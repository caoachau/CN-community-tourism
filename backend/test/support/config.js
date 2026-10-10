import { databaseOptions } from '../../src/config/database.js';

export const LOCAL_TEST_URL = 'mysql://ctp_test:ctp_local_test_only@127.0.0.1:3307/ctp_test_control';
export const isTestSchema = (name) => /^ctp_test_[a-z0-9_]{1,40}$/.test(name);

export class HarnessError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export function testDatabaseOptions(env = process.env) {
  if (env.NODE_ENV !== 'test') throw new HarnessError('TEST_ENVIRONMENT_REQUIRED');
  const rawUrl = env.TEST_DATABASE_URL || LOCAL_TEST_URL;
  let url;
  let schema;
  let user;
  let password;
  try {
    url = new URL(rawUrl);
    schema = decodeURIComponent(url.pathname.slice(1));
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch {
    throw new HarnessError('INVALID_TEST_DATABASE_URL');
  }
  if (url.protocol !== 'mysql:' || !isTestSchema(schema) || !user || !password || url.hash) {
    throw new HarnessError('UNSAFE_TEST_DATABASE_TARGET');
  }
  // A test variable may never point at the application's normal target.
  if (env.DATABASE_URL) {
    try {
      const application = new URL(env.DATABASE_URL);
      if (url.hostname === application.hostname && (url.port || '3306') === (application.port || '3306')) {
        throw new HarnessError('APPLICATION_DATABASE_SERVER_FORBIDDEN');
      }
    } catch (error) {
      if (error instanceof HarnessError) throw error;
    }
  }
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (!local) {
    if (env.TEST_ALLOW_REMOTE_DATABASE !== '1') throw new HarnessError('REMOTE_TEST_DATABASE_REQUIRES_OPT_IN');
    return databaseOptions({
      DATABASE_URL: rawUrl,
      DB_EXPECTED_DATABASE: schema,
      DB_SSL_CA: env.TEST_DB_SSL_CA,
      DB_SSL_CA_PATH: env.TEST_DB_SSL_CA_PATH,
      NODE_TLS_REJECT_UNAUTHORIZED: env.NODE_TLS_REJECT_UNAUTHORIZED,
      DB_POOL_SIZE: '4',
    });
  }
  if (url.search || Number(url.port || 3306) < 1 || Number(url.port || 3306) > 65535) {
    throw new HarnessError('UNSAFE_TEST_DATABASE_TARGET');
  }
  return {
    host: url.hostname.replace(/^\[|\]$/g, ''),
    port: Number(url.port || 3306), user, password, database: schema,
    connectTimeout: 10_000,
    timezone: 'Z', charset: 'utf8mb4',
    supportBigNumbers: true, bigNumberStrings: true, decimalNumbers: false,
    multipleStatements: false,
  };
}

export function quoteTestSchema(name) {
  if (!isTestSchema(name)) throw new HarnessError('UNSAFE_TEST_SCHEMA_NAME');
  return `\`${name}\``;
}
