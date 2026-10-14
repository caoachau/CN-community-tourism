import mysql from 'mysql2/promise';
import { databaseOptions, DatabaseConfigError } from './config/database.js';

// A timed-out waiter must release a connection if the pool supplies one later.
export function acquireConnection(pool, timeoutMs = 12_000) {
  return new Promise((resolve, reject) => {
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      reject(new DatabaseConfigError('DATABASE_ACQUIRE_TIMEOUT'));
    }, timeoutMs);
    pool.getConnection().then((connection) => {
      clearTimeout(timer);
      if (expired) connection.release();
      else resolve(connection);
    }, (error) => {
      clearTimeout(timer);
      if (!expired) reject(error);
    });
  });
}

export async function inspectConnection(connection, expectedDatabase) {
  const query = (sql) => connection.query({ sql, timeout: 5_000 });
  // Only session state changes; no schema, seed or business data writes.
  await query("SET SESSION time_zone = '+00:00'");
  const [[identity]] = await query('SELECT 1 AS ok, DATABASE() AS database_name, VERSION() AS mysql_version');
  const [cipher] = await query("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
  const [protocol] = await query("SHOW SESSION STATUS LIKE 'Ssl_version'");
  if (Number(identity?.ok) !== 1 || identity.database_name !== expectedDatabase) {
    throw new DatabaseConfigError('DATABASE_IDENTITY_CHECK_FAILED');
  }
  if (!cipher[0]?.Value || !['TLSv1.2', 'TLSv1.3'].includes(protocol[0]?.Value)) {
    throw new DatabaseConfigError('TLS_SESSION_NOT_VERIFIED');
  }
  return {
    mysqlVersion: identity.mysql_version,
    databaseMatchesExpected: true,
    tlsProtocol: protocol[0].Value,
    tlsCipher: cipher[0].Value,
  };
}

export function databaseAccess(pool) {
  async function withConnection(work) {
    const connection = await acquireConnection(pool);
    try {
      await connection.query({ sql: "SET SESSION time_zone = '+00:00'", timeout: 5000 });
      return await work(connection);
    } finally { connection.release(); }
  }
  return {
    withConnection,
    transaction: (work) => withConnection(async (connection) => {
      await connection.beginTransaction();
      try {
        const result = await work(connection);
        await connection.commit();
        return result;
      } catch (error) {
        try { await connection.rollback(); }
        catch { connection.destroy(); }
        throw error;
      }
    }),
  };
}

export function createDatabase(env = process.env) {
  const options = databaseOptions(env);
  const pool = mysql.createPool(options);
  let currentCheck;
  return {
    ...databaseAccess(pool),
    // Coalesce concurrent probes rather than filling the pool from health traffic.
    check() {
      currentCheck ??= (async () => {
        const connection = await acquireConnection(pool);
        try {
          return await inspectConnection(connection, options.database);
        } catch (error) {
          connection.destroy();
          throw error;
        } finally {
          connection.release();
        }
      })().finally(() => { currentCheck = undefined; });
      return currentCheck;
    },
    close: () => pool.end(),
  };
}
