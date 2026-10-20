import assert from 'node:assert/strict';
import { test } from 'node:test';
import { roomCreateSchema, roomSaveSchema, roomSubmitSchema, roomPriceSchema, publicRoomQuerySchema } from '../src/rooms/schemas.js';
import { encodeProfile, profileOf, pricingToken, structureChanged, publicRoomOf } from '../src/rooms/models.js';

const input={title:'Phòng Hoa Sen',nightlyPriceVnd:400000,maxGuests:4,placeId:'9007199254740993',terms:{includedItems:['Nước uống']},details:{amenities:['Điều hòa'],houseRules:['Giữ yên tĩnh sau 22 giờ']}};
const root={id:'9007199254740994',household_id:'1',code:'RM-1',place_id:'9007199254740993',max_guests:4,nightly_price_vnd:'400000',check_in_time:'14:00:00',check_out_time:'12:00:00',terms:{},created_at:new Date('2030-01-01T00:00:00Z')};
test('room price is exact whole VND per night; occupancy and ownership cannot be assigned by clients',()=>{
  const value=roomCreateSchema.parse(input);assert.equal(value.checkInTime,'14:00');assert.equal(value.checkOutTime,'12:00');
  for(const extra of [{nightlyPriceVnd:'400000'},{nightlyPriceVnd:0.5},{nightlyPriceVnd:-1},{nightlyPriceVnd:1000000000000000},{maxGuests:0},{maxGuests:1001},{maxGuests:2.5},{householdId:'1'},{role:'HOUSEHOLD'},{pricingType:'PER_PERSON'},{roomQuantity:10},{details:{resourceId:'1'}}])assert.equal(roomCreateSchema.safeParse({...input,...extra}).success,false);
  assert.equal(roomCreateSchema.safeParse({...input,nightlyPriceVnd:0}).success,true);
  assert.equal(roomCreateSchema.safeParse({...input,nightlyPriceVnd:999999999999999}).success,true);
});
test('arrival/departure are strict local wall times on different stay dates',()=>{
  for(const time of ['24:00','14:60','7:00','14:00:00','-01:00','14:00Z'])assert.equal(roomCreateSchema.safeParse({...input,checkInTime:time}).success,false);
  assert.equal(roomCreateSchema.safeParse({...input,checkInTime:'23:59',checkOutTime:'00:00'}).success,true);
  assert.equal(roomCreateSchema.safeParse({...input,checkInTime:'12:00',checkOutTime:'12:00'}).success,true);
});
test('room revisions freeze typed content and submitted price independently of live price',()=>{
  const value=roomCreateSchema.parse(input),details=encodeProfile(value);
  const revision={id:'2',version:1,title:value.title,body:value.body,details:JSON.stringify({...details,nightly_price_snapshot_vnd:400000,private_data:'SECRET'}),schema_version:1,status:'APPROVED',review_note:'PRIVATE',created_at:root.created_at};
  const profile=profileOf(revision,{...root,nightly_price_vnd:'500000'});assert.equal(profile.nightlyPriceSnapshotVnd,400000);assert.equal(profile.placeId,'9007199254740993');assert.deepEqual(profile.terms.includedItems,['Nước uống']);
  assert.equal(structureChanged(root,value),false);assert.equal(structureChanged(root,{...value,maxGuests:3}),true);assert.equal(structureChanged(root,{...value,checkOutTime:'11:00'}),true);assert.equal(structureChanged(root,{...value,placeId:'1'}),true);
  const guest=publicRoomOf({...root,...revision,id:root.id,revision_id:'2',revision_version:1,household_name:'Hộ A',nightly_price_vnd:'500000',place_code:'P',place_name:'Nhà A',place_details:{address:'Ấp A',internal:'SECRET'},published_at:root.created_at});
  assert.equal(guest.nightlyPriceVnd,500000);assert.equal(guest.pricingType,'PER_NIGHT');assert.equal(guest.timeZone,'Asia/Ho_Chi_Minh');assert.doesNotMatch(JSON.stringify(guest),/SECRET|PRIVATE|reviewNote|nightlyPriceSnapshotVnd/);
});
test('optimistic price and revision references are separate and cannot bypass review',()=>{
  assert.notEqual(pricingToken(root),pricingToken({...root,nightly_price_vnd:'500000'}));assert.equal(pricingToken(root),pricingToken({...root,title:'Edited'}));
  const {nightlyPriceVnd,...profile}=input;
  assert.equal(roomSaveSchema.safeParse({...profile,revisionId:'1',version:1}).success,true);
  assert.equal(roomSaveSchema.safeParse({...input,revisionId:'1',version:1}).success,false);
  assert.equal(roomSubmitSchema.safeParse({revisionId:'1',version:1}).success,false);
  assert.equal(roomPriceSchema.safeParse({expectedToken:pricingToken(root),nightlyPriceVnd:500000,reason:'Đổi giá'}).success,true);
});
test('public room search validates integer capacity, inclusive price bounds and query allowlist',()=>{
  assert.deepEqual(publicRoomQuerySchema.parse({guests:'4',minPriceVnd:'0',maxPriceVnd:'500000'}),{page:1,pageSize:20,guests:4,minPriceVnd:0,maxPriceVnd:500000});
  for(const query of [{guests:'0'},{guests:'4.5'},{guests:'1001'},{minPriceVnd:'-1'},{minPriceVnd:'100',maxPriceVnd:'99'},{minPriceVnd:'1e5'},{status:'DRAFT'},{checkInDate:'2030-01-01'},{householdId:'0'},{q:''}])assert.equal(publicRoomQuerySchema.safeParse(query).success,false);
});
