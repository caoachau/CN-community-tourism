import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import { loadMigrations, applyMigrations, expectedStructure, verifyStructure, quoteDatabase } from '../../src/migrations.js';
import { testDatabaseOptions } from '../support/config.js';

let control, worker, plan, oldPlan;
const owned = new Set();
const q = quoteDatabase;
before(async () => {
  const options = testDatabaseOptions();
  assert.ok(['127.0.0.1','localhost'].includes(options.host));
  control = await mysql.createConnection(options); worker = await mysql.createConnection(options);
  await worker.query("SET SESSION sql_mode = 'ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
  plan = await loadMigrations(); plan.migrations = plan.migrations.slice(0, 2); plan.expected = expectedStructure(plan.migrations);
  oldPlan = { ...plan, migrations: plan.migrations.slice(0, 1) };
  oldPlan.expected = expectedStructure(oldPlan.migrations);
});
after(async () => {
  for (const name of owned) await control.query(`DROP DATABASE ${q(name)}`);
  await worker?.end(); await control?.end();
});
async function baseline() {
  const name = `ctp_test_v3_migration_${randomBytes(5).toString('hex')}`;
  await applyMigrations(worker, name, oldPlan, { createDatabase: true }); owned.add(name); return name;
}
function progress(event) {
  if(event.event === 'v3_preflight') { owned.add(event.stage); owned.add(event.backup); }
}
async function user(database) {
  await control.execute(`INSERT INTO ${q(database)}.users (email,display_name,password_hash,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(6))`,
    ['preserve@fixture.invalid','Preserve me','!TEST_ONLY_NO_LOGIN!']);
}

test('atomic v3 swap preserves v1 history and all old tables; replay preserves new data', async () => {
  const database = await baseline(); let backup, stage;
  const result = await applyMigrations(worker, database, plan, { onProgress(e) { progress(e); if(e.event==='v3_preflight') { backup=e.backup; stage=e.stage; } } });
  assert.deepEqual(result.verification, { tableCount:31, primaryKeys:31, foreignKeys:76, enforcedChecks:131 });
  assert.deepEqual(result.history.map(r=>[r.version,r.status,r.completed_statements]), [[1,'APPLIED',144],[2,'APPLIED',108]]);
  await verifyStructure(control, backup, oldPlan.expected);
  const [[empty]] = await control.execute('SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=?',[stage]);
  assert.equal(Number(empty.n),0);
  const [external] = await control.execute('SELECT TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_SCHEMA IS NOT NULL AND REFERENCED_TABLE_SCHEMA<>?',[database,database]);
  assert.equal(external.length,0);
  await user(database);
  const replay = await applyMigrations(worker,database,plan);
  assert.equal(replay.pending.length,0);
  const [[row]] = await control.query(`SELECT COUNT(*) n FROM ${q(database)}.users`); assert.equal(Number(row.n),1);
});
test('a nonempty v2 schema is rejected without losing its record or history', async () => {
  const database = await baseline(); await user(database);
  await assert.rejects(applyMigrations(worker,database,plan), {code:'V3_REQUIRES_EMPTY_BUSINESS_TABLES'});
  await verifyStructure(control,database,oldPlan.expected);
  const [[row]]=await control.query(`SELECT COUNT(*) n FROM ${q(database)}.users`); assert.equal(Number(row.n),1);
});
test('a write arriving after preflight is detected under locks and is preserved', async () => {
  const database = await baseline(); let injected=false;
  const fault={async query(options,values) {
    if(options.sql.startsWith('LOCK TABLES ')&&!injected) { injected=true; await user(database); }
    return worker.query(options,values);
  },destroy:()=>worker.destroy()};
  await assert.rejects(applyMigrations(fault,database,plan,{onProgress:progress}),{code:'V3_REQUIRES_EMPTY_BUSINESS_TABLES'});
  await verifyStructure(control,database,oldPlan.expected);
  const [[row]]=await control.query(`SELECT COUNT(*) n FROM ${q(database)}.users`);assert.equal(Number(row.n),1);
});
test('verification failure after swap rolls back the table sets before releasing write locks', async () => {
  const database=await baseline();let swapped=false,failed=false;
  const fault={async query(options,values) {
    if(swapped&&!failed&&options.sql.startsWith('SELECT TABLE_NAME AS name')) { failed=true; throw Object.assign(new Error('test failure'),{code:'ER_TEST_POST_SWAP'}); }
    const result=await worker.query(options,values);
    if(options.sql.startsWith('RENAME TABLE '))swapped=true;
    return result;
  },destroy:()=>worker.destroy()};
  await assert.rejects(applyMigrations(fault,database,plan,{onProgress:progress}),{code:'ER_TEST_POST_SWAP'});
  await verifyStructure(control,database,oldPlan.expected);
  const [history]=await control.query(`SELECT version FROM ${q(database)}.schema_migrations`);assert.deepEqual(history,[{version:1}]);
});
