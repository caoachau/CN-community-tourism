import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {randomBytes,randomUUID} from 'node:crypto';
import mysql from 'mysql2/promise';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {createTestDatabase} from '../support/mysql.js';
import {insert} from '../support/fixtures.js';
import {testDatabaseOptions} from '../support/config.js';
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
import {createBookingRepository} from '../../src/bookings/repository.js';
import {createBookingService} from '../../src/bookings/service.js';
import {openApiDocument} from '../../src/openapi.js';
import {createApp} from '../../src/app.js';
import {createLogger} from '../../src/shared/logger.js';

let database,pool,authRepository,authService,households,catalog,services,rooms,calendar,repository,booking,server,url,contract,passwordHash,admin,customer,other,a,b,sequence=0;
const password='Long isolated booking fixture password',audit=()=>randomUUID(),actor=s=>authService.authenticate(s.accessToken);
const ref=data=>({revisionId:data.profile.revisionId,version:data.profile.version});
const ajv=addFormats(new Ajv({strict:false,allErrors:true}));
const command=detail=>({expectedToken:detail.booking.token,reason:'Ghi nhận quyết định phục vụ khách'});
const atNow=()=>new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
async function account(role='CUSTOMER'){
  const u=await authRepository.transaction(tx=>tx.createUser({email:`booking-${++sequence}@example.invalid`,displayName:'Booking fixture',passwordHash,role}));
  return authService.login({email:u.email,password});
}
async function request(path,{session=customer,method='GET',body,query}={}){
  const target=new URL(`${url}/api/v1${path}`);for(const [key,value]of Object.entries(query??{}))target.searchParams.set(key,value);
  const response=await fetch(target,{method,headers:{...(session?{Authorization:`Bearer ${session.accessToken}`} : {}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const payload=await response.json();
  const key=`/api/v1${path.replace(/\/cancellation-requests\/\d+/g,'/cancellation-requests/{requestId}').replace(/\/notifications\/\d+/g,'/notifications/{notificationId}').replace(/\/bookings\/\d+/g,'/bookings/{bookingId}').replace(/\/financial-entries\/\d+/g,'/financial-entries/{entryId}').replace(/\/reviews\/\d+/g,'/reviews/{reviewId}').replace(/\/households\/\d+/g,'/households/{householdId}')}`;
  const operation=contract.paths[key]?.[method.toLowerCase()];assert.ok(operation,`Undocumented ${method} ${key}`);
  const validator=ajv.compile((operation.responses[response.status]??operation.responses.default).content['application/json'].schema);
  assert.equal(validator(payload),true,JSON.stringify(validator.errors));assert.equal(response.headers.get('cache-control'),'no-store');
  return {status:response.status,data:payload.data,code:payload.error?.code};
}
async function fixture(){
  const owner=await account(),auth=await actor(owner),adminAuth=await actor(admin);
  let h=await households.open(auth,{title:'Hộ du lịch booking',body:'Gia đình cung cấp lưu trú và trải nghiệm tại nhà vườn.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',contactPhone:'0901234567'}},audit());
  await households.submit(auth,ref(h),audit());h=await households.review(adminAuth,h.profile.revisionId,{version:1,decision:'APPROVED'},audit());
  const host=await actor(owner);
  let place=await catalog.createPlace(host,{title:'Nhà vườn booking',body:'Điểm đón khách nghỉ ngơi và trải nghiệm trong vườn.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long'}},audit());
  await catalog.submitPlace(host,place.place.id,ref(place),audit());place=await catalog.reviewPlace(adminAuth,place.profile.revisionId,{version:1,decision:'APPROVED'},audit());
  const category=await catalog.createCategory(adminAuth,{kind:'SERVICE',code:`BK_${++sequence}`,name:'Trải nghiệm',isActive:true,reason:'Kiểm thử booking'},audit());
  let s=await services.create(host,{title:'Trải nghiệm booking',body:'Trải nghiệm theo khung giờ, kiểm soát sức chứa và tài nguyên.',categoryId:category.category.id,defaultPlaceId:place.place.id,defaultDurationMinutes:90},audit());
  for(const [name,type,mode]of [['Khách ghép','PER_PERSON','SHARED'],['Thuê riêng','PER_GROUP','EXCLUSIVE'],['Thuê xe','PER_UNIT','SHARED'],['Theo giờ','PER_HOUR','SHARED']])await services.createOffer(host,s.service.id,{name,pricingType:type,participationMode:mode,unitPriceVnd:100001,minParticipants:1,maxParticipants:10,terms:{scopeDescription:'Toàn bộ hoạt động trong khung giờ đã chọn.'},addons:[{key:'drink',name:'Nước uống',unitPriceVnd:10000,maxQuantity:10,isActive:true,resourceFree:true}],...(type==='PER_UNIT'?{unitLabel:'xe',maxUnits:10,participantsPerUnit:2}:{})},audit());
  s=await services.mine(host,s.service.id);await services.submit(host,s.service.id,{...ref(s),offersToken:s.offersToken},audit());s=await services.review(adminAuth,s.profile.revisionId,{version:1,decision:'APPROVED'},audit());
  const roomIds=[];
  for(let i=0;i<2;i++){
    let r=await rooms.create(host,{title:`Phòng booking ${i+1}`,body:'Phòng phục vụ theo từng đêm, có điều hòa và phòng tắm.',placeId:place.place.id,maxGuests:4,nightlyPriceVnd:400000},audit());
    await rooms.submit(host,r.room.id,{...ref(r),pricingToken:r.room.pricingToken},audit());r=await rooms.review(adminAuth,r.profile.revisionId,{version:1,decision:'APPROVED'},audit());roomIds.push(r.room.id);
  }
  return {owner,auth:host,householdId:h.household.id,serviceId:s.service.id,placeId:place.place.id,roomIds,offers:s.offers};
}
async function slot(extra={},f=a){
  const day=String(1+(sequence++%25)).padStart(2,'0');
  return (await calendar.createSlot(f.auth,{serviceId:f.serviceId,startsAt:`2035-11-${day}T07:00:00Z`,endsAt:`2035-11-${day}T08:30:00Z`,personCapacity:10,visibility:'PUBLIC',salesStatus:'OPEN',readinessStatus:'CONFIRMED',offers:f.offers.map(o=>({offerId:o.id})),...extra},audit())).slot;
}
const roomCart=(day='2035-12-01',f=a)=>({householdId:f.householdId,items:[{kind:'ROOM',roomId:f.roomIds[0],checkInDate:day,checkOutDate:new Date(Date.parse(day)+86400000).toISOString().slice(0,10),participants:2}]});
const serviceCart=(s,{participants=2,offer=0,units=1,addons=[]}={})=>({householdId:a.householdId,items:[{kind:'SERVICE',slotId:s.id,offerId:a.offers[offer].id,participants,units,addons}]});
async function held(cart,{session=customer,key=randomUUID()}={}){
  const q=await request('/bookings/quote',{session,method:'POST',body:cart});assert.equal(q.status,200,q.code);
  const body={...cart,contact:{name:'Khách kiểm thử',phone:'0901234567'},expectedQuoteToken:q.data.quote.token,idempotencyKey:key};
  const result=await request('/bookings',{session,method:'POST',body});assert.equal(result.status,201,result.code);return {...result.data,requestBody:body,quote:q.data.quote};
}
async function confirm(detail){const r=await request(`/households/me/bookings/${detail.booking.id}/confirm`,{session:a.owner,method:'POST',body:command(detail)});assert.equal(r.status,200,r.code);return r.data;}
async function entry(detail,extra){return request(`/households/me/bookings/${detail.booking.id}/financial-entries`,{session:a.owner,method:'POST',body:{expectedToken:detail.booking.token,idempotencyKey:randomUUID(),occurredAt:atNow(),note:'Ghi nhận thực tế có chứng từ',...extra}});}

before(async()=>{
  database=await createTestDatabase(process.env,{schema:'survey'});pool=mysql.createPool({...testDatabaseOptions(),database:database.name,connectionLimit:10});const access=databaseAccess(pool);
  passwordHash=await hashPassword(password);authRepository=createAuthRepository(access);authService=createAuthService({repository:authRepository,options:authOptions({JWT_SECRET:randomBytes(32).toString('base64url')})});
  households=createHouseholdService({repository:createHouseholdRepository(access)});catalog=createCatalogService({repository:createCatalogRepository(access)});services=createServiceService({repository:createServiceRepository(access)});rooms=createRoomService({repository:createRoomRepository(access)});
  calendar=createCalendarService({repository:createCalendarRepository(access),serviceService:services,roomService:rooms});repository=createBookingRepository(access);booking=createBookingService({repository});
  contract=await SwaggerParser.dereference(structuredClone(openApiDocument),{resolve:{external:false}});
  server=createApp({logger:createLogger({env:{LOG_LEVEL:'silent'}}),authService,bookingService:booking}).listen(0);await new Promise(resolve=>server.once('listening',resolve));url=`http://127.0.0.1:${server.address().port}`;
  admin=await account('ADMIN');customer=await account();other=await account();a=await fixture();b=await fixture();
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await pool?.end();await database?.dispose();});

test('mounting booking routes preserves anonymous authentication and unrelated public routes',async()=>{
  const response=await request('/auth/login',{session:null,method:'POST',body:{email:customer.user.email,password}});assert.equal(response.status,200,response.code);
  const missing=await fetch(`${url}/api/v1/unrelated-public-route`);assert.equal(missing.status,404);
});
test('atomic mixed basket snapshots two rooms, two slots, addons and server computed VND',async()=>{
  const first=await services.mine(a.auth,a.serviceId);
  let second=await services.create(a.auth,{title:'Dịch vụ thứ hai tính giờ',body:'Hoạt động riêng của cùng hộ, đặt chung trong một booking.',categoryId:first.service.categoryId,defaultPlaceId:a.placeId,defaultDurationMinutes:90},audit());
  await services.createOffer(a.auth,second.service.id,{name:'Theo giờ',pricingType:'PER_HOUR',participationMode:'SHARED',unitPriceVnd:100001,minParticipants:1,maxParticipants:10,terms:{scopeDescription:'Hoạt động riêng trọn khung giờ đã chọn.'}},audit());
  second=await services.mine(a.auth,second.service.id);await services.submit(a.auth,second.service.id,{...ref(second),offersToken:second.offersToken},audit());await services.review(await actor(admin),second.profile.revisionId,{version:1,decision:'APPROVED'},audit());
  const s1=await slot(),s2=await slot({}, {...a,serviceId:second.service.id,offers:second.offers}),cart=roomCart();
  cart.items.push({...cart.items[0],roomId:a.roomIds[1]},...serviceCart(s1,{addons:[{key:'drink',quantity:2}]}).items,{kind:'SERVICE',slotId:s2.id,offerId:second.offers[0].id,participants:2});
  const detail=await held(cart);assert.equal(detail.items.length,4);assert.equal(detail.booking.totalVnd,800000+200002+20000+150002);
  assert.equal(new Set(detail.items.filter(i=>i.kind==='SERVICE').map(i=>i.serviceId)).size,2);
  assert.equal(detail.items[0].startsAt,'2035-12-01T07:00:00.000Z');assert.equal(detail.items[0].endsAt,'2035-12-02T05:00:00.000Z');
  assert.ok(detail.items.every(i=>i.snapshot.title));assert.equal(detail.booking.status,'PENDING');
  const replay=await request('/bookings',{method:'POST',body:detail.requestBody});assert.equal(replay.data.booking.id,detail.booking.id);assert.equal(replay.data.replayed,true);
  assert.equal((await request('/bookings',{method:'POST',body:{...detail.requestBody,contact:{name:'Changed',phone:'0901234567'}}})).code,'IDEMPOTENCY_CONFLICT');
  await confirm(detail);
});
test('two customers racing for the last room produce one hold and no partial basket',async()=>{
  const cart=roomCart('2035-12-03'),s=await slot();cart.items.push(...serviceCart(s).items);
  const q=await booking.quote(await actor(customer),cart),base={...cart,contact:{name:'Khách',phone:'0901234567'},expectedQuoteToken:q.quote.token};
  const results=await Promise.all([customer,other].map(session=>request('/bookings',{session,method:'POST',body:{...base,idempotencyKey:randomUUID()}})));
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal(results.find(r=>r.status===409).code,'AVAILABILITY_CONFLICT');
  const winner=results.find(r=>r.status===201).data;assert.equal(winner.items.length,2);await confirm(winner);
});
test('service capacity, exclusive bookings and per-unit resource quotas are enforced',async()=>{
  const resource=(await calendar.createResource(a.auth,{code:`VEH_${++sequence}`,name:'Xe đạp đôi',resourceType:'POOL',totalQuantity:2,maxPeoplePerUnit:2},audit())).resource;
  const s=await slot({personCapacity:10,assignments:[{resourceId:resource.id,quantity:2,allocationMode:'PER_BOOKING_QUOTA',rules:a.offers.map(o=>({offerId:o.id,usageBasis:o.pricingType==='PER_UNIT'?'PER_UNIT':'FIXED',unitsRequired:1,maxPeoplePerUnit:2}))}]});
  let d=await held(serviceCart(s,{offer:2,participants:4,units:2}));await confirm(d);
  assert.equal((await request('/bookings/quote',{session:other,method:'POST',body:serviceCart(s,{offer:2,participants:1})})).code,'AVAILABILITY_CONFLICT');
  const s2=await slot({personCapacity:2});d=await held(serviceCart(s2,{participants:2,offer:1}));await confirm(d);
  assert.equal((await request('/bookings/quote',{session:other,method:'POST',body:serviceCart(s2,{participants:1})})).code,'AVAILABILITY_CONFLICT');
});
test('expired holds stop consuming capacity before worker runs; confirmation persists expiry',async()=>{
  const d=await held(roomCart('2035-12-05'));
  await pool.execute('UPDATE bookings SET hold_expires_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 SECOND) WHERE id=?',[d.booking.id]);
  await pool.execute("UPDATE reservation_sets SET hold_started_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 2 MINUTE),expires_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 SECOND) WHERE booking_id=?",[d.booking.id]);
  assert.equal((await request('/bookings/quote',{session:other,method:'POST',body:roomCart('2035-12-05')})).status,200);
  const r=await request(`/households/me/bookings/${d.booking.id}/confirm`,{session:a.owner,method:'POST',body:command(d)});assert.equal(r.code,'HOLD_EXPIRED');
  const [[row]]=await pool.execute('SELECT status FROM bookings WHERE id=?',[d.booking.id]);assert.equal(row.status,'EXPIRED');
});
test('expiry worker releases held items and records one system transition on repeated sweeps',async()=>{
  const d=await held(roomCart('2035-12-06'));
  await pool.execute('UPDATE bookings SET hold_expires_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 SECOND) WHERE id=?',[d.booking.id]);
  assert.equal((await booking.expireHolds()).expired,1);assert.equal((await booking.expireHolds()).expired,0);
  const result=(await request(`/bookings/${d.booking.id}`)).data;assert.equal(result.booking.status,'EXPIRED');assert.equal(result.history.filter(h=>h.to==='EXPIRED').length,1);
});
test('price changes require a new quote but never rewrite held snapshots',async()=>{
  const cart=roomCart('2035-12-07'),q=await booking.quote(await actor(customer),cart);
  await pool.execute('UPDATE rooms SET nightly_price_vnd=450000 WHERE id=?',[a.roomIds[0]]);
  const bad=await request('/bookings',{method:'POST',body:{...cart,contact:{name:'Khách',phone:'0901234567'},expectedQuoteToken:q.quote.token,idempotencyKey:randomUUID()}});assert.equal(bad.code,'QUOTE_CHANGED');
  const d=await held(cart);await pool.execute('UPDATE rooms SET nightly_price_vnd=400000 WHERE id=?',[a.roomIds[0]]);
  assert.equal((await confirm(d)).items[0].unitPriceVnd,450000);
});
test('rejection and owner cancellation release the basket; legacy customer cancellation is blocked',async()=>{
  let d=await held(roomCart('2035-12-08'));
  let r=await request(`/households/me/bookings/${d.booking.id}/reject`,{session:a.owner,method:'POST',body:command(d)});assert.equal(r.data.booking.status,'REJECTED');
  d=await confirm(await held(roomCart('2035-12-08')));
  assert.equal((await request(`/bookings/${d.booking.id}/cancel`,{method:'POST',body:command(d)})).code,'CANCELLATION_REQUEST_REQUIRED');
  r=await request(`/households/me/bookings/${d.booking.id}/cancel`,{session:a.owner,method:'POST',body:command(d)});assert.equal(r.data.booking.status,'CANCELLED');
  assert.equal((await request('/bookings/quote',{session:other,method:'POST',body:roomCart('2035-12-08')})).status,200);
});

test('cash ledger is append only, idempotent, caps receipts/refunds and distinguishes agreements',async()=>{
  let d=await confirm(await held(roomCart('2035-12-09')));
  const body={expectedToken:d.booking.token,idempotencyKey:randomUUID(),occurredAt:atNow(),note:'Nhận tiền mặt',type:'RECEIPT',amountVnd:200000,paymentMethod:'CASH',receiptPurpose:'DEPOSIT'};
  let r=await request(`/households/me/bookings/${d.booking.id}/financial-entries`,{session:a.owner,method:'POST',body});assert.equal(r.status,201,r.code);d=r.data;
  const replay=await request(`/households/me/bookings/${d.booking.id}/financial-entries`,{session:a.owner,method:'POST',body});assert.equal(replay.data.entry.id,d.entry.id);assert.equal(replay.data.replayed,true);
  assert.equal((await entry(d,{type:'RECEIPT',amountVnd:300000,paymentMethod:'CASH',receiptPurpose:'BALANCE'})).code,'FINANCIAL_CONFLICT');
  assert.equal((await entry(d,{type:'REFUND',amountVnd:50000,paymentMethod:'CASH',agreementId:d.entry.id})).code,'FINANCIAL_CONFLICT');
  r=await entry(d,{type:'REFUND_AGREEMENT',amountVnd:100000});assert.equal(r.status,201,r.code);d=r.data;const agreementId=d.entry.id;
  assert.equal(d.booking.summary.refundedVnd,0);assert.equal(d.booking.summary.refundDueVnd,100000);
  r=await entry(d,{type:'REFUND',amountVnd:60000,paymentMethod:'BANK_TRANSFER',agreementId});assert.equal(r.status,201,r.code);d=r.data;
  assert.equal(d.booking.summary.netReceivedVnd,140000);assert.equal(d.booking.summary.refundDueVnd,40000);
  assert.equal((await entry(d,{type:'REFUND',amountVnd:50000,paymentMethod:'CASH',agreementId})).code,'FINANCIAL_CONFLICT');
  r=await request(`/households/me/bookings/${d.booking.id}/financial-entries/${d.entry.id}/reverse`,{session:a.owner,method:'POST',body:{expectedToken:d.booking.token,idempotencyKey:randomUUID(),occurredAt:atNow(),note:'Ghi sai khoản hoàn, đảo chứng từ'}});assert.equal(r.status,201,r.code);assert.equal(r.data.booking.summary.refundedVnd,0);
  const [[count]]=await pool.execute('SELECT COUNT(*) total FROM financial_entries WHERE booking_id=?',[d.booking.id]);assert.equal(Number(count.total),4);
});
test('only booking customer can review completed visits; moderation hides and restores public review',async()=>{
  let d=await confirm(await held(roomCart('2035-12-10'))),id=d.booking.id;
  const review={rating:5,comment:'Gia đình đón tiếp chu đáo, phòng sạch sẽ.'};
  assert.equal((await request(`/bookings/${id}/review`,{method:'POST',body:review})).code,'INVALID_STATE');
  assert.equal((await request(`/households/me/bookings/${id}/complete`,{session:a.owner,method:'POST',body:command(d)})).code,'INVALID_STATE');
  const future=createBookingService({repository:{transaction:work=>repository.transaction(tx=>work({...tx,databaseNow:async()=>({now_at:new Date('2036-01-01T00:00:00Z')})}))}});
  d=await future.transition(await actor(a.owner),id,'complete',command(d),audit());assert.equal(d.booking.status,'COMPLETED');assert.equal(d.items[0].outcome,'SERVED');
  assert.equal((await request(`/bookings/${id}/review`,{session:other,method:'POST',body:review})).code,'FORBIDDEN');
  let r=await request(`/bookings/${id}/review`,{method:'POST',body:review});assert.equal(r.status,201);let current=r.data.review;
  assert.equal((await request(`/bookings/${id}/review`,{method:'POST',body:{...review,rating:4}})).code,'REVIEW_ALREADY_EXISTS');
  let list=await request(`/public/households/${a.householdId}/reviews`,{session:null});assert.equal(list.data.total,1);assert.doesNotMatch(JSON.stringify(list.data),/bookingId|customerId|phone|email|hiddenReason/);
  r=await request(`/admin/reviews/${current.id}`,{session:admin,method:'PATCH',body:{expectedToken:current.token,reason:'Ẩn để kiểm tra phản ánh',hidden:true}});assert.equal(r.status,200);current=r.data.review;
  assert.equal((await request(`/public/households/${a.householdId}/reviews`,{session:null})).data.total,0);
  await request(`/admin/reviews/${current.id}`,{session:admin,method:'PATCH',body:{expectedToken:current.token,reason:'Đã kiểm tra, khôi phục',hidden:false}});
  assert.equal((await request(`/public/households/${a.householdId}/reviews`,{session:null})).data.total,1);
});
test('owner/customer/admin boundaries and cross-household baskets cannot leak or mutate data',async()=>{
  const d=await confirm(await held(roomCart('2035-12-11'))),id=d.booking.id;
  assert.equal((await request(`/bookings/${id}`,{session:other})).code,'FORBIDDEN');
  assert.equal((await request(`/households/me/bookings/${id}`,{session:b.owner})).code,'FORBIDDEN');
  assert.equal((await request(`/admin/bookings/${id}`,{session:admin})).status,200);
  assert.equal((await request(`/admin/bookings`,{session:other})).code,'FORBIDDEN');
  assert.equal((await request(`/households/me/bookings/${id}/confirm`,{method:'POST',body:command(d)})).code,'FORBIDDEN');
  const mixed=roomCart('2035-12-12');mixed.items.push({...mixed.items[0],roomId:b.roomIds[0]});assert.equal((await request('/bookings/quote',{method:'POST',body:mixed})).code,'AVAILABILITY_CONFLICT');
  const hostList=await request('/households/me/bookings',{session:a.owner});assert.ok(hostList.data.items.every(i=>i.householdId===a.householdId));
  const customerList=await request('/bookings',{session:a.owner});assert.equal(customerList.data.total,0);
});
test('audit failure rolls back bookings, holds, items and financial writes',async()=>{
  const failing=createBookingService({repository:{transaction:work=>repository.transaction(tx=>work({...tx,event:async()=>{throw new Error('audit unavailable');}}))}});
  const cart=roomCart('2035-12-13'),auth=await actor(customer),q=await booking.quote(auth,cart);
  const [[before]]=await pool.execute('SELECT COUNT(*) total FROM bookings');
  await assert.rejects(failing.hold(auth,{...cart,contact:{name:'Khách',phone:'0901234567'},expectedQuoteToken:q.quote.token,idempotencyKey:randomUUID()},audit()),/audit unavailable/);
  const [[after]]=await pool.execute('SELECT COUNT(*) total FROM bookings');assert.equal(after.total,before.total);
  assert.equal((await request('/bookings/quote',{method:'POST',body:cart})).status,200);
  const d=await confirm(await held(cart));
  await assert.rejects(failing.addEntry(await actor(a.owner),d.booking.id,{expectedToken:d.booking.token,idempotencyKey:randomUUID(),type:'RECEIPT',amountVnd:100000,paymentMethod:'CASH',receiptPurpose:'DEPOSIT',occurredAt:atNow(),note:'Thu tiền có kiểm tra audit'},audit()),/audit unavailable/);
  const [[money]]=await pool.execute('SELECT COUNT(*) total FROM financial_entries WHERE booking_id=?',[d.booking.id]);assert.equal(Number(money.total),0);
});
test('room blocks forbid occupied intervals while adjacent check-out/check-in dates remain bookable',async()=>{
  await calendar.createBlock(a.auth,{roomId:a.roomIds[0],startsAt:'2035-12-15T07:00:00Z',endsAt:'2035-12-16T05:00:00Z',quantity:1,reason:'Bảo trì phòng'},audit());
  assert.equal((await request('/bookings/quote',{method:'POST',body:roomCart('2035-12-15')})).code,'AVAILABILITY_CONFLICT');
  assert.equal((await request('/bookings/quote',{method:'POST',body:roomCart('2035-12-16')})).status,200);
});
test('concurrent last-person holds and duplicate network retries each produce one reservation',async()=>{
  const s=await slot({personCapacity:1}),cart=serviceCart(s,{participants:1}),q=await booking.quote(await actor(customer),cart);
  const input={...cart,contact:{name:'Khách',phone:'0901234567'},expectedQuoteToken:q.quote.token,idempotencyKey:randomUUID()};
  const results=await Promise.all([customer,other].map(session=>request('/bookings',{session,method:'POST',body:{...input,idempotencyKey:randomUUID()}})));
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);await confirm(results.find(r=>r.status===201).data);
  const same=await held(roomCart('2035-12-17'));
  const replay=await Promise.all([1,2].map(()=>request('/bookings',{method:'POST',body:same.requestBody})));
  assert.ok(replay.every(r=>r.data.booking.id===same.booking.id));await confirm(same);
});
test('shared-once resources are charged once per session while their people limit still applies',async()=>{
  const resource=(await calendar.createResource(a.auth,{code:`GUIDE_${++sequence}`,name:'Hướng dẫn viên',resourceType:'SINGLE',totalQuantity:1,maxPeoplePerUnit:4},audit())).resource;
  const s=await slot({assignments:[{resourceId:resource.id,quantity:1,allocationMode:'SESSION_SHARED',rules:a.offers.map(o=>({offerId:o.id,usageBasis:'SHARED_ONCE',unitsRequired:1,maxPeoplePerUnit:4}))}]});
  await confirm(await held(serviceCart(s,{participants:2})));
  await confirm(await held(serviceCart(s,{participants:2}),{session:other}));
  assert.equal((await request('/bookings/quote',{method:'POST',body:serviceCart(s,{participants:1})})).code,'AVAILABILITY_CONFLICT');
});
test('racing confirmation and cancellation serialize with one successful transition',async()=>{
  const d=await held(roomCart('2035-12-18')),body=command(d);
  const results=await Promise.all([request(`/households/me/bookings/${d.booking.id}/confirm`,{session:a.owner,method:'POST',body}),request(`/bookings/${d.booking.id}/cancellation-requests`,{method:'POST',body:{...body,idempotencyKey:randomUUID()}})]);
  assert.equal(results.filter(r=>[200,201].includes(r.status)).length,1,JSON.stringify(results));assert.equal(results.filter(r=>r.status===409).length,1);
  const final=(await request(`/bookings/${d.booking.id}`)).data;assert.ok(['CONFIRMED','CANCEL_REQUESTED'].includes(final.booking.displayStatus));
});
test('refund adjustments preserve settled refunds and enable correction without deleting obligations',async()=>{
  let d=await confirm(await held(roomCart('2035-12-19')));
  d=(await entry(d,{type:'RECEIPT',amountVnd:200000,paymentMethod:'CASH',receiptPurpose:'DEPOSIT'})).data;const receiptId=d.entry.id;
  d=(await entry(d,{type:'REFUND_AGREEMENT',amountVnd:100000})).data;const agreementId=d.entry.id;
  let r=await request(`/households/me/bookings/${d.booking.id}/financial-entries/${receiptId}/reverse`,{session:a.owner,method:'POST',body:{expectedToken:d.booking.token,idempotencyKey:randomUUID(),occurredAt:atNow(),note:'Đảo khoản thu ghi sai'}});assert.equal(r.code,'FINANCIAL_CONFLICT');
  d=(await entry(d,{type:'REFUND',amountVnd:60000,paymentMethod:'CASH',agreementId})).data;
  assert.equal((await entry(d,{type:'REFUND_ADJUSTMENT',amountVnd:-50000,agreementId})).code,'FINANCIAL_CONFLICT');
  r=await entry(d,{type:'REFUND_ADJUSTMENT',amountVnd:-40000,agreementId});assert.equal(r.status,201,r.code);assert.equal(r.data.booking.summary.refundDueVnd,0);assert.equal(r.data.booking.summary.refundAgreedVnd,60000);
});
test('the active hold limit is per customer and only confirmed cancellation frees an allowance',async()=>{
  const session=await account(),holds=[];
  for(let index=20;index<25;index++)holds.push(await held(roomCart(`2035-12-${index}`),{session}));
  const q=await booking.quote(await actor(session),roomCart('2035-12-25'));
  const body={...roomCart('2035-12-25'),contact:{name:'Khách',phone:'0901234567'},expectedQuoteToken:q.quote.token,idempotencyKey:randomUUID()};
  assert.equal((await request('/bookings',{session,method:'POST',body})).code,'HOLD_LIMIT');
  const pending=(await request(`/bookings/${holds[0].booking.id}/cancellation-requests`,{session,method:'POST',body:{...command(holds[0]),idempotencyKey:randomUUID()}})).data;
  assert.equal((await request('/bookings',{session,method:'POST',body})).code,'HOLD_LIMIT');
  await request(`/households/me/bookings/${pending.booking.id}/cancellation-requests/${pending.booking.pendingCancellation.id}/confirm`,{session:a.owner,method:'POST',body:{...command(pending),idempotencyKey:randomUUID()}});
  assert.equal((await request('/bookings',{session,method:'POST',body})).status,201);
  for(const d of holds.slice(1))await request(`/households/me/bookings/${d.booking.id}/cancel`,{session:a.owner,method:'POST',body:command(d)});
});
test('live account block and household suspension prohibit acquisition without altering old snapshots',async()=>{
  const cart=roomCart('2035-12-14'),q=await booking.quote(await actor(customer),cart);
  await pool.execute("UPDATE households SET visibility='HIDDEN' WHERE id=?",[a.householdId]);
  assert.equal((await request('/bookings/quote',{method:'POST',body:cart})).code,'HOUSEHOLD_NOT_APPROVED');
  await pool.execute("UPDATE households SET visibility='VISIBLE' WHERE id=?",[a.householdId]);
  const blocked=await account();
  await pool.execute("UPDATE users SET status='BLOCKED',disabled_at=UTC_TIMESTAMP(6) WHERE id=?",[blocked.user.id]);
  assert.equal((await request('/bookings/quote',{session:blocked,method:'POST',body:cart})).code,'ACCOUNT_BLOCKED');
  assert.ok(q.quote.totalVnd>0);
});

const cancelCommand=d=>({...command(d),idempotencyKey:randomUUID()});
async function requestCancellation(d,session=customer){
  const r=await request(`/bookings/${d.booking.id}/cancellation-requests`,{session,method:'POST',body:cancelCommand(d)});
  assert.equal(r.status,201,r.code);return r.data;
}
const cancellationPath=(d,action)=>`${action==='confirm'?'/households/me':''}/bookings/${d.booking.id}/cancellation-requests/${d.booking.pendingCancellation.id}/${action}`;
const clockService=at=>createBookingService({repository:{transaction:work=>repository.transaction(tx=>work({...tx,databaseNow:async()=>({now_at:new Date(at)})}))}});

test('confirmed cancellation keeps capacity and cash until host acknowledgment; duplicates are replayed',async()=>{
  const cart=roomCart('2036-02-01');let d=await confirm(await held(cart));
  d=(await entry(d,{type:'RECEIPT',amountVnd:100000,paymentMethod:'CASH',receiptPurpose:'DEPOSIT'})).data;
  const original=d,body=cancelCommand(d),path=`/bookings/${d.booking.id}/cancellation-requests`;
  const replies=await Promise.all([1,2].map(()=>request(path,{method:'POST',body})));
  assert.ok(replies.every(r=>r.status===201),JSON.stringify(replies));d=replies[0].data;
  assert.equal(d.booking.status,'CONFIRMED');assert.equal(d.booking.displayStatus,'CANCEL_REQUESTED');
  assert.equal(d.cancellations.length,1);assert.equal(d.booking.summary.receivedVnd,100000);
  assert.notEqual(d.booking.token,original.booking.token);
  assert.equal((await request(path,{method:'POST',body:{...body,reason:'Different payload'}})).code,'IDEMPOTENCY_CONFLICT');
  assert.equal((await request('/bookings/quote',{session:other,method:'POST',body:cart})).code,'AVAILABILITY_CONFLICT');
  const [[set]]=await pool.execute('SELECT status,released_at FROM reservation_sets WHERE booking_id=?',[d.booking.id]);assert.equal(set.status,'COMMITTED');assert.equal(set.released_at,null);
  const list=(await request('/admin/bookings',{session:admin,query:{status:'CANCEL_REQUESTED'}})).data;
  assert.ok(list.items.some(b=>b.id===d.booking.id));assert.ok(list.items.every(b=>b.displayStatus==='CANCEL_REQUESTED'));
  assert.equal((await request(`/households/me/bookings/${d.booking.id}/complete`,{session:a.owner,method:'POST',body:command(d)})).code,'CANCELLATION_PENDING');
  const confirmPath=cancellationPath(d,'confirm'),confirmBody=cancelCommand(d);
  const result=await request(confirmPath,{session:a.owner,method:'POST',body:confirmBody});assert.equal(result.status,200,result.code);d=result.data;
  assert.equal(d.booking.status,'CANCELLED');assert.equal(d.booking.pendingCancellation,null);assert.equal(d.cancellations[0].status,'ACCEPTED');
  assert.equal(d.booking.summary.receivedVnd,100000);assert.equal(d.booking.summary.refundedVnd,0);assert.equal(d.entries.length,1);
  assert.equal((await request(confirmPath,{session:a.owner,method:'POST',body:confirmBody})).data.replayed,true);
  assert.equal((await request('/bookings/quote',{session:other,method:'POST',body:cart})).status,200);
  const [[messages]]=await pool.execute("SELECT COUNT(*) total FROM notifications WHERE event_key IN (?,?)",[`cancel:${d.cancellations[0].id}:request`,`cancel:${d.cancellations[0].id}:confirm`]);assert.equal(Number(messages.total),4);
  const agreement=(await entry(d,{type:'REFUND_AGREEMENT',amountVnd:100000})).data;
  const refund=await entry(agreement,{type:'REFUND',amountVnd:100000,paymentMethod:'CASH',agreementId:agreement.entry.id});assert.equal(refund.status,201,refund.code);
});

test('withdrawal keeps the original hold deadline and races safely with host acknowledgment',async()=>{
  let d=await held(roomCart('2036-02-02'));const deadline=d.booking.holdExpiresAt;
  d=await requestCancellation(d);
  for(const action of ['confirm','reject','cancel'])assert.equal((await request(`/households/me/bookings/${d.booking.id}/${action}`,{session:a.owner,method:'POST',body:command(d)})).code,'CANCELLATION_PENDING');
  const withdraw=cancellationPath(d,'withdraw'),body=cancelCommand(d);
  let r=await request(withdraw,{method:'POST',body});assert.equal(r.status,200,r.code);d=r.data;
  assert.equal(d.booking.status,'PENDING');assert.equal(d.booking.displayStatus,'PENDING');assert.equal(d.booking.holdExpiresAt,deadline);assert.equal(d.cancellations[0].status,'WITHDRAWN');
  assert.equal((await request(withdraw,{method:'POST',body})).data.replayed,true);
  d=await requestCancellation(d);
  const results=await Promise.all([
    request(cancellationPath(d,'withdraw'),{method:'POST',body:cancelCommand(d)}),
    request(cancellationPath(d,'confirm'),{session:a.owner,method:'POST',body:cancelCommand(d)}),
  ]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409],JSON.stringify(results));
  const final=(await request(`/bookings/${d.booking.id}`)).data;
  if(final.booking.status==='PENDING')await request(`/households/me/bookings/${d.booking.id}/cancel`,{session:a.owner,method:'POST',body:command(final)});
});

