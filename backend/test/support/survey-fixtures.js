import { randomUUID } from 'node:crypto';
import { insert } from './fixtures.js';

export async function surveyBase(c) {
  const users = {};
  for (const [name,role] of [['customer','CUSTOMER'],['other','CUSTOMER'],['ownerA','HOUSEHOLD'],['ownerB','HOUSEHOLD']]) {
    users[name] = await insert(c,'users',{email:`${name}-${randomUUID()}@fixture.invalid`,display_name:name,role,password_hash:'!TEST_ONLY_NO_LOGIN!',updated_at:'2030-01-01 00:00:00'});
  }
  const households = {};
  for (const k of ['A','B']) households[k] = await insert(c,'households',{owner_user_id:users[`owner${k}`],code:randomUUID(),approval_status:'APPROVED',updated_at:'2030-01-01 00:00:00'});
  const place = await insert(c,'places',{household_id:households.A,code:'GARDEN'});
  const room = await insert(c,'rooms',{household_id:households.A,code:'SEN',max_guests:4,nightly_price_vnd:'400000',place_id:place});
  const category = await insert(c,'categories',{kind:'SERVICE',code:randomUUID(),name:'Experience'});
  const service = await insert(c,'services',{household_id:households.A,code:'BIKES',category_id:category,default_duration_minutes:120,default_place_id:place});
  const offer = await insert(c,'service_offers',{household_id:households.A,service_id:service,name:'Bicycle rental',participation_mode:'SHARED',pricing_type:'PER_UNIT',unit_price_vnd:'50000',unit_label:'bike',min_participants:1,max_participants:10,terms:{}});
  const slot = await insert(c,'service_slots',{household_id:households.A,service_id:service,place_id:place,starts_at:'2030-11-20 07:00:00',ends_at:'2030-11-20 09:00:00',person_capacity:10,sales_status:'OPEN',created_by:users.ownerA,readiness_status:'CONFIRMED',readiness_confirmed_by:users.ownerA,readiness_confirmed_at:'2030-10-01 00:00:00'});
  await insert(c,'slot_offers',{household_id:households.A,service_id:service,slot_id:slot,offer_id:offer});
  const resource = await insert(c,'resources',{household_id:households.A,code:'BIKES',name:'Bicycle pool',resource_type:'POOL',total_quantity:10});
  const assignment = await insert(c,'slot_resource_assignments',{household_id:households.A,slot_id:slot,resource_id:resource,quantity:10,allocation_mode:'PER_BOOKING_QUOTA',preparation_minutes:15,cleanup_minutes:30});
  return { users,households,place,room,category,service,offer,slot,resource,assignment };
}
export async function surveyBooking(c, b, overrides = {}) {
  const booking = await insert(c,'bookings',{household_id:b.households.A,booking_code:randomUUID(),customer_user_id:b.users.customer,created_by:b.users.customer,source:'ONLINE',status:'CONFIRMED',contact_name:'Fixture',contact_phone:'0000000000',first_starts_at:'2030-11-20 07:00:00',last_ends_at:'2030-11-20 09:00:00',total_vnd:'150000',terms_snapshot:{},confirmed_at:'2030-10-01 00:00:00',...overrides});
  const set = await insert(c,'reservation_sets',{household_id:b.households.A,booking_id:booking,status:'COMMITTED',total_vnd:'150000',terms_snapshot:{},first_starts_at:'2030-11-20 07:00:00',last_ends_at:'2030-11-20 09:00:00',accepted_at:'2030-10-01 00:00:00'});
  const item = await insert(c,'booking_items',{household_id:b.households.A,reservation_set_id:set,kind:'SERVICE',service_id:b.service,offer_id:b.offer,slot_id:b.slot,participant_count:3,quantity:'3',pricing_type:'PER_UNIT',starts_at:'2030-11-20 07:00:00',ends_at:'2030-11-20 09:00:00',unit_price_vnd:'50000',base_amount_vnd:'150000',snapshot:{ name:'Bicycle rental', place:'Original place' }});
  const usage = await insert(c,'item_resource_usages',{household_id:b.households.A,slot_id:b.slot,item_id:item,assignment_id:b.assignment,quantity:3,rule_snapshot:{usage_basis:'PER_UNIT',units_required:1}});
  await c.execute('UPDATE bookings SET current_reservation_set_id=? WHERE id=?',[set,booking]);
  return {booking,set,item,usage};
}
export async function surveyCredit(c,b,booking) {
  const receipt = await insert(c,'financial_entries',{household_id:b.households.A,booking_id:booking,entry_type:'RECEIPT',receipt_purpose:'DEPOSIT',amount_vnd:'300000',payment_method:'CASH',occurred_at:'2030-10-01 00:00:00',recorded_by:b.users.ownerA,note:'Deposit'});
  const value = {household_id:b.households.A,credit_code:randomUUID(),source_receipt_id:receipt,source_booking_id:booking,customer_user_id:b.users.customer,beneficiary_snapshot:{name:'Fixture'},amount_vnd:'200000',agreed_at:'2030-10-01 00:00:00',expires_at:'2031-10-01 00:00:00',terms_snapshot:{consent:'Test agreement'},recorded_by:b.users.ownerA,operation_key:randomUUID()};
  const credit = await insert(c,'deposit_credits',value);
  return {receipt,credit,value};
}
