import assert from 'node:assert/strict';
import { before,after,test } from 'node:test';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createTestDatabase } from '../support/mysql.js';
import { testDatabaseOptions } from '../support/config.js';
import { insert } from '../support/fixtures.js';
import { databaseAccess } from '../../src/database.js';
import { createAuthRepository } from '../../src/auth/repository.js';
import { createAuthService } from '../../src/auth/service.js';
import { authOptions } from '../../src/config/auth.js';
import { hashPassword } from '../../src/auth/passwords.js';
import { createHouseholdRepository } from '../../src/households/repository.js';
import { createHouseholdService } from '../../src/households/service.js';
import { createCatalogRepository } from '../../src/catalog/repository.js';
import { createCatalogService } from '../../src/catalog/service.js';
import { createRoomRepository } from '../../src/rooms/repository.js';
import { createRoomService } from '../../src/rooms/service.js';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/shared/logger.js';
import { openApiDocument } from '../../src/openapi.js';

let database,pool,authRepository,authService,householdService,catalogService,repository,service,server,url,passwordHash,contract,admin,admin2;
let sequence=0;
const password='Long isolated password for room fixtures';
const ajv=addFormats(new Ajv({strict:false,allErrors:true}));
const logger=createLogger({env:{LOG_LEVEL:'silent'}});
const correlation=()=>`rooms-fixture-${++sequence}`;
const own=data=>`/households/me/rooms/${data.room.id}`;
const review=data=>`/admin/room-submissions/${data.profile.revisionId}/review`;
const ref=data=>({revisionId:data.profile.revisionId,version:data.profile.version,pricingToken:data.room.pricingToken});
const profileBody=(data,extra={})=>{
  const {revisionId,version,title,body,placeId,maxGuests,checkInTime,checkOutTime,terms,details}=data.profile;
  return {revisionId,version,title,body,placeId,maxGuests,checkInTime,checkOutTime,terms,details,...extra};
};
const priceBody=(data,price)=>({expectedToken:data.room.pricingToken,nightlyPriceVnd:price,reason:'Cập nhật giá áp dụng cho yêu cầu mới'});
async function sql(work){const c=await database.connect();try{return await work(c);}finally{await database.closeConnection(c);}}
async function account(role='CUSTOMER'){
  const user=await authRepository.transaction(tx=>tx.createUser({email:`rooms-${++sequence}@example.invalid`,displayName:`Rooms ${sequence}`,passwordHash,role}));
  return {...await authService.login({email:user.email,password}),id:String(user.id)};
}
async function request(path,{token,method='GET',body}={}){
  const response=await fetch(`${url}/api/v1${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const payload=await response.json(),key=`/api/v1${path.split('?')[0].replace(/\/rooms\/\d+/g,'/rooms/{roomId}').replace(/\/room-submissions\/\d+/g,'/room-submissions/{revisionId}')}`;
  const operation=contract.paths[key]?.[method.toLowerCase()];assert.ok(operation,`Missing OpenAPI operation ${method} ${key}`);
  const validator=ajv.compile((operation.responses[response.status]??operation.responses.default).content['application/json'].schema);
  assert.equal(validator(payload),true,JSON.stringify(validator.errors));assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(payload.meta.requestId,response.headers.get('x-request-id'));
  return {status:response.status,body:payload,data:payload.data};
}
async function point(owner){
  const auth=await authService.authenticate(owner.accessToken);let data=await catalogService.createPlace(auth,{title:`Nhà vườn ${++sequence}`,body:'Điểm nghỉ ngơi, đón khách và trải nghiệm nghề truyền thống.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',coordinates:{latitude:10.2,longitude:105.9}}},correlation());
  await catalogService.submitPlace(auth,data.place.id,{revisionId:data.profile.revisionId,version:data.profile.version},correlation());
  data=await catalogService.reviewPlace(await authService.authenticate(admin.accessToken),data.profile.revisionId,{version:data.profile.version,decision:'APPROVED'},correlation());return data.place.id;
}
async function household(){
  const owner=await account(),auth=await authService.authenticate(owner.accessToken);
  const h=await householdService.open(auth,{title:`Hộ du lịch ${++sequence}`,body:'Gia đình tổ chức trải nghiệm và cung cấp phòng lưu trú.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',contactPhone:'0901234567'}},correlation());
  await householdService.submit(auth,{revisionId:h.profile.revisionId,version:h.profile.version},correlation());
  const accepted=await householdService.review(await authService.authenticate(admin.accessToken),h.profile.revisionId,{version:h.profile.version,decision:'APPROVED'},correlation());
  return {owner,householdId:accepted.household.id,placeId:await point(owner)};
}
async function draft(fixture,extra={}){
  fixture??=await household();const input={title:'Phòng Hoa Sen',body:'Phòng nghỉ hướng vườn, thoáng mát và phù hợp gia đình nhỏ.',placeId:fixture.placeId,nightlyPriceVnd:400000,maxGuests:4,checkInTime:'14:00',checkOutTime:'12:00',terms:{includedItems:['Nước uống'],excludedItems:['Ăn sáng']},details:{amenities:['Điều hòa','Wi-Fi'],houseRules:['Giữ yên tĩnh sau 22 giờ']},...extra};
  const response=await request('/households/me/rooms',{token:fixture.owner.accessToken,method:'POST',body:input});assert.equal(response.status,201);return {...fixture,data:response.data,input};
}
async function pending(fixture){fixture??=await draft();const response=await request(`${own(fixture.data)}/submissions`,{token:fixture.owner.accessToken,method:'POST',body:ref(fixture.data)});assert.equal(response.status,200);return {...fixture,data:response.data};}
async function published(fixture){fixture??=await pending();const response=await request(review(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'APPROVED'}});assert.equal(response.status,200);return {...fixture,data:response.data};}
async function commitment(fixture,status='COMMITTED',createdBy=fixture.owner.id){
  return sql(async c=>{
    const booking=await insert(c,'bookings',{household_id:fixture.householdId,booking_code:`ROOM-${++sequence}`,created_by:createdBy,source:'OFFLINE',offline_channel:'PHONE',status:'CONFIRMED',contact_name:'Khách ngoài app',contact_phone:'0000000000',check_in_date:'2035-11-20',check_out_date:'2035-11-22',first_starts_at:'2035-11-20 07:00:00',last_ends_at:'2035-11-22 05:00:00',total_vnd:800000,terms_snapshot:{accepted:'Original room terms'},confirmed_at:'2035-10-01 00:00:00'});
    const set=await insert(c,'reservation_sets',{household_id:fixture.householdId,booking_id:booking,status,total_vnd:800000,terms_snapshot:{accepted:'Original room terms'},first_starts_at:'2035-11-20 07:00:00',last_ends_at:'2035-11-22 05:00:00',...(status==='HELD'?{hold_started_at:'2020-01-01 00:00:00',expires_at:'2035-11-19 00:00:00'}:{})});
    const item=await insert(c,'booking_items',{household_id:fixture.householdId,reservation_set_id:set,kind:'ROOM',room_id:fixture.data.room.id,participant_count:4,quantity:2,pricing_type:'PER_NIGHT',is_exclusive:1,check_in_date:'2035-11-20',check_out_date:'2035-11-22',unit_price_vnd:400000,base_amount_vnd:800000,starts_at:'2035-11-20 07:00:00',ends_at:'2035-11-22 05:00:00',snapshot:{room:fixture.data.room,profile:fixture.data.profile}});
    await c.execute('UPDATE bookings SET current_reservation_set_id=? WHERE id=?',[set,booking]);const [[row]]=await c.execute('SELECT * FROM booking_items WHERE id=?',[item]);return {booking,set,item,before:JSON.stringify(row)};
  });
}

before(async()=>{
  database=await createTestDatabase(process.env,{schema:'survey'});pool=mysql.createPool({...testDatabaseOptions(),database:database.name,connectionLimit:8,queueLimit:30});const access=databaseAccess(pool);
  authRepository=createAuthRepository(access);authService=createAuthService({repository:authRepository,options:authOptions({JWT_SECRET:randomBytes(32).toString('base64url')})});householdService=createHouseholdService({repository:createHouseholdRepository(access)});
  catalogService=createCatalogService({repository:createCatalogRepository(access)});repository=createRoomRepository(access);service=createRoomService({repository});passwordHash=await hashPassword(password);
  contract=await SwaggerParser.dereference(structuredClone(openApiDocument),{resolve:{external:false}});
  server=createApp({logger,authService,householdService,catalogService,roomService:service}).listen(0);await new Promise(resolve=>server.once('listening',resolve));url=`http://127.0.0.1:${server.address().port}`;
  admin=await account('ADMIN');admin2=await account('ADMIN');
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await pool?.end();await database?.dispose();});

