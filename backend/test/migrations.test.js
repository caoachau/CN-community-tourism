import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { rootCertificates } from 'node:tls';
import { fileURLToPath } from 'node:url';
import { loadMigrations, parseMigration, quoteDatabase, migrationErrorCode } from '../src/migrations.js';

test('deployment manifest matches the complete compact ERD and canonical checksum', async () => {
  const plan = await loadMigrations();
  assert.deepEqual(plan.migrations.map((migration) => [migration.version, migration.file, migration.statements.length]), [[1, '001_initial_schema.sql', 144], [2, '002_compact_v3.sql', 108], [3, '003_survey_schema.sql', 66], [4, '004_household_operations.sql', 3]]);
  assert.equal(plan.migrations[0].checksum, '0cb750b5489af3ce52c8b8293d309cc0170184eeef6d3a6366a30f5f5b100f3f');
  assert.equal(plan.migrations[1].checksum, 'a842313d298c45115320be95b3bef873989ce4b219047c8902a82691f22ced36');
  assert.equal(plan.expected.tables.length, 34);
  assert.equal(plan.expected.foreignKeys.length, 114);
  assert.equal(plan.expected.checks.length, 175);
});

test('survey parser permits reviewed evolution without allowing destructive or unrelated writes', () => {
  const options = { evolution: true };
  assert.equal(parseMigration('ALTER TABLE x ADD COLUMN note VARCHAR(40) NULL, DROP CHECK ck_x, ADD CONSTRAINT ck_x CHECK (note IS NULL);', options).length, 1);
  for (const sql of ['ALTER TABLE users DROP COLUMN email;', 'ALTER TABLE users RENAME TO old_users;',
    'UPDATE bookings b SET b.total_vnd = 0 WHERE b.current_reservation_set_id IS NULL;',
    'UPDATE users SET role = \'ADMIN\';', 'DELETE FROM users;', 'TRUNCATE TABLE bookings;',
    'ALTER TABLE other.users ADD COLUMN x INT;', 'SET FOREIGN_KEY_CHECKS = 0;',
    'CREATE TABLE x AS SELECT * FROM users;', 'ALTER TABLE x ADD COLUMN y INT; DROP TABLE users;']) {
    assert.throws(() => parseMigration(sql, options));
  }
});

test('migration targets safely quote hyphens and reject unsafe identifiers', () => {
  assert.equal(quoteDatabase('community-tourism-db'), '`community-tourism-db`');
  for (const value of ['x`', 'x; DROP DATABASE db', '', '../db', 'x.y', 'x'.repeat(65), null, undefined]) {
    assert.throws(() => quoteDatabase(value), { code: 'INVALID_MIGRATION_DATABASE_NAME' });
  }
});

test('deployment SQL parser rejects destructive/data writes, global settings and cross-database SQL', () => {
  for (const sql of ['DROP TABLE users;', 'DELETE FROM users;', 'INSERT INTO users VALUES (1);',
    'SET FOREIGN_KEY_CHECKS=0;', 'USE defaultdb;', 'CREATE DATABASE x;',
    'CREATE TABLE other.users (id BIGINT PRIMARY KEY);', 'CREATE TABLE x LIKE users;',
    'ALTER TABLE x DROP COLUMN y;', 'CREATE TABLE x (id INT); SELECT 1;',
    'CREATE TABLE x (id INT); /* hidden SQL */']) {
    assert.throws(() => parseMigration(sql));
    assert.throws(() => parseMigration(sql, { jsonLiterals: true }));
  }
});

test('apply requires explicit host, database and plan confirmation before database I/O', () => {
  const result = spawnSync(process.execPath, ['scripts/migrate.js', '--apply'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', timeout: 10000,
    env: { ...process.env, DATABASE_URL: 'mysql://test:SECRET_PASSWORD@never-connect.invalid:26464/community-tourism-db',
      DB_EXPECTED_DATABASE: 'community-tourism-db', DB_SSL_CA: rootCertificates[0], DB_SSL_CA_PATH: '', NODE_TLS_REJECT_UNAUTHORIZED: '1' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /EXPLICIT_TARGET_AND_PLAN_CONFIRMATION_REQUIRED/);
  assert.doesNotMatch(result.stdout + result.stderr, /SECRET_PASSWORD|mysql:\/\//);
});

test('migration diagnostics expose a safe error code rather than driver SQL/message', () => {
  assert.equal(migrationErrorCode({ code: 'ER_TABLE_EXISTS_ERROR', message: 'SECRET_SQL' }), 'ER_TABLE_EXISTS_ERROR');
  assert.equal(migrationErrorCode({ code: 'SECRET password with spaces' }), 'MIGRATION_FAILED');
});
