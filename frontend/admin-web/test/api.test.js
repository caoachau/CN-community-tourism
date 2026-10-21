import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ApiClient,ApiError,normalizeBase} from '../src/api.js';

const user={id:'9007199254740993',displayName:'Quản trị thử nghiệm',role:'ADMIN',status:'ACTIVE'};
const session=(name='first',role='ADMIN')=>({user:{...user,role},accessToken:`access-${name}`,refreshToken:`refresh-${name}`});
const ok=data=>new Response(JSON.stringify({success:true,data,meta:{requestId:'test-request'}}),{status:200});
const failure=(code,status=401)=>new Response(JSON.stringify({success:false,error:{code,message:'NEVER_EXPOSE_SERVER_DETAILS'},meta:{requestId:'safe-reference'}}),{status});
const apiWith=handler=>new ApiClient({baseUrl:'http://127.0.0.1/api/v1',fetcher:async(url,options)=>handler(new URL(url),options)});

test('normalizes the previous /api environment setting without duplicating v1',()=>{
  assert.equal(normalizeBase('http://localhost:5000/api/'),'http://localhost:5000/api/v1');assert.equal(normalizeBase('/api/v1'),'/api/v1');
});
test('uses Bearer headers, keeps BIGINT IDs as strings, and never supplies cookies',async()=>{
  const api=apiWith((url,options)=>{
    assert.equal(options.credentials,'omit');
    if(url.pathname.endsWith('/auth/login'))return ok(session());
    assert.equal(options.headers.Authorization,'Bearer access-first');assert.equal(JSON.parse(options.body).userId,'9007199254740993');return ok({done:true});
  });
  await api.login({email:'admin@example.invalid',password:'test-only-password'});assert.equal(api.user.id,user.id);
  assert.deepEqual(await api.request('POST','/command',{body:{userId:user.id}}),{done:true});
  assert.equal(JSON.stringify(api).includes('access-first'),false);
});
test('concurrent expired requests share one refresh and retry with the rotated access token',async()=>{
  let rotations=0;
  const api=apiWith(async(url,options)=>{
    if(url.pathname.endsWith('/auth/login'))return ok(session());
    if(url.pathname.endsWith('/auth/refresh')){rotations++;await new Promise(resolve=>setTimeout(resolve,10));assert.equal(JSON.parse(options.body).refreshToken,'refresh-first');return ok(session('next'));}
    if(options.headers.Authorization==='Bearer access-first')return failure('UNAUTHENTICATED');return ok({items:[]});
  });
  await api.login({email:'admin@example.invalid',password:'test-only-password'});
  await Promise.all([api.request('GET','/one'),api.request('GET','/two'),api.request('GET','/three')]);assert.equal(rotations,1);assert.ok(api.user);
});
test('blocking or a revoked refresh clears the session, while a network failure retains it',async()=>{
  let mode='network';const api=apiWith((url)=>{if(url.pathname.endsWith('/auth/login'))return ok(session());if(mode==='network')throw new Error('INTERNAL_CONNECTION_SECRET');return failure('ACCOUNT_BLOCKED',403);});
  await api.login({email:'admin@example.invalid',password:'test-only-password'});
  await assert.rejects(api.request('GET','/private'),{code:'NETWORK_ERROR'});assert.ok(api.user);mode='blocked';
  await assert.rejects(api.request('GET','/private'),{code:'ACCOUNT_BLOCKED'});assert.equal(api.user,null);
});
test('non-admin sessions are revoked and rejected from the administration interface',async()=>{
  let loggedOut=false;const api=apiWith(url=>{if(url.pathname.endsWith('/auth/login'))return ok(session('customer','CUSTOMER'));loggedOut=url.pathname.endsWith('/auth/logout');return ok({loggedOut:true});});
  await assert.rejects(api.login({email:'customer@example.invalid',password:'test-only-password'}),{code:'ADMIN_REQUIRED'});assert.equal(loggedOut,true);assert.equal(api.user,null);
});
test('a late refresh cannot overwrite a different login or sign that account out',async()=>{
  let release;const waiting=new Promise(resolve=>{release=resolve;});let refreshing;const started=new Promise(resolve=>{refreshing=resolve;});
  const api=apiWith(async(url,options)=>{
    if(url.pathname.endsWith('/auth/login'))return ok(session(JSON.parse(options.body).email));
    if(url.pathname.endsWith('/auth/refresh')){refreshing();await waiting;return ok(session('old-rotated'));}
    return failure('UNAUTHENTICATED');
  });
  await api.login({email:'old',password:'test-only-password'});const old=api.request('GET','/old').catch(error=>error);
  await started;await api.login({email:'new',password:'test-only-password'});release();const error=await old;assert.equal(error.code,'SESSION_CHANGED');assert.ok(api.user);
});
test('API failures expose fixed messages and support references, not server internals',async()=>{
  const api=apiWith(()=>failure('INTERNAL_ERROR',500));
  await assert.rejects(api.request('GET','/public',{authenticated:false}),error=>{assert.ok(error instanceof ApiError);assert.equal(error.requestId,'safe-reference');assert.doesNotMatch(error.message,/NEVER_EXPOSE/);return true;});
});
test('logout always removes the browser session even if the server cannot be reached',async()=>{
  const api=apiWith(url=>{if(url.pathname.endsWith('/auth/login'))return ok(session());throw new Error('offline');});
  await api.login({email:'admin@example.invalid',password:'test-only-password'});await assert.rejects(api.logout(),{code:'NETWORK_ERROR'});assert.equal(api.user,null);
});

test('an old command returning 401 is never retried with a different account',async()=>{
  let release,started;const waiting=new Promise(resolve=>{release=resolve;}),sent=new Promise(resolve=>{started=resolve;});let commands=0;
  const api=apiWith(async(url,options)=>{
    if(url.pathname.endsWith('/auth/login'))return ok(session(JSON.parse(options.body).email));
    commands++;started();await waiting;return failure('UNAUTHENTICATED');
  });
  await api.login({email:'old',password:'test-only-password'});
  const command=api.request('POST','/command',{body:{reason:'test'}}).catch(error=>error);
  await sent;await api.login({email:'new',password:'test-only-password'});release();
  assert.equal((await command).code,'SESSION_CHANGED');assert.equal(commands,1);assert.ok(api.user);
});
