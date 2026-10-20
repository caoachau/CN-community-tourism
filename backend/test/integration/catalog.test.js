import assert from 'node:assert/strict';
import { before,after,test } from 'node:test';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createTestDatabase } from '../support/mysql.js';
import { testDatabaseOptions } from '../support/config.js';
import { databaseAccess } from '../../src/database.js';
import { createAuthRepository } from '../../src/auth/repository.js';
import { createAuthService } from '../../src/auth/service.js';
import { authOptions } from '../../src/config/auth.js';
import { hashPassword } from '../../src/auth/passwords.js';
import { createHouseholdRepository } from '../../src/households/repository.js';
import { createHouseholdService } from '../../src/households/service.js';
import { createCatalogRepository } from '../../src/catalog/repository.js';
import { createCatalogService } from '../../src/catalog/service.js';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/shared/logger.js';
import { openApiDocument } from '../../src/openapi.js';

let database,pool,access,authRepository,authService,householdService,repository,service,server,url,passwordHash,contract,admin,admin2;
let sequence=0;
const password='Long separate password for catalog fixtures';
const ajv=addFormats(new Ajv({strict:false,allErrors:true}));
const logger=createLogger({env:{LOG_LEVEL:'silent'}});
const profile={title:'Vườn trải nghiệm Ba Thành',body:'Khách tham quan vườn và cùng gia đình thu hoạch trái cây.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',coordinates:{latitude:10.25,longitude:105.97},directions:'Đón tại cổng vườn',contactPhone:'0901234567'}};
const ref=data=>({revisionId:data.profile.revisionId,version:data.profile.version});
const state=data=>({supplyStatus:data.place.supplyStatus,visibility:data.place.visibility});
const ownerPath=data=>`/households/me/places/${data.place.id}`;
const reviewPath=data=>`/admin/place-submissions/${data.profile.revisionId}/review`;
const correlation=()=>`catalog-fixture-${++sequence}`;
async function sql(work){const c=await database.connect();try{return await work(c);}finally{await database.closeConnection(c);}}
async function account(role='CUSTOMER'){
  const user=await authRepository.transaction(tx=>tx.createUser({email:`catalog-${++sequence}@example.invalid`,displayName:`Catalog ${sequence}`,passwordHash,role}));
  return {...await authService.login({email:user.email,password}),id:String(user.id)};
}
async function request(path,{token,method='GET',body}={}){
  const response=await fetch(`${url}/api/v1${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const payload=await response.json();
  const key=`/api/v1${path.split('?')[0].replace(/\/places\/\d+/g,'/places/{placeId}').replace(/\/categories\/\d+/g,'/categories/{categoryId}').replace(/\/place-submissions\/\d+/g,'/place-submissions/{revisionId}')}`;
  const operation=contract.paths[key]?.[method.toLowerCase()];
  if(operation){const validator=ajv.compile((operation.responses[response.status]??operation.responses.default).content['application/json'].schema);assert.equal(validator(payload),true,JSON.stringify(validator.errors));assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(payload.meta.requestId,response.headers.get('x-request-id'));}
  return {status:response.status,body:payload,data:payload.data};
}
async function household(){
  const owner=await account();const ownerAuth=await authService.authenticate(owner.accessToken);
  const opened=await householdService.open(ownerAuth,{title:`Hộ dân ${++sequence}`,body:'Gia đình cung cấp dịch vụ trải nghiệm du lịch cộng đồng.',details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',contactPhone:'0901234567'}},correlation());
  await householdService.submit(ownerAuth,ref(opened),correlation());
  const accepted=await householdService.review(await authService.authenticate(admin.accessToken),opened.profile.revisionId,{version:opened.profile.version,decision:'APPROVED'},correlation());
  return {owner,householdId:accepted.household.id};
}
async function opened(fixture,input=profile){
  fixture??=await household();const result=await request('/households/me/places',{token:fixture.owner.accessToken,method:'POST',body:input});assert.equal(result.status,201);return {...fixture,data:result.data};
}
async function submitted(fixture){fixture??=await opened();const result=await request(`${ownerPath(fixture.data)}/submissions`,{token:fixture.owner.accessToken,method:'POST',body:ref(fixture.data)});assert.equal(result.status,200);return {...fixture,data:result.data};}
async function published(fixture){fixture??=await submitted();const result=await request(reviewPath(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'APPROVED'}});assert.equal(result.status,200);return {...fixture,data:result.data};}
async function category(code='AGRICULTURE',kind='SERVICE'){
  const result=await request('/admin/categories',{token:admin.accessToken,method:'POST',body:{kind,code:`${code}_${++sequence}`,name:'Du lịch nông nghiệp',isActive:true,reason:'Thêm danh mục nền tảng'}});assert.equal(result.status,201);return result.data.category;
}

before(async()=>{
  database=await createTestDatabase(process.env,{schema:'survey'});pool=mysql.createPool({...testDatabaseOptions(),database:database.name,connectionLimit:8,queueLimit:30});access=databaseAccess(pool);
  authRepository=createAuthRepository(access);authService=createAuthService({repository:authRepository,options:authOptions({JWT_SECRET:randomBytes(32).toString('base64url')})});
  householdService=createHouseholdService({repository:createHouseholdRepository(access)});repository=createCatalogRepository(access);service=createCatalogService({repository});passwordHash=await hashPassword(password);
  contract=await SwaggerParser.dereference(structuredClone(openApiDocument),{resolve:{external:false}});
  server=createApp({logger,authService,householdService,catalogService:service}).listen(0);await new Promise(resolve=>server.once('listening',resolve));url=`http://127.0.0.1:${server.address().port}`;
  admin=await account('ADMIN');admin2=await account('ADMIN');
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await pool?.end();await database?.dispose();});

