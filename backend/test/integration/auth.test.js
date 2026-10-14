import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import mysql from 'mysql2/promise';
import { createTestDatabase } from '../support/mysql.js';
import { insert } from '../support/fixtures.js';
import { testDatabaseOptions } from '../support/config.js';
import { databaseAccess } from '../../src/database.js';
import { createApp } from '../../src/app.js';
import { authOptions } from '../../src/config/auth.js';
import { createAuthRepository } from '../../src/auth/repository.js';
import { createAuthService } from '../../src/auth/service.js';
import { hashPassword } from '../../src/auth/passwords.js';
import { hashRefreshToken, createTokenCodec } from '../../src/auth/tokens.js';
import { authenticate, requireRoles, requireHouseholdOwner, requireOwnership } from '../../src/auth/middleware.js';
import { ownershipTypes, ownershipRule } from '../../src/auth/ownership.js';
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
  for (const type of ownershipTypes) for (const as of ownershipRule(type).modes) {
    router.get(`/test/ownership/${as}/${type}/:id`, authenticate(service), requireOwnership(service, { resourceType: type, as }),
      (_req, res) => res.json(res.locals.ownership));
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
  const contractPath = /^\/admin\/users\/[^/]+\/status$/.test(path) ? '/api/v1/admin/users/{userId}/status' : `/api/v1${path}`;
  const operation = contract.paths[contractPath]?.[method.toLowerCase()];
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
    const blocked = await request('/auth/me', { token: auth.accessToken });
    assert.equal(blocked.status, 403); assert.equal(blocked.body.error.code, 'ACCOUNT_BLOCKED');
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

test('every registered ownership lookup executes safely on the current schema', async () => {
  for (const type of ownershipTypes) assert.equal(await repository.read((tx) => tx.findOwnership(type, '18446744073709551615')), null);
});

test('nested ownership uses the actual household/customer, not creator/uploader or a claimed household ID', async () => {
  const ownerA = await account('HOUSEHOLD'); const ownerB = await account('HOUSEHOLD'); const admin = await account('ADMIN');
  const householdA = await household(ownerA); await household(ownerB);
  const rows = await sql(async (connection) => {
    const room = await insert(connection, 'rooms', { household_id: householdA, code: `OWN-${++counter}`, max_guests: 4, nightly_price_vnd: '400000' });
    const booking = await insert(connection, 'bookings', {
      household_id: householdA, booking_code: `OWN-${++counter}`, customer_user_id: ownerB.id, created_by: ownerA.id,
      source: 'ONLINE', status: 'CONFIRMED', contact_name: 'Ownership test', contact_phone: '0900000000',
      first_starts_at: '2030-10-14 07:00:00', last_ends_at: '2030-10-15 05:00:00', total_vnd: '400000', terms_snapshot: {}, confirmed_at: '2030-10-01 00:00:00',
    });
    const reservationSet = await insert(connection, 'reservation_sets', { household_id: householdA, booking_id: booking, status: 'COMMITTED' });
    const bookingItem = await insert(connection, 'booking_items', {
      household_id: householdA, reservation_set_id: reservationSet, kind: 'ROOM', room_id: room, participant_count: 2,
      quantity: '1', pricing_type: 'PER_NIGHT', is_exclusive: 1, check_in_date: '2030-10-14', check_out_date: '2030-10-15',
      starts_at: '2030-10-14 07:00:00', ends_at: '2030-10-15 05:00:00', unit_price_vnd: '400000', base_amount_vnd: '400000', snapshot: {},
    });
    const contentRevision = await insert(connection, 'content_revisions', {
      content_type: 'ROOM', room_id: room, version: 1, title: 'Ownership test', body: 'Room description', details: {}, schema_version: 1, submitted_by: ownerB.id,
    });
    const revisionMedia = await insert(connection, 'revision_media', {
      revision_id: contentRevision, storage_provider: 'TEST', object_key: 'ownership-photo.jpg', mime_type: 'image/jpeg',
      size_bytes: '1000', uploaded_by: ownerB.id, sort_order: 1,
    });
    const financialEntry = await insert(connection, 'financial_entries', {
      household_id: householdA, entry_type: 'EXPENSE', amount_vnd: '50000', payment_method: 'CASH',
      occurred_at: '2030-10-14 00:00:00', recorded_by: ownerB.id, note: 'Ownership fixture',
    });
    return { room, booking, reservationSet, bookingItem, contentRevision, revisionMedia, financialEntry };
  });
  const a = await login(ownerA); const b = await login(ownerB); const adminAuth = await login(admin);
  for (const [type, id] of Object.entries(rows)) {
    const path = `/test/ownership/household/${type}/${id}`;
    assert.equal((await request(path, { token: a.accessToken })).status, 200, type);
    assert.equal((await request(path, { token: b.accessToken })).status, 403, type);
    assert.equal((await request(path, { token: adminAuth.accessToken })).status, 403, type);
  }
  for (const type of ['booking', 'bookingItem', 'reservationSet']) {
    const path = `/test/ownership/customer/${type}/${rows[type]}`;
    assert.equal((await request(path, { token: b.accessToken })).status, 200);
    assert.equal((await request(path, { token: a.accessToken })).status, 403);
    assert.equal((await request(`${path}?householdId=${householdA}&userId=${ownerB.id}`, { token: a.accessToken })).status, 403);
  }
  assert.equal((await request('/test/ownership/household/room/18446744073709551615', { token: a.accessToken })).status, 403);
});

test('offline bookings confer no customer ownership; platform articles confer no household ownership', async () => {
  const owner = await account('HOUSEHOLD'); const admin = await account('ADMIN'); const id = await household(owner);
  const rows = await sql(async (connection) => {
    const booking = await insert(connection, 'bookings', {
      household_id: id, booking_code: `OFFLINE-${++counter}`, customer_user_id: null, created_by: owner.id,
      source: 'OFFLINE', offline_channel: 'PHONE', status: 'CONFIRMED', contact_name: 'Offline test', contact_phone: '0900000000',
      first_starts_at: '2030-10-14 07:00:00', last_ends_at: '2030-10-14 09:00:00', total_vnd: '100000', terms_snapshot: {}, confirmed_at: '2030-10-01 00:00:00',
    });
    const article = await insert(connection, 'cultural_articles', { author_user_id: admin.id, slug: `global-${++counter}` });
    const revision = await insert(connection, 'content_revisions', {
      content_type: 'ARTICLE', article_id: article, version: 1, title: 'Platform content', body: 'Global article', details: {}, schema_version: 1, submitted_by: owner.id,
    });
    return { booking, article, revision };
  });
  const auth = await login(owner);
  assert.equal((await request(`/test/ownership/customer/booking/${rows.booking}`, { token: auth.accessToken })).status, 403);
  assert.equal((await request(`/test/ownership/household/booking/${rows.booking}`, { token: auth.accessToken })).status, 200);
  assert.equal((await request(`/test/ownership/household/article/${rows.article}`, { token: auth.accessToken })).status, 403);
  assert.equal((await request(`/test/ownership/household/contentRevision/${rows.revision}`, { token: auth.accessToken })).status, 403);
});

test('notifications are scoped to their actual user for all three roles', async () => {
  const admin = await account('ADMIN'); const other = await account();
  const notification = await sql((connection) => insert(connection, 'notifications', {
    user_id: admin.id, event_key: `TEST-${++counter}`, event_type: 'TEST', title: 'Private', body: 'Test only', navigation: {},
  }));
  const a = await login(admin); const b = await login(other);
  assert.equal((await request(`/test/ownership/user/notification/${notification}`, { token: a.accessToken })).status, 200);
  assert.equal((await request(`/test/ownership/user/notification/${notification}`, { token: b.accessToken })).status, 403);
});

test('only ADMIN can change account status and a reason is mandatory; self-block is forbidden', async () => {
  const target = await account(); const admin = await account('ADMIN'); const customer = await account(); const owner = await account('HOUSEHOLD');
  const path = `/admin/users/${target.id}/status`;
  assert.equal((await request(path, { method: 'PATCH', body: { status: 'BLOCKED', reason: 'Test' } })).status, 401);
  for (const user of [customer, owner]) {
    const auth = await login(user);
    assert.equal((await request(path, { method: 'PATCH', token: auth.accessToken, body: { status: 'BLOCKED', reason: 'Test' } })).status, 403);
  }
  const auth = await login(admin);
  for (const body of [{ status: 'BLOCKED' }, { status: 'BLOCKED', reason: '   ' }, { status: 'BLOCKED', reason: 'Test', role: 'ADMIN' }]) {
    assert.equal((await request(path, { method: 'PATCH', token: auth.accessToken, body })).status, 422);
  }
  assert.equal((await request(`/admin/users/${admin.id}/status`, { method: 'PATCH', token: auth.accessToken, body: { status: 'BLOCKED', reason: 'Self' } })).status, 403);
  assert.equal((await request('/admin/users/18446744073709551615/status', { method: 'PATCH', token: auth.accessToken, body: { status: 'BLOCKED', reason: 'Missing' } })).status, 404);
  assert.equal((await repository.read((tx) => tx.findUserById(target.id))).status, 'ACTIVE');
});

test('blocking revokes every device atomically, audits once and unblocking never revives tokens or changes household approval', async () => {
  const admin = await account('ADMIN'); const owner = await account('HOUSEHOLD'); const id = await household(owner);
  const adminAuth = await login(admin); const one = await login(owner); const two = await login(owner);
  const path = `/admin/users/${owner.id}/status`;
  const block = await request(path, { method: 'PATCH', token: adminAuth.accessToken, body: { status: 'BLOCKED', reason: '  Vi phạm quy định  ' } });
  assert.equal(block.status, 200); assert.equal(block.body.data.changed, true); assert.equal(block.body.data.revokedSessionCount, 2);
  assert.equal(block.body.data.user.status, 'BLOCKED'); assert.ok(block.body.data.user.disabledAt);
  for (const auth of [one, two]) {
    const me = await request('/auth/me', { token: auth.accessToken });
    assert.equal(me.status, 403); assert.equal(me.body.error.code, 'ACCOUNT_BLOCKED');
    await assert.rejects(service.refresh(auth.refreshToken), { code: 'UNAUTHENTICATED' });
  }
  await assert.rejects(login(owner), { code: 'INVALID_CREDENTIALS' });
  const replay = await request(path, { method: 'PATCH', token: adminAuth.accessToken, body: { status: 'BLOCKED', reason: 'Retry' } });
  assert.equal(replay.body.data.changed, false); assert.equal(replay.body.data.revokedSessionCount, 0);
  await sql(async (connection) => {
    const [events] = await connection.execute("SELECT * FROM activity_events WHERE entity_type='USER' AND entity_id=?", [owner.id]);
    assert.equal(events.length, 1); assert.equal(events[0].actor_user_id, String(admin.id));
    assert.equal(events[0].reason, 'Vi phạm quy định'); assert.equal(events[0].correlation_id, block.body.meta.requestId);
    assert.equal(events[0].from_status, 'ACTIVE'); assert.equal(events[0].to_status, 'BLOCKED');
    assert.doesNotMatch(JSON.stringify(events), /password_hash|refreshToken|accessToken/);
  });
  const unblock = await request(path, { method: 'PATCH', token: adminAuth.accessToken, body: { status: 'ACTIVE', reason: 'Đã xử lý' } });
  assert.equal(unblock.status, 200); assert.equal(unblock.body.data.user.disabledAt, null);
  for (const auth of [one, two]) {
    assert.equal((await request('/auth/me', { token: auth.accessToken })).status, 401);
    await assert.rejects(service.refresh(auth.refreshToken), { code: 'UNAUTHENTICATED' });
  }
  assert.equal((await login(owner)).user.role, 'HOUSEHOLD');
  assert.equal((await repository.read((tx) => tx.findHousehold(id))).approval_status, 'APPROVED');
  assert.equal((await request('/auth/me', { token: adminAuth.accessToken })).status, 200);
});

test('status, session revocation and audit roll back together if the audit write fails', async () => {
  const admin = await account('ADMIN'); const target = await account(); const adminAuth = await login(admin); const targetAuth = await login(target);
  const context = await service.authenticate(adminAuth.accessToken);
  const broken = createAuthService({ options, repository: {
    ...repository, transaction: (work) => repository.transaction((tx) => work({ ...tx, recordAccountStatus: async () => { throw new Error('TEST_AUDIT_FAILURE'); } })),
  } });
  await assert.rejects(broken.setAccountStatus(context, String(target.id), { status: 'BLOCKED', reason: 'Test rollback' }, 'test-audit-rollback'), /TEST_AUDIT_FAILURE/);
  assert.equal((await repository.read((tx) => tx.findUserById(target.id))).status, 'ACTIVE');
  assert.equal((await service.authenticate(targetAuth.accessToken)).user.id, String(target.id));
});

test('a stale admin context cannot bypass a role change or session revocation inside the status transaction', async () => {
  const admin = await account('ADMIN'); const target = await account(); const auth = await login(admin); const context = await service.authenticate(auth.accessToken);
  await sql((connection) => connection.execute("UPDATE users SET role='CUSTOMER' WHERE id=?", [admin.id]));
  await assert.rejects(service.setAccountStatus(context, String(target.id), { status: 'BLOCKED', reason: 'Stale role' }, 'test-stale-role'), { code: 'FORBIDDEN' });
  await sql((connection) => connection.execute("UPDATE users SET role='ADMIN' WHERE id=?", [admin.id]));
  await service.logout(context);
  await assert.rejects(service.setAccountStatus(context, String(target.id), { status: 'BLOCKED', reason: 'Stale session' }, 'test-stale-session'), { code: 'UNAUTHENTICATED' });
  assert.equal((await repository.read((tx) => tx.findUserById(target.id))).status, 'ACTIVE');
});

test('concurrent admins blocking each other leave exactly one active account', async () => {
  const a = await account('ADMIN'); const b = await account('ADMIN'); const aa = await login(a); const bb = await login(b);
  const ca = await service.authenticate(aa.accessToken); const cb = await service.authenticate(bb.accessToken);
  const results = await Promise.allSettled([
    service.setAccountStatus(ca, String(b.id), { status: 'BLOCKED', reason: 'Admin race A' }, 'test-admin-race-a'),
    service.setAccountStatus(cb, String(a.id), { status: 'BLOCKED', reason: 'Admin race B' }, 'test-admin-race-b'),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.find((result) => result.status === 'rejected').reason.code, 'ACCOUNT_BLOCKED');
  const states = await repository.read(async (tx) => [(await tx.findUserById(a.id)).status, (await tx.findUserById(b.id)).status]);
  assert.deepEqual(states.sort(), ['ACTIVE', 'BLOCKED']);
});

test('blocking against login or refresh cannot leave a usable session after unblock', async () => {
  const admin = await account('ADMIN'); const target = await account(); const adminAuth = await login(admin);
  const actor = await service.authenticate(adminAuth.accessToken); const existing = await login(target);
  const [blocked, refreshed, loggedIn] = await Promise.allSettled([
    service.setAccountStatus(actor, String(target.id), { status: 'BLOCKED', reason: 'Race' }, 'test-block-auth-race'),
    service.refresh(existing.refreshToken), login(target),
  ]);
  assert.equal(blocked.status, 'fulfilled');
  await service.setAccountStatus(actor, String(target.id), { status: 'ACTIVE', reason: 'Test unblock' }, 'test-unblock-auth-race');
  for (const result of [refreshed, loggedIn]) if (result.status === 'fulfilled') {
    await assert.rejects(service.authenticate(result.value.accessToken), { code: 'UNAUTHENTICATED' });
    await assert.rejects(service.refresh(result.value.refreshToken), { code: 'UNAUTHENTICATED' });
  }
  await assert.rejects(service.authenticate(existing.accessToken), { code: 'UNAUTHENTICATED' });
});
