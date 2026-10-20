import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {randomBytes} from 'node:crypto';
import mysql from 'mysql2/promise';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {createTestDatabase} from '../support/mysql.js';
import {testDatabaseOptions} from '../support/config.js';
import {insert} from '../support/fixtures.js';
import {databaseAccess} from '../../src/database.js';
import {createAuthRepository} from '../../src/auth/repository.js';
import {createAuthService} from '../../src/auth/service.js';
import {authOptions} from '../../src/config/auth.js';
import {hashPassword} from '../../src/auth/passwords.js';
import {createHouseholdRepository} from '../../src/households/repository.js';
import {createHouseholdService} from '../../src/households/service.js';
import {createCatalogRepository} from '../../src/catalog/repository.js';
import {createCatalogService} from '../../src/catalog/service.js';
import {createServiceRepository} from '../../src/services/repository.js';
import {createServiceService} from '../../src/services/service.js';
import {createApp} from '../../src/app.js';
import {createLogger} from '../../src/shared/logger.js';
import {openApiDocument} from '../../src/openapi.js';

let database,pool,authRepository,authService,householdService,catalogService,repository,service,server,url,passwordHash,contract,admin,admin2,categoryId;
let sequence=0;
const password='Long isolated password for experience fixtures';
const ajv=addFormats(new Ajv({strict:false,allErrors:true}));
const logger=createLogger({env:{LOG_LEVEL:'silent'}});
const addon={key:'preparation',name:'Chuẩn bị bữa ăn',unitPriceVnd:20000,maxQuantity:10,isActive:true,resourceFree:true};
const config={name:'Khách ghép',participationMode:'SHARED',pricingType:'PER_PERSON',unitPriceVnd:150000,minParticipants:1,maxParticipants:10,
  terms:{scopeDescription:'Giá cho một người tham gia toàn bộ buổi bắt cá.',includedItems:['Hướng dẫn của hộ dân'],excludedItems:[]},addons:[addon]};
