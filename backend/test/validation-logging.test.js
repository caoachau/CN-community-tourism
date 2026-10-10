import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Writable } from 'node:stream';
import { z } from 'zod';
import { AppError, normalizeError } from '../src/shared/errors.js';
import { createLogger } from '../src/shared/logger.js';
import { databaseIdSchema, paginationSchema, validate, vndAmountSchema } from '../src/shared/validation.js';

test('BIGINT UNSIGNED IDs retain precision and reject overflow, zero and numeric inputs', () => {
  for (const value of ['1', '9007199254740993', '18446744073709551615']) assert.equal(databaseIdSchema.parse(value), value);
  for (const value of ['0', '-1', '01', '1.5', '1e2', '18446744073709551616', 'x', '', 1]) {
    assert.equal(databaseIdSchema.safeParse(value).success, false);
  }
});

test('VND amounts are exact nonnegative DECIMAL(15,0) integers without implicit coercion', () => {
  for (const value of [0, 150000, 999999999999999]) assert.equal(vndAmountSchema.parse(value), value);
  for (const value of [-1, 0.5, 1000000000000000, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '150000']) {
    assert.equal(vndAmountSchema.safeParse(value).success, false);
  }
});

test('pagination supplies defaults, rejects repeated, unknown, fractional and out-of-range input', () => {
  assert.deepEqual(paginationSchema.parse({}), { page: 1, pageSize: 20 });
  assert.deepEqual(paginationSchema.parse({ page: '100000', pageSize: '100' }), { page: 100000, pageSize: 100 });
  for (const value of [{ page: '' }, { page: '0' }, { page: '1.5' }, { page: '100001' },
    { pageSize: '101' }, { page: ['1', '2'] }, { page: 2 }, { unexpected: 'secret' }]) {
    assert.equal(paginationSchema.safeParse(value).success, false);
  }
});

test('misconfigured validation and application codes fail as programming errors', () => {
  for (const schemas of [{}, { headers: z.string() }, { body: {} }]) assert.throws(() => validate(schemas), TypeError);
  for (const code of ['toString', 'UNKNOWN']) assert.throws(() => new AppError(code), TypeError);
  assert.equal(normalizeError({ status: 401, message: 'SECRET' }).code, 'INTERNAL_ERROR');
  assert.equal(normalizeError(null).code, 'INTERNAL_ERROR');
});

test('structured logger redacts common secret fields and serializes errors without raw details', () => {
  let output = '';
  const destination = new Writable({ write(chunk, _encoding, callback) { output += chunk; callback(); } });
  const logger = createLogger({ env: { NODE_ENV: 'production', LOG_LEVEL: 'debug' }, destination });
  const cause = Object.assign(new Error('SECRET_STACK_MESSAGE'), { sql: 'SECRET_SQL', password: 'SECRET_PASSWORD' });
  logger.error({
    event: 'safe_event', password: 'SECRET_ROOT', authorization: 'SECRET_AUTH',
    context: { refreshToken: 'SECRET_REFRESH', password_hash: 'SECRET_HASH' },
    req: { headers: { cookie: 'SECRET_COOKIE' }, body: { data: 'SECRET_BODY' } },
    err: new AppError('DATABASE_UNAVAILABLE', { cause }),
  }, 'Fixed message');
  const entry = JSON.parse(output);
  assert.equal(entry.level, 'error');
  assert.equal(entry.environment, 'production');
  assert.equal(entry.password, '[REDACTED]');
  assert.deepEqual(entry.err, { type: 'AppError', code: 'DATABASE_UNAVAILABLE' });
  assert.doesNotMatch(output, /SECRET_/);
});

test('log level filters messages and invalid levels fail without echoing configuration', () => {
  let output = '';
  const logger = createLogger({ env: { LOG_LEVEL: 'error' }, destination: new Writable({
    write(chunk, _encoding, callback) { output += chunk; callback(); },
  }) });
  logger.info('Filtered');
  logger.error('Recorded');
  assert.doesNotMatch(output, /Filtered/);
  assert.match(output, /Recorded/);
  assert.throws(() => createLogger({ env: { LOG_LEVEL: 'SECRET_INVALID_LEVEL' } }), /^TypeError: Invalid LOG_LEVEL configuration$/);
});