test('ADMIN manages global typed categories; guests and owners only see active taxonomy',async()=>{
  const owner=await account();assert.equal((await request('/admin/categories',{token:owner.accessToken})).status,403);assert.equal((await request('/admin/categories')).status,401);
  const created=await category();assert.equal(created.kind,'SERVICE');
  const publicList=await request('/public/categories?kind=SERVICE');assert.equal(publicList.status,200);assert.ok(publicList.data.items.some(c=>c.id===created.id));
  assert.equal((await request('/public/categories?isActive=false')).status,422);
  const hidden=await request(`/admin/categories/${created.id}`,{token:admin.accessToken,method:'PATCH',body:{expectedState:{name:created.name,isActive:true},isActive:false,reason:'Ngừng dùng'}});assert.equal(hidden.status,200);assert.equal(hidden.data.category.isActive,false);
  const after=await request('/public/categories?kind=SERVICE');assert.ok(after.data.items.every(c=>c.id!==created.id));
  const adminList=await request('/admin/categories?isActive=false',{token:admin.accessToken});assert.ok(adminList.data.items.some(c=>c.id===created.id));
  assert.equal((await request(`/admin/categories/${created.id}`,{token:admin.accessToken})).status,200);
  assert.equal((await request('/admin/categories',{token:owner.accessToken,method:'POST',body:{kind:'SERVICE',code:'FAKE',name:'Fake',isActive:true,reason:'Không được'}})).status,403);
});

test('category identity is immutable; duplicate kind/code races have one winner, different kinds remain independent',async()=>{
  const body={kind:'SERVICE',code:`race_${++sequence}`,name:'Chèo xuồng',isActive:true,reason:'Tạo danh mục'};
  const results=await Promise.all([admin,admin2].map(a=>request('/admin/categories',{token:a.accessToken,method:'POST',body})));assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal(results.find(r=>r.status===409).body.error.code,'CATEGORY_ALREADY_EXISTS');
  const winner=results.find(r=>r.status===201).data.category;assert.equal(winner.code,body.code.toUpperCase());
  assert.equal((await request('/admin/categories',{token:admin.accessToken,method:'POST',body:{...body,kind:'PRODUCT'}})).status,201);
  for(const extra of [{kind:'PRODUCT'},{code:'CHANGED'},{householdId:'1'}])assert.equal((await request(`/admin/categories/${winner.id}`,{token:admin.accessToken,method:'PATCH',body:{expectedState:{name:winner.name,isActive:true},name:'Mới',reason:'Sửa',...extra}})).status,422);
});

