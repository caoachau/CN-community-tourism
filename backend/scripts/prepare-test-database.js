import { createTestDatabase } from '../test/support/mysql.js';
import { seedBase } from '../test/support/fixtures.js';

let database;
try {
  database = await createTestDatabase({ ...process.env, NODE_ENV: 'test' });
  const connection = await database.connect();
  await connection.beginTransaction();
  try { await seedBase(connection); await connection.commit(); }
  catch (error) { await connection.rollback(); throw error; }
  finally { await database.closeConnection(connection); }
  console.log(JSON.stringify({ status: 'ready', schema: database.name, mysqlVersion: database.mysqlVersion,
    fixture: 'TEST_ONLY_NO_LOGIN', cleanup: 'Removed when the dedicated Compose server is taken down' }));
  await database.dispose({ keep: true });
  database = undefined;
} catch (error) {
  console.error(JSON.stringify({ level: 'error', code: error.code ?? 'TEST_DATABASE_PREPARATION_FAILED' }));
  process.exitCode = 1;
} finally {
  await database?.dispose();
}