const ref=data=>({revisionId:data.profile.revisionId,version:data.profile.version,offersToken:data.offersToken});
const own=data=>`/households/me/services/${data.service.id}`;
const review=data=>`/admin/service-submissions/${data.profile.revisionId}/review`;
const offerPath=(fixture,index=0)=>`${own(fixture.data)}/offers/${fixture.data.offers[index].id}`;
const correlation=()=>`services-fixture-${++sequence}`;
const profileBody=(data,extra={})=>{const p=data.profile;return {title:p.title,body:p.body,categoryId:p.categoryId,defaultPlaceId:p.defaultPlaceId,defaultDurationMinutes:p.defaultDurationMinutes,details:p.details,revisionId:p.revisionId,version:p.version,...extra};};
const offerConfig=offer=>{const {id,token,structureToken,quantityRule,createdAt,...configuration}=offer;return configuration;};
async function sql(work){const c=await database.connect();try{return await work(c);}finally{await database.closeConnection(c);}}
async function account(role='CUSTOMER'){
  const user=await authRepository.transaction(tx=>tx.createUser({email:`services-${++sequence}@example.invalid`,displayName:`Services ${sequence}`,passwordHash,role}));
  return {...await authService.login({email:user.email,password}),id:String(user.id)};
}
async function request(path,{token,method='GET',body}={}){
  const response=await fetch(`${url}/api/v1${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const payload=await response.json(),key=`/api/v1${path.split('?')[0].replace(/\/services\/\d+/g,'/services/{serviceId}').replace(/\/offers\/\d+/g,'/offers/{offerId}').replace(/\/service-submissions\/\d+/g,'/service-submissions/{revisionId}')}`;
  const operation=contract.paths[key]?.[method.toLowerCase()];assert.ok(operation,`Missing OpenAPI operation ${method} ${key}`);
  const validator=ajv.compile((operation.responses[response.status]??operation.responses.default).content['application/json'].schema);
  assert.equal(validator(payload),true,JSON.stringify(validator.errors));assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(payload.meta.requestId,response.headers.get('x-request-id'));
  return {status:response.status,body:payload,data:payload.data};
}
async function point(owner,householdId){
  const auth=await authService.authenticate(owner.accessToken);let data=await catalogService.createPlace(auth,{title:`Vườn nhà ${++sequence}`,body:'Điểm đón khách tham quan và trải nghiệm nghề truyền thống.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',coordinates:{latitude:10.2,longitude:105.9}}},correlation());
  await catalogService.submitPlace(auth,data.place.id,{revisionId:data.profile.revisionId,version:data.profile.version},correlation());
  data=await catalogService.reviewPlace(await authService.authenticate(admin.accessToken),data.profile.revisionId,{version:data.profile.version,decision:'APPROVED'},correlation());return data.place.id;
}
async function household(){
  const owner=await account(),auth=await authService.authenticate(owner.accessToken);
  const h=await householdService.open(auth,{title:`Hộ du lịch ${++sequence}`,body:'Gia đình tổ chức nhiều trải nghiệm du lịch cộng đồng.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',contactPhone:'0901234567'}},correlation());
  await householdService.submit(auth,{revisionId:h.profile.revisionId,version:h.profile.version},correlation());
  const accepted=await householdService.review(await authService.authenticate(admin.accessToken),h.profile.revisionId,{version:h.profile.version,decision:'APPROVED'},correlation());
  return {owner,householdId:accepted.household.id,placeId:await point(owner,accepted.household.id)};
}
async function draft(fixture,options={}){
  fixture??=await household();const input={title:'Trải nghiệm giăng lưới bắt cá',body:'Cùng hộ dân giăng lưới, thu hoạch cá và tìm hiểu nghề địa phương.',categoryId,defaultPlaceId:fixture.placeId,defaultDurationMinutes:180,details:{participationConditions:['Trẻ em đi cùng người lớn'],preparationNotes:['Mang quần áo thay']},...options.profile};
  let response=await request('/households/me/services',{token:fixture.owner.accessToken,method:'POST',body:input});assert.equal(response.status,201);let data=response.data;
  if(options.offer!==false){response=await request(`${own(data)}/offers`,{token:fixture.owner.accessToken,method:'POST',body:options.configuration??config});assert.equal(response.status,201);data=(await request(own(data),{token:fixture.owner.accessToken})).data;}
  return {...fixture,data,input};
}
async function pending(fixture){fixture??=await draft();const response=await request(`${own(fixture.data)}/submissions`,{token:fixture.owner.accessToken,method:'POST',body:ref(fixture.data)});assert.equal(response.status,200);return {...fixture,data:response.data};}
async function published(fixture){fixture??=await pending();const response=await request(review(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'APPROVED'}});assert.equal(response.status,200);return {...fixture,data:response.data};}

before(async()=>{
  database=await createTestDatabase(process.env,{schema:'survey'});pool=mysql.createPool({...testDatabaseOptions(),database:database.name,connectionLimit:8,queueLimit:30});const access=databaseAccess(pool);
  authRepository=createAuthRepository(access);authService=createAuthService({repository:authRepository,options:authOptions({JWT_SECRET:randomBytes(32).toString('base64url')})});householdService=createHouseholdService({repository:createHouseholdRepository(access)});
  catalogService=createCatalogService({repository:createCatalogRepository(access)});repository=createServiceRepository(access);service=createServiceService({repository});passwordHash=await hashPassword(password);
  contract=await SwaggerParser.dereference(structuredClone(openApiDocument),{resolve:{external:false}});
  server=createApp({logger,authService,householdService,catalogService,serviceService:service}).listen(0);await new Promise(resolve=>server.once('listening',resolve));url=`http://127.0.0.1:${server.address().port}`;
  admin=await account('ADMIN');admin2=await account('ADMIN');categoryId=(await catalogService.createCategory(await authService.authenticate(admin.accessToken),{kind:'SERVICE',code:'EXPERIENCES',name:'Trải nghiệm địa phương',isActive:true,reason:'Fixture'},correlation())).category.id;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await pool?.end();await database?.dispose();});

test('service, scoped offers and submitted snapshot become public only after ADMIN approval',async()=>{
  const fixture=await draft();const token=fixture.owner.accessToken;assert.equal(fixture.data.profile.status,'DRAFT');assert.equal(fixture.data.publishedProfile,null);assert.equal(fixture.data.offers[0].quantityRule,'PARTICIPANT_COUNT');
  assert.equal((await request(`/public/services/${fixture.data.service.id}`)).status,404);
  const submitted=await pending(fixture);assert.equal(submitted.data.profile.offerSnapshots.length,1);assert.equal((await request(`/public/services/${fixture.data.service.id}`)).status,404);
  const queue=await request(`/admin/service-submissions?householdId=${fixture.householdId}`,{token:admin.accessToken});assert.ok(queue.data.items.some(row=>row.revisionId===submitted.data.profile.revisionId));
  assert.equal((await request(`/admin/service-submissions/${submitted.data.profile.revisionId}`,{token:admin.accessToken})).status,200);
  const accepted=await published(submitted);const guest=await request(`/public/services/${fixture.data.service.id}`);assert.equal(guest.status,200);assert.equal(guest.data.service.title,fixture.input.title);assert.equal(guest.data.service.offers.length,1);assert.equal(guest.data.service.offers[0].unitPriceVnd,150000);assert.equal(guest.data.service.place.id,fixture.placeId);
  assert.doesNotMatch(JSON.stringify(guest.data),/"(?:token|structureToken|offersToken|reviewNote|reviewedBy|ownerUserId|email)"/);
  const owned=await request('/households/me/services',{token});assert.ok(owned.data.items.some(row=>row.service.id===accepted.data.service.id));
});

