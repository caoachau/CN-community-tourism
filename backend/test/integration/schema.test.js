import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createTestDatabase } from '../support/mysql.js';
import { seedBase, seedBooking, seedServiceItem, insert } from '../support/fixtures.js';

let database;
before(async () => { database = await createTestDatabase(); });
after(async () => { await database?.dispose(); });

test('the real MySQL 8.4 migration creates 41 tables, 101 FKs and 140 enforced CHECKs', async () => {
  const connection = await database.connect();
  try {
    const [tables] = await connection.query("SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> '__test_harness'");
    assert.equal(tables.length, 41);
    assert.ok(tables.every((row) => row.ENGINE === 'InnoDB' && row.TABLE_COLLATION === 'utf8mb4_0900_ai_ci'));
    const [[constraints]] = await connection.query(`SELECT
      SUM(CONSTRAINT_TYPE = 'FOREIGN KEY') AS foreign_keys,
      SUM(CONSTRAINT_TYPE = 'CHECK' AND ENFORCED = 'YES') AS checks,
      SUM(CONSTRAINT_TYPE = 'PRIMARY KEY') AS primary_keys
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME <> '__test_harness'`);
    assert.equal(Number(constraints.foreign_keys), 101);
    assert.equal(Number(constraints.checks), 140);
    assert.equal(Number(constraints.primary_keys), 41);
    assert.equal(database.statementCount, 144);
    const [[session]] = await connection.query('SELECT @@session.time_zone AS timezone, @@session.transaction_isolation AS isolation_level');
    assert.deepEqual(session, { timezone: '+00:00', isolation_level: 'READ-COMMITTED' });
  } finally { await database.closeConnection(connection); }
});

test('test fixtures preserve Vietnamese text and the two resource allocation levels', async () => {
  await database.rollback(async (connection) => {
    const base = await seedBase(connection);
    const [[category]] = await connection.execute('SELECT name FROM service_categories WHERE id = ?', [base.category]);
    assert.equal(category.name, 'Trải nghiệm nông nghiệp');
    const [assignments] = await connection.query('SELECT allocation_mode, quantity FROM slot_resource_assignments ORDER BY quantity');
    assert.deepEqual(assignments, [{ allocation_mode: 'SESSION_SHARED', quantity: 1 }, { allocation_mode: 'PER_BOOKING_QUOTA', quantity: 10 }]);
  });
});

test('fixtures roll back even when the test callback throws', async () => {
  await assert.rejects(database.rollback(async (connection) => {
    await seedBase(connection);
    throw new Error('INTENTIONAL_TEST_FAILURE');
  }), /INTENTIONAL_TEST_FAILURE/);
  const connection = await database.connect();
  try {
    const [[row]] = await connection.query('SELECT COUNT(*) AS count FROM users');
    assert.equal(Number(row.count), 0);
  } finally { await database.closeConnection(connection); }
});

test('composite ownership FKs reject booking items from another household', async () => {
  await database.rollback(async (connection) => {
    const base = await seedBase(connection);
    const booking = await seedBooking(connection, base);
    await assert.rejects(seedServiceItem(connection, base, booking, { service_id: base.services.B }), { code: 'ER_NO_REFERENCED_ROW_2' });
  });
});

test('resource usage cannot refer to an assignment in a different slot', async () => {
  await database.rollback(async (connection) => {
    const base = await seedBase(connection);
    const booking = await seedBooking(connection, base);
    const { reservation } = await seedServiceItem(connection, base, booking);
    const otherSlot = await insert(connection, 'service_slots', {
      household_id: base.households.A, service_id: base.services.A,
      starts_at: '2030-11-21 07:00:00', ends_at: '2030-11-21 10:00:00',
      person_capacity: 10, created_by: base.users.ownerA,
    });
    const otherAssignment = await insert(connection, 'slot_resource_assignments', {
      household_id: base.households.A, slot_id: otherSlot, resource_id: base.resources.bikes,
      quantity: 5, allocation_mode: 'PER_BOOKING_QUOTA',
    });
    const usage = { household_id: base.households.A, slot_id: base.slot,
      slot_reservation_id: reservation, assignment_id: otherAssignment, quantity: 2, rule_snapshot: {} };
    await assert.rejects(insert(connection, 'slot_resource_usages', usage), { code: 'ER_NO_REFERENCED_ROW_2' });
    await insert(connection, 'slot_resource_usages', { ...usage, assignment_id: base.assignments.bikes });
  });
});

