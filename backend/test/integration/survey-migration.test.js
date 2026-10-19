import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { testDatabaseOptions, quoteTestSchema } from '../support/config.js';
import { insert } from '../support/fixtures.js';
import { applyMigrations, loadMigrations, expectedStructure, migrationStatus, verifyStructure } from '../../src/migrations.js';

let control, worker, plan, baselinePlan;
const owned = new Set();
const q = quoteTestSchema;
const options = { maintenanceConfirmed: true, onProgress(event) {
  if (event.event === 'database_created') owned.add(event.database);
  if (event.event === 'v3_preflight') { owned.add(event.stage); owned.add(event.backup); }
} };
before(async () => {
  const config = testDatabaseOptions();
  assert.ok(['127.0.0.1','localhost','::1'].includes(config.host), 'LOCAL_MYSQL_REQUIRED');
  control = await mysql.createConnection(config); worker = await mysql.createConnection(config);
  await worker.query("SET SESSION sql_mode = 'ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
  plan = await loadMigrations();
  baselinePlan = { ...plan, migrations: plan.migrations.slice(0, 2) };
  baselinePlan.expected = expectedStructure(baselinePlan.migrations);
});
after(async () => {
  try { for (const name of owned) await control.query(`DROP DATABASE ${q(name)}`); }
  finally { await worker?.end(); await control?.end(); }
});
async function baseline() {
  // mysql2 caches prepared statements against the schema selected at prepare
  // time. Use a fresh connection per schema so fixtures cannot hit an earlier
  // test's tables after USE switches databases.
  await worker.end();
  worker = await mysql.createConnection(testDatabaseOptions());
  await worker.query("SET SESSION sql_mode = 'ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
  const name = `ctp_test_survey_${randomBytes(6).toString('hex')}`;
  await applyMigrations(worker, name, baselinePlan, { ...options, createDatabase: true });
  return name;
}
async function seed() {
  const user = await insert(worker, 'users', { email:'survey@fixture.invalid', display_name:'Survey sentinel', password_hash:'!TEST_ONLY_NO_LOGIN!', updated_at:'2030-01-01 00:00:00' });
  const owner = await insert(worker, 'users', { email:'owner@fixture.invalid', display_name:'Household sentinel', role:'HOUSEHOLD', password_hash:'!TEST_ONLY_NO_LOGIN!', updated_at:'2030-01-01 00:00:00' });
  const hh = await insert(worker, 'households', { owner_user_id:owner, code:'SURVEY', approval_status:'APPROVED', updated_at:'2030-01-01 00:00:00' });
  const room = await insert(worker, 'rooms', { household_id:hh, code:'SEN', max_guests:4, nightly_price_vnd:'400000' });
  const booking = await insert(worker, 'bookings', { household_id:hh, booking_code:'KEEP-ME', customer_user_id:user, created_by:user, source:'ONLINE', status:'CONFIRMED', contact_name:'Existing customer', contact_phone:'0000000000', first_starts_at:'2030-11-20 07:00:00', last_ends_at:'2030-11-21 05:00:00', total_vnd:'400000', terms_snapshot:{ legacyPolicy:'KEEP ORIGINAL' }, confirmed_at:'2030-10-01 00:00:00' });
  const set = await insert(worker, 'reservation_sets', { household_id:hh, booking_id:booking, status:'COMMITTED' });
  const item = await insert(worker, 'booking_items', { household_id:hh, reservation_set_id:set, kind:'ROOM', room_id:room, participant_count:2, quantity:'1', pricing_type:'PER_NIGHT', is_exclusive:1, check_in_date:'2030-11-20', check_out_date:'2030-11-21', starts_at:'2030-11-20 07:00:00', ends_at:'2030-11-21 05:00:00', unit_price_vnd:'400000', base_amount_vnd:'400000', snapshot:{ name:'Original room', revision:17 } });
  const receipt = await insert(worker, 'financial_entries', { household_id:hh, booking_id:booking, entry_type:'RECEIPT', receipt_purpose:'DEPOSIT', amount_vnd:'300000', payment_method:'CASH', occurred_at:'2030-10-01 00:00:00', recorded_by:owner, note:'Original receipt' });
  const obligation = await insert(worker, 'financial_entries', { household_id:hh, booking_id:booking, entry_type:'REFUND_AGREEMENT', amount_vnd:'100000', occurred_at:'2030-10-02 00:00:00', recorded_by:owner, note:'Original refund obligation' });
  const refund = await insert(worker, 'financial_entries', { household_id:hh, booking_id:booking, entry_type:'REFUND', amount_vnd:'40000', agreement_id:obligation, payment_method:'BANK_TRANSFER', occurred_at:'2030-10-03 00:00:00', recorded_by:owner, note:'Partial refund' });
  const request = await insert(worker, 'schedule_requests', { household_id:hh, customer_user_id:user, request_code:'PRIVATE-OLD', message:'Old custom request', preferences:{ participants:2 }, status:'PROPOSED', first_hold_started_at:'2030-10-01 00:00:00', initial_hold_deadline:'2030-10-02 00:00:00' });
  const proposal = await insert(worker, 'booking_proposals', { household_id:hh, request_id:request, version:2, created_by:owner, status:'SENT', sent_at:'2030-10-01 00:00:00', expires_at:'2030-10-02 00:00:00', total_vnd:'400000', terms_snapshot:{ quote:'old version two' } });
  const customSet = await insert(worker, 'reservation_sets', { household_id:hh, proposal_id:proposal, status:'HELD', hold_started_at:'2030-10-01 00:00:00', expires_at:'2030-10-02 00:00:00' });
  await insert(worker, 'booking_items', { household_id:hh, reservation_set_id:customSet, kind:'ROOM', room_id:room, participant_count:2, quantity:'1', pricing_type:'PER_NIGHT', is_exclusive:1, check_in_date:'2030-11-22', check_out_date:'2030-11-23', starts_at:'2030-11-22 07:00:00', ends_at:'2030-11-23 05:00:00', unit_price_vnd:'400000', base_amount_vnd:'400000', snapshot:{ name:'Old pending quote' } });
  await insert(worker, 'auth_sessions', { user_id:user, token_hash:Buffer.alloc(32, 7), expires_at:'2031-01-01 00:00:00' });
  return { user, owner, hh, room, booking, set, item, receipt, obligation, refund, request, proposal, customSet };
}
async function oldFacts() {
  const result = {};
  for (const table of baselinePlan.expected.tables) {
    const [rows] = await worker.query(`SELECT ${table.columns.map((c) => c.name).join(',')} FROM ${table.name} ORDER BY id`);
    result[table.name] = JSON.stringify(rows);
  }
  return result;
}

test('survey upgrade requires maintenance acknowledgement before any schema change', async () => {
  const name = await baseline();
  await assert.rejects(applyMigrations(worker, name, plan), { code:'SURVEY_UPGRADE_REQUIRES_MAINTENANCE_WINDOW' });
  await verifyStructure(worker, name, baselinePlan.expected);
});

test('empty installation upgrades to 34 application tables plus history without seed; replay is a no-op', async () => {
  const name = await baseline();
  const result = await applyMigrations(worker, name, plan, options);
  assert.equal(result.verification.tableCount, 35);
  assert.equal(result.verification.foreignKeys, 112);
  assert.equal(result.verification.enforcedChecks, 175);
  assert.deepEqual(result.history.map((r) => r.status), ['APPLIED','APPLIED','APPLIED']);
  for (const t of plan.expected.tables) {
    const [[r]] = await worker.query(`SELECT COUNT(*) n FROM ${t.name}`); assert.equal(Number(r.n), 0);
  }
  const replay = await applyMigrations(worker, name, plan);
  assert.deepEqual(replay.history, result.history);
});

test('populated upgrade preserves all old columns, IDs, sessions, quoted prices, holds and refund history', async () => {
  const name = await baseline(); const rows = await seed();
  const facts = await oldFacts();
  const oldHistory = (await migrationStatus(worker, name, baselinePlan)).history;
  await applyMigrations(worker, name, plan, options);
  assert.deepEqual(await oldFacts(), facts);
  const result = await migrationStatus(worker, name, plan);
  assert.deepEqual(result.history.slice(0, 2), oldHistory);
  const [[current]] = await worker.execute('SELECT current_reservation_set_id FROM bookings WHERE id=?', [rows.booking]);
  assert.equal(String(current.current_reservation_set_id), rows.set);
  const [[version]] = await worker.execute('SELECT version,total_vnd,terms_snapshot,first_starts_at,last_ends_at FROM reservation_sets WHERE id=?', [rows.customSet]);
  assert.equal(version.version, 1); // first commitment version, independently of proposal version 2
  assert.equal(version.total_vnd, '400000');
  assert.deepEqual(version.terms_snapshot, { quote:'old version two' });
  assert.ok(version.first_starts_at && version.last_ends_at);
  const [[money]] = await worker.execute("SELECT SUM(CASE WHEN entry_type='RECEIPT' THEN amount_vnd ELSE 0 END) received, SUM(CASE WHEN entry_type='REFUND' THEN amount_vnd ELSE 0 END) refunded FROM financial_entries WHERE booking_id=?", [rows.booking]);
  assert.equal(money.received, '300000'); assert.equal(money.refunded, '40000');
  assert.deepEqual(await oldFacts(), facts);
  const replay = await applyMigrations(worker, name, plan);
  assert.equal(replay.pending.length, 0);
  assert.deepEqual(await oldFacts(), facts);
});

test('inconsistent legacy booking is reported before migration 003 writes; no invented commitments', async () => {
  const name = await baseline(); const rows = await seed();
  await worker.execute("UPDATE reservation_sets SET status='RELEASED',released_at='2030-10-01 01:00:00' WHERE id=?", [rows.set]);
  const before = await oldFacts();
  await assert.rejects(applyMigrations(worker, name, plan, options), { code:'SURVEY_INCONSISTENT_ACTIVE_BOOKING' });
  await verifyStructure(worker, name, baselinePlan.expected);
  assert.deepEqual(await oldFacts(), before);
  assert.equal((await migrationStatus(worker, name, baselinePlan)).history.length, 2);
});

test('partial survey DDL failure preserves business facts and blocks automatic replay', async () => {
  const name = await baseline(); await seed(); const before = await oldFacts();
  const fault = { query(query, values) {
    const sql = typeof query === 'string' ? query : query.sql;
    if (sql.startsWith('CREATE TABLE deposit_credits')) return Promise.reject(Object.assign(new Error('fixture failure'), { code:'ER_TEST_SURVEY_FAILURE' }));
    return worker.query(query, values);
  }, destroy: () => worker.destroy() };
  await assert.rejects(applyMigrations(fault, name, plan, options), { code:'ER_TEST_SURVEY_FAILURE' });
  assert.deepEqual(await oldFacts(), before);
  const [[row]] = await worker.query('SELECT status,completed_statements,total_statements FROM schema_migrations WHERE version=3');
  assert.equal(row.status, 'FAILED'); assert.ok(row.completed_statements > 0 && row.completed_statements < row.total_statements);
  await assert.rejects(applyMigrations(worker, name, plan, options), { code:'INCOMPLETE_MIGRATION_REQUIRES_INSPECTION' });
});