test('pending cancellation expires and closes atomically at the exact deadline',async()=>{
  let d=await requestCancellation(await held(roomCart('2036-02-03')));
  const deadline=d.booking.holdExpiresAt,requestId=d.booking.pendingCancellation.id;
  await assert.rejects(clockService(deadline).cancellation(await actor(a.owner),d.booking.id,'confirm',requestId,cancelCommand(d),audit()),{code:'HOLD_EXPIRED'});
  d=(await request(`/bookings/${d.booking.id}`)).data;
  assert.equal(d.booking.status,'EXPIRED');assert.equal(d.cancellations[0].status,'CLOSED');assert.equal(d.cancellations[0].resolutionCode,'HOLD_EXPIRED');
  assert.equal(d.history.filter(h=>h.to==='EXPIRED').length,1);
});

test('confirmed pending cancellation survives old hold deadline and allows late acknowledgment before any actual service',async()=>{
  let d=await requestCancellation(await confirm(await held(roomCart('2036-02-04'))));
  await pool.execute('UPDATE bookings SET hold_expires_at=DATE_SUB(UTC_TIMESTAMP(6),INTERVAL 1 SECOND) WHERE id=?',[d.booking.id]);
  await booking.expireHolds();d=(await request(`/bookings/${d.booking.id}`)).data;assert.equal(d.booking.displayStatus,'CANCEL_REQUESTED');
  const late=clockService('2036-02-06T12:00:00Z');
  const result=await late.cancellation(await actor(a.owner),d.booking.id,'confirm',d.booking.pendingCancellation.id,cancelCommand(d),audit());assert.equal(result.booking.status,'CANCELLED');
  assert.equal(result.booking.closedAt,'2036-02-06T12:00:00.000Z');
});