test('deactivating categories preserves existing references and concurrent updates cannot overwrite each other',async()=>{
  const fixture=await household();const created=await category();
  await sql(c=>c.execute('INSERT INTO services (household_id,code,category_id,default_duration_minutes) VALUES (?,?,?,?)',[fixture.householdId,`CAT-${++sequence}`,created.id,120]));
  const results=await Promise.all(['A','B'].map(name=>request(`/admin/categories/${created.id}`,{token:admin.accessToken,method:'PATCH',body:{expectedState:{name:created.name,isActive:true},name:`Tên ${name}`,isActive:false,reason:'Tạm ngừng danh mục'}})));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const current=results.find(r=>r.status===200).data.category;const repeat=await request(`/admin/categories/${created.id}`,{token:admin.accessToken,method:'PATCH',body:{expectedState:{name:current.name,isActive:false},isActive:false,reason:'Không đổi'}});assert.equal(repeat.status,200);assert.equal(repeat.data.changed,false);
  await sql(async c=>{const [[r]]=await c.execute('SELECT COUNT(*) n FROM services WHERE category_id=?',[created.id]);assert.equal(Number(r.n),1);});
});

test('creating a category rolls back if its audit cannot be written',async()=>{
  const broken=createCatalogService({repository:{...repository,transaction:work=>repository.transaction(tx=>work({...tx,event:async()=>{throw new Error('audit fixture');}}))}});
  const code=`ROLLBACK_${++sequence}`;await assert.rejects(broken.createCategory(await authService.authenticate(admin.accessToken),{kind:'CONTENT',code,name:'Bài giới thiệu',isActive:true,reason:'Test'},correlation()));
  await sql(async c=>{const [[r]]=await c.execute('SELECT COUNT(*) n FROM categories WHERE code=?',[code]);assert.equal(Number(r.n),0);});
});

test('an approved household creates/submits a place; only ADMIN approval makes it public to guests',async()=>{
  const fixture=await opened();let {data}=fixture;const token=fixture.owner.accessToken;
  assert.equal(data.profile.status,'DRAFT');assert.equal(data.publishedProfile,null);assert.equal(data.place.householdId,fixture.householdId);
  assert.equal((await request(`/public/places/${data.place.id}`)).status,404);
  let result=await submitted(fixture);data=result.data;assert.equal((await request(`/public/places/${data.place.id}`)).status,404);
  const queue=await request(`/admin/place-submissions?householdId=${fixture.householdId}`,{token:admin.accessToken});assert.equal(queue.status,200);assert.ok(queue.data.items.some(r=>r.revisionId===data.profile.revisionId));
  assert.equal((await request(`/admin/place-submissions/${data.profile.revisionId}`,{token:admin.accessToken})).status,200);
  result=await published(result);data=result.data;assert.equal(data.profile.status,'APPROVED');assert.equal(data.place.publishedRevisionId,data.profile.revisionId);
  const guest=await request(`/public/places/${data.place.id}`);assert.equal(guest.status,200);assert.equal(guest.data.place.title,profile.title);assert.equal(guest.data.place.details.contactPhone,profile.details.contactPhone);assert.deepEqual(guest.data.place.details.coordinates,profile.details.coordinates);
  assert.equal((await request(`/households/me/places/${data.place.id}`,{token})).status,200);
  const ownList=await request('/households/me/places',{token});assert.ok(ownList.data.items.some(row=>row.place.id===data.place.id));
  await sql(async c=>{const [[h]]=await c.execute('SELECT approval_status FROM households WHERE id=?',[fixture.householdId]);assert.equal(h.approval_status,'APPROVED');const [[u]]=await c.execute('SELECT role FROM users WHERE id=?',[fixture.owner.id]);assert.equal(u.role,'HOUSEHOLD');});
});

