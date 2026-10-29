import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {randomBytes,randomUUID} from 'node:crypto';
import mysql from 'mysql2/promise';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {createTestDatabase} from '../support/mysql.js';
import {testDatabaseOptions} from '../support/config.js';
import {insert} from '../support/fixtures.js';
import {databaseAccess} from '../../src/database.js';
import {authOptions} from '../../src/config/auth.js';
import {hashPassword} from '../../src/auth/passwords.js';
import {createAuthRepository} from '../../src/auth/repository.js';
import {createAuthService} from '../../src/auth/service.js';
import {createHouseholdRepository} from '../../src/households/repository.js';
import {createHouseholdService} from '../../src/households/service.js';
import {createCatalogRepository} from '../../src/catalog/repository.js';
import {createCatalogService} from '../../src/catalog/service.js';
import {createServiceRepository} from '../../src/services/repository.js';
import {createServiceService} from '../../src/services/service.js';
import {createRoomRepository} from '../../src/rooms/repository.js';
import {createRoomService} from '../../src/rooms/service.js';
import {createCalendarRepository} from '../../src/calendar/repository.js';
import {createCalendarService} from '../../src/calendar/service.js';
import {slotConfiguration} from '../../src/calendar/models.js';
import {openApiDocument} from '../../src/openapi.js';
import {createApp} from '../../src/app.js';
import {createLogger} from '../../src/shared/logger.js';

