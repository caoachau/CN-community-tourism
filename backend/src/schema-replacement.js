import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { MigrationError, quoteDatabase, expectedStructure, verifyStructure, historySql, migrationErrorCode } from './migrations.js';

const q = quoteDatabase;
async function query(connection, sql, values = []) {
  try { return await connection.query({ sql, timeout: 30_000 }, values); }
  catch (error) { if (error.code === 'PROTOCOL_SEQUENCE_TIMEOUT') connection.destroy(); throw error; }
}
async function assertEmpty(connection, database, tables) {
  const [counts] = await query(connection, tables.map(({ name }) =>
    `SELECT '${name}' AS name, COUNT(*) AS count FROM ${q(database)}.${q(name)}`).join(' UNION ALL '));
  if (counts.some(({ count }) => Number(count) !== 0)) throw new MigrationError('V3_REQUIRES_EMPTY_BUSINESS_TABLES');
}

// A schema replacement is allowed only for an empty, verified v2 installation.
// LOCK TABLES closes the check/swap race; one atomic RENAME preserves all old
// tables and history in a separate schema. No DROP/TRUNCATE of source data.
export async function replaceEmptySchema(connection, database, plan, migration, { onProgress = () => {} } = {}) {
  if (migration.version !== 2 || migration.file !== '002_compact_v3.sql') throw new MigrationError('UNSUPPORTED_SCHEMA_REPLACEMENT');
  const previous = expectedStructure(plan.migrations.filter(({ version }) => version < 2));
  const expected = expectedStructure(plan.migrations.filter(({ version }) => version <= 2));
  await verifyStructure(connection, database, previous);
  await assertEmpty(connection, database, previous.tables);
  const [[extra]] = await query(connection, `SELECT
    (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=?) AS triggers,
    (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=?) AS routines,
    (SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA=?) AS events,
    (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA=? AND TABLE_SCHEMA<>?) AS externalFks`, Array(5).fill(database));
  if (Object.values(extra).some((count) => Number(count) !== 0)) throw new MigrationError('V3_UNMANAGED_DEPENDENCIES');
  const [[identity]] = await query(connection, 'SELECT VERSION() AS version, @@session.foreign_key_checks AS fkChecks');
  if (!/^8\.4\./.test(identity.version) || Number(identity.fkChecks) !== 1) throw new MigrationError('V3_REQUIRES_MYSQL84_AND_FK_CHECKS');
  const [history] = await query(connection, `SELECT * FROM ${q(database)}.schema_migrations ORDER BY version`);
  if (history.length !== 1 || history[0].version !== 1 || history[0].status !== 'APPLIED') throw new MigrationError('V3_REQUIRES_APPLIED_V1');

  const token = randomBytes(6).toString('hex');
  const localTest = database.startsWith('ctp_test_');
  const prefix = localTest ? 'ctp_test_' : 'ctp_';
  const stage = `${prefix}v3_stage_${token}`;
  const backup = `${prefix}v2_backup_${token}`;
  const oldNames = [...previous.tables.map(({ name }) => name), 'schema_migrations'];
  const newNames = [...expected.tables.map(({ name }) => name), 'schema_migrations'];
  const rename = `RENAME TABLE ${[
    ...oldNames.map((name) => `${q(database)}.${q(name)} TO ${q(backup)}.${q(name)}`),
    ...newNames.map((name) => `${q(stage)}.${q(name)} TO ${q(database)}.${q(name)}`),
  ].join(', ')}`;
  const rollback = `RENAME TABLE ${[
    ...newNames.map((name) => `${q(database)}.${q(name)} TO ${q(stage)}.${q(name)}`),
    ...oldNames.map((name) => `${q(backup)}.${q(name)} TO ${q(database)}.${q(name)}`),
  ].join(', ')}`;
  const backupRoot = new URL('../../database-backups/', import.meta.url);
  const journalFile = new URL(`v3-upgrade-${token}.json`, backupRoot);
  const journal = { target: database, stage, backup, migration: migration.file, checksum: migration.checksum,
    startedAt: new Date().toISOString(), phase: 'PREFLIGHT', history, tables: [], rollbackSql: rollback,
    rollbackWarning: 'Only safe before v3 receives new writes; preserve/reconcile new data first.' };
  await mkdir(backupRoot, { recursive: true });
  const saveJournal = () => writeFile(journalFile, JSON.stringify(journal, null, 2));
  for (const name of oldNames) {
    const [[row]] = await query(connection, `SHOW CREATE TABLE ${q(database)}.${q(name)}`);
    journal.tables.push({ name, ddl: row['Create Table'] });
  }
  await saveJournal();
  onProgress({ event: 'v3_preflight', database, stage, backup, backupFile: fileURLToPath(journalFile) });
  let locked = false;
  let swapped = false;
  try {
    // Random, process-owned schemas; never CREATE IF NOT EXISTS on unknown data.
    await query(connection, `CREATE DATABASE ${q(stage)} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    await query(connection, `CREATE DATABASE ${q(backup)} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    journal.phase = 'BUILDING_STAGE'; await saveJournal();
    await query(connection, `USE ${q(stage)}`);
    let completed = 0;
    for (const sql of migration.statements) {
      await query(connection, sql); completed++;
      if (completed % 20 === 0 || completed === migration.statements.length) {
        journal.completedStatements = completed; await saveJournal();
        onProgress({ file: migration.file, completed, total: migration.statements.length });
      }
    }
    await query(connection, historySql);
    await query(connection, `INSERT INTO ${q(stage)}.schema_migrations SELECT * FROM ${q(database)}.schema_migrations`);
    await query(connection, `INSERT INTO ${q(stage)}.schema_migrations
      (version,filename,checksum,status,total_statements,completed_statements,started_at,finished_at)
      VALUES (?,?,?,'APPLIED',?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))`,
    [migration.version, migration.file, migration.checksum, migration.statements.length, migration.statements.length]);
    await verifyStructure(connection, stage, expected);
    await query(connection, `USE ${q(database)}`);
    journal.phase = 'STAGED_AND_VERIFIED'; await saveJournal();
    await query(connection, `LOCK TABLES ${[
      ...oldNames.map((name) => `${q(database)}.${q(name)} WRITE`),
      ...newNames.map((name) => `${q(stage)}.${q(name)} WRITE`),
    ].join(', ')}`);
    locked = true;
    await assertEmpty(connection, database, previous.tables);
    // Atomic DDL: if any rename fails, none of the tables are renamed.
    await query(connection, rename);
    swapped = true;
    journal.phase = 'SWAPPED'; await saveJournal();
    await verifyStructure(connection, database, expected);
    await verifyStructure(connection, backup, previous);
    await query(connection, 'UNLOCK TABLES'); locked = false;
    journal.phase = 'VERIFIED'; journal.finishedAt = new Date().toISOString(); await saveJournal();
    onProgress({ event: 'v3_upgraded', database, backup, stage, backupFile: fileURLToPath(journalFile) });
    // Empty staging schema is intentionally retained as the rollback destination.
  } catch (error) {
    // Roll back only while write locks are still held: no new v3 writes can be lost.
    if (swapped && locked) {
      try { await query(connection, rollback); journal.phase = 'ROLLED_BACK'; }
      catch { journal.phase = 'INSPECTION_REQUIRED'; }
    } else journal.phase = swapped ? 'INSPECTION_REQUIRED' : 'SOURCE_UNCHANGED';
    journal.errorCode = migrationErrorCode(error); await saveJournal();
    throw error;
  } finally {
    if (locked) { try { await query(connection, 'UNLOCK TABLES'); } catch { /* disconnect releases locks */ } }
    try { await query(connection, `USE ${q(database)}`); } catch { /* preserve original failure */ }
  }
}