test('incomplete locations cannot be submitted; ownership/state/type injection is rejected',async()=>{
  const fixture=await opened(undefined,{title:'Vườn nháp'});const token=fixture.owner.accessToken;
  const submitted=await request(`${ownerPath(fixture.data)}/submissions`,{token,method:'POST',body:ref(fixture.data)});assert.equal(submitted.status,422);assert.equal(submitted.body.error.code,'PLACE_PROFILE_INCOMPLETE');
  for(const extra of [{householdId:admin.id},{ownerUserId:admin.id},{publishedRevisionId:'1'},{status:'APPROVED'}])assert.equal((await request('/households/me/places',{token,method:'POST',body:{...profile,...extra}})).status,422);
  const bad=await request('/households/me/places',{token,method:'POST',body:{...profile,details:{...profile.details,coordinates:{latitude:95,longitude:100}}}});assert.equal(bad.status,422);
  assert.equal((await request(`/admin/place-submissions/${fixture.data.profile.revisionId}`,{token:admin.accessToken})).status,404);
  const customer=await account();assert.equal((await request('/households/me/places',{token:customer.accessToken,method:'POST',body:profile})).status,403);
  assert.equal((await request('/households/me/places',{token:admin.accessToken,method:'POST',body:profile})).status,403);
});

test('foreign and missing place IDs give the same denial for every owner operation',async()=>{
  const a=await opened();const b=await household();const token=b.owner.accessToken;
  for(const placeId of [a.data.place.id,'18446744073709551615']){
    const root=`/households/me/places/${placeId}`;
    for(const [suffix,method,body] of [['','GET',undefined],['/profile','PUT',{...profile,...ref(a.data)}],['/submissions','POST',ref(a.data)],['/revisions','GET',undefined],['/status','PATCH',{...state(a.data),expectedState:state(a.data),reason:'Không có quyền'}]])assert.equal((await request(`${root}${suffix}`,{token,method,body})).status,403);
  }
  assert.equal((await request('/admin/place-submissions',{token:a.owner.accessToken})).status,403);
  assert.equal((await request('/households/me/places')).status,401);
});

test('rejection preserves its reason/history and resubmission uses a new version',async()=>{
  const fixture=await submitted();const token=fixture.owner.accessToken;
  assert.equal((await request(reviewPath(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'REJECTED'}})).status,422);
  const rejected=await request(reviewPath(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'REJECTED',reason:'Cần hướng dẫn đường đến'}});assert.equal(rejected.status,200);assert.equal(rejected.data.profile.reviewNote,'Cần hướng dẫn đường đến');
  assert.equal((await request(`${ownerPath(fixture.data)}/submissions`,{token,method:'POST',body:ref(rejected.data)})).status,409);
  const saved=await request(`${ownerPath(fixture.data)}/profile`,{token,method:'PUT',body:{...profile,...ref(rejected.data)}});assert.equal(saved.status,200);assert.equal(saved.data.profile.version,2);
  const updated=await submitted({...fixture,data:saved.data});await published(updated);
  const history=await request(`${ownerPath(fixture.data)}/revisions`,{token});assert.equal(history.data.total,2);assert.equal(history.data.items[1].status,'REJECTED');assert.equal(history.data.items[1].reviewNote,'Cần hướng dẫn đường đến');
});