test('actual service prevents blanket cancellation and unauthorized callers cannot process a request',async()=>{
  let d=await requestCancellation(await confirm(await held(roomCart('2036-02-05'))));
  for(const session of [other,b.owner,admin])assert.equal((await request(cancellationPath(d,'confirm'),{session,method:'POST',body:cancelCommand(d)})).code,'FORBIDDEN');
  await pool.execute('UPDATE booking_items SET actual_participant_count=1 WHERE id=?',[d.items[0].id]);
  assert.equal((await request(cancellationPath(d,'confirm'),{session:a.owner,method:'POST',body:cancelCommand(d)})).code,'SERVICE_ALREADY_STARTED');
  assert.equal((await request(`/bookings/${d.booking.id}`)).data.booking.displayStatus,'CANCEL_REQUESTED');
});

test('audit, notification and idempotency persistence failures roll back cancellation including release',async()=>{
  let d=await confirm(await held(roomCart('2036-02-06')));
  for(const hook of ['event','notifyBooking','saveIdempotency']){
    const failing=createBookingService({repository:{transaction:work=>repository.transaction(tx=>work({...tx,[hook]:async()=>{throw new Error('injected rollback');}}))}});
    await assert.rejects(failing.cancellation(await actor(customer),d.booking.id,'request',null,cancelCommand(d),audit()),/injected rollback/);
    assert.equal((await request(`/bookings/${d.booking.id}`)).data.cancellations.length,0);
  }
  d=await requestCancellation(d);
  const failing=createBookingService({repository:{transaction:work=>repository.transaction(tx=>work({...tx,notifyBooking:async()=>{throw new Error('injected rollback');}}))}});
  await assert.rejects(failing.cancellation(await actor(a.owner),d.booking.id,'confirm',d.booking.pendingCancellation.id,cancelCommand(d),audit()),/injected rollback/);
  const result=(await request(`/bookings/${d.booking.id}`)).data;assert.equal(result.booking.status,'CONFIRMED');assert.equal(result.booking.pendingCancellation.id,d.booking.pendingCancellation.id);
  const [[set]]=await pool.execute('SELECT status FROM reservation_sets WHERE booking_id=?',[d.booking.id]);assert.equal(set.status,'COMMITTED');
});

