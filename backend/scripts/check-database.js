import mysql from 'mysql2/promise';
import { connect } from 'node:net';
import { rootCertificates } from 'node:tls';
import { X509Certificate } from 'node:crypto';
import { createDatabase, inspectConnection } from '../src/database.js';
import { databaseOptions, DatabaseConfigError, databaseErrorCode } from '../src/config/database.js';

const report = (entry) => console.log(JSON.stringify({
  executionEnvironment: process.env.RENDER === 'true' ? 'render' : 'local',
  driver: 'mysql2/promise',
  ...entry,
}));
const deadline = setTimeout(() => {
  report({ status: 'FAIL', code: 'CHECK_TIMEOUT' });
  process.exit(1);
}, 60_000);

async function expectTlsRejection(name, options) {
  const { connectionLimit, maxIdle, idleTimeout, waitForConnections, queueLimit, ...connectionOptions } = options;
  let connection;
  let rejected = false;
  try {
    connection = await mysql.createConnection(connectionOptions);
    await inspectConnection(connection, options.database);
  } catch (error) {
    const code = databaseErrorCode(error);
    // mysql2 can wrap OpenSSL verification errors as HANDSHAKE_SSL_ERROR.
    const certificateFailure = code === 'ERR_TLS_CERT_ALTNAME_INVALID' ||
      ['SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT',
        'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'].includes(code) ||
      (code === 'HANDSHAKE_SSL_ERROR' && /certificate|self[- ]signed|altnames/i.test(error.message));
    if (!certificateFailure) throw new DatabaseConfigError(`${name}_INCONCLUSIVE`);
    rejected = true;
    report({ check: name, status: 'PASS', rejectedWith: code });
  } finally {
    await connection?.end();
  }
  if (!rejected) throw new DatabaseConfigError(`${name}_UNEXPECTEDLY_CONNECTED`);
}

let database;
try {
  const options = databaseOptions();
  database = createDatabase();
  const result = await database.check();
  report({ check: 'VALID_CA_AND_HOSTNAME', status: 'PASS', ...result });
  await database.close();
  database = undefined;

  if (process.argv.includes('--negative-tests')) {
    const fingerprint = new X509Certificate(options.ssl.ca).fingerprint256;
    const unrelatedCA = rootCertificates.find((pem) => new X509Certificate(pem).fingerprint256 !== fingerprint);
    if (!unrelatedCA) throw new DatabaseConfigError('NEGATIVE_TEST_CA_UNAVAILABLE');
    await expectTlsRejection('UNTRUSTED_CA', { ...options, ssl: { ...options.ssl, ca: unrelatedCA } });
    // Dial the authorised Aiven host while deliberately checking a wrong TLS name.
    // This changes no DNS records and never sends traffic to tls-check.invalid.
    await expectTlsRejection('WRONG_HOSTNAME', {
      ...options,
      host: 'tls-check.invalid',
      stream: () => connect({ host: options.host, port: options.port }),
    });
  }
  report({ check: 'MYSQL_AIVEN_TLS', status: 'PASS', writesPerformed: false });
} catch (error) {
  report({ check: 'MYSQL_AIVEN_TLS', status: 'FAIL', code: databaseErrorCode(error) });
  process.exitCode = 1;
} finally {
  await database?.close();
  clearTimeout(deadline);
}