test('guests always see the old approved snapshot during draft/pending/rejected edits',async()=>{
  const fixture=await published();const token=fixture.owner.accessToken;const original=fixture.data.profile;
  let saved=await request(`${ownerPath(fixture.data)}/profile`,{token,method:'PUT',body:{...profile,title:'SECRET_DRAFT_TITLE',...ref(fixture.data)}});assert.equal(saved.status,200);
  let guest=await request(`/public/places/${fixture.data.place.id}`);assert.equal(guest.data.place.title,original.title);
  const search=await request(`/public/places?q=SECRET_DRAFT_TITLE&householdId=${fixture.householdId}`);assert.equal(search.data.total,0);
  const pending=await submitted({...fixture,data:saved.data});
  assert.equal((await request(`${ownerPath(fixture.data)}/profile`,{token,method:'PUT',body:{...profile,...ref(pending.data)}})).status,409);
  const rejected=await request(reviewPath(pending.data),{token:admin.accessToken,method:'POST',body:{version:pending.data.profile.version,decision:'REJECTED',reason:'PRIVATE_REVIEW_REASON'}});assert.equal(rejected.status,200);
  guest=await request(`/public/places/${fixture.data.place.id}`);assert.equal(guest.data.place.title,original.title);assert.doesNotMatch(JSON.stringify(guest.data),/SECRET_DRAFT_TITLE|PRIVATE_REVIEW_REASON|reviewNote|reviewedBy|submittedBy|ownerUserId|password|email|profile/);
  saved=await request(`${ownerPath(fixture.data)}/profile`,{token,method:'PUT',body:{...profile,title:'Tên mới đã duyệt',...ref(rejected.data)}});
  const accepted=await published(await submitted({...fixture,data:saved.data}));guest=await request(`/public/places/${fixture.data.place.id}`);assert.equal(guest.data.place.title,'Tên mới đã duyệt');assert.equal(guest.data.place.revisionId,accepted.data.profile.revisionId);
});

test('public lists search only approved data with bounded pagination and literal wildcards',async()=>{
  const owner=await household();const literal=await published(await submitted(await opened(owner,{...profile,title:'Vườn 100%_! quê'})));await published(await submitted(await opened(owner,{...profile,title:'Vườn bình thường'})));
  let result=await request(`/public/places?householdId=${owner.householdId}&q=${encodeURIComponent('%_!')}`);assert.equal(result.status,200);assert.equal(result.data.total,1);assert.equal(result.data.items[0].id,literal.data.place.id);
  result=await request(`/public/places?householdId=${owner.householdId}&locality=${encodeURIComponent('Vĩnh Long')}&pageSize=1&page=2`);assert.equal(result.data.total,2);assert.equal(result.data.items.length,1);
  result=await request(`/public/places?householdId=${owner.householdId}&q=${encodeURIComponent("' OR 1=1 --")}`);assert.equal(result.data.total,0);
  for(const query of ['status=DRAFT','pageSize=101','householdId=0','isActive=false'])assert.equal((await request(`/public/places?${query}`)).status,422);
});

test('public projections require approved household/place pointers and exclude unknown nested JSON fields',async()=>{
  const fixture=await published();const ownerAuth=await authService.authenticate(fixture.owner.accessToken);
  const h=await householdService.mine(ownerAuth);const originalName=h.publishedProfile.title;
  await householdService.save(ownerAuth,{...ref(h),title:'PRIVATE_HOUSEHOLD_DRAFT',body:'Bản giới thiệu mới chưa được xét duyệt.',details:{address:'Ấp Bình Hòa',locality:'Vĩnh Long',contactPhone:'0901234567'}},correlation());
  await sql(c=>c.execute("UPDATE content_revisions SET details=JSON_SET(details,'$.private_note','SECRET_INTERNAL','$.coordinates.private_email','SECRET_ACCOUNT') WHERE id=?",[fixture.data.profile.revisionId]));
  let guest=await request(`/public/places/${fixture.data.place.id}`);assert.equal(guest.status,200);assert.equal(guest.data.place.householdName,originalName);assert.doesNotMatch(JSON.stringify(guest.data),/SECRET_INTERNAL|SECRET_ACCOUNT|private_note|private_email|PRIVATE_HOUSEHOLD_DRAFT/);
  await sql(c=>c.execute('UPDATE households SET published_revision_id=NULL WHERE id=?',[fixture.householdId]));assert.equal((await request(`/public/places/${fixture.data.place.id}`)).status,404);
  await sql(c=>c.execute('UPDATE households SET published_revision_id=? WHERE id=?',[h.publishedProfile.revisionId,fixture.householdId]));
  await sql(c=>c.execute("UPDATE content_revisions SET status='PENDING' WHERE id=?",[h.publishedProfile.revisionId]));assert.equal((await request(`/public/places/${fixture.data.place.id}`)).status,404);
  await sql(c=>c.execute("UPDATE content_revisions SET status='APPROVED' WHERE id=?",[h.publishedProfile.revisionId]));
  guest=await request(`/public/places/${fixture.data.place.id}`);assert.equal(guest.status,200);
  const ownList=await request('/households/me/places',{token:fixture.owner.accessToken});const row=ownList.data.items.find(row=>row.place.id===fixture.data.place.id);assert.equal(row.profile.revisionId,fixture.data.profile.revisionId);assert.equal(row.publishedProfile.revisionId,fixture.data.profile.revisionId);
});

