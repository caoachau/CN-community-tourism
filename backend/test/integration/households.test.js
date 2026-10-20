import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import mysql from 'mysql2/promise';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createTestDatabase } from '../support/mysql.js';
import { testDatabaseOptions } from '../support/config.js';
import { databaseAccess } from '../../src/database.js';
import { createAuthRepository } from '../../src/auth/repository.js';
import { createAuthService } from '../../src/auth/service.js';
import { createHouseholdRepository } from '../../src/households/repository.js';
import { createHouseholdService } from '../../src/households/service.js';
import { authOptions } from '../../src/config/auth.js';
import { hashPassword } from '../../src/auth/passwords.js';
import { authenticate, requireRoles, requireHouseholdOwner } from '../../src/auth/middleware.js';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/shared/logger.js';
import { openApiDocument } from '../../src/openapi.js';

let database, pool, access, authRepository, householdRepository, authService, service, server, baseUrl, passwordHash, contract, admin, admin2;
let sequence=0;
const password='Long unique password for household tests';
const logger=createLogger({env:{LOG_LEVEL:'silent'}});
const ajv=addFormats(new Ajv({strict:false,allErrors:true}));
const complete={title:'Hộ du lịch Ba Thành',body:'Gia đình tổ chức trải nghiệm bắt cá và nấu món địa phương.',
  details:{address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',contactPhone:'0901234567',introductionSections:[]}};
const reference=data=>({revisionId:data.profile.revisionId,version:data.profile.version});
const reviewUrl=data=>`/admin/household-applications/${data.profile.revisionId}/review`;
async function sql(work){const c=await database.connect();try{return await work(c);}finally{await database.closeConnection(c);}}
async function account(role='CUSTOMER'){
  const user=await authRepository.transaction(tx=>tx.createUser({email:`households-${++sequence}@example.invalid`,displayName:`Fixture ${sequence}`,passwordHash,role}));
  return {...await authService.login({email:user.email,password}),id:String(user.id)};
}
async function request(path,{token,method='GET',body}={}){
  const response=await fetch(`${baseUrl}/api/v1${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const payload=await response.json();
  const pathKey=`/api/v1${path.split('?')[0].replace(/\/household-applications\/[^/]+/,'/household-applications/{revisionId}')}`;
  const operation=contract.paths[pathKey]?.[method.toLowerCase()];
  if(operation){
    const schema=(operation.responses[response.status]??operation.responses.default).content['application/json'].schema;
    const validator=ajv.compile(schema);assert.equal(validator(payload),true,JSON.stringify(validator.errors));
    assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(payload.meta.requestId,response.headers.get('x-request-id'));
  }
  return {status:response.status,body:payload,data:payload.data};
}
async function opened(owner=undefined){
  owner??=await account();const result=await request('/households',{token:owner.accessToken,method:'POST',body:complete});
  assert.equal(result.status,201);return {owner,data:result.data};
}
async function pending(){const result=await opened();const submitted=await request('/households/me/submissions',{token:result.owner.accessToken,method:'POST',body:reference(result.data)});assert.equal(submitted.status,200);return {...result,data:submitted.data};}
async function approve(fixture,reviewer=admin){const result=await request(reviewUrl(fixture.data),{token:reviewer.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'APPROVED'}});assert.equal(result.status,200);return {...fixture,data:result.data};}

before(async()=>{
  database=await createTestDatabase(process.env,{schema:'survey'});
  pool=mysql.createPool({...testDatabaseOptions(),database:database.name,connectionLimit:8,queueLimit:30});access=databaseAccess(pool);
  authRepository=createAuthRepository(access);householdRepository=createHouseholdRepository(access);
  authService=createAuthService({repository:authRepository,options:authOptions({JWT_SECRET:randomBytes(32).toString('base64url')})});
  service=createHouseholdService({repository:householdRepository});passwordHash=await hashPassword(password);
  contract=await SwaggerParser.dereference(structuredClone(openApiDocument),{resolve:{external:false}});
  const router=Router();router.get('/test/customer',authenticate(authService),requireRoles('CUSTOMER'),(_req,res)=>res.json({allowed:true}));
  router.get('/test/households/:householdId',authenticate(authService),requireHouseholdOwner(authService,undefined,{requireApproved:true}),(_req,res)=>res.json({allowed:true}));
  server=createApp({logger,authService,householdService:service,apiRouter:router}).listen(0);await new Promise(resolve=>server.once('listening',resolve));baseUrl=`http://127.0.0.1:${server.address().port}`;
  admin=await account('ADMIN');admin2=await account('ADMIN');
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await pool?.end();await database?.dispose();});

test('CUSTOMER opens a private DRAFT, submits, receives approval and uses the same JWT as HOUSEHOLD and CUSTOMER',async()=>{
  const fixture=await opened();const {owner}=fixture;let {data}=fixture;
  assert.equal(data.household.approvalStatus,'DRAFT');assert.equal(data.user.role,'CUSTOMER');assert.equal(data.publishedProfile,null);
  assert.equal((await request('/auth/me',{token:owner.accessToken})).data.user.role,'CUSTOMER');
  assert.equal((await request(`/test/households/${data.household.id}`,{token:owner.accessToken})).status,403);
  const submitted=await request('/households/me/submissions',{token:owner.accessToken,method:'POST',body:reference(data)});assert.equal(submitted.status,200);
  assert.equal(submitted.data.household.approvalStatus,'PENDING');assert.equal(submitted.data.profile.status,'PENDING');assert.equal(submitted.data.user.role,'CUSTOMER');
  const detail=await request(`/admin/household-applications/${data.profile.revisionId}`,{token:admin.accessToken});assert.equal(detail.status,200);assert.equal(detail.data.user.id,owner.id);
  data=(await approve({...fixture,data:submitted.data})).data;
  assert.equal(data.household.approvalStatus,'APPROVED');assert.equal(data.profile.status,'APPROVED');assert.equal(data.user.role,'HOUSEHOLD');
  assert.equal(data.household.publishedRevisionId,data.profile.revisionId);assert.equal(data.publishedProfile.title,complete.title);
  assert.equal((await request('/auth/me',{token:owner.accessToken})).data.user.role,'HOUSEHOLD');
  assert.equal((await request('/test/customer',{token:owner.accessToken})).status,200);
  assert.equal((await request(`/test/households/${data.household.id}`,{token:owner.accessToken})).status,200);
  const refreshed=await request('/auth/refresh',{method:'POST',body:{refreshToken:owner.refreshToken}});assert.equal(refreshed.status,200);assert.equal(refreshed.data.user.role,'HOUSEHOLD');
  await sql(async c=>{
    const [[count]]=await c.execute('SELECT COUNT(*) n FROM households WHERE owner_user_id=?',[owner.id]);assert.equal(Number(count.n),1);
    const [[events]]=await c.execute("SELECT COUNT(*) n FROM activity_events WHERE household_id=? AND event_type='HOUSEHOLD_APPROVAL'",[data.household.id]);assert.equal(Number(events.n),1);
    const [[roles]]=await c.execute("SELECT COUNT(*) n FROM activity_events WHERE entity_type='USER' AND entity_id=? AND to_status='HOUSEHOLD'",[owner.id]);assert.equal(Number(roles.n),1);
    const [[notification]]=await c.execute('SELECT COUNT(*) n FROM notifications WHERE user_id=?',[owner.id]);assert.equal(Number(notification.n),1);
  });
});

test('incomplete drafts can be saved but cannot be submitted or bypass validation with identity/status fields',async()=>{
  const owner=await account();let response=await request('/households',{token:owner.accessToken,method:'POST',body:{title:'Hộ dân'}});assert.equal(response.status,201);
  response=await request('/households/me/submissions',{token:owner.accessToken,method:'POST',body:reference(response.data)});assert.equal(response.status,422);assert.equal(response.body.error.code,'HOUSEHOLD_PROFILE_INCOMPLETE');
  for(const extra of [{role:'HOUSEHOLD'},{ownerUserId:admin.id},{approvalStatus:'APPROVED'},{publishedRevisionId:'1'}]){
    const result=await request('/households',{token:owner.accessToken,method:'POST',body:{...complete,...extra}});assert.equal(result.status,422);
  }
  const mine=await request('/households/me',{token:owner.accessToken});assert.equal(mine.data.household.approvalStatus,'DRAFT');assert.equal(mine.data.profile.submittedAt,null);
});

test('rejection requires a reason; editing and resubmitting preserves the rejected version and does not grant a role early',async()=>{
  const fixture=await pending();const ref=reference(fixture.data);
  const bad=await request(reviewUrl(fixture.data),{token:admin.accessToken,method:'POST',body:{version:ref.version,decision:'REJECTED'}});assert.equal(bad.status,422);
  const rejected=await request(reviewUrl(fixture.data),{token:admin.accessToken,method:'POST',body:{version:ref.version,decision:'REJECTED',reason:'Cần ghi rõ điểm đón khách'}});assert.equal(rejected.status,200);
  assert.equal(rejected.data.household.approvalStatus,'REJECTED');assert.equal(rejected.data.user.role,'CUSTOMER');assert.equal(rejected.data.profile.reviewNote,'Cần ghi rõ điểm đón khách');
  const saved=await request('/households/me/profile',{token:fixture.owner.accessToken,method:'PUT',body:{...complete,...ref,details:{...complete.details,address:'Điểm đón: cổng nhà tại ấp Bình Hòa'}}});assert.equal(saved.status,200);assert.equal(saved.data.profile.version,2);assert.notEqual(saved.data.profile.revisionId,ref.revisionId);
  const submitted=await request('/households/me/submissions',{token:fixture.owner.accessToken,method:'POST',body:reference(saved.data)});assert.equal(submitted.status,200);assert.equal(submitted.data.user.role,'CUSTOMER');
  const history=await request('/households/me/revisions',{token:fixture.owner.accessToken});assert.equal(history.status,200);assert.equal(history.data.total,2);assert.equal(history.data.items[1].reviewNote,'Cần ghi rõ điểm đón khách');
  await approve({...fixture,data:submitted.data});
});

test('an approved revision remains public during draft/pending/rejected edits; a later accepted edit switches the pointer',async()=>{
  const fixture=await approve(await pending());const original=fixture.data.profile;const token=fixture.owner.accessToken;
  let result=await request('/households/me/profile',{token,method:'PUT',body:{...complete,title:'Tên hộ được cập nhật',...reference(fixture.data)}});assert.equal(result.status,200);assert.equal(result.data.household.approvalStatus,'APPROVED');assert.equal(result.data.publishedProfile.title,original.title);
  result=await request('/households/me/submissions',{token,method:'POST',body:reference(result.data)});assert.equal(result.data.household.approvalStatus,'APPROVED');assert.equal(result.data.publishedProfile.revisionId,original.revisionId);
  const rejected=await request(reviewUrl(result.data),{token:admin.accessToken,method:'POST',body:{version:result.data.profile.version,decision:'REJECTED',reason:'Bổ sung thông tin giới thiệu'}});assert.equal(rejected.status,200);assert.equal(rejected.data.user.role,'HOUSEHOLD');assert.equal(rejected.data.household.approvalStatus,'APPROVED');assert.equal(rejected.data.publishedProfile.revisionId,original.revisionId);
  result=await request('/households/me/profile',{token,method:'PUT',body:{...complete,title:'Tên hộ được cập nhật',...reference(rejected.data)}});
  result=await request('/households/me/submissions',{token,method:'POST',body:reference(result.data)});
  const accepted=await approve({...fixture,data:result.data});assert.equal(accepted.data.publishedProfile.title,'Tên hộ được cập nhật');
  await sql(async c=>{const [[old]]=await c.execute('SELECT status,title FROM content_revisions WHERE id=?',[original.revisionId]);assert.equal(old.status,'APPROVED');assert.equal(old.title,original.title);});
});

test('unauthenticated, non-admin and cross-owner access is denied; drafts never appear in admin applications',async()=>{
  const a=await opened();const b=await opened();
  assert.equal((await request('/households/me')).status,401);
  assert.equal((await request('/admin/household-applications',{token:a.owner.accessToken})).status,403);
  assert.equal((await request('/households',{token:admin.accessToken,method:'POST',body:complete})).status,403);
  assert.equal((await request(`/admin/household-applications/${a.data.profile.revisionId}`,{token:admin.accessToken})).status,404);
  const result=await request('/households/me/profile',{token:b.owner.accessToken,method:'PUT',body:{...complete,...reference(a.data)}});assert.equal(result.status,409);
  assert.equal((await request(`/test/households/${a.data.household.id}`,{token:b.owner.accessToken})).status,403);
  const list=await request('/admin/household-applications?status=PENDING',{token:admin.accessToken});assert.equal(list.status,200);assert.ok(list.data.items.every(i=>i.revisionId!==a.data.profile.revisionId));
  assert.equal((await request('/admin/household-applications?pageSize=101',{token:admin.accessToken})).status,422);
});

test('concurrent opens create exactly one household and one initial revision',async()=>{
  const owner=await account();const results=await Promise.all([1,2].map(()=>request('/households',{token:owner.accessToken,method:'POST',body:complete})));
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal(results.find(r=>r.status===409).body.error.code,'HOUSEHOLD_ALREADY_EXISTS');
  await sql(async c=>{const [[r]]=await c.execute('SELECT COUNT(*) n FROM content_revisions cr JOIN households h ON h.id=cr.household_profile_id WHERE h.owner_user_id=?',[owner.id]);assert.equal(Number(r.n),1);});
});

test('concurrent profile saves cannot silently overwrite each other',async()=>{
  const fixture=await opened();const results=await Promise.all(['A','B'].map(name=>request('/households/me/profile',{token:fixture.owner.accessToken,method:'PUT',body:{...complete,title:`Tên hộ ${name}`,...reference(fixture.data)}})));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(results.find(r=>r.status===409).body.error.code,'STALE_VERSION');
  const history=await request('/households/me/revisions',{token:fixture.owner.accessToken});assert.equal(history.data.total,2);
});

test('submit vs edit of the same version has one valid winner; pending content is immutable',async()=>{
  const fixture=await opened();const ref=reference(fixture.data);const token=fixture.owner.accessToken;
  const results=await Promise.all([request('/households/me/profile',{token,method:'PUT',body:{...complete,title:'Thông tin mới',...ref}}),request('/households/me/submissions',{token,method:'POST',body:ref})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const mine=await request('/households/me',{token});
  if(mine.data.profile.status==='PENDING'){
    const edit=await request('/households/me/profile',{token,method:'PUT',body:{...complete,...reference(mine.data)}});assert.equal(edit.status,409);
  }else assert.equal(mine.data.profile.version,2);
});

test('repeated submission and identical review are safe no-ops with one notification',async()=>{
  const fixture=await pending();const ref=reference(fixture.data);
  const again=await request('/households/me/submissions',{token:fixture.owner.accessToken,method:'POST',body:ref});assert.equal(again.status,200);assert.equal(again.data.changed,false);
  const results=await Promise.all([1,2].map(()=>request(reviewUrl(fixture.data),{token:admin.accessToken,method:'POST',body:{version:ref.version,decision:'APPROVED'}})));
  assert.deepEqual(results.map(r=>r.status),[200,200]);assert.deepEqual(results.map(r=>r.data.changed).sort(),[false,true]);
  await sql(async c=>{const [[r]]=await c.execute('SELECT COUNT(*) n FROM notifications WHERE user_id=?',[fixture.owner.id]);assert.equal(Number(r.n),1);});
});

test('two admins deciding approve vs reject produce one final decision without duplicate effects',async()=>{
  const fixture=await pending();const results=await Promise.all([
    request(reviewUrl(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'APPROVED'}}),
    request(reviewUrl(fixture.data),{token:admin2.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'REJECTED',reason:'Cần kiểm tra thông tin'}}),
  ]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const winner=results.find(r=>r.status===200);const mine=await request('/households/me',{token:fixture.owner.accessToken});assert.equal(mine.data.profile.status,winner.data.profile.status);assert.equal(mine.data.user.role,winner.data.profile.status==='APPROVED'?'HOUSEHOLD':'CUSTOMER');
  await sql(async c=>{const [[r]]=await c.execute('SELECT COUNT(*) n FROM notifications WHERE user_id=?',[fixture.owner.id]);assert.equal(Number(r.n),1);});
});

test('stale revision/version cannot be reviewed and pending queue includes edits of approved households',async()=>{
  const fixture=await approve(await pending());const old=fixture.data.profile;
  let result=await request('/households/me/profile',{token:fixture.owner.accessToken,method:'PUT',body:{...complete,...reference(fixture.data)}});
  result=await request('/households/me/submissions',{token:fixture.owner.accessToken,method:'POST',body:reference(result.data)});
  const stale=await request(`/admin/household-applications/${old.revisionId}/review`,{token:admin.accessToken,method:'POST',body:{version:old.version,decision:'APPROVED'}});assert.equal(stale.status,409);assert.equal(stale.body.error.code,'STALE_VERSION');
  const wrongVersion=await request(reviewUrl(result.data),{token:admin.accessToken,method:'POST',body:{version:999,decision:'APPROVED'}});assert.equal(wrongVersion.status,409);
  const list=await request('/admin/household-applications?status=PENDING&pageSize=100',{token:admin.accessToken});const item=list.data.items.find(i=>i.revisionId===result.data.profile.revisionId);assert.ok(item);assert.equal(item.approvalStatus,'APPROVED');
});

test('blocking owner/admin or revoking a session after authentication is rechecked inside the transaction',async()=>{
  const fixture=await pending();const ownerAuth=await authService.authenticate(fixture.owner.accessToken);const reviewer=await account('ADMIN');const reviewerAuth=await authService.authenticate(reviewer.accessToken);
  await sql(c=>c.execute("UPDATE users SET status='BLOCKED',disabled_at=UTC_TIMESTAMP(6) WHERE id=?",[fixture.owner.id]));
  await assert.rejects(service.submit(ownerAuth,reference(fixture.data),'test-blocked-owner'),{code:'ACCOUNT_BLOCKED'});
  const denied=await request(reviewUrl(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'APPROVED'}});assert.equal(denied.status,409);
  await sql(c=>c.execute("UPDATE users SET role='CUSTOMER' WHERE id=?",[reviewer.id]));
  await assert.rejects(service.review(reviewerAuth,fixture.data.profile.revisionId,{version:fixture.data.profile.version,decision:'APPROVED'},'test-demoted-admin'),{code:'FORBIDDEN'});
  await sql(c=>c.execute("UPDATE users SET role='ADMIN',status='BLOCKED',disabled_at=UTC_TIMESTAMP(6) WHERE id=?",[reviewer.id]));
  await assert.rejects(service.review(reviewerAuth,fixture.data.profile.revisionId,{version:fixture.data.profile.version,decision:'APPROVED'},'test-blocked-admin'),{code:'ACCOUNT_BLOCKED'});
  await sql(c=>c.execute("UPDATE users SET status='ACTIVE',disabled_at=NULL WHERE id=?",[fixture.owner.id]));
  await sql(c=>c.execute('UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP(6) WHERE id=?',[ownerAuth.sessionId]));
  await assert.rejects(service.submit(ownerAuth,reference(fixture.data),'test-revoked-session'),{code:'UNAUTHENTICATED'});
});

test('failure after the role update rolls back publication, role, audit and notification together',async()=>{
  const fixture=await pending();const auth=await authService.authenticate(admin.accessToken);
  const failing=createHouseholdService({repository:{...householdRepository,transaction:work=>householdRepository.transaction(tx=>work({...tx,notifyReview:async()=>{throw new Error('fixture notification failure');}}))}});
  await assert.rejects(failing.review(auth,fixture.data.profile.revisionId,{version:fixture.data.profile.version,decision:'APPROVED'},'rollback-test'));
  const mine=await request('/households/me',{token:fixture.owner.accessToken});assert.equal(mine.data.household.approvalStatus,'PENDING');assert.equal(mine.data.profile.status,'PENDING');assert.equal(mine.data.publishedProfile,null);assert.equal(mine.data.user.role,'CUSTOMER');
  await sql(async c=>{const [[r]]=await c.execute("SELECT COUNT(*) n FROM activity_events WHERE household_id=? AND actor_type='ADMIN'",[fixture.data.household.id]);assert.equal(Number(r.n),0);});
  await approve(fixture);
});

test('archived household cannot edit/submit/review; reapproval of a revoked household does not restore old requests',async()=>{
  const fixture=await pending();await sql(c=>c.execute('UPDATE households SET archived_at=UTC_TIMESTAMP(6) WHERE id=?',[fixture.data.household.id]));
  assert.equal((await request('/households/me/submissions',{token:fixture.owner.accessToken,method:'POST',body:reference(fixture.data)})).status,409);
  assert.equal((await request(reviewUrl(fixture.data),{token:admin.accessToken,method:'POST',body:{version:fixture.data.profile.version,decision:'APPROVED'}})).status,409);
  const revoked=await approve(await pending());await sql(c=>c.execute("UPDATE households SET approval_status='REVOKED' WHERE id=?",[revoked.data.household.id]));
  assert.equal((await request('/test/customer',{token:revoked.owner.accessToken})).status,200);
  let saved=await request('/households/me/profile',{token:revoked.owner.accessToken,method:'PUT',body:{...complete,...reference(revoked.data)}});assert.equal(saved.status,200);
  saved=await request('/households/me/submissions',{token:revoked.owner.accessToken,method:'POST',body:reference(saved.data)});assert.equal(saved.data.household.approvalStatus,'PENDING');
  await approve({...revoked,data:saved.data});
  await sql(async c=>{const [[r]]=await c.execute('SELECT COUNT(*) n FROM schedule_requests WHERE household_id=?',[revoked.data.household.id]);assert.equal(Number(r.n),0);});
});