test('room draft, submission, admin approval and public nightly price follow the complete HTTP contract',async()=>{
  const fixture=await draft(),token=fixture.owner.accessToken;assert.equal(fixture.data.profile.status,'DRAFT');assert.equal(fixture.data.profile.nightlyPriceSnapshotVnd,null);assert.equal(fixture.data.publishedProfile,null);
  assert.equal((await request(`/public/rooms/${fixture.data.room.id}`)).status,404);
  assert.equal((await request(`/admin/room-submissions/${fixture.data.profile.revisionId}`,{token:admin.accessToken})).status,404);
  const submitted=await pending(fixture);assert.equal(submitted.data.profile.nightlyPriceSnapshotVnd,400000);assert.equal((await request(`/public/rooms/${fixture.data.room.id}`)).status,404);
  const queue=await request(`/admin/room-submissions?householdId=${fixture.householdId}`,{token:admin.accessToken});assert.equal(queue.data.items[0].revisionId,fixture.data.profile.revisionId);
  assert.equal((await request(`/admin/room-submissions/${fixture.data.profile.revisionId}`,{token:admin.accessToken})).status,200);
  const accepted=await published(submitted),guest=await request(`/public/rooms/${fixture.data.room.id}`);assert.equal(guest.status,200);assert.equal(guest.data.room.title,fixture.input.title);assert.equal(guest.data.room.nightlyPriceVnd,400000);assert.equal(guest.data.room.maxGuests,4);assert.equal(guest.data.room.checkInTime,'14:00');assert.equal(guest.data.room.checkOutTime,'12:00');assert.equal(guest.data.room.place.id,fixture.placeId);
  assert.doesNotMatch(JSON.stringify(guest.data),/pricingToken|reviewNote|reviewedBy|ownerUserId|email|nightlyPriceSnapshotVnd/);
  const list=await request('/households/me/rooms',{token});assert.equal(list.data.total,1);assert.equal(list.data.items[0].publishedProfile.revisionId,accepted.data.profile.revisionId);
  const history=await request(`${own(fixture.data)}/revisions`,{token});assert.equal(history.data.items[0].status,'APPROVED');
});

