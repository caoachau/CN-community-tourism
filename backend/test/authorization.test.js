import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import http from 'node:http';
import { Router } from 'express';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/shared/logger.js';
import { assertCurrentUser, assertRoles, assertHouseholdOwner } from '../src/auth/policies.js';
import { authenticate, requireRoles, requireOwnership } from '../src/auth/middleware.js';
import { accountStatusSchema } from '../src/auth/schemas.js';
import { ownershipRule } from '../src/auth/ownership.js';

const context = (role = 'CUSTOMER', changes = {}) => ({ user: { id: '9007199254740993', role, status: 'ACTIVE', ...changes }, sessionId: '9007199254740994' });

test('current-user checks reject missing, malformed, unknown-role and blocked contexts', () => {
  for (const auth of [null, {}, { user: {} }, context('UNKNOWN'), context('CUSTOMER', { id: 1 }), { ...context(), sessionId: '0' }]) {
    assert.throws(() => assertCurrentUser(auth), { code: 'UNAUTHENTICATED' });
  }
  for (const auth of [context('CUSTOMER', { status: 'BLOCKED' }), context('HOUSEHOLD', { disabled_at: new Date() })]) {
    assert.throws(() => assertCurrentUser(auth), { code: 'ACCOUNT_BLOCKED' });
  }
  assert.equal(assertCurrentUser(context()).id, '9007199254740993');
});

test('role inheritance grants customer rights to household accounts without an implicit admin override', () => {
  for (const [role, allowed, pass] of [
    ['CUSTOMER', ['CUSTOMER'], true], ['HOUSEHOLD', ['CUSTOMER'], true], ['HOUSEHOLD', ['HOUSEHOLD'], true],
    ['ADMIN', ['ADMIN'], true], ['ADMIN', ['HOUSEHOLD'], false], ['CUSTOMER', ['ADMIN'], false],
    ['ADMIN', ['CUSTOMER'], false], ['HOUSEHOLD', ['CUSTOMER', 'ADMIN'], true],
  ]) {
    if (pass) assert.doesNotThrow(() => assertRoles(context(role), allowed));
    else assert.throws(() => assertRoles(context(role), allowed), { code: 'FORBIDDEN' });
  }
  assert.throws(() => requireRoles('SUPER_ADMIN'), TypeError);
  assert.throws(() => requireRoles(), TypeError);
});

test('household ownership preserves access after revocation but requires approval for new commitments', () => {
  const household = { id: '5', owner_user_id: '9007199254740993', approval_status: 'REVOKED', archived_at: null };
  assert.equal(assertHouseholdOwner(context('HOUSEHOLD'), household), household);
  assert.throws(() => assertHouseholdOwner(context('HOUSEHOLD'), household, { requireApproved: true }), { code: 'HOUSEHOLD_NOT_APPROVED' });
  for (const other of [null, { ...household, owner_user_id: '9007199254740992' }]) {
    assert.throws(() => assertHouseholdOwner(context('HOUSEHOLD'), other), { code: 'FORBIDDEN' });
  }
  assert.throws(() => assertHouseholdOwner(context('ADMIN'), household), { code: 'FORBIDDEN' });
  assert.throws(() => assertHouseholdOwner(context('HOUSEHOLD'), { ...household, approval_status: 'APPROVED', archived_at: new Date() }, { requireApproved: true }), { code: 'HOUSEHOLD_NOT_APPROVED' });
});

test('ownership policies are explicit and reject SQL identifiers and unsupported actor modes', () => {
  assert.throws(() => ownershipRule('rooms; DROP TABLE users'), TypeError);
  assert.throws(() => ownershipRule('financialEntry', 'customer'), TypeError);
  assert.throws(() => ownershipRule('complaint', 'household'), TypeError);
  assert.throws(() => requireOwnership({}, { resourceType: 'booking', as: 'customer', requireApproved: true }), TypeError);
});

test('account-status validation requires a reason and rejects role, identity and session injection', () => {
  for (const input of [
    { status: 'BLOCKED' }, { status: 'ACTIVE', reason: '  ' }, { status: 'ADMIN', reason: 'test' },
    { status: 'BLOCKED', reason: 'x'.repeat(2001) }, { status: 'BLOCKED', reason: 'test', role: 'ADMIN' },
    { status: 'BLOCKED', reason: 'test', userId: '1' }, { status: 'BLOCKED', reason: 'test', sessionId: '1' },
  ]) assert.equal(accountStatusSchema.safeParse(input).success, false);
  assert.deepEqual(accountStatusSchema.parse({ status: 'BLOCKED', reason: '  Vi phạm quy định  ' }), { status: 'BLOCKED', reason: 'Vi phạm quy định' });
});

let server, baseUrl, ownershipCalls;
before(async () => {
  ownershipCalls = [];
  const service = {
    authenticate: async (token) => context('HOUSEHOLD', token.startsWith('blocked.') ? { status: 'BLOCKED' } : {}),
    authorizeResource: async (auth, type, id, options) => { ownershipCalls.push({ auth, type, id, options }); return { resource: { id } }; },
  };
  const router = Router();
  router.post('/test/resources/:id', authenticate(service), requireOwnership(service, { resourceType: 'room' }), (_req, res) => res.json(res.locals.ownership));
  server = createApp({ logger: createLogger({ env: { LOG_LEVEL: 'silent' } }), apiRouter: router }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); });

test('ownership middleware resolves the resource ID from the route and ignores claimed owners in the body', async () => {
  const response = await fetch(`${baseUrl}/api/v1/test/resources/9007199254740995`, {
    method: 'POST', headers: { authorization: 'Bearer active.test.test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: '100', householdId: '200', ownerUserId: '300', role: 'ADMIN' }),
  });
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(ownershipCalls.at(-1).id, '9007199254740995');
  assert.equal(ownershipCalls.at(-1).auth.user.role, 'HOUSEHOLD');
  const beforeCalls = ownershipCalls.length;
  const invalid = await fetch(`${baseUrl}/api/v1/test/resources/18446744073709551616`, { method: 'POST', headers: { authorization: 'Bearer active.test.test' } });
  assert.equal(invalid.status, 403); assert.equal(ownershipCalls.length, beforeCalls);
});

test('blocked authentication contexts cannot reach an ownership lookup or protected handler', async () => {
  const beforeCalls = ownershipCalls.length;
  const response = await fetch(`${baseUrl}/api/v1/test/resources/1`, { method: 'POST', headers: { authorization: 'Bearer blocked.test.test' } });
  assert.equal(response.status, 403); assert.equal((await response.json()).error.code, 'ACCOUNT_BLOCKED');
  assert.equal(ownershipCalls.length, beforeCalls);
});

test('ambiguous duplicate Authorization headers are rejected with a Bearer challenge', async () => {
  const result = await new Promise((resolve, reject) => {
    const request = http.request(`${baseUrl}/api/v1/test/resources/1`, {
      method: 'POST', headers: { Authorization: ['Bearer active.test.test', 'Bearer blocked.test.test'] },
    }, (response) => {
      let body = ''; response.setEncoding('utf8'); response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(body), headers: response.headers }));
    });
    request.on('error', reject); request.end();
  });
  assert.equal(result.status, 401); assert.equal(result.body.error.code, 'UNAUTHENTICATED');
  assert.equal(result.headers['www-authenticate'], 'Bearer');
});
