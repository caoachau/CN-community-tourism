import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { rootCertificates } from 'node:tls';
import { testDatabaseOptions, quoteTestSchema, LOCAL_TEST_URL } from './support/config.js';
import { migrationStatements } from './support/mysql.js';

test('test config uses a dedicated local server even if application credentials exist', () => {
  const options = testDatabaseOptions({ NODE_ENV: 'test', DATABASE_URL: 'mysql://prod:secret@prod.invalid/defaultdb' });
  assert.equal(options.host, '127.0.0.1');
  assert.equal(options.port, 3307);
  assert.equal(options.database, 'ctp_test_control');
  assert.equal(options.user, 'ctp_test');
  assert.equal(options.multipleStatements, false);
});

for (const [name, env, code] of [
  ['non-test environment', {}, 'TEST_ENVIRONMENT_REQUIRED'],
  ['defaultdb', { TEST_DATABASE_URL: 'mysql://user:pass@localhost/defaultdb' }, 'UNSAFE_TEST_DATABASE_TARGET'],
  ['production name', { TEST_DATABASE_URL: 'mysql://user:pass@localhost/community_tourism' }, 'UNSAFE_TEST_DATABASE_TARGET'],
  ['identifier injection', { TEST_DATABASE_URL: 'mysql://user:pass@localhost/ctp_test_x%60%3B' }, 'UNSAFE_TEST_DATABASE_TARGET'],
  ['URL options', { TEST_DATABASE_URL: `${LOCAL_TEST_URL}?multipleStatements=true` }, 'UNSAFE_TEST_DATABASE_TARGET'],
  ['remote server', { TEST_DATABASE_URL: 'mysql://user:pass@aiven.invalid/ctp_test_control' }, 'REMOTE_TEST_DATABASE_REQUIRES_OPT_IN'],
  ['same application server', { TEST_DATABASE_URL: LOCAL_TEST_URL, DATABASE_URL: 'mysql://prod:pass@127.0.0.1:3307/defaultdb' }, 'APPLICATION_DATABASE_SERVER_FORBIDDEN'],
]) {
  test(`harness blocks ${name} before any database I/O`, () => {
    assert.throws(() => testDatabaseOptions(name === 'non-test environment' ? env : { NODE_ENV: 'test', ...env }), { code });
  });
}

test('remote test opt-in still requires a CA and strict hostname verification', () => {
  const remote = { NODE_ENV: 'test', TEST_DATABASE_URL: 'mysql://user:pass@tests.invalid/ctp_test_control', TEST_ALLOW_REMOTE_DATABASE: '1' };
  assert.throws(() => testDatabaseOptions(remote), { code: 'SET_EXACTLY_ONE_CA_SOURCE' });
  const options = testDatabaseOptions({ ...remote, TEST_DB_SSL_CA: rootCertificates[0] });
  assert.equal(options.ssl.verifyIdentity, true);
  assert.equal(options.ssl.rejectUnauthorized, true);
});

test('cleanup accepts only a bounded literal test schema identifier', () => {
  assert.equal(quoteTestSchema('ctp_test_123_abcdef'), '`ctp_test_123_abcdef`');
  for (const name of ['defaultdb', 'ctp_test_', 'ctp_test_x`', 'ctp_test_x; DROP DATABASE other', 'ctp_test_' + 'x'.repeat(41)]) {
    assert.throws(() => quoteTestSchema(name), { code: 'UNSAFE_TEST_SCHEMA_NAME' });
  }
});

test('migration preflight accepts the actual 144 scoped DDL statements', () => {
  const statements = migrationStatements(readFileSync(new URL('../migrations/001_initial_schema.sql', import.meta.url), 'utf8'));
  assert.equal(statements.length, 144);
});

for (const source of ['USE defaultdb;', 'DROP DATABASE defaultdb;', 'CREATE TABLE other.users (id INT);',
  'ALTER TABLE users RENAME TO defaultdb.users;', 'CREATE TABLE users LIKE defaultdb.users;',
  'ALTER TABLE users ADD FOREIGN KEY (id) REFERENCES other.users (id);', 'SET FOREIGN_KEY_CHECKS=0;',
  'CREATE TABLE x (note VARCHAR(20) DEFAULT "unsupported");']) {
  test(`migration preflight refuses ${source.split(' ').slice(0, 3).join(' ')}`, () => {
    assert.throws(() => migrationStatements(source));
  });
}
