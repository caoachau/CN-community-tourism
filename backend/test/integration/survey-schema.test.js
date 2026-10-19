import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createTestDatabase } from '../support/mysql.js';
import { insert } from '../support/fixtures.js';
import { surveyBase, surveyBooking, surveyCredit } from '../support/survey-fixtures.js';
import { ownershipRule } from '../../src/auth/ownership.js';
import { loadMigrations } from '../../src/migrations.js';

let db;
before(async () => { db = await createTestDatabase(process.env,{schema:'survey'}); });
after(async () => { await db?.dispose(); });
const rejected = (operation) => assert.rejects(operation,(e) => ['ER_CHECK_CONSTRAINT_VIOLATED','ER_NO_REFERENCED_ROW_2','ER_DUP_ENTRY'].includes(e.code));

test('21 conceptual entities and four attributed associations cover all 34 physical tables',async () => {
  const map = JSON.parse(await readFile(new URL('../../schema/survey-mapping.json',import.meta.url),'utf8'));
  const plan = await loadMigrations();
  assert.equal(map.entities.length,21);
  assert.equal(new Set(map.entities.map(e=>e.code)).size,21);
  const mapped = new Set([...map.entities.flatMap(e=>e.tables),...map.associationsWithAttributes.flatMap(e=>e.tables),...map.technicalTables]);
  assert.deepEqual([...mapped].sort(),plan.expected.tables.map(t=>t.name).sort());
});

test('place references cannot cross households; revision belongs to exactly one of six roots',async () => db.rollback(async c => {
  const b=await surveyBase(c);
  await rejected(insert(c,'rooms',{household_id:b.households.B,code:'WRONG',max_guests:2,nightly_price_vnd:'100000',place_id:b.place}));
  const revision={content_type:'PLACE',place_id:b.place,version:1,title:'Garden',body:'Directions',details:{address:'Test address'},schema_version:1,submitted_by:b.users.ownerA};
  await rejected(insert(c,'content_revisions',{...revision,room_id:b.room}));
  const id=await insert(c,'content_revisions',revision);
  await rejected(c.execute('UPDATE rooms SET published_revision_id=? WHERE id=?',[id,b.room]));
  const [rows]=await c.execute(ownershipRule('contentRevision').sql,[id]);
  assert.equal(String(rows[0].household_id),b.households.A);
  const [[place]]=await c.execute(ownershipRule('place').sql,[b.place]);
  assert.equal(String(place.household_id),b.households.A);
}));

test('requests keep inquiry distinct from rescheduling and permit offline evidence without a fake customer',async () => db.rollback(async c => {
  const b=await surveyBase(c); const order=await surveyBooking(c,b,{source:'OFFLINE',customer_user_id:null,offline_channel:'PHONE',created_by:b.users.ownerA});
  const change={household_id:b.households.A,request_code:randomUUID(),message:'Change date',preferences:{},request_kind:'BOOKING_CHANGE',booking_id:order.booking,created_by:b.users.ownerA,contact_snapshot:{phone:'0000000000'}};
  await rejected(insert(c,'schedule_requests',{...change,contact_snapshot:null}));
  await insert(c,'schedule_requests',change);
  await rejected(insert(c,'schedule_requests',{...change,request_code:randomUUID()}));
  await rejected(insert(c,'schedule_requests',{household_id:b.households.B,customer_user_id:b.users.customer,request_code:randomUUID(),message:'Inquiry',preferences:{},request_kind:'SERVICE_INQUIRY',service_id:b.service}));
}));

test('readiness confirmation requires an actor/time; an unknown repair end can remain blocked',async () => db.rollback(async c => {
  const b=await surveyBase(c);
  await rejected(c.execute('UPDATE service_slots SET readiness_confirmed_by=NULL,readiness_confirmed_at=NULL WHERE id=?',[b.slot]));
  await insert(c,'availability_blocks',{household_id:b.households.A,resource_id:b.resource,starts_at:'2030-11-20 09:00:00',ends_at:null,quantity:1,reason:'Awaiting repair',created_by:b.users.ownerA});
}));