test('submission requires a complete profile, an approved owned place and active scoped offers',async()=>{
  let fixture=await draft(undefined,{offer:false});let result=await request(`${own(fixture.data)}/submissions`,{token:fixture.owner.accessToken,method:'POST',body:ref(fixture.data)});assert.equal(result.status,422);assert.equal(result.body.error.code,'SERVICE_OFFER_INVALID');
  fixture=await draft(undefined,{profile:{body:''}});result=await request(`${own(fixture.data)}/submissions`,{token:fixture.owner.accessToken,method:'POST',body:ref(fixture.data)});assert.equal(result.body.error.code,'SERVICE_PROFILE_INCOMPLETE');
  fixture=await draft(undefined,{profile:{defaultPlaceId:null}});result=await request(`${own(fixture.data)}/submissions`,{token:fixture.owner.accessToken,method:'POST',body:ref(fixture.data)});assert.equal(result.body.error.code,'SERVICE_PLACE_NOT_READY');
  fixture=await draft(undefined,{configuration:{...config,terms:{}}});result=await request(`${own(fixture.data)}/submissions`,{token:fixture.owner.accessToken,method:'POST',body:ref(fixture.data)});assert.equal(result.body.error.code,'SERVICE_OFFER_INVALID');
});

test('category kind/activity and place ownership are checked rather than trusting request IDs',async()=>{
  const a=await household(),b=await household(),adminAuth=await authService.authenticate(admin.accessToken);
  const product=(await catalogService.createCategory(adminAuth,{kind:'PRODUCT',code:'LOCAL_PRODUCTS',name:'Sản phẩm',isActive:true,reason:'Fixture'},correlation())).category;
  const inactive=(await catalogService.createCategory(adminAuth,{kind:'SERVICE',code:'INACTIVE',name:'Ngừng dùng',isActive:false,reason:'Fixture'},correlation())).category;
  for(const invalid of [product.id,inactive.id]){const result=await request('/households/me/services',{token:a.owner.accessToken,method:'POST',body:{title:'Dịch vụ',categoryId:invalid,defaultDurationMinutes:120,defaultPlaceId:a.placeId}});assert.equal(result.status,422);assert.equal(result.body.error.code,'INVALID_SERVICE_CATEGORY');}
  const foreign=await request('/households/me/services',{token:a.owner.accessToken,method:'POST',body:{title:'Dịch vụ',categoryId,defaultDurationMinutes:120,defaultPlaceId:b.placeId}});assert.equal(foreign.status,403);
  const customer=await account();assert.equal((await request('/households/me/services',{token:customer.accessToken,method:'POST',body:{title:'Dịch vụ',categoryId,defaultDurationMinutes:120}})).status,403);
  assert.equal((await request('/households/me/services',{token:admin.accessToken,method:'POST',body:{title:'Dịch vụ',categoryId,defaultDurationMinutes:120}})).status,403);
});

test('offers validate six pricing types, group/unit limits and explicit resource-free addons',async()=>{
  const fixture=await draft(undefined,{offer:false}),token=fixture.owner.accessToken;
  for(const pricingType of ['PER_PERSON','PER_GROUP','PER_TRIP','FIXED_PACKAGE','PER_HOUR','PER_UNIT']){
    const body={...config,pricingType,...(pricingType==='PER_UNIT'?{unitLabel:'xe',maxUnits:10,participantsPerUnit:1}:{} )};
    const result=await request(`${own(fixture.data)}/offers`,{token,method:'POST',body});assert.equal(result.status,201);assert.equal(result.data.offer.pricingType,pricingType);
  }
  for(const patch of [{unitPriceVnd:-1},{unitPriceVnd:1.5},{maxParticipants:0},{maxUnits:10},{addons:[{...addon,resourceFree:false}]},{addons:[addon,addon]},{quantity:2},{participantCount:2},{resourceUsages:[]}])assert.equal((await request(`${own(fixture.data)}/offers`,{token,method:'POST',body:{...config,...patch}})).status,422);
});

