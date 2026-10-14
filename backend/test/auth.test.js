import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { SignJWT } from 'jose';
import { Router } from 'express';
import { createApp } from '../src/app.js';
import { authOptions } from '../src/config/auth.js';
import { hashPassword, verifyPassword } from '../src/auth/passwords.js';
import { createTokenCodec } from '../src/auth/tokens.js';
import { registerSchema, loginSchema, createAuthLimiter } from '../src/auth/router.js';
import { requireRoles, authenticate } from '../src/auth/middleware.js';
import { createLogger } from '../src/shared/logger.js';

const options = authOptions({ JWT_SECRET: randomBytes(32).toString('base64url') });
const logger = createLogger({ env: { LOG_LEVEL: 'silent' } });
let clock = new Date('2026-10-14T01:00:00Z');
const codec = createTokenCodec(options, () => clock);
const user = { id: '9007199254740993', role: 'HOUSEHOLD' };
const session = { id: '9007199254740994', expires_at: new Date(clock.getTime() + 604800000) };

test('auth config fails closed on missing/placeholder keys and invalid proxy settings', () => {
  for (const JWT_SECRET of [undefined, '', 'short', 'change-me-to-a-long-secret-of-32-characters']) {
    assert.throws(() => authOptions({ JWT_SECRET }), { code: 'INVALID_JWT_SECRET' });
  }
  assert.throws(() => authOptions({ JWT_SECRET: options.secret, TRUST_PROXY_HOPS: 'true' }), { code: 'INVALID_TRUST_PROXY_HOPS' });
  assert.throws(() => authOptions({ JWT_SECRET: options.secret, JWT_ISSUER: '' }), { code: 'INVALID_JWT_IDENTITY' });
});

test('registration normalizes identity, preserves password and rejects role/status injection', () => {
  const input = { email: '  Alice@Example.COM ', displayName: '  Alice  ', password: '  a long passphrase  ' };
  const parsed = registerSchema.parse(input);
  assert.equal(parsed.email, 'alice@example.com'); assert.equal(parsed.displayName, 'Alice');
  assert.equal(parsed.password, input.password);
  for (const extra of [{ role: 'ADMIN' }, { role: 'HOUSEHOLD' }, { status: 'ACTIVE' }, { householdId: '1' }]) {
    assert.equal(registerSchema.safeParse({ ...input, ...extra }).success, false);
  }
  assert.equal(registerSchema.safeParse({ ...input, password: 'too-short' }).success, false);
  assert.equal(loginSchema.safeParse({ email: input.email, password: 'x'.repeat(129) }).success, false);
});

test('password hashing uses independent salts, verifies Unicode/spaces and fails safely for missing hashes', async () => {
  const password = '  Mật khẩu dài cho test  ';
  const first = await hashPassword(password); const second = await hashPassword(password);
  assert.notEqual(first, second); assert.ok(first.length <= 255);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password.trim(), first), false);
  assert.equal(await verifyPassword(password, undefined), false);
  assert.equal(await verifyPassword(password, 'scrypt$v1$999999999$8$3$bad$bad'), false);
});

test('password work rejects overload without an unbounded memory queue', async () => {
  const first = hashPassword('one long test passphrase');
  const second = hashPassword('two long test passphrase');
  await assert.rejects(hashPassword('third long test passphrase'), { code: 'RATE_LIMITED' });
  await Promise.all([first, second]);
});

test('JWT round trip preserves BIGINT IDs, clips lifetime and expires without a cleanup job', async () => {
  const signed = await codec.sign(user, session);
  assert.equal(signed.expiresIn, 900);
  const payload = await codec.verify(signed.accessToken);
  assert.equal(payload.sub, user.id); assert.equal(payload.sid, session.id);
  assert.equal(payload.email, undefined); assert.equal(payload.password, undefined);
  const short = await codec.sign(user, { ...session, expires_at: new Date(clock.getTime() + 30000) });
  assert.equal(short.expiresIn, 30);
  clock = new Date(clock.getTime() + 900000);
  await assert.rejects(codec.verify(signed.accessToken), { code: 'UNAUTHENTICATED' });
  clock = new Date('2026-10-14T01:00:00Z');
});

