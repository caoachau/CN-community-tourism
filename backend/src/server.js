import { createApp } from './app.js';
import { createDatabase } from './database.js';
import { DatabaseConfigError, databaseErrorCode } from './config/database.js';

const port = Number(process.env.PORT ?? '5000');
let database;
let server;
const log = (entry) => console.log(JSON.stringify(entry));
const startupDeadline = setTimeout(() => {
  log({ level: 'error', message: 'Startup failed', code: 'STARTUP_TIMEOUT' });
  process.exit(1);
}, 40_000);

try {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new DatabaseConfigError('INVALID_PORT');
  database = createDatabase();
  const tls = await database.check();
  log({ level: 'info', message: 'Database TLS verified', driver: 'mysql2/promise', ...tls });
  const app = createApp({ checkDatabase: () => database.check() });
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(port, '0.0.0.0', () => resolve(listener));
    listener.once('error', reject);
  });
  log({ level: 'info', message: 'API listening', port });
} catch (error) {
  log({ level: 'error', message: 'Startup failed', code: databaseErrorCode(error) });
  await database?.close();
  process.exitCode = 1;
} finally {
  clearTimeout(startupDeadline);
}

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 10_000);
  try {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await database?.close();
  } catch {
    process.exitCode = 1;
  } finally {
    clearTimeout(deadline);
  }
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