test('root and offer operations reject foreign households and foreign offers even within an owned service',async()=>{
  const a=await draft(),b=await draft(),token=b.owner.accessToken;
  for(const [path,method,body] of [[own(a.data),'GET'],[`${own(a.data)}/profile`,'PUT',profileBody(a.data)],[`${own(a.data)}/submissions`,'POST',ref(a.data)],[`${own(a.data)}/revisions`,'GET'],[`${own(a.data)}/offers`,'POST',config],[offerPath(a),'GET']])assert.equal((await request(path,{token,method,body})).status,403);
  const wrongOffer=await request(`${own(b.data)}/offers/${a.data.offers[0].id}`,{token});assert.equal(wrongOffer.status,403);
  assert.equal((await request('/admin/service-submissions',{token:a.owner.accessToken})).status,403);
  assert.equal((await request('/households/me/services')).status,401);
  for(const extra of [{householdId:admin.id},{publishedRevisionId:'1'},{approvalStatus:'APPROVED'},{details:{price:100}}])assert.equal((await request('/households/me/services',{token:a.owner.accessToken,method:'POST',body:{...a.input,...extra}})).status,422);
});

test('offer tokens prevent lost updates, and the submission token covers configuration changes since the owner last read',async()=>{
  const fixture=await draft(),token=fixture.owner.accessToken,offer=fixture.data.offers[0];
  const results=await Promise.all([170000,180000].map(unitPriceVnd=>request(`${offerPath(fixture)}/pricing`,{token,method:'PATCH',body:{expectedToken:offer.token,unitPriceVnd,reason:'Cập nhật giá'}})));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const stale=await request(`${own(fixture.data)}/submissions`,{token,method:'POST',body:ref(fixture.data)});assert.equal(stale.status,409);assert.equal(stale.body.error.code,'STALE_VERSION');
  const fresh=(await request(own(fixture.data),{token})).data;await pending({...fixture,data:fresh});
});

test('two concurrent offers cannot exceed the 32-active-offer limit',async()=>{
  const fixture=await draft();const normalized=offerConfig(fixture.data.offers[0]);
  await repository.transaction(async tx=>{for(let index=0;index<30;index++)await tx.createOffer(fixture.data.service.id,fixture.householdId,{...normalized,name:`Phương thức ${index}`});});
  const results=await Promise.all(['A','B'].map(name=>request(`${own(fixture.data)}/offers`,{token:fixture.owner.accessToken,method:'POST',body:{...config,name:`Phương thức cuối ${name}`}})));assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal(results.find(r=>r.status===409).body.error.code,'SERVICE_OFFER_LIMIT');
  const fresh=(await request(own(fixture.data),{token:fixture.owner.accessToken})).data;assert.equal(fresh.offers.filter(o=>o.isActive).length,32);
  const submitted=await pending({...fixture,data:fresh});assert.equal(submitted.data.profile.offerSnapshots.length,32);
});

test('base/addon prices roll back together when the audit write fails',async()=>{
  const fixture=await published(),offer=fixture.data.offers[0],auth=await authService.authenticate(fixture.owner.accessToken);
  const broken=createServiceService({repository:{...repository,transaction:work=>repository.transaction(tx=>work({...tx,event:async()=>{throw new Error('audit fixture');}}))}});
  await assert.rejects(broken.updatePrices(auth,fixture.data.service.id,offer.id,{expectedToken:offer.token,unitPriceVnd:999000,addonPrices:[{key:'preparation',unitPriceVnd:99000,isActive:false}],reason:'Fixture rollback'},correlation()));
  const current=(await request(offerPath(fixture),{token:fixture.owner.accessToken})).data.offer;assert.equal(current.token,offer.token);assert.equal(current.unitPriceVnd,150000);assert.equal(current.addons[0].unitPriceVnd,20000);assert.equal(current.addons[0].isActive,true);
});

test('unsubmitted structural edits are allowed; pending structure is frozen but live prices can change',async()=>{
  let fixture=await draft(),token=fixture.owner.accessToken,offer=fixture.data.offers[0];
  let result=await request(offerPath(fixture),{token,method:'PUT',body:{expectedToken:offer.token,reason:'Sửa mô tả',configuration:{...offerConfig(offer),name:'Nhóm khách ghép'}}});assert.equal(result.status,200);
  fixture={...fixture,data:(await request(own(fixture.data),{token})).data};fixture=await pending(fixture);offer=fixture.data.offers[0];
  result=await request(offerPath(fixture),{token,method:'PUT',body:{expectedToken:offer.token,reason:'Không được sửa lúc chờ',configuration:{...offerConfig(offer),maxParticipants:8}}});assert.equal(result.status,409);
  assert.equal((await request(`${own(fixture.data)}/offers`,{token,method:'POST',body:config})).status,409);
  result=await request(`${offerPath(fixture)}/pricing`,{token,method:'PATCH',body:{expectedToken:offer.token,unitPriceVnd:185000,reason:'Giá mới'}});assert.equal(result.status,200);
  const reviewed=await published(fixture);assert.equal(reviewed.data.profile.offerSnapshots[0].unitPriceVnd,150000);assert.equal((await request(`/public/services/${fixture.data.service.id}`)).data.service.offers[0].unitPriceVnd,185000);
});