test('hold policy is enforced by the server at 30-minute boundary and retries never extend it',async()=>{
  const cart=roomCart('2037-01-01'),at='2037-01-01T04:30:00Z',clock=clockService(at),auth=await actor(customer),q=await clock.quote(auth,cart);
  assert.equal(q.quote.canHold,true);assert.equal(q.quote.holdExpiresAt,'2037-01-01T05:00:00.000Z');
  const input={...cart,contact:{name:'Khách gần giờ',phone:'0901234567'},expectedQuoteToken:q.quote.token,idempotencyKey:randomUUID()};
  await assert.rejects(clockService('2037-01-01T04:30:01Z').hold(auth,input,audit()),{code:'HOLD_WINDOW_TOO_SHORT'});
  const d=await clock.hold(auth,input,audit());assert.equal(d.booking.holdExpiresAt,q.quote.holdExpiresAt);
  const replay=await clockService('2037-01-01T04:45:00Z').hold(auth,input,audit());assert.equal(replay.booking.holdExpiresAt,d.booking.holdExpiresAt);assert.equal(replay.replayed,true);
  await assert.rejects(clockService(d.booking.holdExpiresAt).transition(await actor(a.owner),d.booking.id,'confirm',command(d),audit()),{code:'HOLD_EXPIRED'});
});