test('reschedule holds coexist with the old commitment; accepting switches current version atomically',async () => db.rollback(async c => {
  const b=await surveyBase(c); const old=await surveyBooking(c,b);
  const request=await insert(c,'schedule_requests',{household_id:b.households.A,customer_user_id:b.users.customer,request_code:randomUUID(),message:'New date',preferences:{},request_kind:'BOOKING_CHANGE',booking_id:old.booking,status:'PROPOSED'});
  const proposal=await insert(c,'booking_proposals',{household_id:b.households.A,request_id:request,booking_id:old.booking,version:1,created_by:b.users.ownerA,status:'SENT',sent_at:'2030-10-01 00:00:00',expires_at:'2030-10-02 00:00:00',total_vnd:'150000',terms_snapshot:{}});
  const values={household_id:b.households.A,booking_id:old.booking,proposal_id:proposal,version:2,purpose:'RESCHEDULE',base_set_id:old.set,status:'HELD',hold_started_at:'2030-10-01 00:00:00',expires_at:'2030-10-02 00:00:00',total_vnd:'150000',terms_snapshot:{},first_starts_at:'2030-11-21 07:00:00',last_ends_at:'2030-11-21 09:00:00'};
  const next=await insert(c,'reservation_sets',values);
  const [[before]]=await c.execute('SELECT current_reservation_set_id FROM bookings WHERE id=?',[old.booking]);
  assert.equal(String(before.current_reservation_set_id),old.set);
  await rejected(c.execute("UPDATE reservation_sets SET status='COMMITTED' WHERE id=?",[next]));
  const another=await surveyBooking(c,b);
  await rejected(c.execute('UPDATE reservation_sets SET base_set_id=? WHERE id=?',[another.set,next]));
  await rejected(c.execute('UPDATE bookings SET current_reservation_set_id=? WHERE id=?',[another.set,old.booking]));
  await c.execute("UPDATE reservation_sets SET status='RELEASED',released_at='2030-10-01 01:00:00',release_reason='Replaced' WHERE id=?",[old.set]);
  await c.execute("UPDATE reservation_sets SET status='COMMITTED',accepted_at='2030-10-01 01:00:00' WHERE id=?",[next]);
  await c.execute('UPDATE bookings SET current_reservation_set_id=? WHERE id=?',[next,old.booking]);
  const [[result]]=await c.execute('SELECT COUNT(*) n FROM reservation_sets WHERE booking_id=? AND status=?',[old.booking,'COMMITTED']);
  assert.equal(Number(result.n),1);
  // Capacity, unchanged-item mapping, consent and expiry are API transaction rules,
  // not claims made by this relational transition test.
}));

test('preparation and actual attendance do not overwrite committed quantities or prices',async () => db.rollback(async c => {
  const b=await surveyBase(c); const order=await surveyBooking(c,b);
  await rejected(c.execute('UPDATE booking_items SET preparations=? WHERE id=?',[JSON.stringify([{key:'meal',name:'Meal'}]),order.item]));
  const preparations=[{key:'bike',name:'Bicycles',required_quantity:3,prepared_quantity:3,unit:'bike',status:'READY',recorded_by:b.users.ownerA,recorded_at:'2030-11-20T06:30:00Z'}];
  await c.execute('UPDATE booking_items SET preparations=?,actual_participant_count=2,actual_served_quantity=2,actual_served_unit=? WHERE id=?',[JSON.stringify(preparations),'bike',order.item]);
  const [[row]]=await c.execute('SELECT participant_count,quantity,total_vnd,actual_participant_count FROM booking_items WHERE id=?',[order.item]);
  assert.equal(row.participant_count,3); assert.equal(row.quantity,'3.0000'); assert.equal(row.total_vnd,'150000'); assert.equal(row.actual_participant_count,2);
}));

test('deposit credit has a real deposit source, explicit expiry agreement and household ownership',async () => db.rollback(async c => {
  const b=await surveyBase(c); const order=await surveyBooking(c,b); const credit=await surveyCredit(c,b,order.booking);
  await rejected(insert(c,'deposit_credits',{...credit.value,credit_code:randomUUID(),operation_key:randomUUID(),household_id:b.households.B}));
  await rejected(insert(c,'deposit_credits',{...credit.value,credit_code:randomUUID(),operation_key:randomUUID(),expires_at:null}));
  await rejected(insert(c,'deposit_credits',{...credit.value,credit_code:randomUUID(),operation_key:randomUUID(),customer_user_id:b.users.other}));
  const [[scope]]=await c.execute(ownershipRule('depositCredit').sql,[credit.credit]);
  assert.equal(String(scope.household_id),b.households.A); assert.equal(String(scope.customer_user_id),b.users.customer);
}));

