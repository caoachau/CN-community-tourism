import { readFileSync } from 'node:fs';
import { X509Certificate } from 'node:crypto';
import { isIP } from 'node:net';

export class DatabaseConfigError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export function databaseOptions(env = process.env, readCertificate = readFileSync) {
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new DatabaseConfigError('TLS_VERIFICATION_DISABLED');
  if (!env.DATABASE_URL || !env.DB_EXPECTED_DATABASE) throw new DatabaseConfigError('MISSING_DATABASE_CONFIGURATION');

  let url;
  let database;
  let user;
  let password;
  try {
    url = new URL(env.DATABASE_URL);
    database = decodeURIComponent(url.pathname.slice(1));
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch {
    throw new DatabaseConfigError('INVALID_DATABASE_URL');
  }
  // A DNS hostname is required so mysql2 verifies the certificate identity.
  if (url.protocol !== 'mysql:' || !url.hostname || isIP(url.hostname.replace(/^\[|\]$/g, '')) ||
      !user || !password || !database || database.includes('/') || url.hash) {
    throw new DatabaseConfigError('INVALID_DATABASE_URL');
  }
  if (database !== env.DB_EXPECTED_DATABASE) throw new DatabaseConfigError('UNEXPECTED_DATABASE');
  const port = Number(url.port || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new DatabaseConfigError('INVALID_DATABASE_URL');
  // Accept the copied Aiven CLI parameter, but enforce stronger TLS explicitly.
  // Never forward arbitrary URL options (debug, multipleStatements, ssl=false).
  for (const [key, value] of url.searchParams) {
    if (key !== 'ssl-mode' || !['REQUIRED', 'VERIFY_CA', 'VERIFY_IDENTITY'].includes(value)) {
      throw new DatabaseConfigError('UNSUPPORTED_DATABASE_URL_OPTIONS');
    }
  }
  if (Boolean(env.DB_SSL_CA) === Boolean(env.DB_SSL_CA_PATH)) {
    throw new DatabaseConfigError('SET_EXACTLY_ONE_CA_SOURCE');
  }
  let ca;
  try {
    ca = env.DB_SSL_CA || readCertificate(env.DB_SSL_CA_PATH, 'utf8');
    if (!new X509Certificate(ca).ca) throw new Error();
  } catch {
    throw new DatabaseConfigError('INVALID_OR_UNREADABLE_CA_FILE');
  }
  const connectionLimit = Number(env.DB_POOL_SIZE || 5);
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 10) {
    throw new DatabaseConfigError('INVALID_DB_POOL_SIZE');
  }
  return {
    host: url.hostname,
    port,
    user,
    password,
    database,
    ssl: { ca, rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2' },
    connectTimeout: 10_000,
    connectionLimit,
    maxIdle: connectionLimit,
    idleTimeout: 60_000,
    waitForConnections: true,
    queueLimit: 20,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
    timezone: 'Z',
    supportBigNumbers: true,
    bigNumberStrings: true,
    decimalNumbers: false,
    multipleStatements: false,
    debug: false,
  };
}

const DRIVER_ERROR_CODES = new Set([
  'SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'ERR_TLS_CERT_ALTNAME_INVALID',
  'HANDSHAKE_SSL_ERROR', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNREFUSED',
  'ECONNRESET', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR',
  'PROTOCOL_CONNECTION_LOST', 'PROTOCOL_SEQUENCE_TIMEOUT',
]);

// Do not log error.message: database drivers can embed usernames and hostnames.
export function databaseErrorCode(error) {
  if (error instanceof DatabaseConfigError) return error.code;
  return DRIVER_ERROR_CODES.has(error?.code) ? error.code : 'DATABASE_UNAVAILABLE';
}