test('notifications are scoped, paginated, readable once and cannot be read across accounts',async()=>{
  const result=await request('/notifications',{session:customer,query:{unreadOnly:'true',pageSize:5}});assert.equal(result.status,200,result.code);assert.ok(result.data.items.length>0);assert.ok(result.data.unreadCount>=result.data.items.length);
  const id=result.data.items[0].id;
  assert.equal((await request(`/notifications/${id}/read`,{session:other,method:'POST'})).code,'NOT_FOUND');
  const first=await request(`/notifications/${id}/read`,{method:'POST'}),second=await request(`/notifications/${id}/read`,{method:'POST'});assert.equal(first.status,200,first.code);assert.equal(first.data.notification.readAt,second.data.notification.readAt);
  assert.equal((await request('/notifications',{session:null})).status,401);
});

test('cancelling one shared booking preserves the other booking and the shared resource assignment',async()=>{
  const resource=(await calendar.createResource(a.auth,{code:`CANCEL_SHARED_${++sequence}`,name:'Hướng dẫn chung',resourceType:'SINGLE',totalQuantity:1,maxPeoplePerUnit:4},audit())).resource;
  const s=await slot({personCapacity:4,assignments:[{resourceId:resource.id,quantity:1,allocationMode:'SESSION_SHARED',rules:a.offers.map(o=>({offerId:o.id,usageBasis:'SHARED_ONCE',unitsRequired:1,maxPeoplePerUnit:4}))}]});
  let d=await confirm(await held(serviceCart(s,{participants:2}))),second=await confirm(await held(serviceCart(s,{participants:2}),{session:other}));
  d=await requestCancellation(d);
  assert.equal((await request('/bookings/quote',{method:'POST',body:serviceCart(s,{participants:1})})).code,'AVAILABILITY_CONFLICT');
  const r=await request(cancellationPath(d,'confirm'),{session:a.owner,method:'POST',body:cancelCommand(d)});assert.equal(r.status,200,r.code);
  const otherBooking=(await request(`/bookings/${second.booking.id}`,{session:other})).data;assert.equal(otherBooking.booking.status,'CONFIRMED');
  assert.equal((await request('/bookings/quote',{method:'POST',body:serviceCart(s,{participants:2})})).status,200);
  assert.equal((await request('/bookings/quote',{method:'POST',body:serviceCart(s,{participants:3})})).code,'AVAILABILITY_CONFLICT');
});