test('credit application/partial restoration retains origins and does not create new cash receipts',async () => db.rollback(async c => {
  const b=await surveyBase(c); const order=await surveyBooking(c,b); const credit=await surveyCredit(c,b,order.booking);
  const value={household_id:b.households.A,credit_id:credit.credit,booking_id:order.booking,movement_kind:'APPLY',amount_vnd:'150000',occurred_at:'2030-10-02 00:00:00',recorded_by:b.users.ownerA,consent_snapshot:{confirmed:true},reason:'Agreed application',operation_key:randomUUID()};
  const apply=await insert(c,'deposit_credit_movements',value);
  await rejected(insert(c,'deposit_credit_movements',value));
  const restore=await insert(c,'deposit_credit_movements',{...value,movement_kind:'RESTORE',restores_movement_id:apply,amount_vnd:'50000',operation_key:randomUUID()});
  await rejected(insert(c,'deposit_credit_movements',{...value,movement_kind:'RESTORE',restores_movement_id:restore,operation_key:randomUUID()}));
  const [[money]]=await c.query("SELECT SUM(amount_vnd) amount FROM financial_entries WHERE entry_type='RECEIPT'");
  assert.equal(money.amount,'300000');
  const [[movement]]=await c.query("SELECT SUM(CASE WHEN movement_kind='APPLY' THEN amount_vnd ELSE -amount_vnd END) applied FROM deposit_credit_movements");
  assert.equal(movement.applied,'100000');
}));

test('refund obligation has exactly one source; actual refunds must match their credit or booking root',async () => db.rollback(async c => {
  const b=await surveyBase(c); const order=await surveyBooking(c,b); const credit=await surveyCredit(c,b,order.booking);
  const root={household_id:b.households.A,deposit_credit_id:credit.credit,entry_type:'REFUND_AGREEMENT',amount_vnd:'50000',occurred_at:'2030-10-02 00:00:00',recorded_by:b.users.ownerA,note:'Agreed return of credit'};
  await rejected(insert(c,'financial_entries',{...root,booking_id:order.booking}));
  const obligation=await insert(c,'financial_entries',root);
  const cash={...root,entry_type:'REFUND',agreement_id:obligation,payment_method:'BANK_TRANSFER',amount_vnd:'20000'};
  const refund=await insert(c,'financial_entries',cash);
  await rejected(insert(c,'financial_entries',{...cash,deposit_credit_id:null,booking_id:order.booking}));
  await rejected(insert(c,'financial_entries',{...cash,reverses_entry_id:refund,amount_vnd:'10000'}));
  const [[balance]]=await c.query("SELECT SUM(CASE WHEN entry_type='REFUND_AGREEMENT' THEN amount_vnd WHEN entry_type='REFUND' THEN -amount_vnd ELSE 0 END) outstanding FROM financial_entries WHERE deposit_credit_id IS NOT NULL");
  assert.equal(balance.outstanding,'30000');
}));

test('handover histories support multiple partial returns and prohibit wrong origins or duplicate operations',async () => db.rollback(async c => {
  const b=await surveyBase(c); const order=await surveyBooking(c,b);
  const event={household_id:b.households.A,usage_id:order.usage,event_kind:'ISSUE',quantity:3,condition_note:'Ready',occurred_at:'2030-11-20 07:00:00',recorded_by:b.users.ownerA,operation_key:randomUUID()};
  const issue=await insert(c,'resource_handovers',event);
  await rejected(insert(c,'resource_handovers',event));
  const first=await insert(c,'resource_handovers',{...event,event_kind:'RETURN',quantity:1,returns_event_id:issue,operation_key:randomUUID()});
  await insert(c,'resource_handovers',{...event,event_kind:'RETURN',quantity:2,returns_event_id:issue,operation_key:randomUUID()});
  await rejected(insert(c,'resource_handovers',{...event,event_kind:'RETURN',quantity:1,returns_event_id:first,operation_key:randomUUID()}));
  const other=await surveyBooking(c,b);
  await rejected(insert(c,'resource_handovers',{...event,usage_id:other.usage,event_kind:'RETURN',quantity:1,returns_event_id:issue,operation_key:randomUUID()}));
  const [[row]]=await c.query("SELECT SUM(CASE WHEN event_kind='ISSUE' THEN quantity ELSE -quantity END) outstanding FROM resource_handovers");
  assert.equal(Number(row.outstanding),0);
}));

test('only incidents can attach item detail; household incident access does not expose complaints',async () => db.rollback(async c => {
  const b=await surveyBase(c); const order=await surveyBooking(c,b);
  const data={household_id:b.households.A,booking_id:order.booking,item_id:order.item,reported_by:b.users.ownerA,subject:'Bike damaged',description:'Inspection needed'};
  await rejected(insert(c,'complaints',data));
  const incident=await insert(c,'complaints',{...data,feedback_kind:'INCIDENT'});
  const complaint=await insert(c,'complaints',{...data,item_id:null});
  const [[row]]=await c.execute(ownershipRule('incident').sql,[incident]);
  assert.equal(String(row.household_id),b.households.A);
  const [hidden]=await c.execute(ownershipRule('incident').sql,[complaint]); assert.equal(hidden.length,0);
}));
