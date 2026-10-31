import {test} from 'node:test';
import assert from 'node:assert/strict';
import {holdWindow} from '../src/bookings/hold-policy.js';

test('hold deadline is the earlier of 24 hours or two hours before the earliest use',()=>{
  const at='2035-01-01T00:00:00.123Z';
  assert.equal(holdWindow(at,'2035-01-05T00:00:00Z').holdExpiresAt,'2035-01-02T00:00:00.123Z');
  assert.equal(holdWindow(at,'2035-01-01T10:00:00+07:00').holdExpiresAt,'2035-01-01T01:00:00.000Z');
});
test('exactly 30 minutes is allowed; 29:59 and an elapsed deadline are not',()=>{
  assert.equal(holdWindow('2035-01-01T00:00:00Z','2035-01-01T02:30:00Z').canHold,true);
  assert.equal(holdWindow('2035-01-01T00:00:01Z','2035-01-01T02:30:00Z').canHold,false);
  assert.equal(holdWindow('2035-01-01T00:30:00Z','2035-01-01T02:30:00Z').canHold,false);
});
test('retry and a later replacement cannot move the original hold deadline forward',()=>{
  const options={firstHeldAt:'2035-01-01T00:00:00Z',previousDeadline:'2035-01-01T05:00:00Z',oldFirstUse:'2035-01-01T07:00:00Z'};
  assert.equal(holdWindow('2035-01-01T01:00:00Z','2035-01-03T00:00:00Z',options).holdExpiresAt,'2035-01-01T05:00:00.000Z');
  assert.equal(holdWindow('2035-01-01T01:00:00Z','2035-01-01T05:00:00Z',options).holdExpiresAt,'2035-01-01T03:00:00.000Z');
});