test('requesting cancellation closes pending rescheduling and only releases its supplemental hold',async()=>{
  let d=await confirm(await held(roomCart('2036-03-01')));
  const [[current]]=await pool.execute('SELECT current_reservation_set_id FROM bookings WHERE id=?',[d.booking.id]);
  const change=await insert(pool,'schedule_requests',{household_id:a.householdId,customer_user_id:customer.user.id,request_code:`CH-${randomUUID()}`,request_kind:'BOOKING_CHANGE',booking_id:d.booking.id,created_by:customer.user.id,message:'Xin đổi lịch',preferences:{},status:'PROPOSED'});
  const proposal=await insert(pool,'booking_proposals',{household_id:a.householdId,request_id:change,booking_id:d.booking.id,version:1,created_by:a.owner.user.id,status:'SENT',sent_at:atNow().slice(0,19).replace('T',' '),expires_at:new Date(Date.now()+3600000).toISOString().slice(0,19).replace('T',' '),total_vnd:400000,terms_snapshot:{}});
  const set=await insert(pool,'reservation_sets',{household_id:a.householdId,booking_id:d.booking.id,proposal_id:proposal,status:'HELD',purpose:'RESCHEDULE',base_set_id:current.current_reservation_set_id,version:2,first_starts_at:'2036-03-03 07:00:00',last_ends_at:'2036-03-04 05:00:00',hold_started_at:atNow().slice(0,19).replace('T',' '),expires_at:new Date(Date.now()+3600000).toISOString().slice(0,19).replace('T',' '),total_vnd:400000,terms_snapshot:{}});
  await insert(pool,'booking_items',{household_id:a.householdId,reservation_set_id:set,kind:'ROOM',room_id:a.roomIds[0],participant_count:2,quantity:1,pricing_type:'PER_NIGHT',is_exclusive:1,check_in_date:'2036-03-03',check_out_date:'2036-03-04',starts_at:'2036-03-03 07:00:00',ends_at:'2036-03-04 05:00:00',unit_price_vnd:400000,base_amount_vnd:400000,snapshot:{title:'Alternative'}});
  d=await requestCancellation(d);
  const [sets]=await pool.execute('SELECT id,status FROM reservation_sets WHERE booking_id=? ORDER BY id',[d.booking.id]);assert.deepEqual(sets.map(s=>s.status),['COMMITTED','RELEASED']);
  const [[closed]]=await pool.execute('SELECT status,resolution_code FROM schedule_requests WHERE id=?',[change]);assert.equal(closed.status,'CLOSED');assert.equal(closed.resolution_code,'CANCELLATION_REQUESTED');
  const [[proposed]]=await pool.execute('SELECT status FROM booking_proposals WHERE id=?',[proposal]);assert.equal(proposed.status,'WITHDRAWN');
  assert.equal((await request('/bookings/quote',{method:'POST',body:roomCart('2036-03-03')})).status,200);
  assert.equal((await request('/bookings/quote',{method:'POST',body:roomCart('2036-03-01')})).code,'AVAILABILITY_CONFLICT');
});

