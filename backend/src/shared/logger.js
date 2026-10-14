import pino from 'pino';
import { AppError, ERROR_DEFINITIONS } from './errors.js';

const levels = new Set(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']);
const sensitiveKeys = [
  'password', 'passwordHash', 'password_hash', 'token', 'accessToken', 'refreshToken',
  'access_token', 'refresh_token', 'authorization', 'cookie', 'apiKey', 'api_key',
  'secret', 'JWT_SECRET', 'ADMIN_BOOTSTRAP_PASSWORD', 'privateKey', 'connectionString', 'DATABASE_URL', 'databaseUrl',
  'DB_SSL_CA', 'DB_SSL_CA_PATH', 'sql', 'sqlMessage', 'body', 'headers',
  'req', 'res', 'request', 'response',
];

export function createLogger({ env = process.env, destination } = {}) {
  const level = env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info');
  if (!levels.has(level)) throw new TypeError('Invalid LOG_LEVEL configuration');
  return pino({
    level,
    base: {
      service: 'community-tourism-api',
      environment: ['development', 'test', 'production'].includes(env.NODE_ENV) ? env.NODE_ENV : 'development',
    },
    messageKey: 'message',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    redact: {
      paths: sensitiveKeys.flatMap((key) => [key, `*.${key}`]),
      censor: '[REDACTED]',
    },
    serializers: {
      // Driver messages, SQL, stacks and causes can contain credentials or PII.
      err(error) {
        return {
          type: error instanceof AppError ? 'AppError' : 'Error',
          code: error instanceof AppError && Object.hasOwn(ERROR_DEFINITIONS, error.code)
            ? error.code : 'INTERNAL_ERROR',
        };
      },
    },
  }, destination);
}

export const logger = createLogger();