test('content CHECKs require one owner of the declared type and a matching published revision', async () => {
  await database.rollback(async (connection) => {
    const base = await seedBase(connection);
    const revision = { content_type: 'ROOM', version: 1, title: 'Phòng Sen', body: 'Giới thiệu', details: {}, schema_version: 1, submitted_by: base.users.ownerA };
    for (const owner of [{}, { room_id: base.rooms.A, service_id: base.services.A }, { service_id: base.services.A }]) {
      await assert.rejects(insert(connection, 'content_revisions', { ...revision, ...owner }), { code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    }
    const revisionId = await insert(connection, 'content_revisions', { ...revision, room_id: base.rooms.A });
    await assert.rejects(connection.execute('UPDATE rooms SET published_revision_id = ? WHERE id = ?', [revisionId, base.rooms.B]), { code: 'ER_NO_REFERENCED_ROW_2' });
  });
});

test('price CHECKs distinguish participant count and quantity and round hourly prices from exact duration', async () => {
  await database.rollback(async (connection) => {
    const base = await seedBase(connection);
    const booking = await seedBooking(connection, base);
    await assert.rejects(seedServiceItem(connection, base, booking, { quantity: '1.0000', line_total_vnd: '150000' }), { code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    const { item } = await seedServiceItem(connection, base, booking, {
      pricing_type_snapshot: 'PER_HOUR', quantity: '0.3333', duration_minutes: 20,
      ends_at: '2030-11-20 07:20:00', unit_price_vnd: '100000', line_total_vnd: '33333',
    });
    const [[saved]] = await connection.execute('SELECT quantity, line_total_vnd FROM service_items WHERE id = ?', [item]);
    assert.equal(saved.quantity, '0.3333');
    assert.equal(saved.line_total_vnd, '33333');
  });
});

test('incomplete item outcomes require an actor, reason and served/unserved details', async () => {
  await database.rollback(async (connection) => {
    const base = await seedBase(connection);
    const booking = await seedBooking(connection, base);
    const { item } = await seedServiceItem(connection, base, booking);
    await assert.rejects(connection.execute("UPDATE service_items SET outcome = 'SERVED' WHERE id = ?", [item]), { code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await assert.rejects(connection.execute(`UPDATE service_items SET outcome = 'PARTIALLY_SERVED', reason_code = 'WEATHER',
      reason_detail = 'Mưa', outcome_recorded_by = ?, outcome_recorded_at = UTC_TIMESTAMP(6) WHERE id = ?`, [base.users.ownerA, item]), { code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    await connection.execute(`UPDATE service_items SET outcome = 'PARTIALLY_SERVED', reason_code = 'WEATHER',
      reason_detail = 'Mưa lớn', served_detail = 'Đã hướng dẫn', unserved_detail = 'Chưa giăng lưới',
      outcome_recorded_by = ?, outcome_recorded_at = UTC_TIMESTAMP(6) WHERE id = ?`, [base.users.ownerA, item]);
    await assert.rejects(connection.execute("UPDATE service_items SET reason_code = 'CUSTOMER_ABSENT' WHERE id = ?", [item]), { code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  });
});

test('a request can have only one SENT proposal version', async () => {
  await database.rollback(async (connection) => {
    const base = await seedBase(connection);
    const request = await insert(connection, 'schedule_requests', {
      household_id: base.households.A, customer_user_id: base.users.customer,
      request_code: 'TEST-REQUEST', message: 'Lịch riêng', preferences: {},
    });
    const proposal = { household_id: base.households.A, request_id: request, version: 1,
      created_by: base.users.ownerA, status: 'SENT', sent_at: '2030-11-19 00:00:00',
      expires_at: '2030-11-19 12:00:00', total_vnd: '300000', terms_snapshot: {} };
    const first = await insert(connection, 'booking_proposals', proposal);
    await assert.rejects(insert(connection, 'booking_proposals', { ...proposal, version: 2 }), { code: 'ER_DUP_ENTRY' });
    await connection.execute("UPDATE booking_proposals SET status = 'SUPERSEDED' WHERE id = ?", [first]);
    await insert(connection, 'booking_proposals', { ...proposal, version: 2 });
  });
});

test('cancelling a booking does not erase a deposit or automatically create a refund', async () => {
  await database.rollback(async (connection) => {
    const base = await seedBase(connection);
    const booking = await seedBooking(connection, base);
    await insert(connection, 'financial_entries', { household_id: base.households.A, booking_id: booking.booking,
      entry_type: 'RECEIPT', receipt_purpose: 'DEPOSIT', amount_vnd: '100000', payment_method: 'CASH',
      occurred_at: '2030-11-19 00:00:00', recorded_by: base.users.ownerA, note: 'Cọc test' });
    await connection.execute("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?", [booking.booking]);
    const [[money]] = await connection.query("SELECT SUM(entry_type = 'REFUND') AS refunds, SUM(amount_vnd) AS received FROM financial_entries");
    assert.equal(Number(money.refunds), 0);
    assert.equal(money.received, '100000');
    await assert.rejects(connection.execute('DELETE FROM bookings WHERE id = ?', [booking.booking]), { code: 'ER_ROW_IS_REFERENCED_2' });
  });
});

test('catalog edits leave the accepted item snapshot intact', async () => {
  await database.rollback(async (connection) => {
    const base = await seedBase(connection);
    const booking = await seedBooking(connection, base);
    const { item } = await seedServiceItem(connection, base, booking);
    await connection.execute('UPDATE service_offers SET unit_price_vnd = 250000 WHERE id = ?', [base.offers.shared]);
    const [[snapshot]] = await connection.execute('SELECT unit_price_vnd, service_name_snapshot FROM service_items WHERE id = ?', [item]);
    assert.equal(snapshot.unit_price_vnd, '150000');
    assert.equal(snapshot.service_name_snapshot, 'Trải nghiệm bắt cá');
  });
});

test('schema cleanup removes only the schema created by that harness instance', async () => {
  const disposable = await createTestDatabase();
  const name = disposable.name;
  await disposable.dispose();
  const connection = await database.connect();
  try {
    const [rows] = await connection.execute('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [name]);
    assert.equal(rows.length, 0);
    const [[row]] = await connection.query('SELECT DATABASE() AS name');
    assert.equal(row.name, database.name);
  } finally { await database.closeConnection(connection); }
});