test('household ownership is enforced for every room command and admin cannot manage on behalf of owner',async()=>{
  const fixture=await draft(),other=await household(),customer=await account();
  const mutations=[['GET','',undefined],['PUT','/profile',profileBody(fixture.data)],['POST','/submissions',ref(fixture.data)],['GET','/revisions',undefined],['PATCH','/pricing',priceBody(fixture.data,500000)],['PATCH','/status',{expectedState:{supplyStatus:'AVAILABLE',visibility:'VISIBLE'},supplyStatus:'PAUSED',visibility:'HIDDEN',reason:'Không phải chủ hộ'}]];
  for(const [method,suffix,body] of mutations)assert.equal((await request(`${own(fixture.data)}${suffix}`,{token:other.owner.accessToken,method,body})).status,403);
  for(const token of [customer.accessToken,admin.accessToken])assert.equal((await request(own(fixture.data),{token})).status,403);
  assert.equal((await request(own(fixture.data))).status,401);
  assert.equal((await request('/admin/room-submissions',{token:fixture.owner.accessToken})).status,403);
  assert.equal((await request('/households/me/rooms',{token:fixture.owner.accessToken,method:'POST',body:{...fixture.input,placeId:other.placeId}})).status,403);
  assert.equal((await request('/households/me/rooms',{token:fixture.owner.accessToken,method:'POST',body:{...fixture.input,householdId:other.householdId}})).status,422);
});

