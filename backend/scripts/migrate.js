import mysql from 'mysql2/promise';
import { databaseOptions, databaseErrorCode } from '../src/config/database.js';
import { inspectConnection } from '../src/database.js';
import { applyMigrations, loadMigrations, migrationStatus, verifyStructure, MigrationError, migrationErrorCode } from '../src/migrations.js';

function argumentsFor(args) {
  const modes = args.filter((arg) => ['--plan', '--apply', '--verify'].includes(arg));
  const values = {};
  let createDatabase = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (['--plan', '--apply', '--verify'].includes(arg)) continue;
    if (arg === '--create-database') { createDatabase = true; continue; }
    if (['--confirm-database', '--confirm-host', '--confirm-plan'].includes(arg) && args[index + 1] && !args[index + 1].startsWith('--') && !values[arg]) {
      values[arg] = args[++index];
    } else throw new MigrationError('INVALID_MIGRATION_ARGUMENTS');
  }
  if (modes.length > 1 || (createDatabase && modes[0] !== '--apply')) throw new MigrationError('INVALID_MIGRATION_ARGUMENTS');
  return { mode: modes[0] ?? '--plan', createDatabase, values };
}

let connection;
try {
  const args = argumentsFor(process.argv.slice(2));
  const options = databaseOptions(process.env);
  const plan = await loadMigrations();
  if (args.mode === '--apply' && (args.values['--confirm-database'] !== options.database ||
      args.values['--confirm-host'] !== options.host || args.values['--confirm-plan'] !== plan.checksum)) {
    throw new MigrationError('EXPLICIT_TARGET_AND_PLAN_CONFIRMATION_REQUIRED');
  }
  // Connect without a default schema so a read-only plan can inspect a missing
  // target; creation is permitted only in explicit --apply --create-database.
  connection = await mysql.createConnection({ ...options, database: undefined });
  const tls = await inspectConnection(connection, null);
  const status = await migrationStatus(connection, options.database, plan);
  const report = { action: args.mode.slice(2), host: options.host, port: options.port, tls,
    ...status, migrations: plan.migrations.map(({ version, file, checksum, statements }) => ({ version, file, checksum, statements: statements.length })) };
  if (args.mode === '--plan') console.log(JSON.stringify(report));
  else if (args.mode === '--verify') {
    if (!status.exists || status.pending.length) throw new MigrationError('MIGRATIONS_NOT_FULLY_APPLIED');
    console.log(JSON.stringify({ ...report, verification: await verifyStructure(connection, options.database, plan.expected) }));
  } else {
    const applied = await applyMigrations(connection, options.database, plan, {
      createDatabase: args.createDatabase,
      onProgress: ({ event, database, backup, stage, backupFile, file, completed, total }) => {
        if (event === 'database_created') console.log(JSON.stringify({ action: event, database }));
        if (event?.startsWith('v3_')) console.log(JSON.stringify({ action: event, database, backup, stage, backupFile }));
        if (file && (completed % 20 === 0 || completed === total)) console.log(JSON.stringify({ action: 'migration_progress', file, completed, total }));
      },
    });
    console.log(JSON.stringify({ ...report, ...applied, action: 'applied' }));
  }
} catch (error) {
  console.log(JSON.stringify({ status: 'FAILED', code: error instanceof MigrationError ? migrationErrorCode(error) :
    (error?.code?.startsWith('ER_') ? migrationErrorCode(error) : databaseErrorCode(error)) }));
  process.exitCode = 1;
} finally {
  if (connection) {
    try { await connection.end(); } catch { connection.destroy(); }
  }
}
