// Standalone design verification. Never reads backend/.env or connects to Aiven.
// Run from the repository root: node backend/test/design/validate.mjs
import mysql from 'mysql2/promise';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes, createHash } from 'node:crypto';
import { testDatabaseOptions } from '../support/config.js';

const source = await readFile(new URL('../../../Tai lieu he thong/Thiet ke CSDL/schema.sql', import.meta.url), 'utf8');
const output = new URL('../../../tmp/schema-validation/', import.meta.url);
await mkdir(output, { recursive: true });
const sqls = source.replace(/^\s*--[^\n]*(?:\n|$)/gm, '').split(';').map(s => s.trim()).filter(Boolean);
assert(sqls.every(s => /^(SET NAMES |SET SESSION time_zone|CREATE TABLE [a-z_]+ \(|ALTER TABLE [a-z_]+ ADD CONSTRAINT )/.test(s)));
const options = testDatabaseOptions({ NODE_ENV: 'test' }); // fixed local test defaults only
assert.equal(options.host, '127.0.0.1');
assert.equal(options.port, 3307);
const name = `ctp_test_v3_${randomBytes(7).toString('hex')}`;
assert(/^ctp_test_v3_[a-f0-9]{14}$/.test(name));
const token = randomBytes(16).toString('hex');
const control = await mysql.createConnection(options);
const connections = new Set();
const checks = [];
let created = false;
let marked = false;
let summary;
async function connection() {
  const c = await mysql.createConnection({ ...options, database: name });
  connections.add(c);
  await c.query("SET SESSION time_zone = '+00:00'");
  await c.query('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');
  await c.query('SET SESSION innodb_lock_wait_timeout = 5');
  return c;
}
async function close(c) { connections.delete(c); await c.end(); }
async function insert(c, table, values) {
  const keys = Object.keys(values);
  assert([table, ...keys].every(k => /^[a-z_]+$/.test(k)));
  const [r] = await c.execute(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
    Object.values(values).map(v => v !== null && typeof v === 'object' && !Buffer.isBuffer(v) ? JSON.stringify(v) : v));
  return String(r.insertId);
}
async function rejects(work, code) { await assert.rejects(work, e => e.code === code); }
async function test(label, work) {
  const c = await connection();
  await c.beginTransaction();
  try { await work(c); checks.push({ name: label, status: 'PASS' }); console.log(`PASS ${label}`); }
  finally { await c.rollback(); await close(c); }
}
const baseTime = '2030-01-01 00:00:00';
async function fixture(c) {
  const users = {};
  for (const [key, role] of [['admin','ADMIN'],['customer','CUSTOMER'],['ownerA','HOUSEHOLD'],['ownerB','HOUSEHOLD']]) {
    users[key] = await insert(c, 'users', {email:`${key}-${randomBytes(5).toString('hex')}@fixture.invalid`, display_name:key,
      password_hash:'!TEST_ONLY_NO_LOGIN!', role, updated_at:baseTime});
  }
  const households = {};
  for (const key of ['A','B']) households[key] = await insert(c,'households',{owner_user_id:users[`owner${key}`],code:`H${randomBytes(5).toString('hex')}`,approval_status:'APPROVED',updated_at:baseTime});
  const category = await insert(c,'categories',{kind:'SERVICE',code:randomBytes(5).toString('hex'),name:'Experience'});
  const productCategory = await insert(c,'categories',{kind:'PRODUCT',code:randomBytes(5).toString('hex'),name:'Local product'});
  const rooms = {}, services = {};
  for (const key of ['A','B']) {
    rooms[key] = await insert(c,'rooms',{household_id:households[key],code:'ROOM',max_guests:4,nightly_price_vnd:400000});
    services[key] = await insert(c,'services',{household_id:households[key],code:'FISHING',category_id:category,default_duration_minutes:180});
  }
  const offers = {};
  for (const [key,mode,pricing] of [['shared','SHARED','PER_PERSON'],['exclusive','EXCLUSIVE','PER_TRIP']]) {
    offers[key] = await insert(c,'service_offers',{household_id:households.A,service_id:services.A,name:key,participation_mode:mode,
      pricing_type:pricing,unit_price_vnd:150000,unit_label:'unit',min_participants:1,max_participants:10,terms:{}});
  }
  const slot = await insert(c,'service_slots',{household_id:households.A,service_id:services.A,starts_at:'2030-11-20 07:00:00',ends_at:'2030-11-20 10:00:00',person_capacity:10,sales_status:'OPEN',created_by:users.ownerA});
  const slotOffers = {};
  for (const key of ['shared','exclusive']) slotOffers[key] = await insert(c,'slot_offers',{household_id:households.A,service_id:services.A,slot_id:slot,offer_id:offers[key]});
  const resources = {}, assignments = {};
  for (const [key,type,quantity,mode] of [['boat','SINGLE',1,'SESSION_SHARED'],['bikes','POOL',10,'PER_BOOKING_QUOTA']]) {
    resources[key] = await insert(c,'resources',{household_id:households.A,code:key,name:key,resource_type:type,total_quantity:quantity});
    assignments[key] = await insert(c,'slot_resource_assignments',{household_id:households.A,slot_id:slot,resource_id:resources[key],quantity,allocation_mode:mode});
  }
  return {users,households,category,productCategory,rooms,services,offers,slot,slotOffers,resources,assignments};
}
async function booking(c,b,overrides={}) {
  const id = await insert(c,'bookings',{household_id:b.households.A,booking_code:randomBytes(10).toString('hex'),customer_user_id:b.users.customer,
    created_by:b.users.customer,source:'ONLINE',status:'PENDING',contact_name:'Fixture',contact_phone:'TEST',first_starts_at:'2030-11-20 07:00:00',
    last_ends_at:'2030-11-20 10:00:00',total_vnd:150000,terms_snapshot:{},hold_expires_at:'2030-11-19 10:00:00',...overrides});
  const set = await insert(c,'reservation_sets',{household_id:b.households.A,booking_id:id,status:'HELD',hold_started_at:'2030-11-18 10:00:00',expires_at:'2030-11-19 10:00:00'});
  return {id,set};
}
const serviceValues = (b,set,overrides={}) => ({household_id:b.households.A,reservation_set_id:set,kind:'SERVICE',service_id:b.services.A,
  offer_id:b.offers.shared,slot_id:b.slot,participant_count:1,quantity:1,pricing_type:'PER_PERSON',starts_at:'2030-11-20 07:00:00',ends_at:'2030-11-20 10:00:00',
  unit_price_vnd:150000,base_amount_vnd:150000,snapshot:{name:'Fishing',schema_version:1},occupied_starts_at:'2030-11-20 07:00:00',occupied_ends_at:'2030-11-20 10:00:00',...overrides});
const roomValues = (b,set,overrides={}) => ({household_id:b.households.A,reservation_set_id:set,kind:'ROOM',room_id:b.rooms.A,participant_count:2,
  quantity:3,pricing_type:'PER_NIGHT',is_exclusive:1,check_in_date:'2030-11-20',check_out_date:'2030-11-23',starts_at:'2030-11-20 07:00:00',ends_at:'2030-11-23 05:00:00',
  unit_price_vnd:400000,base_amount_vnd:1200000,snapshot:{name:'Room',schema_version:1},occupied_starts_at:'2030-11-20 07:00:00',occupied_ends_at:'2030-11-23 05:00:00',...overrides});
const activeSql = `(rs.status = 'COMMITTED' OR (rs.status = 'HELD' AND rs.expires_at > ?)) AND i.released_at IS NULL AND i.occupied_starts_at IS NOT NULL`;
async function occupancy(c,slot,now) {
  const [[r]] = await c.execute(`SELECT COALESCE(SUM(i.participant_count),0) AS people, COALESCE(MAX(i.is_exclusive),0) AS exclusive, COUNT(*) AS commitments
    FROM booking_items i JOIN reservation_sets rs ON rs.id=i.reservation_set_id WHERE i.slot_id=? AND ${activeSql}`,[slot,now]);
  return {people:Number(r.people),exclusive:Number(r.exclusive),commitments:Number(r.commitments)};
}
function priceAddons(config, selections) {
  const definitions=new Map();
  for(const a of config.items){if(definitions.has(a.key))throw new Error('DUPLICATE_ADDON');definitions.set(a.key,a);}
  const seen=new Set(); let total=0n; const snapshot=[];
  for(const s of selections){
    const a=definitions.get(s.key);
    if(seen.has(s.key)||!a||!a.is_active||!Number.isInteger(s.quantity)||s.quantity<1||s.quantity>a.max_quantity)throw new Error('INVALID_ADDON');
    seen.add(s.key);const amount=BigInt(a.unit_price_vnd)*BigInt(s.quantity);total+=amount;
    if(total>999999999999999n)throw new Error('ADDON_AMOUNT_OVERFLOW');
    snapshot.push({key:a.key,name:a.name,quantity:s.quantity,unit_price_vnd:a.unit_price_vnd,amount_vnd:Number(amount)});
  }
  return {snapshot,total:String(total)};
}
async function assertReadyItems(c,set) {
  const [items]=await c.execute('SELECT * FROM booking_items WHERE reservation_set_id=?',[set]);
  if(!items.length)throw new Error('EMPTY_SET');
  for(const i of items){
    if(!i.occupied_starts_at||!i.occupied_ends_at||i.released_at||i.kind==='SERVICE'&&!i.slot_id)throw new Error('INCOMPLETE_ALLOCATION');
    if(i.kind==='SERVICE'){
      const [rules]=await c.execute(`SELECT r.*,a.allocation_mode FROM slot_offer_resource_rules r JOIN slot_offers o ON o.id=r.slot_offer_id JOIN slot_resource_assignments a ON a.id=r.assignment_id WHERE o.slot_id=? AND o.offer_id=?`,[i.slot_id,i.offer_id]);
      const [usages]=await c.execute('SELECT * FROM item_resource_usages WHERE item_id=?',[i.id]);
      const expected=new Map();
      for(const rule of rules){
        if(rule.usage_basis==='SHARED_ONCE'){if(rule.allocation_mode!=='SESSION_SHARED')throw new Error('INVALID_RULE_MODE');continue;}
        if(rule.allocation_mode!=='PER_BOOKING_QUOTA')throw new Error('INVALID_RULE_MODE');
        const factor=rule.usage_basis==='PER_PERSON'?Number(i.participant_count):rule.usage_basis==='PER_UNIT'?Number(i.quantity):1;
        const required=factor*Number(rule.units_required);
        if(!Number.isSafeInteger(required)||required<1)throw new Error('INVALID_RESOURCE_QUANTITY');
        expected.set(String(rule.assignment_id),required);
      }
      if(usages.length!==expected.size||usages.some(u=>expected.get(String(u.assignment_id))!==Number(u.quantity)))throw new Error('INCOMPLETE_QUOTA');
    }
  }
  return items;
}
async function assertCashReversal(c,originalId,candidate) {
  const [[original]]=await c.execute('SELECT * FROM financial_entries WHERE id=?',[originalId]);
  if(!original||!['RECEIPT','REFUND','OTHER_INCOME','EXPENSE'].includes(original.entry_type)||original.reverses_entry_id)throw new Error('INVALID_REVERSAL_ROOT');
  for(const key of ['household_id','booking_id','entry_type','receipt_purpose','agreement_id','amount_vnd','payment_method']){
    if(String(original[key]??'')!==String(candidate[key]??''))throw new Error('REVERSAL_MISMATCH');
  }
  const [[existing]]=await c.execute('SELECT COUNT(*) AS n FROM financial_entries WHERE reverses_entry_id=?',[originalId]);
  if(Number(existing.n)>0)throw new Error('ALREADY_REVERSED');
}
function aggregateOutcome(items){
  if(!items.length||items.some(i=>i.outcome==='UNRESOLVED'))return null;
  if(items.every(i=>i.outcome==='SERVED'))return 'COMPLETED';
  if(items.every(i=>i.outcome==='NOT_SERVED'&&i.reason_code==='CUSTOMER_ABSENT'))return 'NO_SHOW';
  return 'INTERRUPTED';
}
try {
  const [[server]] = await control.query('SELECT VERSION() AS version');
  assert.match(server.version,/^8\.4\./);
  await control.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`); created=true;
  await control.query(`CREATE TABLE \`${name}\`.__v3_owner (token CHAR(32) PRIMARY KEY)`);
  await control.execute(`INSERT INTO \`${name}\`.__v3_owner (token) VALUES (?)`,[token]); marked=true;
  const c = await connection();
  for (const [index,sql] of sqls.entries()) {
    try { await c.query(sql); }
    catch(e) { throw new Error(`DDL statement ${index+1}: ${e.code} ${e.sqlMessage}`); }
  }
  const [columns] = await c.query(`SELECT TABLE_NAME AS table_name,COLUMN_NAME AS column_name,ORDINAL_POSITION AS ordinal_position,COLUMN_TYPE AS column_type,
    IS_NULLABLE AS is_nullable,COLUMN_DEFAULT AS column_default,EXTRA AS extra,GENERATION_EXPRESSION AS generation_expression
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME<>'__v3_owner' ORDER BY TABLE_NAME,ORDINAL_POSITION`);
  const [keys] = await c.query(`SELECT TABLE_NAME AS table_name,CONSTRAINT_NAME AS constraint_name,COLUMN_NAME AS column_name,ORDINAL_POSITION AS ordinal_position,
    REFERENCED_TABLE_NAME AS referenced_table_name,REFERENCED_COLUMN_NAME AS referenced_column_name FROM information_schema.KEY_COLUMN_USAGE
    WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME<>'__v3_owner' ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION`);
  const [constraints] = await c.query(`SELECT t.TABLE_NAME AS table_name,t.CONSTRAINT_NAME AS constraint_name,t.CONSTRAINT_TYPE AS constraint_type,t.ENFORCED AS enforced,
    c.CHECK_CLAUSE AS check_clause FROM information_schema.TABLE_CONSTRAINTS t LEFT JOIN information_schema.CHECK_CONSTRAINTS c
    ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME WHERE t.CONSTRAINT_SCHEMA=DATABASE() AND t.TABLE_NAME<>'__v3_owner' ORDER BY t.TABLE_NAME,t.CONSTRAINT_NAME`);
  const metadata = {columns,keys,constraints};
  await writeFile(new URL('schema-metadata.json',output),JSON.stringify(metadata,null,2));
  summary={mysql:server.version,tables:new Set(columns.map(v=>v.table_name)).size,columns:columns.length,foreign_keys:constraints.filter(v=>v.constraint_type==='FOREIGN KEY').length,
    primary_keys:constraints.filter(v=>v.constraint_type==='PRIMARY KEY').length,checks:constraints.filter(v=>v.constraint_type==='CHECK'&&v.enforced==='YES').length};
  assert.equal(summary.tables,30); assert.equal(summary.primary_keys,30);
  await close(c);
  checks.push({name:'DDL imports on actual MySQL 8.4 with enforced constraints',status:'PASS'});

  await test('Typed categories and household ownership reject invalid references',async c=>{
    const b=await fixture(c), x=await booking(c,b);
    await rejects(()=>insert(c,'booking_items',serviceValues(b,x.set,{service_id:b.services.B})),'ER_NO_REFERENCED_ROW_2');
    await rejects(()=>insert(c,'booking_items',roomValues(b,x.set,{room_id:b.rooms.B})),'ER_NO_REFERENCED_ROW_2');
    await rejects(()=>c.execute('UPDATE services SET category_id=? WHERE id=?',[b.productCategory,b.services.A]),'ER_NO_REFERENCED_ROW_2');
    await insert(c,'local_products',{household_id:b.households.A,category_id:b.productCategory,code:'HONEY'});
  });
  await test('Unified item discriminators, price units, nights and hour rounding',async c=>{
    const b=await fixture(c),x=await booking(c,b);
    await rejects(()=>insert(c,'booking_items',serviceValues(b,x.set,{room_id:b.rooms.A})),'ER_CHECK_CONSTRAINT_VIOLATED');
    await rejects(()=>insert(c,'booking_items',serviceValues(b,x.set,{quantity:2})),'ER_CHECK_CONSTRAINT_VIOLATED');
    await rejects(()=>insert(c,'booking_items',roomValues(b,x.set,{quantity:1,base_amount_vnd:400000})),'ER_CHECK_CONSTRAINT_VIOLATED');
    await insert(c,'booking_items',serviceValues(b,x.set,{pricing_type:'PER_GROUP',participant_count:5}));
    await insert(c,'booking_items',serviceValues(b,x.set,{pricing_type:'PER_HOUR',ends_at:'2030-11-20 07:20:00',occupied_ends_at:'2030-11-20 07:20:00',quantity:'0.3333',unit_price_vnd:100000,base_amount_vnd:33333}));
  });
  await test('Block targets and per-slot resource usage remain relational',async c=>{
    const b=await fixture(c),x=await booking(c,b),item=await insert(c,'booking_items',serviceValues(b,x.set));
    await rejects(()=>insert(c,'availability_blocks',{household_id:b.households.A,room_id:b.rooms.A,resource_id:b.resources.boat,starts_at:baseTime,ends_at:'2030-01-02 00:00:00',quantity:1,reason:'maintenance',created_by:b.users.ownerA}),'ER_CHECK_CONSTRAINT_VIOLATED');
    const slot=await insert(c,'service_slots',{household_id:b.households.A,service_id:b.services.A,starts_at:'2030-12-01 07:00:00',ends_at:'2030-12-01 10:00:00',person_capacity:10,created_by:b.users.ownerA});
    const assignment=await insert(c,'slot_resource_assignments',{household_id:b.households.A,slot_id:slot,resource_id:b.resources.bikes,quantity:10,allocation_mode:'PER_BOOKING_QUOTA'});
    await rejects(()=>insert(c,'item_resource_usages',{household_id:b.households.A,slot_id:b.slot,item_id:item,assignment_id:assignment,quantity:1,rule_snapshot:{}}),'ER_NO_REFERENCED_ROW_2');
    await insert(c,'item_resource_usages',{household_id:b.households.A,slot_id:b.slot,item_id:item,assignment_id:b.assignments.bikes,quantity:3,rule_snapshot:{basis:'PER_UNIT'}});
  });
  await test('Revision identity and copied media preserve separate published versions',async c=>{
    const b=await fixture(c);
    const values={content_type:'ROOM',room_id:b.rooms.A,title:'Room',body:'Description',details:{},schema_version:1,submitted_by:b.users.ownerA};
    const first=await insert(c,'content_revisions',{...values,version:1}),second=await insert(c,'content_revisions',{...values,version:2});
    const media={storage_provider:'TEST',object_key:'immutable/photo.jpg',mime_type:'image/jpeg',size_bytes:100,uploaded_by:b.users.ownerA,sort_order:0,is_cover:1};
    await insert(c,'revision_media',{...media,revision_id:first});
    await insert(c,'revision_media',{...media,revision_id:second});
    await rejects(()=>insert(c,'revision_media',{...media,revision_id:second,object_key:'other.jpg',sort_order:1}),'ER_DUP_ENTRY');
    await rejects(()=>c.execute('UPDATE rooms SET published_revision_id=? WHERE id=?',[first,b.rooms.B]),'ER_NO_REFERENCED_ROW_2');
    await c.execute('UPDATE rooms SET published_revision_id=? WHERE id=?',[first,b.rooms.A]);
    const [[room]]=await c.execute('SELECT published_revision_id FROM rooms WHERE id=?',[b.rooms.A]);
    assert.equal(String(room.published_revision_id),first);
  });
  await test('Bounded addon JSON rejects finite-resource fields and preserves copied prices',async c=>{
    const b=await fixture(c),x=await booking(c,b);
    const addon={key:'meal',name:'Meal preparation',unit_price_vnd:50000,max_quantity:4,is_active:true};
    await c.execute('UPDATE service_offers SET addons=? WHERE id=?',[JSON.stringify({schema_version:1,items:[addon]}),b.offers.shared]);
    await rejects(()=>c.execute('UPDATE service_offers SET addons=? WHERE id=?',[JSON.stringify({schema_version:1,items:[{...addon,resource_id:1}]}),b.offers.shared]),'ER_CHECK_CONSTRAINT_VIOLATED');
    const item=await insert(c,'booking_items',serviceValues(b,x.set,{addons_amount_vnd:100000,addons_snapshot:[{key:'meal',name:'Meal preparation',quantity:2,unit_price_vnd:50000,amount_vnd:100000}]}));
    await c.execute('UPDATE service_offers SET addons=? WHERE id=?',[JSON.stringify({schema_version:1,items:[{...addon,unit_price_vnd:70000}]}),b.offers.shared]);
    const [[r]]=await c.execute('SELECT total_vnd,addons_snapshot FROM booking_items WHERE id=?',[item]);
    assert.equal(r.total_vnd,'250000'); assert.equal(r.addons_snapshot[0].unit_price_vnd,50000);
  });
  await test('Unified ledger separates cash, obligations, adjustments and typed agreement roots',async c=>{
    const b=await fixture(c),x=await booking(c,b);
    const f={household_id:b.households.A,booking_id:x.id,occurred_at:baseTime,recorded_by:b.users.ownerA,note:'Fixture'};
    const receipt=await insert(c,'financial_entries',{...f,entry_type:'RECEIPT',receipt_purpose:'DEPOSIT',amount_vnd:1000000,payment_method:'CASH'});
    const agreement=await insert(c,'financial_entries',{...f,entry_type:'REFUND_AGREEMENT',amount_vnd:600000});
    await insert(c,'financial_entries',{...f,entry_type:'REFUND_ADJUSTMENT',agreement_id:agreement,amount_vnd:-100000});
    await insert(c,'financial_entries',{...f,entry_type:'REFUND',agreement_id:agreement,amount_vnd:200000,payment_method:'CASH'});
    await insert(c,'financial_entries',{...f,entry_type:'REFUND',agreement_id:agreement,amount_vnd:100000,payment_method:'CASH'});
    await rejects(()=>insert(c,'financial_entries',{...f,entry_type:'REFUND',agreement_id:receipt,amount_vnd:1,payment_method:'CASH'}),'ER_NO_REFERENCED_ROW_2');
    await rejects(()=>insert(c,'financial_entries',{...f,entry_type:'REFUND_AGREEMENT',amount_vnd:100,payment_method:'CASH'}),'ER_CHECK_CONSTRAINT_VIOLATED');
    await rejects(()=>insert(c,'financial_entries',{...f,entry_type:'EXPENSE',booking_id:null,amount_vnd:-100,payment_method:'CASH'}),'ER_CHECK_CONSTRAINT_VIOLATED');
    const [[totals]]=await c.execute(`SELECT SUM(CASE WHEN entry_type='RECEIPT' THEN amount_vnd ELSE 0 END) AS received,
      SUM(CASE WHEN entry_type IN ('REFUND_AGREEMENT','REFUND_ADJUSTMENT') THEN amount_vnd ELSE 0 END) AS owed,
      SUM(CASE WHEN entry_type='REFUND' THEN amount_vnd ELSE 0 END) AS refunded FROM financial_entries WHERE booking_id=?`,[x.id]);
    assert.deepEqual(totals,{received:'1000000',owed:'500000',refunded:'300000'});
  });
  await test('Partial service requires details and can release room early without rewriting stay',async c=>{
    const b=await fixture(c),x=await booking(c,b),item=await insert(c,'booking_items',roomValues(b,x.set));
    await rejects(()=>c.execute("UPDATE booking_items SET outcome='PARTIALLY_SERVED',outcome_recorded_by=?,outcome_recorded_at=? WHERE id=?",[b.users.ownerA,baseTime,item]),'ER_CHECK_CONSTRAINT_VIOLATED');
    await c.execute("UPDATE booking_items SET outcome='PARTIALLY_SERVED',reason_code='CUSTOMER_LEFT',outcome_detail=?,outcome_recorded_by=?,outcome_recorded_at=?,occupied_ends_at='2030-11-21 05:00:00' WHERE id=?",[JSON.stringify({reason:'Left early',served:'1 night',unserved:'2 nights'}),b.users.ownerA,'2030-11-21 05:00:00',item]);
    const [[r]]=await c.execute('SELECT quantity,base_amount_vnd,ends_at,occupied_ends_at FROM booking_items WHERE id=?',[item]);
    assert.equal(r.quantity,'3.0000'); assert.equal(r.base_amount_vnd,'1200000'); assert(r.ends_at>r.occupied_ends_at);
  });
  await test('Holds expire at the boundary without worker; COMMITTED ignores old deadline',async c=>{
    const b=await fixture(c),x=await booking(c,b);
    await insert(c,'booking_items',serviceValues(b,x.set));
    assert.equal((await occupancy(c,b.slot,'2030-11-19 09:59:59')).people,1);
    assert.equal((await occupancy(c,b.slot,'2030-11-19 10:00:00')).people,0);
    await c.execute("UPDATE reservation_sets SET status='COMMITTED' WHERE id=?",[x.set]);
    assert.equal((await occupancy(c,b.slot,'2030-11-19 10:00:00')).people,1);
  });
  await test('Proposal accept retains item, allocation and quota IDs with source guard',async c=>{
    const b=await fixture(c);
    const request=await insert(c,'schedule_requests',{household_id:b.households.A,customer_user_id:b.users.customer,request_code:randomBytes(8).toString('hex'),message:'Private visit',preferences:{}});
    const proposal=await insert(c,'booking_proposals',{household_id:b.households.A,request_id:request,version:1,created_by:b.users.ownerA,total_vnd:150000,terms_snapshot:{}});
    const set=await insert(c,'reservation_sets',{household_id:b.households.A,proposal_id:proposal,status:'DRAFT'});
    const item=await insert(c,'booking_items',serviceValues(b,set,{occupied_starts_at:null,occupied_ends_at:null}));
    assert.equal((await occupancy(c,b.slot,'2030-11-19 09:00:00')).people,0);
    await c.execute("UPDATE reservation_sets SET status='HELD',hold_started_at='2030-11-18 10:00:00',expires_at='2030-11-19 10:00:00' WHERE id=?",[set]);
    await c.execute("UPDATE booking_items SET occupied_starts_at=starts_at,occupied_ends_at=ends_at WHERE id=?",[item]);
    const usage=await insert(c,'item_resource_usages',{household_id:b.households.A,slot_id:b.slot,item_id:item,assignment_id:b.assignments.bikes,quantity:1,rule_snapshot:{}});
    const wrong=await booking(c,b);
    await c.execute('DELETE FROM reservation_sets WHERE id=?',[wrong.set]); // isolated fixture: test source FK, not unique set
    await rejects(()=>c.execute("UPDATE reservation_sets SET booking_id=?,status='COMMITTED' WHERE id=?",[wrong.id,set]),'ER_NO_REFERENCED_ROW_2');
    const accepted=await insert(c,'bookings',{household_id:b.households.A,booking_code:randomBytes(10).toString('hex'),customer_user_id:b.users.customer,created_by:b.users.customer,source:'CUSTOM_PROPOSAL',accepted_proposal_id:proposal,schedule_request_id:request,status:'CONFIRMED',contact_name:'Fixture',contact_phone:'TEST',first_starts_at:'2030-11-20 07:00:00',last_ends_at:'2030-11-20 10:00:00',total_vnd:150000,terms_snapshot:{},confirmed_at:'2030-11-19 09:00:00'});
    await c.execute("UPDATE reservation_sets SET booking_id=?,status='COMMITTED' WHERE id=?",[accepted,set]);
    const [[r]]=await c.execute('SELECT id,reservation_set_id FROM booking_items WHERE id=?',[item]);
    const [[u]]=await c.execute('SELECT id,item_id FROM item_resource_usages WHERE id=?',[usage]);
    assert.equal(String(r.reservation_set_id),set); assert.equal(String(u.item_id),item);
    assert.equal((await occupancy(c,b.slot,'2030-11-19 11:00:00')).people,1);
  });
  await test('Events preserve revocation causation and prevent Admin booking-status actor',async c=>{
    const b=await fixture(c),x=await booking(c,b);
    const cause=await insert(c,'activity_events',{household_id:b.households.A,actor_user_id:b.users.admin,actor_type:'ADMIN',event_type:'HOUSEHOLD_APPROVAL',entity_type:'households',entity_id:b.households.A,from_status:'APPROVED',to_status:'REVOKED',reason:'Provider cannot receive new requests',correlation_id:'fixture-revoke'});
    await insert(c,'activity_events',{household_id:b.households.A,booking_id:x.id,actor_type:'SYSTEM',event_type:'BOOKING_STATUS',entity_type:'bookings',entity_id:x.id,from_status:'PENDING',to_status:'CANCELLED',reason:'Approval revoked',caused_by_event_id:cause,correlation_id:'fixture-revoke'});
    await rejects(()=>insert(c,'activity_events',{household_id:b.households.A,booking_id:x.id,actor_user_id:b.users.admin,actor_type:'ADMIN',event_type:'BOOKING_STATUS',entity_type:'bookings',entity_id:x.id,to_status:'CONFIRMED',correlation_id:'invalid'}),'ER_CHECK_CONSTRAINT_VIOLATED');
  });
  await test('Offline source and account-linked review constraints remain intact',async c=>{
    const b=await fixture(c);
    const x=await booking(c,b,{source:'OFFLINE',customer_user_id:null,created_by:b.users.ownerA,offline_channel:'PHONE',status:'CONFIRMED',confirmed_at:baseTime});
    await rejects(()=>insert(c,'reviews',{household_id:b.households.A,booking_id:x.id,customer_user_id:b.users.customer,rating:5,comment:'Invalid offline link'}),'ER_NO_REFERENCED_ROW_2');
    const y=await booking(c,b,{customer_user_id:b.users.ownerB,created_by:b.users.ownerB});
    assert(y.id);
  });
  await test('Idempotency and notification keys reject duplicate writes',async c=>{
    const b=await fixture(c);
    const v={actor_user_id:b.users.customer,action:'accept',idempotency_key:'abc',request_hash:Buffer.alloc(32),response_status:200,response_body:{id:1},completed_at:baseTime};
    await insert(c,'idempotency_keys',v); await rejects(()=>insert(c,'idempotency_keys',v),'ER_DUP_ENTRY');
    const n={user_id:b.users.customer,event_key:'booking:1:confirmed',event_type:'CONFIRMED',title:'Confirmed',body:'Fixture',navigation:{}};
    await insert(c,'notifications',n); await rejects(()=>insert(c,'notifications',n),'ER_DUP_ENTRY');
  });
  await test('Command prototype validates complete item occupancy and required quota before sending',async c=>{
    const b=await fixture(c),x=await booking(c,b);
    await assert.rejects(()=>assertReadyItems(c,x.set),/EMPTY_SET/);
    const item=await insert(c,'booking_items',serviceValues(b,x.set,{occupied_starts_at:null,occupied_ends_at:null}));
    await assert.rejects(()=>assertReadyItems(c,x.set),/INCOMPLETE_ALLOCATION/);
    await c.execute('UPDATE booking_items SET occupied_starts_at=starts_at,occupied_ends_at=ends_at WHERE id=?',[item]);
    await insert(c,'slot_offer_resource_rules',{household_id:b.households.A,slot_id:b.slot,slot_offer_id:b.slotOffers.shared,assignment_id:b.assignments.bikes,usage_basis:'PER_PERSON',units_required:1});
    await assert.rejects(()=>assertReadyItems(c,x.set),/INCOMPLETE_QUOTA/);
    await insert(c,'item_resource_usages',{household_id:b.households.A,slot_id:b.slot,item_id:item,assignment_id:b.assignments.bikes,quantity:1,rule_snapshot:{}});
    assert.equal((await assertReadyItems(c,x.set)).length,1);
  });
  await test('Command prototype enforces addon key uniqueness and backend price calculation',async()=>{
    const a={key:'meal',name:'Meal',unit_price_vnd:50000,max_quantity:3,is_active:true};
    assert.throws(()=>priceAddons({items:[a,a]},[]),/DUPLICATE_ADDON/);
    assert.throws(()=>priceAddons({items:[a]},[{key:'meal',quantity:1},{key:'meal',quantity:1}]),/INVALID_ADDON/);
    assert.throws(()=>priceAddons({items:[a]},[{key:'meal',quantity:4}]),/INVALID_ADDON/);
    assert.throws(()=>priceAddons({items:[a]},[{key:'bicycle',quantity:1}]),/INVALID_ADDON/);
    const priced=priceAddons({items:[a]},[{key:'meal',quantity:2,unit_price_vnd:1}]);
    assert.equal(priced.total,'100000');assert.equal(priced.snapshot[0].unit_price_vnd,50000);
  });
  await test('Command prototype rejects mismatched cash reversal and excludes obligations from cash',async c=>{
    const b=await fixture(c),x=await booking(c,b);
    const value={household_id:b.households.A,booking_id:x.id,entry_type:'RECEIPT',receipt_purpose:'DEPOSIT',amount_vnd:1000000,payment_method:'CASH',occurred_at:baseTime,recorded_by:b.users.ownerA,note:'Receipt'};
    const original=await insert(c,'financial_entries',value);
    await assert.rejects(()=>assertCashReversal(c,original,{...value,amount_vnd:1}),/REVERSAL_MISMATCH/);
    await assertCashReversal(c,original,value);
    const reversal=await insert(c,'financial_entries',{...value,reverses_entry_id:original,note:'Reverse mistake'});
    await assert.rejects(()=>assertCashReversal(c,original,value),/ALREADY_REVERSED/);
    await assert.rejects(()=>assertCashReversal(c,reversal,value),/INVALID_REVERSAL_ROOT/);
    await insert(c,'financial_entries',{...value,amount_vnd:800000,note:'Corrected receipt'});
    const [[sum]]=await c.execute("SELECT SUM(CASE WHEN reverses_entry_id IS NULL THEN amount_vnd ELSE -amount_vnd END) AS amount FROM financial_entries WHERE booking_id=? AND entry_type='RECEIPT'",[x.id]);
    assert.equal(sum.amount,'800000');
  });
  await test('Cancelling one shared booking releases only its people and quota',async c=>{
    const b=await fixture(c),one=await booking(c,b),two=await booking(c,b);
    for(const [x,quantity] of [[one,7],[two,2]]){
      const item=await insert(c,'booking_items',serviceValues(b,x.set,{participant_count:quantity,quantity,base_amount_vnd:quantity*150000}));
      await insert(c,'item_resource_usages',{household_id:b.households.A,slot_id:b.slot,item_id:item,assignment_id:b.assignments.bikes,quantity,rule_snapshot:{}});
    }
    await c.execute("UPDATE reservation_sets SET status='RELEASED',released_at='2030-11-19 08:00:00' WHERE id=?",[one.set]);
    assert.equal((await occupancy(c,b.slot,'2030-11-19 09:00:00')).people,2);
    const [[used]]=await c.execute(`SELECT SUM(u.quantity) AS used FROM item_resource_usages u JOIN booking_items i ON i.id=u.item_id JOIN reservation_sets rs ON rs.id=i.reservation_set_id WHERE u.assignment_id=? AND ${activeSql}`,[b.assignments.bikes,'2030-11-19 09:00:00']);
    assert.equal(used.used,'2');
    const [[boat]]=await c.execute('SELECT quantity,released_at FROM slot_resource_assignments WHERE id=?',[b.assignments.boat]);
    assert.equal(boat.quantity,1);assert.equal(boat.released_at,null);
  });
  await test('Item outcome aggregation distinguishes partial, weather, no-show and unresolved',async()=>{
    assert.equal(aggregateOutcome([{outcome:'SERVED'},{outcome:'SERVED'}]),'COMPLETED');
    assert.equal(aggregateOutcome([{outcome:'SERVED'},{outcome:'NOT_SERVED',reason_code:'WEATHER'}]),'INTERRUPTED');
    assert.equal(aggregateOutcome([{outcome:'PARTIALLY_SERVED',reason_code:'CUSTOMER_LEFT'}]),'INTERRUPTED');
    assert.equal(aggregateOutcome([{outcome:'NOT_SERVED',reason_code:'CUSTOMER_ABSENT'}]),'NO_SHOW');
    assert.equal(aggregateOutcome([{outcome:'NOT_SERVED',reason_code:'PROVIDER_FAILURE'}]),'INTERRUPTED');
    assert.equal(aggregateOutcome([{outcome:'SERVED'},{outcome:'UNRESOLVED'}]),null);
  });

  // These are small SQL transaction prototypes to exercise the design, not production APIs.
  const seed=await connection(), b=await fixture(seed); await close(seed);
  async function reserve(people,exclusive,units) {
    const c=await connection(); await c.beginTransaction();
    try {
      const [[house]]=await c.execute('SELECT approval_status FROM households WHERE id=? FOR UPDATE',[b.households.A]);
      if(house.approval_status!=='APPROVED') throw new Error('INELIGIBLE');
      const used=await occupancy(c,b.slot,'2030-11-19 09:00:00');
      const [[q]]=await c.execute(`SELECT COALESCE(SUM(u.quantity),0) AS used FROM item_resource_usages u JOIN booking_items i ON i.id=u.item_id JOIN reservation_sets rs ON rs.id=i.reservation_set_id WHERE u.assignment_id=? AND ${activeSql}`,[b.assignments.bikes,'2030-11-19 09:00:00']);
      if(used.exclusive || (exclusive && used.commitments>0) || used.people+people>10 || Number(q.used)+units>10) throw new Error('UNAVAILABLE');
      const x=await booking(c,b);
      const item=await insert(c,'booking_items',serviceValues(b,x.set,{offer_id:exclusive?b.offers.exclusive:b.offers.shared,participant_count:people,quantity:exclusive?1:people,pricing_type:exclusive?'PER_TRIP':'PER_PERSON',is_exclusive:exclusive?1:0,base_amount_vnd:exclusive?150000:150000*people}));
      if(units) await insert(c,'item_resource_usages',{household_id:b.households.A,slot_id:b.slot,item_id:item,assignment_id:b.assignments.bikes,quantity:units,rule_snapshot:{}});
      await c.commit(); return x;
    } catch(e) {await c.rollback();throw e;} finally {await close(c);}
  }
  const races=await Promise.allSettled([reserve(6,false,6),reserve(6,false,6),reserve(4,true,4)]);
  assert.equal(races.filter(r=>r.status==='fulfilled').length,1);
  const read=await connection();
  const actual=await occupancy(read,b.slot,'2030-11-19 09:00:00');
  assert(actual.people<=10); assert(actual.commitments===1);
  await close(read);
  checks.push({name:'MySQL concurrent shared/shared/exclusive with household mutex never exceeds capacity/quota',status:'PASS'});
  console.log('PASS concurrent shared/shared/exclusive SQL prototype');

  const peak=intervals=>{
    const events=new Map(); for(const [s,e,q] of intervals){events.set(s,(events.get(s)||0)+q);events.set(e,(events.get(e)||0)-q);}
    let use=0,max=0;for(const [t,delta] of [...events].sort((a,b)=>a[0]-b[0])){use+=delta;max=Math.max(max,use);}return max;
  };
  assert.equal(peak([[8,9,6],[9,10,6],[8,10,4]]),10);
  assert.equal(peak([[8,9.5,6],[9,10,6],[8,10,4]]),16);
  checks.push({name:'Pool sweep-line boundary and partial overlap examples',status:'PASS'});

  const report={status:'PASS',checkedAt:new Date().toISOString(),...summary,statements:sqls.length,schemaSha256:createHash('sha256').update(source).digest('hex'),checks,
    limits:['Validation uses disposable local MySQL only; Aiven is unchanged.','SQL transaction prototypes are not production booking APIs.','Authorization, full proposal replacement/revocation races and complete business acceptance remain implementation work.']};
  await writeFile(new URL('validation-results.json',output),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:'PASS',...summary,tests:checks.length}));
} catch(e) {
  console.error(e.message); process.exitCode=1;
} finally {
  for(const c of connections){try{await c.rollback();await c.end();}catch{c.destroy();}}
  try {
    if(created && marked){const [[row]]=await control.execute(`SELECT token FROM \`${name}\`.__v3_owner`);assert.equal(row.token,token);await control.query(`DROP DATABASE \`${name}\``);}
    else if(created){await control.query(`DROP DATABASE \`${name}\``);}
  } finally {await control.end();}
}