test('submission requires complete content and a ready owned place; invalid prices and times never reach SQL',async()=>{
  const fixture=await draft(undefined,{body:'',placeId:null}),token=fixture.owner.accessToken;
  let result=await request(`${own(fixture.data)}/submissions`,{token,method:'POST',body:ref(fixture.data)});assert.equal(result.body.error.code,'ROOM_PROFILE_INCOMPLETE');
  let data=(await request(`${own(fixture.data)}/profile`,{token,method:'PUT',body:profileBody(fixture.data,{body:'Mô tả phòng đầy đủ nhưng chưa chọn điểm lưu trú.'})})).data;
  result=await request(`${own(data)}/submissions`,{token,method:'POST',body:ref(data)});assert.equal(result.body.error.code,'ROOM_PLACE_NOT_READY');
  await sql(c=>c.execute("UPDATE places SET visibility='HIDDEN' WHERE id=?",[fixture.placeId]));
  data=(await request(`${own(data)}/profile`,{token,method:'PUT',body:profileBody(data,{placeId:fixture.placeId})})).data;
  result=await request(`${own(data)}/submissions`,{token,method:'POST',body:ref(data)});assert.equal(result.body.error.code,'ROOM_PLACE_NOT_READY');
  for(const extra of [{nightlyPriceVnd:-1},{nightlyPriceVnd:1.1},{nightlyPriceVnd:'400000'},{nightlyPriceVnd:1000000000000000},{maxGuests:0},{checkInTime:'24:00'},{checkOutTime:'12:30:00'}])assert.equal((await request('/households/me/rooms',{token,method:'POST',body:{...fixture.input,...extra}})).status,422);
});

test('editing and rejecting room content preserves the published place, capacity, times and terms',async()=>{
  let fixture=await published(),token=fixture.owner.accessToken;const nextPlace=await point(fixture.owner);
  let data=(await request(`${own(fixture.data)}/profile`,{token,method:'PUT',body:profileBody(fixture.data,{title:'PRIVATE_DRAFT',placeId:nextPlace,maxGuests:2,checkInTime:'15:00',checkOutTime:'11:00',terms:{includedItems:['Ăn sáng'],excludedItems:[]}})})).data;
  fixture=await pending({...fixture,data});let guest=await request(`/public/rooms/${data.room.id}`);assert.equal(guest.data.room.place.id,fixture.placeId);assert.equal(guest.data.room.maxGuests,4);assert.equal(guest.data.room.checkInTime,'14:00');
  let result=await request(`${own(data)}/profile`,{token,method:'PUT',body:profileBody(data)});assert.equal(result.status,409);
  result=await request(review(data),{token:admin.accessToken,method:'POST',body:{version:data.profile.version,decision:'REJECTED',reason:'PRIVATE_REVIEW_NOTE'}});assert.equal(result.status,200);
  guest=await request(`/public/rooms/${data.room.id}`);assert.doesNotMatch(JSON.stringify(guest.data),/PRIVATE_DRAFT|PRIVATE_REVIEW_NOTE/);assert.deepEqual(guest.data.room.terms.includedItems,['Nước uống']);
  data=(await request(`${own(data)}/profile`,{token,method:'PUT',body:profileBody(result.data,{title:'Phòng cập nhật đã duyệt'})})).data;
  fixture=await published(await pending({...fixture,data}));guest=await request(`/public/rooms/${data.room.id}`);assert.equal(guest.data.room.place.id,nextPlace);assert.equal(guest.data.room.maxGuests,2);assert.equal(guest.data.room.checkInTime,'15:00');assert.equal(guest.data.room.checkOutTime,'11:00');assert.deepEqual(guest.data.room.terms.includedItems,['Ăn sáng']);
});

test('nightly price updates are immediate and preserve submitted revisions and actual room reservation snapshots',async()=>{
  const fixture=await published(),token=fixture.owner.accessToken,stored=await commitment(fixture);
  const result=await request(`${own(fixture.data)}/pricing`,{token,method:'PATCH',body:priceBody(fixture.data,500000)});assert.equal(result.status,200);assert.equal(result.data.room.nightlyPriceVnd,500000);assert.equal(result.data.publishedProfile.nightlyPriceSnapshotVnd,400000);
  assert.equal((await request(`/public/rooms/${fixture.data.room.id}`)).data.room.nightlyPriceVnd,500000);
  const repeat=await request(`${own(fixture.data)}/pricing`,{token,method:'PATCH',body:priceBody(result.data,500000)});assert.equal(repeat.data.changed,false);
  assert.equal((await request(`${own(fixture.data)}/pricing`,{token,method:'PATCH',body:priceBody(fixture.data,550000)})).body.error.code,'STALE_VERSION');
  await sql(async c=>{const [[row]]=await c.execute('SELECT * FROM booking_items WHERE id=?',[stored.item]);assert.equal(JSON.stringify(row),stored.before);});
});

