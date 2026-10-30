import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cart,hold,entry } from '../src/bookings/schemas.js';
import { hourlyAmount,multiply,ledgerSummary } from '../src/bookings/models.js';

test('booking inputs reject duplicate rooms/slots, invalid dates and client supplied prices',()=>{
  const room={kind:'ROOM',roomId:'1',checkInDate:'2035-11-01',checkOutDate:'2035-11-03',participants:2};
  assert.equal(cart.safeParse({householdId:'1',items:[room]}).success,true);
  for(const items of [[room,room],[{...room,checkOutDate:'2035-11-01'}],[{...room,checkInDate:'2035-02-30'}],[{...room,totalVnd:1}]])assert.equal(cart.safeParse({householdId:'1',items}).success,false);
  assert.equal(hold.safeParse({householdId:'1',items:[room],contact:{name:'Khách',phone:'0901234567'},expectedQuoteToken:'a'.repeat(64),idempotencyKey:'test_hold_123456789'}).success,true);
});
test('VND arithmetic rounds hours using exact integers and rejects overflow',()=>{
  assert.equal(hourlyAmount(100001,90),150002);assert.equal(hourlyAmount(1,30),1);
  assert.equal(multiply(999999999999999,1),999999999999999);
  assert.throws(()=>multiply(999999999999999,2),{code:'INVALID_REQUEST'});
});
test('ledger keeps noncash obligations separate and handles cash reversals',()=>{
  const rows=[{entry_type:'RECEIPT',amount_vnd:'500000'},{entry_type:'REFUND_AGREEMENT',amount_vnd:'200000'},{entry_type:'REFUND',amount_vnd:'100000'},
    {entry_type:'REFUND',amount_vnd:'100000',reverses_entry_id:'3'}];
  assert.deepEqual(ledgerSummary(rows,600000),{receivedVnd:500000,refundedVnd:0,netReceivedVnd:500000,refundAgreedVnd:200000,refundDueVnd:200000,balanceDueVnd:100000});
});
test('financial input enforces receipt purpose, refund agreement and method pairing',()=>{
  const base={expectedToken:'a'.repeat(64),idempotencyKey:'test_money_12345678',amountVnd:10000,occurredAt:'2035-01-01T00:00:00Z',note:'Ghi nhận khoản tiền'};
  assert.equal(entry.safeParse({...base,type:'RECEIPT',paymentMethod:'CASH',receiptPurpose:'DEPOSIT'}).success,true);
  assert.equal(entry.safeParse({...base,type:'RECEIPT',paymentMethod:'CASH'}).success,false);
  assert.equal(entry.safeParse({...base,type:'REFUND_AGREEMENT'}).success,true);
  assert.equal(entry.safeParse({...base,type:'REFUND_AGREEMENT',paymentMethod:'CASH'}).success,false);
  assert.equal(entry.safeParse({...base,type:'REFUND',paymentMethod:'CASH',agreementId:'1'}).success,true);
  assert.equal(entry.safeParse({...base,type:'REFUND_ADJUSTMENT',amountVnd:-1000,agreementId:'1',occurredAt:'2035-01-01T00:00:00.000Z'}).success,true);
});