test('an outstanding asset handover prevents cancellation even without a recorded outcome',async()=>{
  const resource=(await calendar.createResource(a.auth,{code:`CANCEL_ASSET_${++sequence}`,name:'Xe của khách',resourceType:'POOL',totalQuantity:2,maxPeoplePerUnit:2},audit())).resource;
  const s=await slot({personCapacity:4,assignments:[{resourceId:resource.id,quantity:2,allocationMode:'PER_BOOKING_QUOTA',rules:a.offers.map(o=>({offerId:o.id,usageBasis:'FIXED',unitsRequired:1,maxPeoplePerUnit:2}))}]});
  let d=await requestCancellation(await confirm(await held(serviceCart(s,{participants:2}))));
  const [[usage]]=await pool.execute('SELECT id FROM item_resource_usages WHERE item_id=?',[d.items[0].id]);
  await insert(pool,'resource_handovers',{household_id:a.householdId,usage_id:usage.id,event_kind:'ISSUE',quantity:1,condition_note:'Xe đã giao',occurred_at:atNow().slice(0,19).replace('T',' '),recorded_by:a.owner.user.id,operation_key:randomUUID()});
  assert.equal((await request(cancellationPath(d,'confirm'),{session:a.owner,method:'POST',body:cancelCommand(d)})).code,'SERVICE_ALREADY_STARTED');
  d=(await request(`/bookings/${d.booking.id}`)).data;assert.ok(!d.allowedActions.includes('confirmCancellation'));assert.equal(d.booking.displayStatus,'CANCEL_REQUESTED');
});