test('operational visibility/supply gates are immediate and retirement cannot be reopened',async()=>{
  let fixture=await published();const token=fixture.owner.accessToken;
  let changed=await request(`${ownerPath(fixture.data)}/status`,{token,method:'PATCH',body:{supplyStatus:'PAUSED',visibility:'VISIBLE',expectedState:state(fixture.data),reason:'Tạm nghỉ'}});assert.equal(changed.status,200);assert.equal((await request(`/public/places/${fixture.data.place.id}`)).status,404);
  const stale=await request(`${ownerPath(fixture.data)}/status`,{token,method:'PATCH',body:{supplyStatus:'AVAILABLE',visibility:'VISIBLE',expectedState:state(fixture.data),reason:'Dữ liệu cũ'}});assert.equal(stale.status,409);
  fixture={...fixture,data:changed.data};changed=await request(`${ownerPath(fixture.data)}/status`,{token,method:'PATCH',body:{supplyStatus:'AVAILABLE',visibility:'HIDDEN',expectedState:state(fixture.data),reason:'Ẩn nội dung'}});assert.equal((await request(`/public/places/${fixture.data.place.id}`)).status,404);
  fixture={...fixture,data:changed.data};changed=await request(`${ownerPath(fixture.data)}/status`,{token,method:'PATCH',body:{supplyStatus:'AVAILABLE',visibility:'VISIBLE',expectedState:state(fixture.data),reason:'Hiển thị lại'}});assert.equal(changed.status,200);assert.equal((await request(`/public/places/${fixture.data.place.id}`)).status,200);
  fixture={...fixture,data:changed.data};changed=await request(`${ownerPath(fixture.data)}/status`,{token,method:'PATCH',body:{supplyStatus:'RETIRED',visibility:'HIDDEN',expectedState:state(fixture.data),reason:'Ngừng phục vụ'}});assert.equal(changed.status,200);
  assert.equal((await request(`${ownerPath(fixture.data)}/status`,{token,method:'PATCH',body:{supplyStatus:'AVAILABLE',visibility:'VISIBLE',expectedState:state(changed.data),reason:'Không được mở lại'}})).status,409);
  assert.equal((await request(`${ownerPath(fixture.data)}/profile`,{token,method:'PUT',body:{...profile,...ref(changed.data)}})).status,409);
  assert.equal((await request(`/public/places/${fixture.data.place.id}`)).status,404);
});

