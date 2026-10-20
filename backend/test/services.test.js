import assert from 'node:assert/strict';
import {test} from 'node:test';
import {offerConfigSchema,offerUpdateSchema,offerPriceSchema,serviceProfileSchema,serviceSubmitSchema,quantityRules,publicServiceQuerySchema} from '../src/services/schemas.js';
import {structureToken,digest,encodeOffer,offerOf,snapshotsOf,approvedOffers,snapshotOf} from '../src/services/models.js';

const input={name:'Bắt cá ghép',participationMode:'SHARED',pricingType:'PER_PERSON',unitPriceVnd:150000,minParticipants:1,maxParticipants:10,terms:{scopeDescription:'Giá cho một người tham gia trọn buổi bắt cá.'}};
const row=config=>{const encoded=encodeOffer(config);return {id:'9007199254740993',name:config.name,participation_mode:config.participationMode,pricing_type:config.pricingType,unit_price_vnd:String(config.unitPriceVnd),unit_label:config.unitLabel,min_participants:config.minParticipants,max_participants:config.maxParticipants,max_units:config.maxUnits,participants_per_unit:config.participantsPerUnit,terms:JSON.parse(encoded.terms),addons:JSON.parse(encoded.addons),is_active:Number(config.isActive),created_at:new Date('2030-01-01T00:00:00Z')};};
test('billing quantity rules are independent of participants and mode, with bounded unit configuration',()=>{
  const person=offerConfigSchema.parse(input);assert.equal(person.unitLabel,'người');assert.equal(person.maxUnits,null);assert.equal(quantityRules.PER_PERSON,'PARTICIPANT_COUNT');
  for(const pricingType of ['PER_GROUP','PER_TRIP','FIXED_PACKAGE']){const config=offerConfigSchema.parse({...input,pricingType,participationMode:'EXCLUSIVE'});assert.equal(quantityRules[config.pricingType],'ONE');}
  assert.equal(quantityRules.PER_HOUR,'SLOT_DURATION_HOURS');
  const units={...input,pricingType:'PER_UNIT',unitLabel:'xe',maxUnits:10,participantsPerUnit:1};assert.equal(offerConfigSchema.safeParse(units).success,true);
  for(const extra of [{maxUnits:null},{participantsPerUnit:null},{maxParticipants:11},{maxUnits:0}])assert.equal(offerConfigSchema.safeParse({...units,...extra}).success,false);
  for(const extra of [{maxParticipants:0},{maxParticipants:0,minParticipants:1},{unitPriceVnd:-1},{unitPriceVnd:1.5},{unitPriceVnd:1000000000000000},{unitPriceVnd:'150000'},{maxUnits:10},{participantCount:3},{resourceUsages:[]}])assert.equal(offerConfigSchema.safeParse({...input,...extra}).success,false);
});
test('addons are explicit resource-free charges with unique immutable identities and bounded exact VND',()=>{
  const addon={key:'preparation',name:'Chuẩn bị bữa ăn',unitPriceVnd:50000,maxQuantity:4,isActive:true,resourceFree:true};
  assert.equal(offerConfigSchema.safeParse({...input,addons:[addon]}).success,true);
  for(const addons of [[{...addon,resourceFree:false}],[{...addon,resourceId:'1'}],[addon,addon],[{...addon,maxQuantity:0}]])assert.equal(offerConfigSchema.safeParse({...input,addons}).success,false);
  assert.equal(offerPriceSchema.safeParse({expectedToken:'a'.repeat(64),reason:'Sửa giá',addonPrices:[{key:'preparation',unitPriceVnd:60000},{key:'preparation',isActive:false}]}).success,false);
});
test('tokens are canonical across input/SQL representation and pricing changes do not change structural approval',()=>{
  const config=offerConfigSchema.parse(input);const stored=row(config);const offered=offerOf(stored);
  assert.equal(offered.structureToken,JSON.parse(encodeOffer(config).terms)._structure_token);
  assert.equal(offered.id,'9007199254740993');assert.equal(digest({a:1,b:2}),digest({b:2,a:1}));
  const repriced={...stored,unit_price_vnd:'180000'};assert.equal(offerOf(repriced).structureToken,offered.structureToken);assert.notEqual(offerOf(repriced).token,offered.token);
  assert.notEqual(structureToken({...config,maxParticipants:8}),offered.structureToken);
  assert.equal(offerUpdateSchema.safeParse({configuration:input,expectedToken:offered.token,reason:'Đổi'}).success,true);
});
test('public offers require an approved snapshot identity and structure; live prices never rewrite stored snapshots',()=>{
  const config=offerConfigSchema.parse(input),stored=row(config),snapshot=snapshotOf(stored),revision={details:{offers_snapshot:[snapshot]}};
  assert.equal(snapshotsOf(revision).length,1);const priced=approvedOffers(revision,[{...stored,unit_price_vnd:'180000'}]);assert.equal(priced[0].unitPriceVnd,180000);assert.equal(snapshot.unitPriceVnd,150000);
  assert.equal(approvedOffers(revision,[{...stored,id:'99'}]).length,0);assert.equal(approvedOffers(revision,[{...stored,name:'Unreviewed text'}]).length,0);assert.equal(approvedOffers(revision,[{...stored,is_active:0}]).length,0);
  assert.equal(approvedOffers(revision,[stored],{pricingType:'PER_TRIP'}).length,0);assert.equal('token' in priced[0],false);assert.equal('structureToken' in priced[0],false);
});
test('service profile fields are typed and prevent operational/ownership input inside revision content',()=>{
  const draft={title:'Bắt cá',categoryId:'1',defaultDurationMinutes:180};assert.equal(serviceProfileSchema.parse(draft).defaultPlaceId,null);
  for(const extra of [{categoryId:'0'},{ownerUserId:'1'},{householdId:'1'},{publishedRevisionId:'1'},{defaultDurationMinutes:0},{defaultDurationMinutes:10081},{details:{price:100}}])assert.equal(serviceProfileSchema.safeParse({...draft,...extra}).success,false);
  assert.equal(serviceSubmitSchema.safeParse({revisionId:'1',version:1}).success,false);assert.equal(serviceSubmitSchema.safeParse({revisionId:'1',version:1,offersToken:'a'.repeat(64)}).success,true);
  assert.equal(publicServiceQuerySchema.safeParse({status:'DRAFT'}).success,false);
});
