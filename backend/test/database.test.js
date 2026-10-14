import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rootCertificates } from 'node:tls';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { databaseOptions, databaseErrorCode } from '../src/config/database.js';
import { acquireConnection, inspectConnection } from '../src/database.js';

const config = (overrides = {}) => ({
  DATABASE_URL: 'mysql://test:encoded%40password@example.invalid:26464/defaultdb?ssl-mode=REQUIRED',
  DB_EXPECTED_DATABASE: 'defaultdb',
  DB_SSL_CA: rootCertificates[0],
  ...overrides,
});

test('Aiven URI produces strict CA and hostname verification with decoded credentials', () => {
  const options = databaseOptions(config());
  assert.equal(options.password, 'encoded@password');
  assert.equal(options.ssl.rejectUnauthorized, true);
  assert.equal(options.ssl.verifyIdentity, true);
  assert.equal(options.ssl.minVersion, 'TLSv1.2');
  assert.equal(options.port, 26464);
  assert.equal(options.connectionLimit, 5);
  assert.equal(options.multipleStatements, false);
  assert.equal(options.bigNumberStrings, true);
  assert.equal(options.decimalNumbers, false);
});

test('CA can be provided by a file without embedding it into configuration files', () => {
  const options = databaseOptions(config({ DB_SSL_CA: '', DB_SSL_CA_PATH: '/etc/secrets/ca.pem' }), (path, encoding) => {
    assert.equal(path, '/etc/secrets/ca.pem');
    assert.equal(encoding, 'utf8');
    return rootCertificates[0];
  });
  assert.equal(options.ssl.ca, rootCertificates[0]);
});

for (const [name, overrides, code] of [
  ['missing credentials', { DATABASE_URL: '' }, 'MISSING_DATABASE_CONFIGURATION'],
  ['wrong database', { DB_EXPECTED_DATABASE: 'other' }, 'UNEXPECTED_DATABASE'],
  ['missing CA', { DB_SSL_CA: '' }, 'SET_EXACTLY_ONE_CA_SOURCE'],
  ['ambiguous CA', { DB_SSL_CA_PATH: 'ca.pem' }, 'SET_EXACTLY_ONE_CA_SOURCE'],
  ['invalid PEM', { DB_SSL_CA: 'not a certificate' }, 'INVALID_OR_UNREADABLE_CA_FILE'],
  ['disabled TLS', { NODE_TLS_REJECT_UNAUTHORIZED: '0' }, 'TLS_VERIFICATION_DISABLED'],
  ['invalid port', { DATABASE_URL: 'mysql://u:p@host:99999/defaultdb' }, 'INVALID_DATABASE_URL'],
  ['zero port', { DATABASE_URL: 'mysql://u:p@host:0/defaultdb' }, 'INVALID_DATABASE_URL'],
  ['wrong scheme', { DATABASE_URL: 'postgres://u:p@host/defaultdb' }, 'INVALID_DATABASE_URL'],
  ['IP host bypass', { DATABASE_URL: 'mysql://u:p@127.0.0.1/defaultdb' }, 'INVALID_DATABASE_URL'],
  ['IPv6 host bypass', { DATABASE_URL: 'mysql://u:p@[::1]/defaultdb' }, 'INVALID_DATABASE_URL'],
  ['URL options injection', { DATABASE_URL: 'mysql://u:p@host/defaultdb?multipleStatements=true' }, 'UNSUPPORTED_DATABASE_URL_OPTIONS'],
  ['URL TLS bypass', { DATABASE_URL: 'mysql://u:p@host/defaultdb?ssl-mode=DISABLED' }, 'UNSUPPORTED_DATABASE_URL_OPTIONS'],
  ['oversized pool', { DB_POOL_SIZE: '1000' }, 'INVALID_DB_POOL_SIZE'],
]) {
  test(`reject ${name} before connecting`, () => {
    assert.throws(() => databaseOptions(config(overrides)), { code });
  });
}

test('error reporting does not expose raw driver messages', () => {
  const error = { code: 'ER_ACCESS_DENIED_ERROR', message: 'sensitive user/password/host' };
  assert.equal(databaseErrorCode(error), 'ER_ACCESS_DENIED_ERROR');
  assert.equal(databaseErrorCode({ code: 'secret', message: 'secret' }), 'DATABASE_UNAVAILABLE');
});

function fakeConnection({ database = 'defaultdb', cipher = 'TLS_AES_256_GCM_SHA384', protocol = 'TLSv1.3' } = {}) {
  const calls = [];
  return {
    calls,
    async query({ sql, timeout }) {
      calls.push(sql);
      assert.equal(timeout, 5_000);
      if (sql.startsWith('SET SESSION')) return [[], []];
      if (sql.startsWith('SELECT')) return [[{ ok: 1, database_name: database, mysql_version: '8.4.11' }], []];
      return [[{ Value: sql.includes('Ssl_cipher') ? cipher : protocol }], []];
    },
  };
}

test('probe checks session TLS and database identity on one connection', async () => {
  const connection = fakeConnection();
  const result = await inspectConnection(connection, 'defaultdb');
  assert.equal(result.tlsProtocol, 'TLSv1.3');
  assert.equal(result.databaseMatchesExpected, true);
  assert.equal(connection.calls.length, 4);
  assert.equal(connection.calls.some((sql) => /INSERT|UPDATE|DELETE|CREATE|ALTER|DROP/.test(sql)), false);
});

for (const [name, options, code] of [
  ['unencrypted session', { cipher: '' }, 'TLS_SESSION_NOT_VERIFIED'],
  ['old TLS', { protocol: 'TLSv1' }, 'TLS_SESSION_NOT_VERIFIED'],
  ['unexpected database', { database: 'other' }, 'DATABASE_IDENTITY_CHECK_FAILED'],
]) {
  test(`probe rejects ${name}`, async () => {
    await assert.rejects(inspectConnection(fakeConnection(options), 'defaultdb'), { code });
  });
}

test('pool timeout releases a connection that arrives after its caller timed out', async () => {
  let deliver;
  let released = false;
  const pending = new Promise((resolve) => { deliver = resolve; });
  await assert.rejects(acquireConnection({ getConnection: () => pending }, 5), { code: 'DATABASE_ACQUIRE_TIMEOUT' });
  deliver({ release() { released = true; } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(released, true);
});

test('server fails closed before listening when DB configuration is missing', () => {
  const result = spawnSync(process.execPath, ['src/server.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, DATABASE_URL: '', NODE_TLS_REJECT_UNAUTHORIZED: '1', PORT: '5000', JWT_SECRET: 'test-only-jwt-signing-key-at-least-32-bytes' },
    encoding: 'utf8', timeout: 10_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /MISSING_DATABASE_CONFIGURATION/);
  assert.doesNotMatch(result.stdout, /API listening/);
});
