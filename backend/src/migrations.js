import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

export class MigrationError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const fail = (code) => { throw new MigrationError(code); };
const digest = (text) => createHash('sha256').update(text).digest('hex');
const normalize = (text) => text.replace(/\r\n/g, '\n');
export const HISTORY_TABLE = 'schema_migrations';

export function quoteDatabase(name) {
  if (typeof name !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(name)) fail('INVALID_MIGRATION_DATABASE_NAME');
  return `\`${name}\``;
}

// Deliberately supports only the reviewed, additive initial DDL. New SQL forms
// require explicit parser/test changes rather than a permissive SQL splitter.
export function parseMigration(source, { jsonLiterals = false } = {}) {
  const stripped = normalize(source).replace(/^\s*--[^\n]*(?:\n|$)/gm, '').trim();
  if (jsonLiterals) {
    // Mask single-quoted literals before checking scope; JSON Schema contains
    // double quotes and SQL keywords as data. Never enable multipleStatements.
    let masked = ''; let quoted = false;
    for (let i = 0; i < stripped.length; i++) {
      const ch = stripped[i];
      if (quoted && ch === '\\') { masked += '  '; i++; continue; }
      if (ch === "'") {
        if (quoted && stripped[i + 1] === "'") { masked += '  '; i++; continue; }
        quoted = !quoted; masked += ' '; continue;
      }
      masked += quoted ? ' ' : ch;
    }
    if (quoted || /\/\*|\*\/|DELIMITER|[`"#]/i.test(masked)) fail('UNSUPPORTED_MIGRATION_FORMAT');
    const result = []; let start = 0;
    for (let i = 0; i <= masked.length; i++) if (i === masked.length || masked[i] === ';') {
      const sql = stripped.slice(start, i).trim();
      const scope = masked.slice(start, i).trim(); start = i + 1;
      if (!sql) continue;
      if (/^SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci$/i.test(sql) || /^SET SESSION time_zone = '\+00:00'$/i.test(sql)) { result.push(sql); continue; }
      if (!(/^CREATE TABLE [a-z][a-z0-9_]*\s*\(/i.test(scope) || /^ALTER TABLE [a-z][a-z0-9_]* ADD CONSTRAINT [a-z][a-z0-9_]* FOREIGN KEY\s*\(/i.test(scope)) ||
          /\b(?:USE|DATABASE|SCHEMA|GRANT|REVOKE|DROP|TRUNCATE|RENAME|SELECT|INSERT|DELETE|UPDATE|LIKE|OUTFILE|INFILE)\b/i.test(scope) ||
          /\b(?:TABLE|REFERENCES)\s+[a-z0-9_]+\s*\./i.test(scope)) fail('UNSAFE_MIGRATION_SCOPE');
      result.push(sql);
    }
    if (!result.length) fail('EMPTY_MIGRATION');
    return result;
  }
  if (/\/\*|\*\/|DELIMITER|[`"#]/i.test(stripped)) fail('UNSUPPORTED_MIGRATION_FORMAT');
  const statements = stripped.split(';').map((sql) => sql.trim()).filter(Boolean);
  if (!statements.length) fail('EMPTY_MIGRATION');
  for (const sql of statements) {
    if (/^SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci$/i.test(sql) ||
        /^SET SESSION time_zone = '\+00:00'$/i.test(sql)) continue;
    if (!(/^CREATE TABLE [a-z][a-z0-9_]*\s*\(/i.test(sql) ||
          /^ALTER TABLE [a-z][a-z0-9_]* ADD CONSTRAINT [a-z][a-z0-9_]* FOREIGN KEY\s*\(/i.test(sql)) ||
        /\b(?:USE|DATABASE|SCHEMA|GRANT|REVOKE|DROP|TRUNCATE|RENAME|SELECT|INSERT|DELETE|UPDATE|LIKE|OUTFILE|INFILE)\b/i.test(sql) ||
        /\b(?:TABLE|REFERENCES)\s+[a-z0-9_]+\s*\./i.test(sql)) fail('UNSAFE_MIGRATION_SCOPE');
  }
  return statements;
}

export async function loadMigrations(directory = new URL('../migrations/', import.meta.url)) {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  if (!files.length) fail('NO_MIGRATIONS_FOUND');
  const migrations = [];
  for (const file of files) {
    const match = /^(\d{3})_[a-z0-9_]+\.sql$/.exec(file);
    if (!match || Number(match[1]) !== migrations.length + 1) fail('INVALID_MIGRATION_SEQUENCE');
    const source = normalize(await readFile(new URL(file, directory), 'utf8'));
    const replacement = file === '002_compact_v3.sql';
    migrations.push({ version: Number(match[1]), file, checksum: digest(source),
      ...(replacement ? { mode: 'REPLACE_EMPTY' } : {}),
      statements: parseMigration(source, { jsonLiterals: replacement }) });
  }
  const checksum = digest(migrations.map(({ version, file, checksum }) => `${version}:${file}:${checksum}`).join('\n'));
  return { migrations, checksum, expected: expectedStructure(migrations) };
}

export function expectedStructure(migrations) {
  const tables = [];
  const foreignKeys = [];
  const checks = [];
  const replacementIndex = migrations.findLastIndex((migration) => migration.mode === 'REPLACE_EMPTY');
  for (const migration of migrations.slice(Math.max(0, replacementIndex))) for (const sql of migration.statements) {
    const table = /^CREATE TABLE (\w+)/i.exec(sql)?.[1];
    if (table) {
      if (tables.some((entry) => entry.name === table) || table === HISTORY_TABLE) fail('DUPLICATE_OR_RESERVED_TABLE');
      const primary = /PRIMARY KEY\s*\(([^)]+)\)/i.exec(sql);
      if (!primary) fail('MIGRATION_TABLE_REQUIRES_PRIMARY_KEY');
      const columns = primary[1].split(',').map((value) => value.trim());
      tables.push({ name: table, primaryKey: columns });
      for (const match of sql.matchAll(/CONSTRAINT (\w+) CHECK\s*\(/gi)) checks.push({ table, name: match[1] });
    } else {
      const fk = /^ALTER TABLE (\w+) ADD CONSTRAINT (\w+) FOREIGN KEY\s*\(([^)]+)\) REFERENCES (\w+)\s*\(([^)]+)\)$/i.exec(sql);
      if (fk) foreignKeys.push({ table: fk[1], name: fk[2], columns: fk[3].split(',').map((v) => v.trim()),
        parent: fk[4], parentColumns: fk[5].split(',').map((v) => v.trim()) });
      else if (/^ALTER /i.test(sql)) fail('UNSUPPORTED_FOREIGN_KEY_FORMAT');
    }
  }
  const names = new Set(tables.map((table) => table.name));
  if (foreignKeys.some((key) => !names.has(key.table) || !names.has(key.parent) || key.columns.length !== key.parentColumns.length)) {
    fail('INVALID_MIGRATION_FOREIGN_KEY');
  }
  return { tables, foreignKeys, checks };
}

export const historySql = `CREATE TABLE schema_migrations (
  version INT UNSIGNED NOT NULL,
  filename VARCHAR(128) NOT NULL,
  checksum CHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL,
  total_statements INT UNSIGNED NOT NULL,
  completed_statements INT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME(6) NOT NULL,
  finished_at DATETIME(6) NULL,
  last_error_code VARCHAR(64) NULL,
  PRIMARY KEY (version),
  UNIQUE KEY uq_schema_migrations_filename (filename),
  CONSTRAINT ck_schema_migrations_status CHECK (status IN ('RUNNING', 'APPLIED', 'FAILED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;

async function query(connection, sql, values = []) {
  try { return await connection.query({ sql, timeout: 30_000 }, values); }
  catch (error) {
    // A client timeout is not proof that server-side DDL rolled back.
    if (error.code === 'PROTOCOL_SEQUENCE_TIMEOUT') connection.destroy();
    throw error;
  }
}

export function migrationErrorCode(error) {
  if (error instanceof MigrationError) return error.code;
  return typeof error?.code === 'string' && /^(?:ER_|PROTOCOL_|HANDSHAKE_|ECONN|ETIMEDOUT|ENOTFOUND|EAI_)[A-Z0-9_]*$/.test(error.code)
    ? error.code : 'MIGRATION_FAILED';
}

export async function migrationStatus(connection, database, plan) {
  quoteDatabase(database);
  const [[schema]] = await query(connection, 'SELECT COUNT(*) AS count FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [database]);
  const [tables] = await query(connection, 'SELECT TABLE_NAME AS name, TABLE_TYPE AS type FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME', [database]);
  let history = [];
  if (tables.some((table) => table.name === HISTORY_TABLE)) {
    [history] = await query(connection, `SELECT version, filename, checksum, status, total_statements, completed_statements, started_at, finished_at, last_error_code FROM ${quoteDatabase(database)}.schema_migrations ORDER BY version`);
  }
  for (const row of history) {
    const migration = plan.migrations.find((entry) => entry.version === row.version);
    if (!migration || migration.file !== row.filename || migration.checksum !== row.checksum) fail('MIGRATION_HISTORY_CHECKSUM_MISMATCH');
    if (row.status !== 'APPLIED' || row.completed_statements !== migration.statements.length || row.total_statements !== migration.statements.length) {
      fail('INCOMPLETE_MIGRATION_REQUIRES_INSPECTION');
    }
  }
  if (history.some((row, index) => row.version !== index + 1)) fail('MIGRATION_HISTORY_SEQUENCE_MISMATCH');
  if (!history.length && tables.some((table) => table.name !== HISTORY_TABLE)) fail('NONEMPTY_DATABASE_WITHOUT_MIGRATION_HISTORY');
  return {
    database, exists: Number(schema.count) === 1, tableCount: tables.length, tables, history,
    pending: plan.migrations.filter((entry) => !history.some((row) => row.version === entry.version)).map((entry) => entry.file),
    expected: { businessTables: plan.expected.tables.length, technicalTables: 1, totalTables: plan.expected.tables.length + 1,
      primaryKeys: plan.expected.tables.length + 1, foreignKeys: plan.expected.foreignKeys.length, businessChecks: plan.expected.checks.length, totalChecks: plan.expected.checks.length + 1 },
    planChecksum: plan.checksum,
  };
}

export async function verifyStructure(connection, database, expected) {
  const [tables] = await query(connection, 'SELECT TABLE_NAME AS name, TABLE_TYPE AS type, ENGINE AS engine, TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME', [database]);
  const expectedNames = [...expected.tables.map((table) => table.name), HISTORY_TABLE].sort();
  if (JSON.stringify(tables.map((table) => table.name)) !== JSON.stringify(expectedNames) ||
      tables.some((table) => table.type !== 'BASE TABLE' || table.engine !== 'InnoDB' || table.collation !== 'utf8mb4_0900_ai_ci')) fail('MIGRATION_TABLE_VERIFICATION_FAILED');
  const [keys] = await query(connection, `SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS name, COLUMN_NAME AS columnName,
    REFERENCED_TABLE_SCHEMA AS parentSchema, REFERENCED_TABLE_NAME AS parent, REFERENCED_COLUMN_NAME AS parentColumn
    FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA = ? ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`, [database]);
  for (const table of [...expected.tables, { name: HISTORY_TABLE, primaryKey: ['version'] }]) {
    if (JSON.stringify(keys.filter((key) => key.tableName === table.name && key.name === 'PRIMARY').map((key) => key.columnName)) !== JSON.stringify(table.primaryKey)) fail('MIGRATION_PRIMARY_KEY_VERIFICATION_FAILED');
  }
  const foreign = keys.filter((key) => key.parent);
  if (new Set(foreign.map((key) => `${key.tableName}.${key.name}`)).size !== expected.foreignKeys.length) fail('MIGRATION_FOREIGN_KEY_VERIFICATION_FAILED');
  for (const key of expected.foreignKeys) {
    const actual = foreign.filter((entry) => entry.tableName === key.table && entry.name === key.name);
    if (JSON.stringify(actual.map((entry) => entry.columnName)) !== JSON.stringify(key.columns) ||
        JSON.stringify(actual.map((entry) => entry.parentColumn)) !== JSON.stringify(key.parentColumns) ||
        actual.some((entry) => entry.parent !== key.parent || entry.parentSchema !== database)) fail('MIGRATION_FOREIGN_KEY_VERIFICATION_FAILED');
  }
  const [checks] = await query(connection, "SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS name, ENFORCED AS enforced FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND CONSTRAINT_TYPE = 'CHECK'", [database]);
  const expectedChecks = [...expected.checks, { table: HISTORY_TABLE, name: 'ck_schema_migrations_status' }];
  if (checks.length !== expectedChecks.length || expectedChecks.some((check) => !checks.some((actual) =>
    actual.tableName === check.table && actual.name === check.name && actual.enforced === 'YES'))) fail('MIGRATION_CHECK_VERIFICATION_FAILED');
  return { tableCount: tables.length, primaryKeys: expectedNames.length, foreignKeys: expected.foreignKeys.length, enforcedChecks: checks.length };
}

export async function applyMigrations(connection, database, plan, { createDatabase = false, onProgress = () => {} } = {}) {
  const quoted = quoteDatabase(database);
  const lock = `ctp:migrations:${digest(database).slice(0, 40)}`;
  const [[result]] = await query(connection, 'SELECT GET_LOCK(?, 0) AS acquired', [lock]);
  if (Number(result.acquired) !== 1) fail('MIGRATION_LOCK_UNAVAILABLE');
  try {
    const status = await migrationStatus(connection, database, plan);
    if (!status.exists) {
      if (!createDatabase) fail('DATABASE_CREATION_REQUIRES_EXPLICIT_FLAG');
      await query(connection, `CREATE DATABASE ${quoted} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
      onProgress({ event: 'database_created', database });
    }
    await query(connection, `USE ${quoted}`);
    const [[identity]] = await query(connection, 'SELECT DATABASE() AS name, @@session.foreign_key_checks AS fkChecks');
    if (identity.name !== database || Number(identity.fkChecks) !== 1) fail('MIGRATION_SESSION_NOT_SAFE');
    await query(connection, "SET SESSION time_zone = '+00:00'");
    await query(connection, 'SET SESSION lock_wait_timeout = 30');
    if (!status.tables.some((table) => table.name === HISTORY_TABLE)) await query(connection, historySql);
    // Check previously applied structure before adding anything to an existing schema.
    if (status.history.length) await verifyStructure(connection, database, expectedStructure(plan.migrations.slice(0, status.history.length)));
    for (const migration of plan.migrations.filter((entry) => status.pending.includes(entry.file))) {
      if (migration.mode === 'REPLACE_EMPTY') {
        const { replaceEmptySchema } = await import('./schema-replacement.js');
        await replaceEmptySchema(connection, database, plan, migration, { onProgress });
        continue;
      }
      await query(connection, `INSERT INTO schema_migrations (version, filename, checksum, status, total_statements, started_at)
        VALUES (?, ?, ?, 'RUNNING', ?, UTC_TIMESTAMP(6))`, [migration.version, migration.file, migration.checksum, migration.statements.length]);
      let completed = 0;
      try {
        for (const sql of migration.statements) {
          await query(connection, sql);
          completed++;
          await query(connection, 'UPDATE schema_migrations SET completed_statements = ? WHERE version = ?', [completed, migration.version]);
          onProgress({ file: migration.file, completed, total: migration.statements.length });
        }
        await verifyStructure(connection, database, expectedStructure(plan.migrations.filter((entry) => entry.version <= migration.version)));
        await query(connection, "UPDATE schema_migrations SET status = 'APPLIED', finished_at = UTC_TIMESTAMP(6) WHERE version = ?", [migration.version]);
      } catch (error) {
        try {
          await query(connection, "UPDATE schema_migrations SET status = 'FAILED', finished_at = UTC_TIMESTAMP(6), last_error_code = ? WHERE version = ?", [migrationErrorCode(error), migration.version]);
        } catch { /* A broken connection leaves RUNNING; the next run must stop. */ }
        throw error;
      }
    }
    const verification = await verifyStructure(connection, database, plan.expected);
    return { ...(await migrationStatus(connection, database, plan)), verification };
  } finally {
    try { await query(connection, 'SELECT RELEASE_LOCK(?) AS released', [lock]); } catch { /* Disconnect releases the lock. */ }
  }
}