test('submission detects stale prices, pending price changes do not rewrite submitted price and approval keeps the live price',async()=>{
  const fixture=await draft(),token=fixture.owner.accessToken;
  let result=await request(`${own(fixture.data)}/pricing`,{token,method:'PATCH',body:priceBody(fixture.data,450000)});const updated=result.data;
  result=await request(`${own(fixture.data)}/submissions`,{token,method:'POST',body:ref(fixture.data)});assert.equal(result.body.error.code,'STALE_VERSION');
  const submitted=await pending({...fixture,data:updated});result=await request(`${own(fixture.data)}/pricing`,{token,method:'PATCH',body:priceBody(submitted.data,475000)});assert.equal(result.status,200);assert.equal(result.data.profile.nightlyPriceSnapshotVnd,450000);
  result=await request(`${own(fixture.data)}/submissions`,{token,method:'POST',body:ref(submitted.data)});assert.equal(result.data.changed,false);
  const accepted=await published(submitted);assert.equal(accepted.data.room.nightlyPriceVnd,475000);assert.equal(accepted.data.publishedProfile.nightlyPriceSnapshotVnd,450000);
});

test('capacity/location/check-in/out changes are blocked by committed room items but content-only edits remain possible',async()=>{
  const fixture=await published(),token=fixture.owner.accessToken;await commitment(fixture);let data=fixture.data;
  for(const extra of [{maxGuests:2},{checkInTime:'15:00'},{checkOutTime:'11:00'},{placeId:await point(fixture.owner)}]){
    data=(await request(`${own(data)}/profile`,{token,method:'PUT',body:profileBody(data,{placeId:fixture.placeId,maxGuests:4,checkInTime:'14:00',checkOutTime:'12:00',...extra})})).data;
    assert.equal((await request(`${own(data)}/submissions`,{token,method:'POST',body:ref(data)})).body.error.code,'ROOM_CONFIGURATION_LOCKED');
  }
  data=(await request(`${own(data)}/profile`,{token,method:'PUT',body:profileBody(data,{placeId:fixture.placeId,maxGuests:4,checkInTime:'14:00',checkOutTime:'12:00',title:'Cập nhật mô tả, giữ nguyên cam kết'})})).data;
  const accepted=await published(await pending({...fixture,data}));assert.equal(accepted.data.profile.status,'APPROVED');
});

test('admin approval rechecks newly created holds; expired holds do not block even if background status is still HELD',async()=>{
  const fixture=await published(),token=fixture.owner.accessToken;
  const data=(await request(`${own(fixture.data)}/profile`,{token,method:'PUT',body:profileBody(fixture.data,{maxGuests:2})})).data;
  const submitted=await pending({...fixture,data}),held=await commitment(fixture,'HELD');
  let result=await request(review(data),{token:admin.accessToken,method:'POST',body:{version:data.profile.version,decision:'APPROVED'}});assert.equal(result.body.error.code,'ROOM_CONFIGURATION_LOCKED');
  await sql(c=>c.execute('UPDATE reservation_sets SET expires_at=UTC_TIMESTAMP(6)-INTERVAL 1 SECOND WHERE id=?',[held.set]));
  result=await published(submitted);assert.equal(result.data.room.maxGuests,2);
});

test('room commitment check sees a reservation committed after an earlier consistent read in the same transaction',async()=>{
  const fixture=await published(),token=fixture.owner.accessToken,customer=await account();
  const data=(await request(`${own(fixture.data)}/profile`,{token,method:'PUT',body:profileBody(fixture.data,{maxGuests:2})})).data;
  let inserted=false;
  const concurrent=createRoomService({repository:{...repository,transaction:work=>repository.transaction(tx=>work({...tx,
    ownedHousehold:async ownerId=>{
      const row=await tx.ownedHousehold(ownerId);
      if(!inserted){inserted=true;await commitment(fixture,'COMMITTED',customer.id);}
      return row;
    },
  }))}});
  await assert.rejects(concurrent.submit(await authService.authenticate(token),data.room.id,ref(data),correlation()),{code:'ROOM_CONFIGURATION_LOCKED'});
  assert.equal((await request(own(data),{token})).data.profile.status,'DRAFT');
});

