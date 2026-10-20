import { createApp } from './app.js';
import { createDatabase } from './database.js';
import { DatabaseConfigError, databaseErrorCode } from './config/database.js';
import { logger } from './shared/logger.js';
import { authOptions, AuthConfigError } from './config/auth.js';
import { createAuthRepository } from './auth/repository.js';
import { createAuthService } from './auth/service.js';
import { createHouseholdRepository } from './households/repository.js';
import { createHouseholdService } from './households/service.js';

const port = Number(process.env.PORT ?? '5000');
let database;
let server;
const startupDeadline = setTimeout(() => {
  logger.error({ event: 'startup_failed', code: 'STARTUP_TIMEOUT' }, 'Startup failed');
  process.exit(1);
}, 40_000);

try {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new DatabaseConfigError('INVALID_PORT');
  const options = authOptions();
  database = createDatabase();
  const tls = await database.check();
  logger.info({ event: 'database_verified', driver: 'mysql2/promise', ...tls }, 'Database TLS verified');
  const authService = createAuthService({ repository: createAuthRepository(database), options });
  const householdService = createHouseholdService({ repository: createHouseholdRepository(database) });
  const app = createApp({ checkDatabase: () => database.check(), logger, authService, householdService, trustProxy: options.trustProxy });
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(port, '0.0.0.0', () => resolve(listener));
    listener.once('error', reject);
  });
  logger.info({ event: 'server_started', port }, 'API listening');
} catch (error) {
  logger.error({ event: 'startup_failed', code: error instanceof AuthConfigError ? error.code : databaseErrorCode(error) }, 'Startup failed');
  try {
    await database?.close();
  } catch {
    logger.error({ event: 'startup_cleanup_failed', code: 'DATABASE_CLOSE_FAILED' }, 'Database cleanup failed');
  }
  process.exitCode = 1;
} finally {
  clearTimeout(startupDeadline);
}

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  logger.info({ event: 'shutdown_started' }, 'Shutting down API');
  const deadline = setTimeout(() => {
    logger.error({ event: 'shutdown_failed', code: 'SHUTDOWN_TIMEOUT' }, 'Shutdown timed out');
    process.exit(1);
  }, 10_000);
  try {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await database?.close();
    logger.info({ event: 'shutdown_completed' }, 'API stopped');
  } catch {
    logger.error({ event: 'shutdown_failed', code: 'SHUTDOWN_FAILED' }, 'Shutdown failed');
    process.exitCode = 1;
  } finally {
    clearTimeout(deadline);
  }
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
