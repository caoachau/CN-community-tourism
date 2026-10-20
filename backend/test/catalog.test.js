import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoryCreateSchema,categoryUpdateSchema,categoryQuerySchema,adminCategoryQuerySchema,placeProfileSchema,placeSubmissionSchema,placeSaveSchema,placeStatusSchema,publicPlaceQuerySchema } from '../src/catalog/schemas.js';

test('categories are typed global data and reject household ownership or mutable identity',()=>{
  const input={kind:'SERVICE',code:'  fruit_picking  ',name:'  Hái trái cây  ',isActive:true,reason:'Thêm danh mục'};
  assert.equal(categoryCreateSchema.parse(input).code,'FRUIT_PICKING');
  for(const extra of [{householdId:'1'},{ownerUserId:'1'},{status:'APPROVED'},{kind:'PLACE'},{code:'code; DROP TABLE users'}]) assert.equal(categoryCreateSchema.safeParse({...input,...extra}).success,false);
  const update={expectedState:{name:'Cũ',isActive:true},name:'Mới',reason:'Đổi tên'};
  assert.equal(categoryUpdateSchema.safeParse(update).success,true);
  for(const extra of [{kind:'PRODUCT'},{code:'NEW'},{householdId:'1'}]) assert.equal(categoryUpdateSchema.safeParse({...update,...extra}).success,false);
  assert.equal(categoryUpdateSchema.safeParse({expectedState:update.expectedState,reason:'Thiếu thay đổi'}).success,false);
});

test('public category queries cannot request inactive taxonomy or unbounded pages',()=>{
  assert.deepEqual(categoryQuerySchema.parse({}),{page:1,pageSize:20});
  assert.equal(categoryQuerySchema.safeParse({isActive:'false'}).success,false);
  assert.deepEqual(adminCategoryQuerySchema.parse({isActive:'false',kind:'PRODUCT'}),{page:1,pageSize:20,isActive:false,kind:'PRODUCT'});
  assert.equal(categoryQuerySchema.safeParse({pageSize:'101'}).success,false);
});

test('place drafts allow incomplete details while submissions require a usable location',()=>{
  const draft=placeProfileSchema.parse({title:'Vườn Ba Thành'});assert.deepEqual(draft,{title:'Vườn Ba Thành',body:'',details:{}});
  assert.equal(placeSubmissionSchema.safeParse(draft).success,false);
  assert.equal(placeSubmissionSchema.safeParse({...draft,body:'Tham quan vườn và thu hoạch trái cây địa phương.',details:{address:'Ấp Bình Hòa',locality:'Vĩnh Long'}}).success,true);
  for(const extra of [{householdId:'1'},{code:'FAKE'},{publishedRevisionId:'1'},{status:'APPROVED'},{supplyStatus:'AVAILABLE'}]) assert.equal(placeProfileSchema.safeParse({...draft,...extra}).success,false);
  assert.equal(placeProfileSchema.safeParse({...draft,details:{capacity:10}}).success,false);
});

test('coordinates must be a bounded numeric pair and save references retain bigint precision',()=>{
  for(const coordinates of [{latitude:10},{longitude:105},{latitude:91,longitude:105},{latitude:10,longitude:181},{latitude:'10',longitude:105}]) assert.equal(placeProfileSchema.safeParse({title:'Vườn',details:{coordinates}}).success,false);
  assert.equal(placeProfileSchema.safeParse({title:'Vườn',details:{coordinates:null}}).success,true);
  assert.equal(placeSaveSchema.safeParse({title:'Vườn',revisionId:'9007199254740993',version:1}).success,true);
  assert.equal(placeSaveSchema.safeParse({title:'Vườn',revisionId:'18446744073709551616',version:1}).success,false);
});

test('operational state changes require an expected state and reason; public filters cannot select drafts',()=>{
  const input={supplyStatus:'PAUSED',visibility:'HIDDEN',expectedState:{supplyStatus:'AVAILABLE',visibility:'VISIBLE'},reason:'Tạm nghỉ'};
  assert.equal(placeStatusSchema.safeParse(input).success,true);
  for(const extra of [{reason:''},{expectedState:null},{approvalStatus:'APPROVED'},{publishedRevisionId:'1'}]) assert.equal(placeStatusSchema.safeParse({...input,...extra}).success,false);
  for(const input of [{status:'DRAFT'},{isActive:'false'},{householdId:'0'},{q:'x'.repeat(101)},{page:'-1'}]) assert.equal(publicPlaceQuerySchema.safeParse(input).success,false);
});