test('released and finished room reservations do not lock future room configuration',async()=>{
  for(const released of [true,false]){
    const fixture=await published(),stored=await commitment(fixture),token=fixture.owner.accessToken;
    if(released)await sql(c=>c.execute('UPDATE booking_items SET released_at=UTC_TIMESTAMP(6) WHERE id=?',[stored.item]));
    else await sql(c=>c.execute("UPDATE booking_items SET check_in_date='2020-11-20',check_out_date='2020-11-22',starts_at='2020-11-20 07:00:00',ends_at='2020-11-22 05:00:00' WHERE id=?",[stored.item]));
    const data=(await request(`${own(fixture.data)}/profile`,{token,method:'PUT',body:profileBody(fixture.data,{maxGuests:2})})).data;assert.equal((await published(await pending({...fixture,data}))).data.room.maxGuests,2);
  }
});

test('concurrent edits and concurrent prices cannot overwrite a newer version',async()=>{
  const fixture=await draft(),token=fixture.owner.accessToken;
  const edits=await Promise.all(['Một','Hai'].map(value=>request(`${own(fixture.data)}/profile`,{token,method:'PUT',body:profileBody(fixture.data,{title:`Phòng ${value}`})})));assert.deepEqual(edits.map(r=>r.status).sort(),[200,409]);
  const prices=await Promise.all([450000,500000].map(value=>request(`${own(fixture.data)}/pricing`,{token,method:'PATCH',body:priceBody(fixture.data,value)})));assert.deepEqual(prices.map(r=>r.status).sort(),[200,409]);
});

