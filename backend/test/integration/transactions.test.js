import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createHash } from 'node:crypto';
import { createTestDatabase, concurrentTransactions } from '../support/mysql.js';
import { seedBase, insert } from '../support/fixtures.js';

let database;
let base;
before(async () => {
  database = await createTestDatabase();
  const connection = await database.connect();
  try { base = await seedBase(connection); }
  finally { await database.closeConnection(connection); }
});
after(async () => { await database?.dispose(); });

test('two independent connections enforce household row locks and reread the committed state', async () => {
  const first = await database.connect();
  const second = await database.connect();
  try {
    const [[a]] = await first.query('SELECT CONNECTION_ID() AS id');
    const [[b]] = await second.query('SELECT CONNECTION_ID() AS id');
    assert.notEqual(a.id, b.id);
    await first.beginTransaction();
    await second.beginTransaction();
    await first.execute('SELECT id FROM households WHERE id = ? FOR UPDATE', [base.households.A]);
    await first.execute("UPDATE households SET approval_status = 'REVOKED' WHERE id = ?", [base.households.A]);
    await assert.rejects(second.execute('SELECT id FROM households WHERE id = ? FOR UPDATE NOWAIT', [base.households.A]), { code: 'ER_LOCK_NOWAIT' });
    await first.commit();
    const [[current]] = await second.execute('SELECT approval_status FROM households WHERE id = ? FOR UPDATE', [base.households.A]);
    assert.equal(current.approval_status, 'REVOKED');
    await second.rollback();
  } finally {
    await first.rollback(); await second.rollback();
    await database.closeConnection(first); await database.closeConnection(second);
  }
});

test('concurrent idempotency inserts have one committed winner and one duplicate', async () => {
  const payloadHash = createHash('sha256').update('same fixture payload').digest();
  const work = (connection) => insert(connection, 'idempotency_keys', {
    actor_user_id: base.users.customer, action: 'test.command', idempotency_key: 'same-key',
    request_hash: payloadHash, response_status: 200, response_body: { fixture: true }, completed_at: '2030-01-01 00:00:00',
  });
  const results = await concurrentTransactions(database, [work, work]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const failures = results.filter((result) => result.status === 'rejected');
  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason.code, 'ER_DUP_ENTRY');
  const connection = await database.connect();
  try {
    const [[count]] = await connection.query("SELECT COUNT(*) AS count FROM idempotency_keys WHERE idempotency_key = 'same-key'");
    assert.equal(Number(count.count), 1);
  } finally { await database.closeConnection(connection); }
});