test('published offer structures require replacement and new active offers cannot bypass moderation',async()=>{
  let fixture=await published(),token=fixture.owner.accessToken,old=fixture.data.offers[0];
  let result=await request(offerPath(fixture),{token,method:'PUT',body:{expectedToken:old.token,reason:'Đổi loại bán',configuration:{...offerConfig(old),participationMode:'EXCLUSIVE',pricingType:'PER_TRIP',unitLabel:'chuyến'}}});assert.equal(result.status,409);assert.equal(result.body.error.code,'OFFER_CONFIGURATION_LOCKED');
  result=await request(`${own(fixture.data)}/offers`,{token,method:'POST',body:{...config,name:'THUÊ_RIÊNG_CHƯA_DUYỆT',participationMode:'EXCLUSIVE',pricingType:'PER_TRIP',unitPriceVnd:800000}});assert.equal(result.status,201);const replacement=result.data.offer;
  let guest=await request(`/public/services/${fixture.data.service.id}`);assert.equal(guest.data.service.offers.length,1);assert.equal(guest.data.service.offers[0].id,old.id);assert.doesNotMatch(JSON.stringify(guest.data),/THUÊ_RIÊNG_CHƯA_DUYỆT/);
  await request(`${offerPath(fixture)}/pricing`,{token,method:'PATCH',body:{expectedToken:old.token,isActive:false,reason:'Thay phương thức'}});assert.equal((await request(`/public/services/${fixture.data.service.id}`)).status,404);
  let data=(await request(own(fixture.data),{token})).data;data=(await request(`${own(data)}/profile`,{token,method:'PUT',body:profileBody(data)})).data;
  fixture=await published(await pending({...fixture,data}));guest=await request(`/public/services/${fixture.data.service.id}`);assert.equal(guest.data.service.offers.length,1);assert.equal(guest.data.service.offers[0].id,replacement.id);
  old=(await request(`${own(data)}/offers/${old.id}`,{token})).data.offer;await request(`${own(data)}/offers/${old.id}/pricing`,{token,method:'PATCH',body:{expectedToken:old.token,isActive:true,reason:'Bật nhưng chưa có trong bản mới'}});
  guest=await request(`/public/services/${fixture.data.service.id}`);assert.deepEqual(guest.data.service.offers.map(o=>o.id),[replacement.id]);
});

test('price/addon changes are immediate without rewriting reviewed or committed historical prices',async()=>{
  const fixture=await published(),offer=fixture.data.offers[0],customer=await account();
  const stored=await sql(async c=>{
    const slot=await insert(c,'service_slots',{household_id:fixture.householdId,service_id:fixture.data.service.id,place_id:fixture.placeId,starts_at:'2030-11-20 07:00:00',ends_at:'2030-11-20 10:00:00',person_capacity:10,sales_status:'OPEN',created_by:fixture.owner.id});
    await insert(c,'slot_offers',{household_id:fixture.householdId,service_id:fixture.data.service.id,slot_id:slot,offer_id:offer.id});
    const booking=await insert(c,'bookings',{household_id:fixture.householdId,booking_code:`PRICE-${++sequence}`,customer_user_id:customer.id,created_by:customer.id,source:'ONLINE',status:'CONFIRMED',contact_name:'Fixture',contact_phone:'0000000000',first_starts_at:'2030-11-20 07:00:00',last_ends_at:'2030-11-20 10:00:00',total_vnd:300000,terms_snapshot:{},confirmed_at:'2030-10-01 00:00:00'});
    const set=await insert(c,'reservation_sets',{household_id:fixture.householdId,booking_id:booking,status:'COMMITTED',total_vnd:300000,terms_snapshot:{},first_starts_at:'2030-11-20 07:00:00',last_ends_at:'2030-11-20 10:00:00'});
    const item=await insert(c,'booking_items',{household_id:fixture.householdId,reservation_set_id:set,kind:'SERVICE',service_id:fixture.data.service.id,offer_id:offer.id,slot_id:slot,participant_count:2,quantity:2,pricing_type:'PER_PERSON',unit_price_vnd:150000,base_amount_vnd:300000,starts_at:'2030-11-20 07:00:00',ends_at:'2030-11-20 10:00:00',snapshot:{name:'Original agreement',offer:config}});
    await c.execute('UPDATE bookings SET current_reservation_set_id=? WHERE id=?',[set,booking]);const [[row]]=await c.execute('SELECT * FROM booking_items WHERE id=?',[item]);return {item,before:JSON.stringify(row)};
  });
  const result=await request(`${offerPath(fixture)}/pricing`,{token:fixture.owner.accessToken,method:'PATCH',body:{expectedToken:offer.token,unitPriceVnd:190000,addonPrices:[{key:'preparation',unitPriceVnd:25000}],reason:'Giá phục vụ mới'}});assert.equal(result.status,200);
  const guest=await request(`/public/services/${fixture.data.service.id}`);assert.equal(guest.data.service.offers[0].unitPriceVnd,190000);assert.equal(guest.data.service.offers[0].addons[0].unitPriceVnd,25000);
  const history=await request(`${own(fixture.data)}/revisions`,{token:fixture.owner.accessToken});assert.equal(history.data.items[0].offerSnapshots[0].unitPriceVnd,150000);assert.equal(history.data.items[0].offerSnapshots[0].addons[0].unitPriceVnd,20000);
  await sql(async c=>{const [[row]]=await c.execute('SELECT * FROM booking_items WHERE id=?',[stored.item]);assert.equal(JSON.stringify(row),stored.before);});
});

