import assert from 'node:assert/strict';
import {test} from 'node:test';
import {peakQuantity,overlaps,offerAvailability} from '../src/calendar/models.js';
import {instant,slotCreateSchema,blockCreateSchema,slotQuerySchema,roomAvailabilitySchema} from '../src/calendar/schemas.js';

test('calendar time validation requires valid dates, explicit offsets and bounded ranges',()=>{
  for(const value of ['2035-02-30T10:00:00Z','2035-01-01T10:00:00','2035-01-01T10:00:00.123Z','2100-01-01T10:00:00Z'])assert.equal(instant.safeParse(value).success,false);
  for(const value of ['2035-01-01T10:00:00+07:00','2035-01-01T03:00:00.000Z'])assert.equal(instant.safeParse(value).success,true);
  assert.equal(slotQuerySchema.safeParse({from:'2035-01-01T00:00:00Z',to:'2036-01-01T00:00:00Z'}).success,false);
  assert.equal(roomAvailabilitySchema.safeParse({checkInDate:'2035-01-01',checkOutDate:'2035-01-01'}).success,false);
});
test('capacity sweep counts simultaneous allocations, includes indefinite blocks and releases before arrivals',()=>{
  const interval=(from,to,quantity)=>({startsAt:`2035-01-01T${from}:00Z`,endsAt:to?`2035-01-01T${to}:00Z`:null,quantity});
  const rows=[interval('07:00','08:00',3),interval('08:00','09:00',3)];
  assert.equal(peakQuantity(rows),3);
  assert.equal(peakQuantity([...rows,interval('07:30','08:30',2)]),5);
  assert.equal(peakQuantity([...rows,interval('06:00',null,1)]),4);
  assert.equal(overlaps(rows[0],rows[1]),false);
  assert.equal(peakQuantity([...rows,interval('06:00',null,1)],interval('09:00','10:00',1)),1);
});
test('slot and block schemas reject conflicting modes, duplicates and forged fields',()=>{
  const slot={serviceId:'1',startsAt:'2035-01-01T07:00:00Z',endsAt:'2035-01-01T09:00:00Z',personCapacity:10};
  for(const extra of [{householdId:'2'},{salesStatus:'OPEN',readinessStatus:'UNAVAILABLE'},{salesStatus:'OPEN',visibility:'PRIVATE',readinessStatus:'CONFIRMED'},
    {offers:[{offerId:'1'},{offerId:'1'}]},{endsAt:slot.startsAt},{personCapacity:0}])assert.equal(slotCreateSchema.safeParse({...slot,...extra}).success,false);
  for(const extra of [{roomId:'1',resourceId:'2',quantity:1},{roomId:'1',quantity:2},{quantity:1}])assert.equal(blockCreateSchema.safeParse({startsAt:slot.startsAt,endsAt:null,reason:'Bảo trì',...extra}).success,false);
});
test('shared and exclusive offers account for held people and resource quotas independently',()=>{
  const offer={id:'1',pricingType:'PER_PERSON',participationMode:'SHARED',minParticipants:1,maxParticipants:10};
  const slot={person_capacity:10},items=[{participant_count:6,is_exclusive:0}],assignment=[{id:'2',quantity:4}],rules=[{offer_id:'1',assignment_id:'2',usage_basis:'PER_PERSON',units_required:1}];
  assert.equal(offerAvailability(offer,slot,items,assignment,rules,[{assignment_id:'2',quantity:3}],2,1).available,false);
  assert.equal(offerAvailability(offer,slot,items,assignment,rules,[{assignment_id:'2',quantity:3}],1,1).available,true);
  assert.equal(offerAvailability({...offer,participationMode:'EXCLUSIVE'},slot,items,[],[],[],1,1).available,false);
  assert.equal(offerAvailability(offer,slot,[{participant_count:1,is_exclusive:1}],[],[],[],1,1).available,false);
  const perUnit={...offer,pricingType:'PER_UNIT',maxUnits:10,participantsPerUnit:2};
  const limited=offerAvailability(perUnit,slot,[],[{id:'2',quantity:2}],[{offer_id:'1',assignment_id:'2',usage_basis:'PER_UNIT',units_required:1,max_people_per_unit:1}],[],2,2);
  assert.equal(limited.remainingCapacity,2);assert.equal(limited.available,true);
});
