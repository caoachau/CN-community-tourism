import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import mysql from 'mysql2/promise';
import { createTestDatabase } from '../support/mysql.js';
import { testDatabaseOptions } from '../support/config.js';
import { databaseAccess } from '../../src/database.js';
import { createApp } from '../../src/app.js';
import { authOptions } from '../../src/config/auth.js';
import { createAuthRepository } from '../../src/auth/repository.js';
import { createAuthService } from '../../src/auth/service.js';
import { hashPassword } from '../../src/auth/passwords.js';
import { hashRefreshToken, createTokenCodec } from '../../src/auth/tokens.js';
import { authenticate, requireRoles, requireHouseholdOwner } from '../../src/auth/middleware.js';
import { openApiDocument } from '../../src/openapi.js';
import { createLogger } from '../../src/shared/logger.js';

let database, pool, repository, service, server, baseUrl, passwordHash, contract;
const password = 'Long test password for all three roles';
let counter = 0;
const ajv = addFormats(new Ajv({ strict: false, allErrors: true }));
const logger = createLogger({ env: { LOG_LEVEL: 'silent' } });
const options = authOptions({ JWT_SECRET: randomBytes(32).toString('base64url') });

async function sql(work) {
  const connection = await database.connect();
  try { return await work(connection); }
  finally { await database.closeConnection(connection); }
}
before(async () => {
  database = await createTestDatabase(process.env, { schema: 'current' });
  pool = mysql.createPool({ ...testDatabaseOptions(), database: database.name, connectionLimit: 5, queueLimit: 20 });
  repository = createAuthRepository(databaseAccess(pool));
  service = createAuthService({ repository, options });
  passwordHash = await hashPassword(password);
  contract = await SwaggerParser.dereference(structuredClone(openApiDocument), { resolve: { external: false } });
  const router = Router();
  router.get('/test/customer', authenticate(service), requireRoles('CUSTOMER'), (_req, res) => res.json({ allowed: true }));
  router.get('/test/admin', authenticate(service), requireRoles('ADMIN'), (_req, res) => res.json({ allowed: true }));
  for (const [path, requireApproved] of [['manage', false], ['commit', true]]) {
    router.get(`/test/households/:householdId/${path}`, authenticate(service),
      requireHouseholdOwner(service, undefined, { requireApproved }), (_req, res) => res.json({ allowed: true }));
  }
  server = createApp({ logger, authService: service, apiRouter: router }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool?.end();
  await database?.dispose();
});

async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  const operation = contract.paths[`/api/v1${path}`]?.[method.toLowerCase()];
  if (operation) {
    const responseSchema = (operation.responses[response.status] ?? operation.responses.default).content['application/json'].schema;
    const validate = ajv.compile(responseSchema);
    assert.equal(validate(data), true, JSON.stringify(validate.errors));
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(data.meta.requestId, response.headers.get('x-request-id'));
  }
  return { status: response.status, body: data, headers: response.headers };
}
async function account(role = 'CUSTOMER') {
  const email = `auth-${++counter}@example.invalid`;
  return repository.transaction((tx) => tx.createUser({ email, displayName: `Account ${counter}`, passwordHash, role }));
}
const login = (user) => service.login({ email: user.email, password });
async function household(owner, status = 'APPROVED') {
  return sql(async (connection) => {
    await connection.execute('INSERT INTO households (owner_user_id, code, approval_status, updated_at) VALUES (?, ?, ?, UTC_TIMESTAMP(6))',
      [owner.id, `AUTH-${++counter}`, status]);
    const [[row]] = await connection.query('SELECT CAST(LAST_INSERT_ID() AS CHAR) id'); return row.id;
  });
}