test('offer structures referenced by a slot are locked even before content submission',async()=>{
  const fixture=await draft(),offer=fixture.data.offers[0];await sql(async c=>{const slot=await insert(c,'service_slots',{household_id:fixture.householdId,service_id:fixture.data.service.id,starts_at:'2030-12-01 07:00:00',ends_at:'2030-12-01 10:00:00',person_capacity:10,sales_status:'CLOSED',created_by:fixture.owner.id});await insert(c,'slot_offers',{household_id:fixture.householdId,service_id:fixture.data.service.id,slot_id:slot,offer_id:offer.id});});
  const result=await request(offerPath(fixture),{token:fixture.owner.accessToken,method:'PUT',body:{expectedToken:offer.token,reason:'Đã gắn lịch',configuration:{...offerConfig(offer),maxParticipants:8}}});assert.equal(result.body.error.code,'OFFER_CONFIGURATION_LOCKED');
});

test('draft/rejected category, place and duration changes do not alter public metadata until accepted',async()=>{
  let fixture=await published(),token=fixture.owner.accessToken;const point2=await point(fixture.owner,fixture.householdId);
  const category2=(await catalogService.createCategory(await authService.authenticate(admin.accessToken),{kind:'SERVICE',code:`NEW_${++sequence}`,name:'Danh mục mới',isActive:true,reason:'Fixture'},correlation())).category.id;
  let data=(await request(`${own(fixture.data)}/profile`,{token,method:'PUT',body:profileBody(fixture.data,{title:'PRIVATE_DRAFT_TITLE',categoryId:category2,defaultPlaceId:point2,defaultDurationMinutes:120})})).data;
  let guest=await request(`/public/services/${fixture.data.service.id}`);assert.equal(guest.data.service.category.id,categoryId);assert.equal(guest.data.service.place.id,fixture.placeId);assert.equal(guest.data.service.defaultDurationMinutes,180);
  fixture=await pending({...fixture,data});let rejected=await request(review(data),{token:admin.accessToken,method:'POST',body:{version:data.profile.version,decision:'REJECTED',reason:'PRIVATE_REVIEW_NOTE'}});assert.equal(rejected.status,200);
  guest=await request(`/public/services/${fixture.data.service.id}`);assert.doesNotMatch(JSON.stringify(guest.data),/PRIVATE_DRAFT_TITLE|PRIVATE_REVIEW_NOTE/);assert.equal(guest.data.service.category.id,categoryId);
  data=(await request(`${own(data)}/profile`,{token,method:'PUT',body:profileBody(rejected.data,{title:'Dịch vụ đã cập nhật'})})).data;fixture=await published(await pending({...fixture,data}));guest=await request(`/public/services/${fixture.data.service.id}`);assert.equal(guest.data.service.category.id,category2);assert.equal(guest.data.service.place.id,point2);assert.equal(guest.data.service.defaultDurationMinutes,120);
});