test('household approval, visibility, publication and active owner are all required on every public query',async()=>{
  const fixture=await published();const placeId=fixture.data.place.id;
  const mutations=[
    ["UPDATE households SET approval_status='REVOKED' WHERE id=?","UPDATE households SET approval_status='APPROVED' WHERE id=?",fixture.householdId],
    ["UPDATE households SET visibility='HIDDEN' WHERE id=?","UPDATE households SET visibility='VISIBLE' WHERE id=?",fixture.householdId],
    ["UPDATE households SET archived_at=UTC_TIMESTAMP(6) WHERE id=?","UPDATE households SET archived_at=NULL WHERE id=?",fixture.householdId],
    ["UPDATE users SET status='BLOCKED' WHERE id=?","UPDATE users SET status='ACTIVE' WHERE id=?",fixture.owner.id],
    ["UPDATE users SET disabled_at=UTC_TIMESTAMP(6) WHERE id=?","UPDATE users SET disabled_at=NULL WHERE id=?",fixture.owner.id],
    ["UPDATE users SET role='CUSTOMER' WHERE id=?","UPDATE users SET role='HOUSEHOLD' WHERE id=?",fixture.owner.id],
    ["UPDATE places SET archived_at=UTC_TIMESTAMP(6) WHERE id=?","UPDATE places SET archived_at=NULL WHERE id=?",placeId],
  ];
  for(const [change,restore,value] of mutations){await sql(c=>c.execute(change,[value]));assert.equal((await request(`/public/places/${placeId}`)).status,404);assert.equal((await request(`/public/places?householdId=${fixture.householdId}`)).data.total,0);await sql(c=>c.execute(restore,[value]));}
  await sql(c=>c.execute("UPDATE content_revisions SET status='PENDING' WHERE id=?",[fixture.data.profile.revisionId]));assert.equal((await request(`/public/places/${placeId}`)).status,404);
  await sql(c=>c.execute("UPDATE content_revisions SET status='APPROVED' WHERE id=?",[fixture.data.profile.revisionId]));
  assert.equal((await request(`/public/places/${placeId}`)).status,200);
});

test('concurrent saves and submit/edit races have a single valid revision winner',async()=>{
  const fixture=await opened();const token=fixture.owner.accessToken;
  const results=await Promise.all(['A','B'].map(title=>request(`${ownerPath(fixture.data)}/profile`,{token,method:'PUT',body:{...profile,title:`Vườn ${title}`,...ref(fixture.data)}})));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const winner=results.find(r=>r.status===200).data;
  const race=await Promise.all([request(`${ownerPath(winner)}/profile`,{token,method:'PUT',body:{...profile,...ref(winner)}}),request(`${ownerPath(winner)}/submissions`,{token,method:'POST',body:ref(winner)})]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
});

test('repeat submit/review is idempotent while two conflicting reviewers produce one decision',async()=>{
  const fixture=await submitted();const token=fixture.owner.accessToken;
  const repeated=await request(`${ownerPath(fixture.data)}/submissions`,{token,method:'POST',body:ref(fixture.data)});assert.equal(repeated.status,200);assert.equal(repeated.data.changed,false);
  const results=await Promise.all([
    request(reviewPath(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'APPROVED'}}),
    request(reviewPath(fixture.data),{token:admin2.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'REJECTED',reason:'Cần xác minh địa điểm'}}),
  ]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const index=results.findIndex(r=>r.status===200);const body=index===0?{version:fixture.data.profile.version,decision:'APPROVED'}:{version:fixture.data.profile.version,decision:'REJECTED',reason:'Cần xác minh địa điểm'};
  const again=await request(reviewPath(fixture.data),{token:[admin,admin2][index].accessToken,method:'POST',body});assert.equal(again.status,200);assert.equal(again.data.changed,false);
  await sql(async c=>{const [[r]]=await c.execute("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND event_type='PLACE_REVIEW'",[fixture.owner.id]);assert.equal(Number(r.n),1);});
});

test('review cannot target a wrong content type or an outdated revision/version',async()=>{
  const fixture=await published();let changed=await request(`${ownerPath(fixture.data)}/profile`,{token:fixture.owner.accessToken,method:'PUT',body:{...profile,...ref(fixture.data)}});
  changed=await request(`${ownerPath(fixture.data)}/submissions`,{token:fixture.owner.accessToken,method:'POST',body:ref(changed.data)});
  const stale=await request(reviewPath(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'APPROVED'}});assert.equal(stale.status,409);assert.equal(stale.body.error.code,'STALE_VERSION');
  assert.equal((await request(reviewPath(changed.data),{token:admin.accessToken,method:'POST',body:{version:999,decision:'APPROVED'}})).status,409);
  const mine=await householdService.mine(await authService.authenticate(fixture.owner.accessToken));assert.equal((await request(`/admin/place-submissions/${mine.profile.revisionId}`,{token:admin.accessToken})).status,404);
});