let database,pool,authRepository,authService,householdService,catalogService,serviceService,roomService,repository,service,server,url,contract,passwordHash,admin,customer,a,b,sequence=0;
const password='Long isolated calendar fixture password',prefix='/households/me/calendar',audit=()=>randomUUID();
const ajv=addFormats(new Ajv({strict:false,allErrors:true}));
const window={from:'2035-11-01T00:00:00Z',to:'2035-12-31T23:59:59Z'};
const ref=data=>({revisionId:data.profile.revisionId,version:data.profile.version});
const command=(value,extra={})=>({expectedToken:value.token,reason:'Điều chỉnh lịch phục vụ',...extra});
const update=(slot,extra={})=>({...slotConfiguration(slot),...command(slot),...extra});
const sqlDate=value=>new Date(value).toISOString().slice(0,19).replace('T',' ');
async function account(role='CUSTOMER') {
  const user=await authRepository.transaction(tx=>tx.createUser({email:`calendar-${++sequence}@example.invalid`,displayName:'Calendar fixture',passwordHash,role}));
  return authService.login({email:user.email,password});
}
const actor=session=>authService.authenticate(session.accessToken);
async function request(path,{session=a?.owner,method='GET',body,query}={}) {
  const target=new URL(`${url}/api/v1${path}`);for(const [key,value]of Object.entries(query??{}))target.searchParams.set(key,value);
  const response=await fetch(target,{method,headers:{...(session?{Authorization:`Bearer ${session.accessToken}`} : {}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const payload=await response.json();
  const key=`/api/v1${path.replace(/\/slots\/\d+/g,'/slots/{slotId}').replace(/\/resources\/\d+/g,'/resources/{resourceId}').replace(/\/blocks\/\d+/g,'/blocks/{blockId}').replace(/\/services\/\d+/g,'/services/{serviceId}').replace(/\/rooms\/\d+/g,'/rooms/{roomId}')}`;
  const operation=contract.paths[key]?.[method.toLowerCase()];assert.ok(operation,`Undocumented ${method} ${key}`);
  const validator=ajv.compile((operation.responses[response.status]??operation.responses.default).content['application/json'].schema);
  assert.equal(validator(payload),true,JSON.stringify(validator.errors));assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(payload.meta.requestId,response.headers.get('x-request-id'));
  return {status:response.status,data:payload.data,code:payload.error?.code};
}
async function fixture() {
  const owner=await account(),auth=await actor(owner),adminAuth=await actor(admin);
  let h=await householdService.open(auth,{title:'Hộ du lịch lịch phục vụ',body:'Gia đình cung cấp lưu trú và các trải nghiệm trong vườn.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',contactPhone:'0901234567'}},audit());
  await householdService.submit(auth,ref(h),audit());h=await householdService.review(adminAuth,h.profile.revisionId,{version:h.profile.version,decision:'APPROVED'},audit());
  const host=await actor(owner);
  let place=await catalogService.createPlace(host,{title:'Nhà vườn lịch phục vụ',body:'Điểm đón khách nghỉ ngơi và trải nghiệm trong vườn.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long'}},audit());
  await catalogService.submitPlace(host,place.place.id,ref(place),audit());place=await catalogService.reviewPlace(adminAuth,place.profile.revisionId,{version:1,decision:'APPROVED'},audit());
  const category=await catalogService.createCategory(adminAuth,{kind:'SERVICE',code:`CAL_${++sequence}`,name:'Trải nghiệm',isActive:true,reason:'Kiểm thử lịch'},audit());
  let s=await serviceService.create(host,{title:'Trải nghiệm theo khung giờ',body:'Hộ tổ chức trải nghiệm có kiểm soát sức chứa và tài nguyên.',categoryId:category.category.id,defaultPlaceId:place.place.id,defaultDurationMinutes:120},audit());
  for(const [name,type,mode]of [['Khách ghép','PER_PERSON','SHARED'],['Thuê riêng','PER_GROUP','EXCLUSIVE'],['Thuê xe','PER_UNIT','SHARED']])await serviceService.createOffer(host,s.service.id,{name,pricingType:type,participationMode:mode,unitPriceVnd:150000,minParticipants:1,maxParticipants:10,terms:{scopeDescription:'Toàn bộ hoạt động trong khung giờ đã chọn.'},...(type==='PER_UNIT'?{unitLabel:'xe',maxUnits:10,participantsPerUnit:1}:{})},audit());
  s=await serviceService.mine(host,s.service.id);await serviceService.submit(host,s.service.id,{...ref(s),offersToken:s.offersToken},audit());
  s=await serviceService.review(adminAuth,s.profile.revisionId,{version:1,decision:'APPROVED'},audit());
  let room=await roomService.create(host,{title:'Phòng lịch phục vụ',body:'Phòng có điều hòa, phục vụ từng phòng theo từng đêm.',placeId:place.place.id,maxGuests:4,nightlyPriceVnd:400000},audit());
  await roomService.submit(host,room.room.id,{...ref(room),pricingToken:room.room.pricingToken},audit());room=await roomService.review(adminAuth,room.profile.revisionId,{version:1,decision:'APPROVED'},audit());
  return {owner,auth:host,householdId:h.household.id,serviceId:s.service.id,placeId:place.place.id,roomId:room.room.id,offers:s.offers};
}
async function resource(extra={},f=a) {
  const r=await request(`${prefix}/resources`,{method:'POST',session:f.owner,body:{code:`RES_${++sequence}`,name:'Tài nguyên phục vụ',resourceType:'POOL',totalQuantity:10,...extra}});
  assert.equal(r.status,201);return r.data.resource;
}
async function slot(extra={},f=a) {
  const day=String(1+(sequence++%20)).padStart(2,'0');
  const r=await request(`${prefix}/slots`,{method:'POST',session:f.owner,body:{serviceId:f.serviceId,startsAt:`2035-11-${day}T07:00:00Z`,endsAt:`2035-11-${day}T09:00:00Z`,personCapacity:10,offers:[{offerId:f.offers[0].id}],...extra}});
  assert.equal(r.status,201);return r.data.slot;
}
async function reservation(s,{participants=3,status='COMMITTED',expiresAt='2035-11-01 00:00:00',exclusive=false,units=null}={}) {
  const c=await pool.getConnection();
  try {
    const booking=await insert(c,'bookings',{household_id:a.householdId,booking_code:randomUUID(),created_by:a.owner.user.id,source:'OFFLINE',offline_channel:'PHONE',status:'CONFIRMED',contact_name:'Khách kiểm thử',contact_phone:'0000000000',first_starts_at:sqlDate(s.startsAt),last_ends_at:sqlDate(s.endsAt),total_vnd:150000*(units??participants),terms_snapshot:{original:true},confirmed_at:'2030-01-01 00:00:00'});
    const set=await insert(c,'reservation_sets',{household_id:a.householdId,booking_id:booking,status,total_vnd:150000*(units??participants),terms_snapshot:{original:true},first_starts_at:sqlDate(s.startsAt),last_ends_at:sqlDate(s.endsAt),...(status==='HELD'?{hold_started_at:'2020-01-01 00:00:00',expires_at:expiresAt}:{})});
    const item=await insert(c,'booking_items',{household_id:a.householdId,reservation_set_id:set,kind:'SERVICE',service_id:a.serviceId,offer_id:s.offers[0].offerId,slot_id:s.id,participant_count:participants,quantity:units??participants,pricing_type:units===null?'PER_PERSON':'PER_UNIT',is_exclusive:Number(exclusive),starts_at:sqlDate(s.startsAt),ends_at:sqlDate(s.endsAt),unit_price_vnd:150000,base_amount_vnd:150000*(units??participants),snapshot:{original:true}});
    await c.execute('UPDATE bookings SET current_reservation_set_id=? WHERE id=?',[set,booking]);return {booking,set,item};
  } finally {c.release();}
}
before(async()=>{
  database=await createTestDatabase(process.env,{schema:'survey'});pool=mysql.createPool({...testDatabaseOptions(),database:database.name,connectionLimit:8});const access=databaseAccess(pool);
  passwordHash=await hashPassword(password);authRepository=createAuthRepository(access);authService=createAuthService({repository:authRepository,options:authOptions({JWT_SECRET:randomBytes(32).toString('base64url')})});
  householdService=createHouseholdService({repository:createHouseholdRepository(access)});catalogService=createCatalogService({repository:createCatalogRepository(access)});
  serviceService=createServiceService({repository:createServiceRepository(access)});roomService=createRoomService({repository:createRoomRepository(access)});
  repository=createCalendarRepository(access);service=createCalendarService({repository,serviceService,roomService});
  contract=await SwaggerParser.dereference(structuredClone(openApiDocument),{resolve:{external:false}});
  server=createApp({logger:createLogger({env:{LOG_LEVEL:'silent'}}),authService,householdService,catalogService,serviceService,roomService,calendarService:service}).listen(0);
  await new Promise(resolve=>server.once('listening',resolve));url=`http://127.0.0.1:${server.address().port}`;
  admin=await account('ADMIN');customer=await account();a=await fixture();b=await fixture();
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await pool?.end();await database?.dispose();});

test('calendar resource CRUD and token conflict follow the Swagger contract',async()=>{
  const r=await resource();let response=await request(`${prefix}/resources/${r.id}`);assert.equal(response.data.resource.name,r.name);
  response=await request(`${prefix}/resources/${r.id}`,{method:'PUT',body:{...command(r),name:'Xe đạp mới',totalQuantity:12,maxPeoplePerUnit:null,supplyContact:'Liên hệ chủ hộ'}});assert.equal(response.status,200);
  const stale=await request(`${prefix}/resources/${r.id}`,{method:'PUT',body:{...command(r),name:'Ghi đè cũ',totalQuantity:1,maxPeoplePerUnit:null,supplyContact:null}});assert.equal(stale.code,'STALE_VERSION');
  response=await request(`${prefix}/resources/${r.id}`,{method:'DELETE',body:command(response.data.resource)});assert.ok(response.data.resource.archivedAt);
  const listed=await request(`${prefix}/resources`);assert.ok(!listed.data.items.some(i=>i.id===r.id));
});
test('slots require confirmed readiness and approved offers before opening; public data is restricted',async()=>{
  const s=await slot();assert.equal((await request(`/public/services/${a.serviceId}/slots`,{session:null,query:window})).data.items.some(i=>i.id===s.id),false);
  let response=await request(`${prefix}/slots/${s.id}`,{method:'PUT',body:update(s,{salesStatus:'OPEN'})});assert.equal(response.status,422);
  response=await request(`${prefix}/slots/${s.id}`,{method:'PUT',body:update(s,{salesStatus:'OPEN',readinessStatus:'CONFIRMED',offers:[]})});assert.equal(response.code,'SLOT_NOT_READY');
  response=await request(`${prefix}/slots/${s.id}`,{method:'PUT',body:update(s,{salesStatus:'OPEN',readinessStatus:'CONFIRMED'})});assert.equal(response.status,200);
  const publicData=await request(`/public/services/${a.serviceId}/slots`,{session:null,query:window});assert.ok(publicData.data.items.some(i=>i.id===s.id));
  assert.doesNotMatch(JSON.stringify(publicData.data),/readinessNote|supplyContact|token|createdBy|customer|reason/);
  assert.equal((await request(`${prefix}/slots`,{query:window})).status,200);
});
test('adjacent resource reservations fit; overlap and preparation buffers conflict',async()=>{
  const r=await resource({totalQuantity:1}),base={startsAt:'2035-12-01T07:00:00Z',endsAt:'2035-12-01T09:00:00Z',assignments:[{resourceId:r.id,quantity:1,allocationMode:'SESSION_SHARED'}]};
  await slot(base);await slot({...base,startsAt:base.endsAt,endsAt:'2035-12-01T11:00:00Z'});
  let response=await request(`${prefix}/slots`,{method:'POST',body:{serviceId:a.serviceId,personCapacity:10,...base}});assert.equal(response.code,'AVAILABILITY_CONFLICT');
  response=await request(`${prefix}/slots`,{method:'POST',body:{serviceId:a.serviceId,personCapacity:10,...base,startsAt:'2035-12-01T11:00:00Z',endsAt:'2035-12-01T12:00:00Z',assignments:[{...base.assignments[0],preparationMinutes:1}]}});assert.equal(response.code,'AVAILABILITY_CONFLICT');
});
test('capacity counts live holds and committed people; expired and released holds do not consume capacity',async()=>{
  let s=await slot({salesStatus:'OPEN',readinessStatus:'CONFIRMED'});
  await reservation(s,{participants:4});const held=await reservation(s,{participants:3,status:'HELD',expiresAt:'2035-12-30 00:00:00'});await reservation(s,{participants:2,status:'HELD',expiresAt:'2021-01-01 00:00:00'});
  let result=await request(`/public/services/${a.serviceId}/slots`,{session:null,query:{...window,participants:4}}),current=result.data.items.find(i=>i.id===s.id);
  assert.equal(current.remainingCapacity,3);assert.equal(current.available,false);
  let changed=await request(`${prefix}/slots/${s.id}`,{method:'PUT',body:update(s,{personCapacity:6})});assert.equal(changed.code,'CALENDAR_COMMITMENT_CONFLICT');
  changed=await request(`${prefix}/slots/${s.id}`,{method:'PUT',body:update(s,{personCapacity:8})});assert.equal(changed.status,200);s=changed.data.slot;
  assert.equal((await request(`${prefix}/slots/${s.id}`,{method:'DELETE',body:command(s)})).code,'CALENDAR_COMMITMENT_CONFLICT');
  assert.equal((await request(`${prefix}/slots/${s.id}`,{method:'PUT',body:update(s,{startsAt:'2035-12-30T10:00:00Z',endsAt:'2035-12-30T12:00:00Z'})})).code,'CALENDAR_COMMITMENT_CONFLICT');
  await pool.execute('UPDATE reservation_sets SET released_at=UTC_TIMESTAMP(6),status=\'RELEASED\' WHERE id=?',[held.set]);
  result=await request(`/public/services/${a.serviceId}/slots`,{session:null,query:window});assert.equal(result.data.items.find(i=>i.id===s.id).remainingCapacity,4);
});
test('exclusive commitments block all further sales and slot prices remain separate from existing snapshots',async()=>{
  const s=await slot({salesStatus:'OPEN',readinessStatus:'CONFIRMED'});const booking=await reservation(s,{participants:1,exclusive:true});
  const [[before]]=await pool.execute('SELECT * FROM booking_items WHERE id=?',[booking.item]);
  const response=await request(`${prefix}/slots/${s.id}`,{method:'PUT',body:update(s,{offers:[{offerId:s.offers[0].offerId,isEnabled:true,priceOverrideVnd:0}]})});assert.equal(response.status,200);
  const published=await request(`/public/services/${a.serviceId}/slots`,{session:null,query:window});const current=published.data.items.find(i=>i.id===s.id);
  assert.equal(current.offers[0].unitPriceVnd,0);assert.equal(current.available,false);assert.equal(current.remainingCapacity,0);
  const [[after]]=await pool.execute('SELECT * FROM booking_items WHERE id=?',[booking.item]);assert.deepEqual(after,before);
});
test('quota rules account for selected units and actual item resource use',async()=>{
  const r=await resource({totalQuantity:5}),unit=a.offers.find(o=>o.pricingType==='PER_UNIT');
  const s=await slot({salesStatus:'OPEN',readinessStatus:'CONFIRMED',offers:[{offerId:unit.id}],assignments:[{resourceId:r.id,quantity:5,allocationMode:'PER_BOOKING_QUOTA',rules:[{offerId:unit.id,usageBasis:'PER_UNIT',unitsRequired:1}]}]});
  const booking=await reservation(s,{participants:3,units:3});const [[assignment]]=await pool.execute('SELECT id FROM slot_resource_assignments WHERE slot_id=?',[s.id]);
  await insert(pool,'item_resource_usages',{household_id:a.householdId,slot_id:s.id,item_id:booking.item,assignment_id:assignment.id,quantity:3,rule_snapshot:{original:true}});
  let result=await request(`/public/services/${a.serviceId}/slots`,{session:null,query:{...window,participants:3,units:3}});assert.equal(result.data.items.find(i=>i.id===s.id).available,false);
  result=await request(`/public/services/${a.serviceId}/slots`,{session:null,query:{...window,participants:2,units:2}});assert.equal(result.data.items.find(i=>i.id===s.id).available,true);assert.equal(result.data.items.find(i=>i.id===s.id).remainingCapacity,2);
  const last=await reservation(s,{participants:2,units:2});
  await insert(pool,'item_resource_usages',{household_id:a.householdId,slot_id:s.id,item_id:last.item,assignment_id:assignment.id,quantity:2,rule_snapshot:{original:true}});
  result=await request(`/public/services/${a.serviceId}/slots`,{session:null,query:window});assert.equal(result.data.items.find(i=>i.id===s.id).remainingCapacity,0);assert.equal(result.data.items.find(i=>i.id===s.id).available,false);
});
test('room blocks are half-open and indefinite, can be edited and released without hard deletion',async()=>{
  let result=await request(`${prefix}/blocks`,{method:'POST',body:{roomId:a.roomId,startsAt:'2035-12-10T05:00:00Z',endsAt:null,quantity:1,reason:'Bảo trì dài hạn'}});assert.equal(result.status,201);let block=result.data.block;
  result=await request(`/public/rooms/${a.roomId}/availability`,{session:null,query:{checkInDate:'2035-12-11',checkOutDate:'2035-12-12'}});assert.equal(result.data.reason,'BLOCKED');
  result=await request(`${prefix}/blocks/${block.id}`,{method:'PUT',body:{roomId:a.roomId,resourceId:null,startsAt:block.startsAt,endsAt:'2035-12-11T07:00:00Z',quantity:1,...command(block)}});assert.equal(result.status,200);block=result.data.block;
  result=await request(`/public/rooms/${a.roomId}/availability`,{session:null,query:{checkInDate:'2035-12-11',checkOutDate:'2035-12-12',guests:4}});assert.equal(result.data.available,true);assert.equal(result.data.startsAt,'2035-12-11T07:00:00.000Z');
  result=await request(`${prefix}/blocks/${block.id}`,{method:'DELETE',body:command(block)});assert.ok(result.data.block.releasedAt);
  assert.equal((await request(`${prefix}/blocks`,{query:window})).data.items.some(i=>i.id===block.id),false);
});
test('resource blocks and capacity reductions consider simultaneous occupancy rather than whole-range sums',async()=>{
  const r=await resource({totalQuantity:4});
  for(const [start,end]of [['07:00','08:00'],['08:00','09:00']])await slot({startsAt:`2035-12-15T${start}:00Z`,endsAt:`2035-12-15T${end}:00Z`,assignments:[{resourceId:r.id,quantity:3,allocationMode:'SESSION_SHARED'}]});
  let response=await request(`${prefix}/blocks`,{method:'POST',body:{resourceId:r.id,startsAt:'2035-12-15T07:00:00Z',endsAt:'2035-12-15T09:00:00Z',quantity:1,reason:'Bảo trì một thiết bị'}});assert.equal(response.status,201);
  response=await request(`${prefix}/blocks`,{method:'POST',body:{resourceId:r.id,startsAt:'2035-12-15T07:00:00Z',endsAt:null,quantity:1,reason:'Vượt sức chứa'}});assert.equal(response.code,'AVAILABILITY_CONFLICT');
  response=await request(`${prefix}/resources/${r.id}`,{method:'PUT',body:{name:r.name,totalQuantity:3,maxPeoplePerUnit:null,supplyContact:null,...command(r)}});assert.equal(response.code,'AVAILABILITY_CONFLICT');
});
test('concurrent allocations of the last resource have one winner',async()=>{
  const r=await resource({totalQuantity:1}),input={serviceId:a.serviceId,startsAt:'2035-12-20T07:00:00Z',endsAt:'2035-12-20T09:00:00Z',personCapacity:10,assignments:[{resourceId:r.id,quantity:1,allocationMode:'SESSION_SHARED'}]};
  const results=await Promise.all([1,2].map(()=>request(`${prefix}/slots`,{method:'POST',body:input})));
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
});
test('owner scope, roles, malformed dates and stale versions cannot bypass calendar guards',async()=>{
  const r=await resource(),s=await slot();
  for(const session of [null,admin,customer,b.owner]) {
    const expected=session===null?401:403;
    assert.equal((await request(`${prefix}/slots/${s.id}`,{session})).status,expected);
    assert.equal((await request(`${prefix}/resources/${r.id}`,{session,method:'DELETE',body:command(r)})).status,expected);
  }
  assert.equal((await request(`${prefix}/blocks`,{method:'POST',body:{resourceId:(await resource({},b)).id,startsAt:s.startsAt,endsAt:s.endsAt,quantity:1,reason:'Khác hộ'}})).status,403);
  assert.equal((await request(`${prefix}/slots`,{query:{...window,from:'2035-02-30T00:00:00Z'}})).status,422);
  assert.equal((await request(`${prefix}/slots/${s.id}`,{method:'PUT',body:update(s,{expectedToken:'0'.repeat(64)})})).code,'STALE_VERSION');
});
test('audit failure rolls back slot configuration, blocks and resources atomically',async()=>{
  const failing=createCalendarService({serviceService,roomService,repository:{transaction:work=>repository.transaction(tx=>work({...tx,event:async()=>{throw new Error('audit failed');}}))}});
  const resourceInput={code:`ROLL_${++sequence}`,name:'Rollback',resourceType:'POOL',totalQuantity:1};
  await assert.rejects(failing.createResource(a.auth,resourceInput,audit()),/audit failed/);
  const [[count]]=await pool.execute('SELECT COUNT(*) n FROM resources WHERE code=?',[resourceInput.code]);assert.equal(Number(count.n),0);
  const s=await slot();await assert.rejects(failing.updateSlot(a.auth,s.id,update(s,{personCapacity:12}),audit()),/audit failed/);
  assert.equal((await request(`${prefix}/slots/${s.id}`)).data.slot.personCapacity,10);
});
test('cancelling/archiving an unused slot releases allocations but preserves history',async()=>{
  const r=await resource({totalQuantity:1}),s=await slot({assignments:[{resourceId:r.id,quantity:1,allocationMode:'SESSION_SHARED'}]});
  assert.equal((await request(`${prefix}/resources/${r.id}`,{method:'DELETE',body:command(r)})).code,'CALENDAR_COMMITMENT_CONFLICT');
  const result=await request(`${prefix}/slots/${s.id}`,{method:'DELETE',body:command(s)});assert.ok(result.data.slot.archivedAt);
  assert.equal((await request(`${prefix}/resources/${r.id}`,{method:'DELETE',body:command(r)})).status,200);
});
test('live account and session revocation are rechecked after authentication',async()=>{
  const stale=b.auth;await authService.setAccountStatus(await actor(admin),b.owner.user.id,{status:'BLOCKED',reason:'Kiểm thử khóa tài khoản'},audit());
  await assert.rejects(service.createResource(stale,{code:'BLOCKED',name:'Blocked',resourceType:'POOL',totalQuantity:1},audit()),{code:'ACCOUNT_BLOCKED'});
});

test('current locking reads see a new allocation even after an older consistent read',async()=>{
  const r=await resource({totalQuantity:3});
  const delayed=createCalendarService({serviceService,roomService,repository:{transaction:work=>repository.transaction(async tx=>{
    await tx.ownedHousehold(a.owner.user.id);
    assert.equal((await request(`${prefix}/blocks`,{method:'POST',body:{resourceId:r.id,startsAt:'2035-12-25T07:00:00Z',endsAt:null,quantity:2,reason:'Phát sinh trước khóa'}})).status,201);
    return work(tx);
  })}});
  await assert.rejects(delayed.updateResource(a.auth,r.id,{...command(r),name:r.name,totalQuantity:1,maxPeoplePerUnit:null,supplyContact:null},audit()),{code:'AVAILABILITY_CONFLICT'});
});

test('room blocks cannot override live reservations, and expired holds release the room immediately',async()=>{
  const booking=await insert(pool,'bookings',{household_id:a.householdId,booking_code:randomUUID(),created_by:a.owner.user.id,source:'OFFLINE',offline_channel:'PHONE',status:'CONFIRMED',contact_name:'Khách cũ',contact_phone:'0000000000',check_in_date:'2035-12-27',check_out_date:'2035-12-29',first_starts_at:'2035-12-27 07:00:00',last_ends_at:'2035-12-29 05:00:00',total_vnd:800000,terms_snapshot:{original:true},confirmed_at:'2030-01-01 00:00:00'});
  const set=await insert(pool,'reservation_sets',{household_id:a.householdId,booking_id:booking,status:'HELD',hold_started_at:'2020-01-01 00:00:00',expires_at:'2035-12-26 00:00:00',total_vnd:800000,terms_snapshot:{},first_starts_at:'2035-12-27 07:00:00',last_ends_at:'2035-12-29 05:00:00'});
  await insert(pool,'booking_items',{household_id:a.householdId,reservation_set_id:set,kind:'ROOM',room_id:a.roomId,participant_count:2,quantity:2,pricing_type:'PER_NIGHT',is_exclusive:1,check_in_date:'2035-12-27',check_out_date:'2035-12-29',starts_at:'2035-12-27 07:00:00',ends_at:'2035-12-29 05:00:00',unit_price_vnd:400000,base_amount_vnd:800000,snapshot:{original:true}});
  const block={roomId:a.roomId,startsAt:'2035-12-28T07:00:00Z',endsAt:'2035-12-29T07:00:00Z',quantity:1,reason:'Trùng với giữ chỗ'};
  assert.equal((await request(`${prefix}/blocks`,{method:'POST',body:block})).code,'AVAILABILITY_CONFLICT');
  assert.equal((await request(`/public/rooms/${a.roomId}/availability`,{session:null,query:{checkInDate:'2035-12-27',checkOutDate:'2035-12-28'}})).data.reason,'OCCUPIED');
  await pool.execute("UPDATE reservation_sets SET expires_at='2021-01-01 00:00:00' WHERE id=?",[set]);
  assert.equal((await request(`${prefix}/blocks`,{method:'POST',body:block})).status,201);
});