test('registration/login/me/refresh/logout work end to end on the current 30-table MySQL schema', async () => {
  const input = { email: '  First-Auth@Example.invalid ', displayName: '  Nguyễn Văn A  ', password, phone: '+84901234567' };
  const registered = await request('/auth/register', { method: 'POST', body: input });
  assert.equal(registered.status, 201);
  const auth = registered.body.data;
  assert.equal(auth.user.role, 'CUSTOMER'); assert.equal(auth.user.email, 'first-auth@example.invalid');
  assert.equal(auth.user.displayName, 'Nguyễn Văn A');
  await sql(async (connection) => {
    const [[stored]] = await connection.execute('SELECT password_hash FROM users WHERE id = ?', [auth.user.id]);
    assert.notEqual(stored.password_hash, password); assert.match(stored.password_hash, /^scrypt\$/);
    const [[session]] = await connection.execute('SELECT token_hash FROM auth_sessions WHERE user_id = ?', [auth.user.id]);
    assert.ok(timingSafeEqual(session.token_hash, hashRefreshToken(auth.refreshToken)));
    const [[row]] = await connection.execute('SELECT COUNT(*) n FROM households WHERE owner_user_id = ?', [auth.user.id]);
    assert.equal(Number(row.n), 0);
  });
  const me = await request('/auth/me', { token: auth.accessToken });
  assert.equal(me.status, 200); assert.deepEqual(me.body.data.user, auth.user);
  const refreshed = await request('/auth/refresh', { method: 'POST', body: { refreshToken: auth.refreshToken } });
  assert.equal(refreshed.status, 200); assert.notEqual(refreshed.body.data.refreshToken, auth.refreshToken);
  assert.equal(refreshed.body.data.refreshExpiresAt, auth.refreshExpiresAt);
  assert.equal((await request('/auth/refresh', { method: 'POST', body: { refreshToken: auth.refreshToken } })).status, 401);
  const second = await request('/auth/login', { method: 'POST', body: { email: input.email, password } });
  assert.equal(second.status, 200);
  assert.equal((await request('/auth/logout', { method: 'POST', token: refreshed.body.data.accessToken })).status, 200);
  assert.equal((await request('/auth/me', { token: auth.accessToken })).status, 401);
  assert.equal((await request('/auth/refresh', { method: 'POST', body: { refreshToken: refreshed.body.data.refreshToken } })).status, 401);
  assert.equal((await request('/auth/me', { token: second.body.data.accessToken })).status, 200);
});

test('public signup rejects elevated roles/unknown fields and duplicate normalized email safely', async () => {
  for (const extra of [{ role: 'ADMIN' }, { role: 'HOUSEHOLD' }, { status: 'ACTIVE' }]) {
    const response = await request('/auth/register', { method: 'POST', body: { email: 'injected@example.invalid', password, displayName: 'Injected', ...extra } });
    assert.equal(response.status, 422);
  }
  const duplicate = await request('/auth/register', { method: 'POST', body: { email: 'FIRST-AUTH@example.invalid', password, displayName: 'Duplicate' } });
  assert.equal(duplicate.status, 409); assert.equal(duplicate.body.error.code, 'EMAIL_ALREADY_EXISTS');
  assert.doesNotMatch(JSON.stringify(duplicate.body), /password_hash|ER_DUP_ENTRY|INSERT INTO/);
});

test('all three roles can sign in; HOUSEHOLD inherits CUSTOMER and only manages its own household', async () => {
  const customer = await account(); const ownerA = await account('HOUSEHOLD');
  const ownerB = await account('HOUSEHOLD'); const admin = await account('ADMIN');
  const householdA = await household(ownerA); const householdB = await household(ownerB);
  for (const user of [customer, ownerA, ownerB, admin]) {
    const response = await request('/auth/login', { method: 'POST', body: { email: user.email, password } });
    assert.equal(response.status, 200); assert.equal(response.body.data.user.role, user.role);
    const token = response.body.data.accessToken;
    assert.equal((await request('/test/customer', { token })).status, user.role === 'ADMIN' ? 403 : 200);
    assert.equal((await request('/test/admin', { token })).status, user.role === 'ADMIN' ? 200 : 403);
    if (user.id === ownerA.id) {
      assert.equal((await request(`/test/households/${householdA}/manage`, { token })).status, 200);
      assert.equal((await request(`/test/households/${householdB}/manage`, { token })).status, 403);
    } else if (user.id !== ownerB.id) {
      assert.equal((await request(`/test/households/${householdA}/manage`, { token })).status, 403);
    }
  }
});

test('household revocation preserves customer and existing management access but blocks new commitments', async () => {
  const owner = await account('HOUSEHOLD'); const id = await household(owner, 'REVOKED'); const auth = await login(owner);
  assert.equal((await request('/test/customer', { token: auth.accessToken })).status, 200);
  assert.equal((await request(`/test/households/${id}/manage`, { token: auth.accessToken })).status, 200);
  const denied = await request(`/test/households/${id}/commit`, { token: auth.accessToken });
  assert.equal(denied.status, 403); assert.equal(denied.body.error.code, 'HOUSEHOLD_NOT_APPROVED');
});

test('invalid passwords, nonexistent and blocked accounts return the same public login failure', async () => {
  const user = await account();
  const wrong = await request('/auth/login', { method: 'POST', body: { email: user.email, password: 'wrong' } });
  const missing = await request('/auth/login', { method: 'POST', body: { email: 'missing@example.invalid', password } });
  await sql((connection) => connection.execute("UPDATE users SET status = 'BLOCKED' WHERE id = ?", [user.id]));
  const blocked = await request('/auth/login', { method: 'POST', body: { email: user.email, password } });
  for (const response of [wrong, missing, blocked]) {
    assert.equal(response.status, 401); assert.deepEqual(response.body.error, wrong.body.error);
  }
});