test('JWT rejects bad signatures, wrong algorithm, issuer, audience, type and required claims', async () => {
  const iat = Math.floor(clock.getTime() / 1000);
  const payload = { sub: user.id, sid: session.id, role: user.role, jti: 'test-jti', iat, exp: iat + 900, iss: options.issuer, aud: options.audience };
  for (const [claims, header, secret] of [
    [payload, { alg: 'HS256', typ: 'JWT' }, 'unrelated-test-signing-key-with-32-bytes'],
    [payload, { alg: 'HS384', typ: 'JWT' }, options.secret],
    [{ ...payload, iss: 'other' }, { alg: 'HS256', typ: 'JWT' }, options.secret],
    [{ ...payload, aud: 'other' }, { alg: 'HS256', typ: 'JWT' }, options.secret],
    [payload, { alg: 'HS256', typ: 'refresh' }, options.secret],
    [{ ...payload, sid: undefined }, { alg: 'HS256', typ: 'JWT' }, options.secret],
    [{ ...payload, sub: '18446744073709551616' }, { alg: 'HS256', typ: 'JWT' }, options.secret],
    [{ ...payload, iat: iat + 60, exp: iat + 900 }, { alg: 'HS256', typ: 'JWT' }, options.secret],
    [{ ...payload, exp: iat + 1800 }, { alg: 'HS256', typ: 'JWT' }, options.secret],
  ]) {
    const token = await new SignJWT(claims).setProtectedHeader(header).sign(new TextEncoder().encode(secret));
    await assert.rejects(codec.verify(token), { code: 'UNAUTHENTICATED' });
  }
  await assert.rejects(codec.verify('not-a-token'), { code: 'UNAUTHENTICATED' });
});

test('auth limiter covers normalized email across IPs, bounds state and releases expired buckets', () => {
  let time = 0; const headers = {};
  const limit = createAuthLimiter({ now: () => time, windowMs: 60000, maxIp: 3, maxEmail: 2, maxEntries: 3 });
  const res = { set: (key, value) => { headers[key] = value; } };
  const req = (ip) => ({ ip, body: { email: ' ALICE@example.com ' } });
  limit(req('1'), res, () => {}); limit(req('2'), res, () => {});
  assert.throws(() => limit(req('1'), res, () => {}), { code: 'RATE_LIMITED' });
  assert.equal(headers['Retry-After'], '60');
  assert.throws(() => limit({ ip: '3', body: {} }, res, () => {}), { code: 'RATE_LIMITED' });
  time = 60000;
  assert.doesNotThrow(() => limit(req('3'), res, () => {}));
});

let server, baseUrl;
before(async () => {
  const router = Router();
  // Test routes are deliberately never mounted in the production server.
  const service = { authenticate: async (token) => ({ user: { id: '1', role: token.split('.')[0] }, sessionId: '1' }) };
  for (const role of ['CUSTOMER', 'HOUSEHOLD', 'ADMIN']) {
    router.get(`/test/${role}`, authenticate(service), requireRoles(role), (_req, res) => res.json({ allowed: true }));
  }
  server = createApp({ logger, apiRouter: router }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); });

test('HTTP role guards inherit CUSTOMER only for HOUSEHOLD; ADMIN cannot act as a household', async () => {
  for (const [role, required, expected] of [
    ['CUSTOMER', 'CUSTOMER', 200], ['HOUSEHOLD', 'CUSTOMER', 200], ['HOUSEHOLD', 'HOUSEHOLD', 200],
    ['ADMIN', 'ADMIN', 200], ['CUSTOMER', 'HOUSEHOLD', 403], ['HOUSEHOLD', 'ADMIN', 403], ['ADMIN', 'HOUSEHOLD', 403],
  ]) {
    const response = await fetch(`${baseUrl}/api/v1/test/${required}`, { headers: { Authorization: `Bearer ${role}.test.test` } });
    assert.equal(response.status, expected);
  }
  for (const authorization of ['', 'Basic customer', 'Bearer bad', 'Bearer a.b.c extra']) {
    const response = await fetch(`${baseUrl}/api/v1/test/CUSTOMER`, { headers: { authorization } });
    assert.equal(response.status, 401);
  }
});

test('server rejects a missing JWT key before opening HTTP or contacting MySQL', () => {
  const result = spawnSync(process.execPath, ['src/server.js'], {
    cwd: new URL('../', import.meta.url), env: { ...process.env, JWT_SECRET: '', DATABASE_URL: '', LOG_LEVEL: 'info' }, encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, 1); assert.match(result.stdout, /INVALID_JWT_SECRET/);
  assert.doesNotMatch(result.stdout, /API listening|Database TLS verified/);
});

test('admin provisioning refuses to write without explicit command flags and never logs input secrets', () => {
  const result = spawnSync(process.execPath, ['scripts/create-admin.js'], {
    cwd: new URL('../', import.meta.url), env: { ...process.env, ADMIN_BOOTSTRAP_PASSWORD: 'DO_NOT_PRINT_TEST_PASSWORD' }, encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, 1); assert.match(result.stderr, /ADMIN_CREATION_REQUIRES_APPLY/);
  assert.doesNotMatch(result.stdout + result.stderr, /DO_NOT_PRINT_TEST_PASSWORD/);
});
