import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomBytes, createHash } from 'node:crypto';
import mysql from 'mysql2/promise';
import { testDatabaseOptions, quoteTestSchema } from '../support/config.js';
import { loadMigrations, migrationStatus, applyMigrations, verifyStructure, expectedStructure } from '../../src/migrations.js';

let control;
let worker;
let plan;
let database;
const ownedSchemas = new Set();

before(async () => {
  const options = testDatabaseOptions();
  // Runner tests intentionally create/alter schemas; this suite is local only.
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(options.host), 'LOCAL_MYSQL_REQUIRED_FOR_RUNNER_TESTS');
  control = await mysql.createConnection(options);
  worker = await mysql.createConnection(options);
  // Match the read-only Aiven audit's ANSI + strict behavior for deployment DDL.
  await worker.query("SET SESSION sql_mode = 'ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
  plan = await loadMigrations();
  // Preserve the v1 runner regression suite; schema-replacement.test.js tests upgrade.
  plan.migrations = plan.migrations.slice(0, 1);
  plan.expected = expectedStructure(plan.migrations);
  database = `ctp_test_migration_${process.pid}_${randomBytes(6).toString('hex')}`;
  quoteTestSchema(database);
});

after(async () => {
  try {
    for (const name of ownedSchemas) {
      // Only names generated here, marked after a successful CREATE, are dropped.
      await control.query(`DROP DATABASE ${quoteTestSchema(name)}`);
    }
  } finally {
    await worker?.end();
    await control?.end();
  }
});

test('read-only plan sees a missing target without creating database or history', async () => {
  const status = await migrationStatus(control, database, plan);
  assert.equal(status.exists, false);
  assert.equal(status.tableCount, 0);
  assert.deepEqual(status.pending, ['001_initial_schema.sql']);
  assert.equal(status.expected.totalTables, 42);
});

test('applying to a missing database requires the separate creation flag', async () => {
  await assert.rejects(applyMigrations(worker, database, plan), { code: 'DATABASE_CREATION_REQUIRES_EXPLICIT_FLAG' });
  assert.equal((await migrationStatus(control, database, plan)).exists, false);
});

test('real deployment runner creates 41 business tables plus history with all keys and no seed', async () => {
  const result = await applyMigrations(worker, database, plan, { createDatabase: true,
    onProgress: ({ event, database: created }) => { if (event === 'database_created') ownedSchemas.add(created); } });
  assert.deepEqual(result.verification, { tableCount: 42, primaryKeys: 42, foreignKeys: 101, enforcedChecks: 141 });
  assert.equal(result.pending.length, 0);
  assert.equal(result.history.length, 1);
  assert.equal(result.history[0].status, 'APPLIED');
  assert.equal(result.history[0].completed_statements, 144);
  assert.ok(result.history[0].finished_at);
  for (const table of plan.expected.tables) {
    const [[row]] = await worker.query(`SELECT COUNT(*) AS count FROM ${table.name}`);
    assert.equal(Number(row.count), 0, `${table.name} must not be seeded`);
  }
});

test('replaying an applied migration is a no-op and preserves existing business data', async () => {
  await worker.execute('INSERT INTO users (email, password_hash, display_name, updated_at) VALUES (?, ?, ?, UTC_TIMESTAMP(6))',
    ['migration-sentinel@fixture.invalid', '!TEST_ONLY_NO_LOGIN!', 'Migration sentinel']);
  const before = (await migrationStatus(control, database, plan)).history;
  const result = await applyMigrations(worker, database, plan);
  assert.deepEqual(result.history, before);
  const [[row]] = await worker.query('SELECT COUNT(*) AS count FROM users');
  assert.equal(Number(row.count), 1);
});

test('migration advisory lock rejects a second writer', async () => {
  const lock = `ctp:migrations:${createHash('sha256').update(database).digest('hex').slice(0, 40)}`;
  const [[held]] = await control.execute('SELECT GET_LOCK(?, 0) AS acquired', [lock]);
  assert.equal(Number(held.acquired), 1);
  try { await assert.rejects(applyMigrations(worker, database, plan), { code: 'MIGRATION_LOCK_UNAVAILABLE' }); }
  finally { await control.execute('SELECT RELEASE_LOCK(?)', [lock]); }
});

test('history checksum mismatches stop deployment before writes', async () => {
  const changed = structuredClone(plan);
  changed.migrations[0].checksum = 'a'.repeat(64);
  await assert.rejects(applyMigrations(worker, database, changed), { code: 'MIGRATION_HISTORY_CHECKSUM_MISMATCH' });
  assert.equal((await migrationStatus(control, database, plan)).history[0].status, 'APPLIED');
});

test('an unmanaged nonempty schema is refused without modifying its table or data', async () => {
  const name = `${database}_legacy`;
  const quoted = quoteTestSchema(name);
  await control.query(`CREATE DATABASE ${quoted} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  ownedSchemas.add(name);
  await control.query(`CREATE TABLE ${quoted}.legacy (id INT PRIMARY KEY, note VARCHAR(30))`);
  await control.execute(`INSERT INTO ${quoted}.legacy VALUES (1, ?)`, ['preserve me']);
  await assert.rejects(applyMigrations(worker, name, plan), { code: 'NONEMPTY_DATABASE_WITHOUT_MIGRATION_HISTORY' });
  const [[row]] = await control.query(`SELECT note FROM ${quoted}.legacy WHERE id = 1`);
  assert.equal(row.note, 'preserve me');
});

test('partial DDL failure records progress and the next run refuses automatic replay', async () => {
  const name = `${database}_failed`;
  const quoted = quoteTestSchema(name);
  await control.query(`CREATE DATABASE ${quoted} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  ownedSchemas.add(name);
  const fault = {
    query(options, values) {
      if (/^CREATE TABLE auth_sessions/.test(options.sql)) return Promise.reject(Object.assign(new Error('SECRET_DRIVER_SQL'), { code: 'ER_TEST_DDL_FAILURE' }));
      return worker.query(options, values);
    },
    destroy: () => worker.destroy(),
  };
  await assert.rejects(applyMigrations(fault, name, plan), { code: 'ER_TEST_DDL_FAILURE' });
  const [[history]] = await control.query(`SELECT status, completed_statements, last_error_code FROM ${quoted}.schema_migrations`);
  assert.deepEqual(history, { status: 'FAILED', completed_statements: 3, last_error_code: 'ER_TEST_DDL_FAILURE' });
  await assert.rejects(applyMigrations(worker, name, plan), { code: 'INCOMPLETE_MIGRATION_REQUIRES_INSPECTION' });
  const [[row]] = await control.query('SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [name]);
  assert.equal(Number(row.count), 2); // history and users remain; no cleanup/replay in the runner.
});

test('verification detects a missing foreign key even when all tables still exist', async () => {
  await worker.query(`USE ${quoteTestSchema(database)}`);
  const fk = plan.expected.foreignKeys[0];
  await worker.query(`ALTER TABLE ${fk.table} DROP FOREIGN KEY ${fk.name}`);
  try {
    await assert.rejects(verifyStructure(worker, database, plan.expected), { code: 'MIGRATION_FOREIGN_KEY_VERIFICATION_FAILED' });
  } finally {
    const original = plan.migrations.flatMap((entry) => entry.statements).find((sql) => sql.startsWith(`ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.name} `));
    await worker.query(original);
  }
  assert.equal((await verifyStructure(worker, database, plan.expected)).foreignKeys, 101);
});