test('live account blocking, disabling and role changes take effect before access JWT expiry', async () => {
  const user = await account('ADMIN'); const auth = await login(user);
  await sql((connection) => connection.execute("UPDATE users SET role = 'CUSTOMER' WHERE id = ?", [user.id]));
  assert.equal((await request('/test/admin', { token: auth.accessToken })).status, 403);
  const me = await request('/auth/me', { token: auth.accessToken });
  assert.equal(me.body.data.user.role, 'CUSTOMER');
  for (const change of ["status = 'BLOCKED'", 'disabled_at = UTC_TIMESTAMP(6)']) {
    await sql((connection) => connection.execute(`UPDATE users SET ${change} WHERE id = ?`, [user.id]));
    assert.equal((await request('/auth/me', { token: auth.accessToken })).status, 401);
    await assert.rejects(service.refresh(auth.refreshToken), { code: 'UNAUTHENTICATED' });
    await sql((connection) => connection.execute("UPDATE users SET status = 'ACTIVE', disabled_at = NULL WHERE id = ?", [user.id]));
  }
});

test('expired sessions immediately reject both tokens without cleanup jobs', async () => {
  const user = await account(); const auth = await login(user);
  await sql((connection) => connection.execute('UPDATE auth_sessions SET expires_at = UTC_TIMESTAMP(6) - INTERVAL 1 SECOND WHERE user_id = ?', [user.id]));
  assert.equal((await request('/auth/me', { token: auth.accessToken })).status, 401);
  await assert.rejects(service.refresh(auth.refreshToken), { code: 'UNAUTHENTICATED' });
});

test('a correctly signed token cannot bind one account to another account session', async () => {
  const customer = await account(); const admin = await account('ADMIN');
  const adminAuth = await login(admin); const adminContext = await service.authenticate(adminAuth.accessToken);
  const mismatched = await createTokenCodec(options).sign(customer, {
    id: adminContext.sessionId, expires_at: new Date(adminAuth.refreshExpiresAt),
  });
  assert.equal((await request('/auth/me', { token: mismatched.accessToken })).status, 401);
  assert.equal((await request('/auth/me', { token: adminAuth.refreshToken })).status, 401);
});

test('two concurrent refreshes of one token produce exactly one rotation', async () => {
  const user = await account(); const auth = await login(user);
  const results = await Promise.allSettled([service.refresh(auth.refreshToken), service.refresh(auth.refreshToken)]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.find((result) => result.status === 'rejected').reason.code, 'UNAUTHENTICATED');
  const winner = results.find((result) => result.status === 'fulfilled').value;
  await assert.rejects(service.refresh(auth.refreshToken), { code: 'UNAUTHENTICATED' });
  assert.equal((await service.authenticate(winner.accessToken)).user.id, String(user.id));
});

test('refresh racing logout cannot leave a usable session', async () => {
  const user = await account(); const auth = await login(user); const context = await service.authenticate(auth.accessToken);
  const [refreshed, loggedOut] = await Promise.allSettled([service.refresh(auth.refreshToken), service.logout(context)]);
  assert.equal(loggedOut.status, 'fulfilled');
  await assert.rejects(service.authenticate(auth.accessToken), { code: 'UNAUTHENTICATED' });
  if (refreshed.status === 'fulfilled') {
    await assert.rejects(service.authenticate(refreshed.value.accessToken), { code: 'UNAUTHENTICATED' });
    await assert.rejects(service.refresh(refreshed.value.refreshToken), { code: 'UNAUTHENTICATED' });
  } else assert.equal(refreshed.reason.code, 'UNAUTHENTICATED');
});

test('duplicate registration races create one account and one session; session failure rolls back signup', async () => {
  const input = { email: 'race-register@example.invalid', password, displayName: 'Race' };
  const results = await Promise.allSettled([service.register(input), service.register(input)]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.find((result) => result.status === 'rejected').reason.code, 'EMAIL_ALREADY_EXISTS');
  await sql(async (connection) => {
    const [[row]] = await connection.execute('SELECT COUNT(*) n FROM users u JOIN auth_sessions s ON s.user_id=u.id WHERE u.email=?', [input.email]);
    assert.equal(Number(row.n), 1);
  });
  const broken = createAuthService({ options, repository: {
    ...repository,
    transaction: (work) => repository.transaction((tx) => work({ ...tx, createSession: async () => { throw new Error('TEST_SESSION_FAILURE'); } })),
  } });
  await assert.rejects(broken.register({ ...input, email: 'rollback-register@example.invalid' }), /TEST_SESSION_FAILURE/);
  assert.equal(await repository.read((tx) => tx.findUserByEmail('rollback-register@example.invalid')), null);
});

test('registration service never trusts a directly supplied elevated role', async () => {
  const auth = await service.register({ email: 'direct-role@example.invalid', password, displayName: 'Direct', role: 'ADMIN' });
  assert.equal(auth.user.role, 'CUSTOMER');
});
