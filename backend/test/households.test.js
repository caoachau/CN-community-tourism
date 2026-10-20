import assert from 'node:assert/strict';
import { test } from 'node:test';
import { profileSchema, saveProfileSchema, revisionReferenceSchema, reviewSchema, applicationListSchema, submissionProfileSchema } from '../src/households/schemas.js';

test('household drafts accept incomplete content; submission needs usable contact and location', () => {
  const draft = profileSchema.parse({ title:'  Hộ Ba Thành  ' });
  assert.deepEqual(draft,{ title:'Hộ Ba Thành',body:'',details:{ introductionSections:[] } });
  assert.equal(submissionProfileSchema.safeParse(draft).success,false);
  assert.equal(submissionProfileSchema.safeParse({ title:'Hộ Ba Thành',body:'Mô tả trải nghiệm du lịch cộng đồng.',details:{ address:'Ấp Bình Hòa',locality:'Vĩnh Long',contactPhone:'0901234567' } }).success,true);
});

test('untrusted ownership, privilege and operational fields are not accepted in a profile', () => {
  for (const extra of [{ ownerUserId:'1' },{ householdId:'1' },{ role:'HOUSEHOLD' },{ approvalStatus:'APPROVED' },{ code:'HH-FAKE' },{ publishedRevisionId:'1' }]) {
    assert.equal(profileSchema.safeParse({ title:'Hộ dân',...extra }).success,false);
  }
  for (const extra of [{ price:150000 },{ capacity:10 },{ status:'APPROVED' },{ contactPhone:'javascript:alert(1)' }]) {
    assert.equal(profileSchema.safeParse({ title:'Hộ dân',details:extra }).success,false);
  }
  assert.equal(profileSchema.safeParse({ title:'Hộ dân',body:'x'.repeat(20001) }).success,false);
});

test('profile saves and submissions require exact revision identity and a bounded numeric version', () => {
  assert.equal(saveProfileSchema.safeParse({ title:'Hộ dân' }).success,false);
  for(const value of [{ revisionId:'0',version:1 },{ revisionId:'18446744073709551616',version:1 },{ revisionId:'1',version:'1' },{ revisionId:'1',version:0 },{ revisionId:'1',version:4294967296 }]) {
    assert.equal(revisionReferenceSchema.safeParse(value).success,false);
  }
  assert.equal(saveProfileSchema.safeParse({ title:'Hộ dân',revisionId:'9007199254740993',version:1 }).success,true);
});

test('review validation requires a rejection reason and excludes all other state changes', () => {
  for(const value of [{ version:1,decision:'REJECTED' },{ version:1,decision:'REJECTED',reason:'  ' },{ version:1,decision:'REVOKED',reason:'x' },{ version:1,decision:'APPROVED',role:'ADMIN' }]) {
    assert.equal(reviewSchema.safeParse(value).success,false);
  }
  assert.deepEqual(reviewSchema.parse({ version:1,decision:'REJECTED',reason:'  Thiếu địa chỉ cụ thể  ' }),{ version:1,decision:'REJECTED',reason:'Thiếu địa chỉ cụ thể' });
  assert.equal(reviewSchema.safeParse({ version:1,decision:'APPROVED' }).success,true);
});

test('admin application queries are bounded and filter revisions rather than household privileges', () => {
  assert.deepEqual(applicationListSchema.parse({}),{ page:1,pageSize:20,status:'PENDING' });
  for(const value of [{ status:'DRAFT' },{ pageSize:'101' },{ ownerUserId:'1' },{ page:'1 OR 1=1' }]) assert.equal(applicationListSchema.safeParse(value).success,false);
});