test('concurrent conflicting reviews produce one decision, and duplicate accepted decisions do not repeat audit or notification',async()=>{
  const fixture=await pending(),body={version:fixture.data.profile.version,decision:'APPROVED'};
  const results=await Promise.all([request(review(fixture.data),{token:admin.accessToken,method:'POST',body}),request(review(fixture.data),{token:admin2.accessToken,method:'POST',body:{...body,decision:'REJECTED',reason:'Không chấp thuận'}})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const winner=results[0].status===200?0:1,token=winner===0?admin.accessToken:admin2.accessToken,input=winner===0?body:{...body,decision:'REJECTED',reason:'Không chấp thuận'};
  assert.equal((await request(review(fixture.data),{token,method:'POST',body:input})).data.changed,false);
  await sql(async c=>{const [[n]]=await c.execute('SELECT COUNT(*) n FROM notifications WHERE event_key=?',[`room-review:${fixture.data.profile.revisionId}`]);assert.equal(Number(n.n),1);const [[e]]=await c.execute("SELECT COUNT(*) n FROM activity_events WHERE entity_type='CONTENT_REVISION' AND entity_id=? AND event_type='CONTENT_REVIEW'",[fixture.data.profile.revisionId]);assert.equal(Number(e.n),1);});
});

test('review and price failures roll back root, revision, audit and notification atomically',async()=>{
  const fixture=await pending(),auth=await authService.authenticate(admin.accessToken);
  const broken=createRoomService({repository:{...repository,transaction:work=>repository.transaction(tx=>work({...tx,notifyRoomReview:async()=>{throw new Error('notification fixture');}}))}});
  await assert.rejects(broken.review(auth,fixture.data.profile.revisionId,{version:fixture.data.profile.version,decision:'APPROVED'},correlation()));
  const mine=(await request(own(fixture.data),{token:fixture.owner.accessToken})).data;assert.equal(mine.profile.status,'PENDING');assert.equal(mine.publishedProfile,null);
  const brokenPrice=createRoomService({repository:{...repository,transaction:work=>repository.transaction(tx=>work({...tx,event:async()=>{throw new Error('audit fixture');}}))}});
  await assert.rejects(brokenPrice.updatePrice(await authService.authenticate(fixture.owner.accessToken),fixture.data.room.id,priceBody(fixture.data,500000),correlation()));
  assert.equal((await request(own(fixture.data),{token:fixture.owner.accessToken})).data.room.nightlyPriceVnd,400000);await published(fixture);
});

test('public price/capacity filters use inclusive boundaries, escaped literal search and strict pagination',async()=>{
  const fixture=await published(await pending(await draft(undefined,{title:'Phòng 100%_! hướng vườn'})));
  for(const query of [`guests=4&minPriceVnd=400000&maxPriceVnd=400000&placeId=${fixture.placeId}`,`q=${encodeURIComponent('%_!')}`])assert.equal((await request(`/public/rooms?householdId=${fixture.householdId}&${query}`)).data.total,1);
  for(const query of ['guests=5','maxPriceVnd=399999','minPriceVnd=400001',`q=${encodeURIComponent("' OR 1=1 --")}`])assert.equal((await request(`/public/rooms?householdId=${fixture.householdId}&${query}`)).data.total,0);
  for(const query of ['guests=0','guests=4.5','minPriceVnd=500000&maxPriceVnd=400000','status=DRAFT','pageSize=101','checkInDate=2030-01-01'])assert.equal((await request(`/public/rooms?${query}`)).status,422);
});

test('public reads hide rooms whenever the household, owner, place or room is not eligible',async()=>{
  const fixture=await published(),roomId=fixture.data.room.id;
  const mutations=[
    ["households","approval_status='REVOKED'","approval_status='APPROVED'",fixture.householdId],
    ["households","visibility='HIDDEN'","visibility='VISIBLE'",fixture.householdId],
    ["households","archived_at=UTC_TIMESTAMP(6)","archived_at=NULL",fixture.householdId],
    ["households","published_revision_id=NULL",`published_revision_id=(SELECT id FROM content_revisions WHERE household_profile_id=${fixture.householdId} AND status='APPROVED' LIMIT 1)`,fixture.householdId],
    ["users","status='BLOCKED'","status='ACTIVE'",fixture.owner.id],
    ["users","disabled_at=UTC_TIMESTAMP(6)","disabled_at=NULL",fixture.owner.id],
    ["users","role='CUSTOMER'","role='HOUSEHOLD'",fixture.owner.id],
    ["places","supply_status='PAUSED'","supply_status='AVAILABLE'",fixture.placeId],
    ["places","visibility='HIDDEN'","visibility='VISIBLE'",fixture.placeId],
    ["places","archived_at=UTC_TIMESTAMP(6)","archived_at=NULL",fixture.placeId],
    ["places","published_revision_id=NULL",`published_revision_id=(SELECT id FROM content_revisions WHERE place_id=${fixture.placeId} AND status='APPROVED' LIMIT 1)`,fixture.placeId],
    ["rooms","supply_status='PAUSED'","supply_status='AVAILABLE'",roomId],
    ["rooms","visibility='HIDDEN'","visibility='VISIBLE'",roomId],
    ["rooms","archived_at=UTC_TIMESTAMP(6)","archived_at=NULL",roomId],
  ];
  for(const [table,change,restore,id] of mutations){
    await sql(c=>c.execute(`UPDATE ${table} SET ${change} WHERE id=?`,[id]));
    assert.equal((await request(`/public/rooms/${roomId}`)).status,404);assert.equal((await request(`/public/rooms?householdId=${fixture.householdId}`)).data.total,0);
    await sql(c=>c.execute(`UPDATE ${table} SET ${restore} WHERE id=?`,[id]));
  }
  assert.equal((await request(`/public/rooms/${roomId}`)).status,200);
});

test('revoked households retain room history and old commitments but cannot publish, edit prices or reopen supply',async()=>{
  const fixture=await published(),token=fixture.owner.accessToken,stored=await commitment(fixture);
  await sql(c=>c.execute("UPDATE households SET approval_status='REVOKED' WHERE id=?",[fixture.householdId]));
  assert.equal((await request(own(fixture.data),{token})).status,200);assert.equal((await request(`${own(fixture.data)}/revisions`,{token})).status,200);
  assert.equal((await request(`${own(fixture.data)}/pricing`,{token,method:'PATCH',body:priceBody(fixture.data,500000)})).status,403);
  assert.equal((await request(`${own(fixture.data)}/profile`,{token,method:'PUT',body:profileBody(fixture.data)})).status,403);
  const status={expectedState:{supplyStatus:'AVAILABLE',visibility:'VISIBLE'},supplyStatus:'PAUSED',visibility:'HIDDEN',reason:'Ngừng nhận đặt mới'};
  let result=await request(`${own(fixture.data)}/status`,{token,method:'PATCH',body:status});assert.equal(result.status,200);
  assert.equal((await request(`${own(fixture.data)}/status`,{token,method:'PATCH',body:{...status,expectedState:{supplyStatus:'PAUSED',visibility:'HIDDEN'},supplyStatus:'AVAILABLE',visibility:'VISIBLE'}})).status,403);
  await sql(async c=>{const [[row]]=await c.execute('SELECT * FROM booking_items WHERE id=?',[stored.item]);assert.equal(JSON.stringify(row),stored.before);});
});

test('retired rooms cannot reopen; status conflicts and archived room commands preserve history',async()=>{
  const fixture=await published(),token=fixture.owner.accessToken,status={expectedState:{supplyStatus:'AVAILABLE',visibility:'VISIBLE'},supplyStatus:'RETIRED',visibility:'HIDDEN',reason:'Ngừng cung cấp phòng'};
  assert.equal((await request(`${own(fixture.data)}/status`,{token,method:'PATCH',body:status})).status,200);
  assert.equal((await request(`${own(fixture.data)}/status`,{token,method:'PATCH',body:status})).body.error.code,'STALE_VERSION');
  const current={supplyStatus:'RETIRED',visibility:'HIDDEN'};
  assert.equal((await request(`${own(fixture.data)}/status`,{token,method:'PATCH',body:{...status,expectedState:current}})).data.changed,false);
  assert.equal((await request(`${own(fixture.data)}/status`,{token,method:'PATCH',body:{...status,expectedState:current,supplyStatus:'AVAILABLE'}})).status,409);
  assert.equal((await request(`${own(fixture.data)}/pricing`,{token,method:'PATCH',body:priceBody(fixture.data,500000)})).status,409);
  await sql(c=>c.execute('UPDATE rooms SET archived_at=UTC_TIMESTAMP(6) WHERE id=?',[fixture.data.room.id]));
  assert.equal((await request(`${own(fixture.data)}/status`,{token,method:'PATCH',body:{...status,expectedState:current}})).status,409);
  assert.equal((await request(own(fixture.data),{token})).status,200);
});

test('review rechecks household/place/owner state and rejects stale revisions',async()=>{
  const fixture=await pending(),body={version:fixture.data.profile.version,decision:'APPROVED'};
  for(const [table,change,restore,id] of [['households',"approval_status='REVOKED'","approval_status='APPROVED'",fixture.householdId],['places',"visibility='HIDDEN'","visibility='VISIBLE'",fixture.placeId],['users',"status='BLOCKED'","status='ACTIVE'",fixture.owner.id]]){
    await sql(c=>c.execute(`UPDATE ${table} SET ${change} WHERE id=?`,[id]));assert.notEqual((await request(review(fixture.data),{token:admin.accessToken,method:'POST',body})).status,200);await sql(c=>c.execute(`UPDATE ${table} SET ${restore} WHERE id=?`,[id]));
  }
  const accepted=await published(fixture),token=fixture.owner.accessToken;
  await request(`${own(accepted.data)}/profile`,{token,method:'PUT',body:profileBody(accepted.data)});
  assert.equal((await request(review(fixture.data),{token:admin.accessToken,method:'POST',body})).body.error.code,'STALE_VERSION');
});

test('live authority and session are rechecked under transaction locks after authentication',async()=>{
  const fixture=await pending(),ownerAuth=await authService.authenticate(fixture.owner.accessToken),reviewer=await account('ADMIN'),auth=await authService.authenticate(reviewer.accessToken);
  await sql(c=>c.execute("UPDATE users SET role='CUSTOMER' WHERE id=?",[reviewer.id]));await assert.rejects(service.review(auth,fixture.data.profile.revisionId,{version:fixture.data.profile.version,decision:'APPROVED'},correlation()),{code:'FORBIDDEN'});
  await sql(c=>c.execute("UPDATE users SET status='BLOCKED' WHERE id=?",[fixture.owner.id]));await assert.rejects(service.updatePrice(ownerAuth,fixture.data.room.id,priceBody(fixture.data,500000),correlation()),{code:'ACCOUNT_BLOCKED'});
  await sql(c=>c.execute("UPDATE users SET status='ACTIVE' WHERE id=?",[fixture.owner.id]));await sql(c=>c.execute('UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP(6) WHERE id=?',[ownerAuth.sessionId]));await assert.rejects(service.save(ownerAuth,fixture.data.room.id,profileBody(fixture.data),correlation()),{code:'UNAUTHENTICATED'});
});
