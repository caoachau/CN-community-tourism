import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Writable } from 'node:stream';
import { once } from 'node:events';
import { Router } from 'express';
import { z } from 'zod';
import { createApp } from '../src/app.js';
import { AppError, ERROR_DEFINITIONS } from '../src/shared/errors.js';
import { sendSuccess } from '../src/shared/http.js';
import { createLogger } from '../src/shared/logger.js';
import { databaseIdSchema, paginationSchema, validate, vndAmountSchema } from '../src/shared/validation.js';

const lines = [];
const destination = new Writable({ write(chunk, _encoding, callback) {
  for (const line of chunk.toString().trim().split('\n')) {
    const entry = JSON.parse(line);
    lines.push(entry);
    destination.emit('record', entry);
  }
  callback();
} });
const logger = createLogger({ env: { NODE_ENV: 'test', LOG_LEVEL: 'info' }, destination });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
let server;
let baseUrl;

before(async () => {
  const router = Router();
  router.post('/validation/:id', validate({
    params: z.strictObject({ id: databaseIdSchema }),
    query: paginationSchema,
    body: z.strictObject({ participantCount: z.number().int().min(1).max(10), amount: vndAmountSchema }),
  }), (request, response) => {
    sendSuccess(response, { ...response.locals.validated, rawPage: request.query.page });
  });
  router.post('/async-validation', validate({
    body: z.strictObject({ code: z.string().refine(async () => false, { message: 'SECRET_CUSTOM_MESSAGE' }) }),
  }), (_request, response) => sendSuccess(response, {}));
  router.post('/many-errors', validate({ body: z.array(z.number()).max(100) }),
    (_request, response) => sendSuccess(response, {}));
  router.get('/failure', async () => {
    throw Object.assign(new Error('SECRET_SQL_MESSAGE mysql://user:SECRET_DB_PASSWORD@host/db'), {
      status: 403, sql: 'SELECT SECRET_SQL', code: 'ER_DUP_ENTRY',
    });
  });
  router.get('/conflict/:code', (request) => { throw new AppError(request.params.code); });
  router.get('/partial-response', async (_request, response) => {
    response.write('partial response');
    await new Promise((resolve) => setImmediate(resolve));
    throw new Error('SECRET_STREAM_ERROR');
  });
  server = createApp({ logger, apiRouter: router, allowedOrigins: ['http://localhost:5173'] }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function post(path, body, headers = { 'Content-Type': 'application/json' }) {
  return fetch(`${baseUrl}${path}`, { method: 'POST', headers, body });
}

async function expectError(response, status, code) {
  assert.equal(response.status, status);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, code);
  assert.equal(body.error.message, ERROR_DEFINITIONS[code].message);
  assert.match(body.meta.requestId, uuid);
  assert.equal(body.meta.requestId, response.headers.get('x-request-id'));
  return body;
}

test('validated params, body and transformed query remain separate from raw Express 5 query', async () => {
  const response = await post('/api/v1/validation/9007199254740993?page=2&pageSize=10',
    JSON.stringify({ participantCount: 3, amount: 150000 }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.params.id, '9007199254740993');
  assert.deepEqual(body.data.query, { page: 2, pageSize: 10 });
  assert.equal(body.data.rawPage, '2');
  assert.equal(body.meta.requestId, response.headers.get('x-request-id'));
});

test('schema errors report body, params and query paths without echoing input or unknown fields', async () => {
  const response = await post('/api/v1/validation/0?pageSize=101', JSON.stringify({
    participantCount: 'SECRET_INPUT', amount: -1, SECRET_UNKNOWN_FIELD: 'SECRET_VALUE',
  }));
  const body = await expectError(response, 422, 'VALIDATION_ERROR');
  assert.deepEqual(new Set(body.error.details.map((issue) => issue.source)), new Set(['body', 'params', 'query']));
  assert.ok(body.error.details.some((issue) => issue.path.join('.') === 'participantCount'));
  assert.doesNotMatch(JSON.stringify(body), /SECRET_/);
});

test('async schema refinements fail before the route and do not expose custom messages', async () => {
  const body = await expectError(await post('/api/v1/async-validation', '{"code":"SECRET_INPUT"}'), 422, 'VALIDATION_ERROR');
  assert.equal(body.error.details[0].code, 'custom');
  assert.doesNotMatch(JSON.stringify(body), /SECRET_/);
});

test('validation errors are limited to fifty details', async () => {
  const body = await expectError(await post('/api/v1/many-errors', JSON.stringify(Array(100).fill('invalid'))), 422, 'VALIDATION_ERROR');
  assert.equal(body.error.details.length, 50);
});

test('malformed JSON and empty JSON bodies have distinct safe errors', async () => {
  const body = await expectError(await post('/api/v1/validation/1', '{"SECRET_INVALID_JSON":'), 400, 'INVALID_JSON');
  assert.doesNotMatch(JSON.stringify(body), /SECRET_|SyntaxError|stack/);
  await expectError(await post('/api/v1/validation/1', ''), 422, 'VALIDATION_ERROR');
});

test('body validation rejects unsupported media types and JSON parser rejects unsupported charsets', async () => {
  await expectError(await post('/api/v1/validation/1', 'plain text', { 'Content-Type': 'text/plain' }), 415, 'UNSUPPORTED_MEDIA_TYPE');
  await expectError(await post('/api/v1/validation/1', '{}', { 'Content-Type': 'application/json; charset=iso-8859-1' }), 415, 'UNSUPPORTED_MEDIA_TYPE');
});

test('vendor JSON is supported and JSON bodies larger than 1 MiB are rejected', async () => {
  const valid = await post('/api/v1/validation/1', '{"participantCount":1,"amount":0}', { 'Content-Type': 'application/vnd.ctp+json' });
  assert.equal(valid.status, 200);
  await valid.arrayBuffer();
  await expectError(await post('/api/v1/validation/1', JSON.stringify({ text: 'x'.repeat(1024 * 1024) })), 413, 'PAYLOAD_TOO_LARGE');
});

test('CORS returns a structured 403 for disallowed origins and exposes request ID for allowed clients', async () => {
  const denied = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'https://SECRET_ORIGIN.invalid' } });
  const body = await expectError(denied, 403, 'CORS_ORIGIN_DENIED');
  assert.doesNotMatch(JSON.stringify(body), /SECRET_ORIGIN/);
  const allowed = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(allowed.headers.get('access-control-expose-headers'), 'X-Request-Id');
  await allowed.arrayBuffer();
  const preflight = await fetch(`${baseUrl}/api/v1/validation/1`, {
    method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('x-request-id'), uuid);
});

test('unknown routes and malformed URL parameters use the error envelope', async () => {
  await expectError(await fetch(`${baseUrl}/SECRET_UNKNOWN_ROUTE`), 404, 'NOT_FOUND');
  await expectError(await post('/api/v1/validation/%E0%A4%A', '{}'), 400, 'INVALID_REQUEST');
});

test('unhandled async/driver errors ignore arbitrary status and never expose SQL or credentials', async () => {
  const body = await expectError(await fetch(`${baseUrl}/api/v1/failure`), 500, 'INTERNAL_ERROR');
  assert.doesNotMatch(JSON.stringify(body), /SECRET_|mysql:|ER_DUP_ENTRY|stack|sql/i);
});

test('business conflicts, permissions, expired holds and stale versions have stable distinct codes', async () => {
  for (const code of ['AVAILABILITY_CONFLICT', 'INVALID_STATE', 'HOLD_EXPIRED', 'STALE_VERSION', 'IDEMPOTENCY_CONFLICT', 'FORBIDDEN', 'UNAUTHENTICATED']) {
    await expectError(await fetch(`${baseUrl}/api/v1/conflict/${code}`), ERROR_DEFINITIONS[code].status, code);
  }
});

test('an error after headers closes the partial response and logs one safe failure', async () => {
  const recorded = once(destination, 'record', { signal: AbortSignal.timeout(2000) });
  await assert.rejects(async () => {
    const response = await fetch(`${baseUrl}/api/v1/partial-response`);
    await response.text();
  });
  await recorded;
  const entries = lines.filter((line) => line.route === '/partial-response');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].event, 'http_request_aborted');
  assert.equal(entries[0].status, 500);
  assert.equal(entries[0].errorCode, 'INTERNAL_ERROR');
  assert.doesNotMatch(JSON.stringify(entries), /SECRET_/);
});

test('each request has a fresh server ID and one correlated log without private input', async () => {
  const response = await post('/api/v1/validation/SECRET_PATH?token=SECRET_QUERY', '{"password":"SECRET_BODY"}', {
    'Content-Type': 'application/json', Authorization: 'Bearer SECRET_AUTH', Cookie: 'session=SECRET_COOKIE',
    'X-Request-Id': 'SECRET_CLIENT_ID',
  });
  const body = await expectError(response, 422, 'VALIDATION_ERROR');
  const entries = lines.filter((line) => line.requestId === body.meta.requestId);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].route, '/validation/:id');
  assert.equal(entries[0].event, 'http_request');
  assert.equal(entries[0].level, 'warn');
  assert.equal(entries[0].status, 422);
  assert.equal(entries[0].errorCode, 'VALIDATION_ERROR');
  assert.ok(entries[0].durationMs >= 0);
  assert.ok(entries[0].time);
  assert.equal(entries[0].service, 'community-tourism-api');
  assert.doesNotMatch(JSON.stringify(lines), /SECRET_/);
  const another = await fetch(`${baseUrl}/api/health`);
  assert.notEqual(another.headers.get('x-request-id'), body.meta.requestId);
  await another.arrayBuffer();
});