test('public filters match the same approved active offer and escape search wildcards',async()=>{
  let fixture=await draft(undefined,{profile:{title:'Bắt cá 100%_! địa phương'}});await request(`${own(fixture.data)}/offers`,{token:fixture.owner.accessToken,method:'POST',body:{...config,name:'Riêng chuyến',participationMode:'EXCLUSIVE',pricingType:'PER_TRIP',unitPriceVnd:800000}});
  fixture={...fixture,data:(await request(own(fixture.data),{token:fixture.owner.accessToken})).data};fixture=await published(await pending(fixture));
  let result=await request(`/public/services?householdId=${fixture.householdId}&pricingType=PER_PERSON&participationMode=EXCLUSIVE`);assert.equal(result.data.total,0);
  result=await request(`/public/services?householdId=${fixture.householdId}&pricingType=PER_TRIP&participationMode=EXCLUSIVE&categoryId=${categoryId}&placeId=${fixture.placeId}`);assert.equal(result.data.total,1);assert.equal(result.data.items[0].offers.length,1);assert.equal(result.data.items[0].offers[0].quantityRule,'ONE');
  result=await request(`/public/services?householdId=${fixture.householdId}&q=${encodeURIComponent('%_!')}`);assert.equal(result.data.total,1);
  result=await request(`/public/services?householdId=${fixture.householdId}&q=${encodeURIComponent("' OR 1=1 --")}`);assert.equal(result.data.total,0);
  for(const query of ['pricingType=PER_NIGHT','status=DRAFT','pageSize=101','categoryId=0'])assert.equal((await request(`/public/services?${query}`)).status,422);
});

test('public reads gate owner/household/category/place/service publication and effective offers',async()=>{
  const fixture=await published(),serviceId=fixture.data.service.id;
  const mutations=[
    ["UPDATE households SET approval_status='REVOKED' WHERE id=?","UPDATE households SET approval_status='APPROVED' WHERE id=?",fixture.householdId],
    ["UPDATE households SET visibility='HIDDEN' WHERE id=?","UPDATE households SET visibility='VISIBLE' WHERE id=?",fixture.householdId],
    ["UPDATE users SET status='BLOCKED' WHERE id=?","UPDATE users SET status='ACTIVE' WHERE id=?",fixture.owner.id],
    ["UPDATE users SET disabled_at=UTC_TIMESTAMP(6) WHERE id=?","UPDATE users SET disabled_at=NULL WHERE id=?",fixture.owner.id],
    ["UPDATE users SET role='CUSTOMER' WHERE id=?","UPDATE users SET role='HOUSEHOLD' WHERE id=?",fixture.owner.id],
    ["UPDATE categories SET is_active=0 WHERE id=?","UPDATE categories SET is_active=1 WHERE id=?",categoryId],
    ["UPDATE places SET visibility='HIDDEN' WHERE id=?","UPDATE places SET visibility='VISIBLE' WHERE id=?",fixture.placeId],
    ["UPDATE places SET supply_status='PAUSED' WHERE id=?","UPDATE places SET supply_status='AVAILABLE' WHERE id=?",fixture.placeId],
    ["UPDATE services SET visibility='HIDDEN' WHERE id=?","UPDATE services SET visibility='VISIBLE' WHERE id=?",serviceId],
    ["UPDATE services SET supply_status='PAUSED' WHERE id=?","UPDATE services SET supply_status='AVAILABLE' WHERE id=?",serviceId],
    ["UPDATE service_offers SET is_active=0 WHERE id=?","UPDATE service_offers SET is_active=1 WHERE id=?",fixture.data.offers[0].id],
  ];
  for(const [change,restore,value] of mutations){await sql(c=>c.execute(change,[value]));assert.equal((await request(`/public/services/${serviceId}`)).status,404);assert.equal((await request(`/public/services?householdId=${fixture.householdId}`)).data.total,0);await sql(c=>c.execute(restore,[value]));}
});

test('same-admin retries are no-ops, conflicting reviews commit one decision and stale revisions are rejected',async()=>{
  const fixture=await pending(),token=fixture.owner.accessToken;const repeat=await request(`${own(fixture.data)}/submissions`,{token,method:'POST',body:ref(fixture.data)});assert.equal(repeat.data.changed,false);
  const results=await Promise.all([request(review(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'APPROVED'}}),request(review(fixture.data),{token:admin2.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'REJECTED',reason:'Kiểm tra lại'}})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const winner=results.findIndex(r=>r.status===200),body=winner===0?{version:fixture.data.profile.version,decision:'APPROVED'}:{version:fixture.data.profile.version,decision:'REJECTED',reason:'Kiểm tra lại'};
  const again=await request(review(fixture.data),{token:[admin,admin2][winner].accessToken,method:'POST',body});assert.equal(again.data.changed,false);
  const current=results[winner].data;const saved=await request(`${own(current)}/profile`,{token,method:'PUT',body:profileBody(current)});assert.equal(saved.status,200);
  const stale=await request(review(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'APPROVED'}});assert.equal(stale.body.error.code,'STALE_VERSION');
  await sql(async c=>{const [[r]]=await c.execute("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND event_type='SERVICE_REVIEW'",[fixture.owner.id]);assert.equal(Number(r.n),1);});
});