test('failed notification rolls back publication, review and audit as one transaction',async()=>{
  const fixture=await submitted();const broken=createCatalogService({repository:{...repository,transaction:work=>repository.transaction(tx=>work({...tx,notifyReview:async()=>{throw new Error('notification fixture');}}))}});
  await assert.rejects(broken.reviewPlace(await authService.authenticate(admin.accessToken),fixture.data.profile.revisionId,{version:fixture.data.profile.version,decision:'APPROVED'},correlation()));
  const mine=await request(ownerPath(fixture.data),{token:fixture.owner.accessToken});assert.equal(mine.data.profile.status,'PENDING');assert.equal(mine.data.publishedProfile,null);assert.equal((await request(`/public/places/${fixture.data.place.id}`)).status,404);
  await sql(async c=>{const [[r]]=await c.execute("SELECT COUNT(*) n FROM activity_events WHERE entity_type='CONTENT_REVISION' AND entity_id=? AND event_type='CONTENT_REVIEW'",[fixture.data.profile.revisionId]);assert.equal(Number(r.n),0);});
  await published(fixture);
});

test('revoked households keep private history but cannot create/submit/approve new publication',async()=>{
  const fixture=await submitted();await sql(c=>c.execute("UPDATE households SET approval_status='REVOKED' WHERE id=?",[fixture.householdId]));const token=fixture.owner.accessToken;
  assert.equal((await request(ownerPath(fixture.data),{token})).status,200);
  assert.equal((await request('/households/me/places',{token,method:'POST',body:profile})).status,403);
  assert.equal((await request(`${ownerPath(fixture.data)}/submissions`,{token,method:'POST',body:ref(fixture.data)})).status,403);
  assert.equal((await request(reviewPath(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'APPROVED'}})).status,403);
  const hidden=await request(`${ownerPath(fixture.data)}/status`,{token,method:'PATCH',body:{supplyStatus:'PAUSED',visibility:'HIDDEN',expectedState:state(fixture.data),reason:'Ngừng nhận khách'}});assert.equal(hidden.status,200);
  assert.equal((await request(`${ownerPath(fixture.data)}/status`,{token,method:'PATCH',body:{supplyStatus:'AVAILABLE',visibility:'VISIBLE',expectedState:state(hidden.data),reason:'Không được mở'}})).status,403);
});

test('live role, blocked account and revoked session are rechecked after authentication before writes',async()=>{
  const fixture=await submitted();const ownerAuth=await authService.authenticate(fixture.owner.accessToken);const reviewer=await account('ADMIN');const auth=await authService.authenticate(reviewer.accessToken);
  await sql(c=>c.execute("UPDATE users SET role='CUSTOMER' WHERE id=?",[reviewer.id]));await assert.rejects(service.reviewPlace(auth,fixture.data.profile.revisionId,{version:fixture.data.profile.version,decision:'APPROVED'},correlation()),{code:'FORBIDDEN'});
  await sql(c=>c.execute("UPDATE users SET status='BLOCKED',disabled_at=UTC_TIMESTAMP(6) WHERE id=?",[fixture.owner.id]));await assert.rejects(service.savePlace(ownerAuth,fixture.data.place.id,{...profile,...ref(fixture.data)},correlation()),{code:'ACCOUNT_BLOCKED'});
  await sql(c=>c.execute("UPDATE users SET status='ACTIVE',disabled_at=NULL WHERE id=?",[fixture.owner.id]));await sql(c=>c.execute('UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP(6) WHERE id=?',[ownerAuth.sessionId]));await assert.rejects(service.submitPlace(ownerAuth,fixture.data.place.id,ref(fixture.data),correlation()),{code:'UNAUTHENTICATED'});
});