test('concurrent profile edits cannot overwrite each other',async()=>{
  const fixture=await draft();const results=await Promise.all(['A','B'].map(name=>request(`${own(fixture.data)}/profile`,{token:fixture.owner.accessToken,method:'PUT',body:profileBody(fixture.data,{title:`Trải nghiệm ${name}`})})));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
});

test('review failure rolls publication, category/default changes, audit and notification back together',async()=>{
  const fixture=await pending(),auth=await authService.authenticate(admin.accessToken);const broken=createServiceService({repository:{...repository,transaction:work=>repository.transaction(tx=>work({...tx,notifyServiceReview:async()=>{throw new Error('notification fixture');}}))}});
  await assert.rejects(broken.review(auth,fixture.data.profile.revisionId,{version:fixture.data.profile.version,decision:'APPROVED'},correlation()));
  const mine=await request(own(fixture.data),{token:fixture.owner.accessToken});assert.equal(mine.data.profile.status,'PENDING');assert.equal(mine.data.publishedProfile,null);assert.equal((await request(`/public/services/${fixture.data.service.id}`)).status,404);
  await sql(async c=>{const [[r]]=await c.execute("SELECT COUNT(*) n FROM activity_events WHERE entity_type='CONTENT_REVISION' AND entity_id=? AND event_type='CONTENT_REVIEW'",[fixture.data.profile.revisionId]);assert.equal(Number(r.n),0);});await published(fixture);
});

test('revocation preserves history and only permits disabling offers, while retired services cannot reopen',async()=>{
  const fixture=await published(),token=fixture.owner.accessToken,offer=fixture.data.offers[0];await sql(c=>c.execute("UPDATE households SET approval_status='REVOKED' WHERE id=?",[fixture.householdId]));
  assert.equal((await request(own(fixture.data),{token})).status,200);assert.equal((await request(`/public/services/${fixture.data.service.id}`)).status,404);
  assert.equal((await request(`${offerPath(fixture)}/pricing`,{token,method:'PATCH',body:{expectedToken:offer.token,unitPriceVnd:200000,reason:'Không được đổi giá'}})).status,403);
  const disabled=await request(`${offerPath(fixture)}/pricing`,{token,method:'PATCH',body:{expectedToken:offer.token,isActive:false,reason:'Ngừng nhận mới'}});assert.equal(disabled.status,200);
  assert.equal((await request(`${offerPath(fixture)}/pricing`,{token,method:'PATCH',body:{expectedToken:disabled.data.offer.token,isActive:true,reason:'Không được mở'}})).status,403);
  assert.equal((await request(`${own(fixture.data)}/offers`,{token,method:'POST',body:config})).status,403);
  await sql(c=>c.execute("UPDATE households SET approval_status='APPROVED' WHERE id=?",[fixture.householdId]));
  const retired=await request(`${own(fixture.data)}/status`,{token,method:'PATCH',body:{expectedState:{supplyStatus:'AVAILABLE',visibility:'VISIBLE'},supplyStatus:'RETIRED',visibility:'HIDDEN',reason:'Ngừng phục vụ'}});assert.equal(retired.status,200);
  assert.equal((await request(`${own(fixture.data)}/status`,{token,method:'PATCH',body:{expectedState:{supplyStatus:'RETIRED',visibility:'HIDDEN'},supplyStatus:'AVAILABLE',visibility:'VISIBLE',reason:'Không mở lại'}})).status,409);
});

test('live user role, block and session are rechecked inside transactions after authentication',async()=>{
  const fixture=await pending(),ownerAuth=await authService.authenticate(fixture.owner.accessToken),reviewer=await account('ADMIN'),auth=await authService.authenticate(reviewer.accessToken);
  await sql(c=>c.execute("UPDATE users SET role='CUSTOMER' WHERE id=?",[reviewer.id]));await assert.rejects(service.review(auth,fixture.data.profile.revisionId,{version:fixture.data.profile.version,decision:'APPROVED'},correlation()),{code:'FORBIDDEN'});
  await sql(c=>c.execute("UPDATE users SET status='BLOCKED',disabled_at=UTC_TIMESTAMP(6) WHERE id=?",[fixture.owner.id]));await assert.rejects(service.createOffer(ownerAuth,fixture.data.service.id,config,correlation()),{code:'ACCOUNT_BLOCKED'});
  await sql(c=>c.execute("UPDATE users SET status='ACTIVE',disabled_at=NULL WHERE id=?",[fixture.owner.id]));await sql(c=>c.execute('UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP(6) WHERE id=?',[ownerAuth.sessionId]));await assert.rejects(service.updatePrices(ownerAuth,fixture.data.service.id,fixture.data.offers[0].id,{expectedToken:fixture.data.offers[0].token,isActive:false,reason:'Phiên hết hiệu lực'},correlation()),{code:'UNAUTHENTICATED'});
});
