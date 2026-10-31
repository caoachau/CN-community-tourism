import { digest, json } from '../services/models.js';
import { iso } from '../calendar/models.js';
import { AppError } from '../shared/errors.js';

export const MAX_VND=999_999_999_999_999n;
export function amount(value){const n=BigInt(value);if(n<0n||n>MAX_VND)throw new AppError('INVALID_REQUEST');return Number(n);}
export const multiply=(price,quantity)=>amount(BigInt(price)*BigInt(quantity));
export const hourlyAmount=(price,minutes)=>amount((BigInt(price)*BigInt(minutes)+30n)/60n);
export const dateOnly=value=>value==null?null:typeof value==='string'?value.slice(0,10):iso(value).slice(0,10);
export function ledgerSummary(entries,totalVnd){
  let received=0,refunded=0,agreed=0;
  for(const e of entries){const n=Number(e.amount_vnd)*(e.reverses_entry_id?-1:1);
    if(e.entry_type==='RECEIPT')received+=n;
    if(e.entry_type==='REFUND')refunded+=n;
    if(['REFUND_AGREEMENT','REFUND_ADJUSTMENT'].includes(e.entry_type))agreed+=n;
  }
  return {receivedVnd:received,refundedVnd:refunded,netReceivedVnd:received-refunded,refundAgreedVnd:agreed,
    refundDueVnd:Math.max(0,agreed-refunded),balanceDueVnd:Math.max(0,totalVnd-received)};
}
export const entryOf=e=>({id:String(e.id),bookingId:String(e.booking_id),householdId:String(e.household_id),type:e.entry_type,amountVnd:Number(e.amount_vnd),
  paymentMethod:e.payment_method,receiptPurpose:e.receipt_purpose,agreementId:e.agreement_id?String(e.agreement_id):null,reversesEntryId:e.reverses_entry_id?String(e.reverses_entry_id):null,
  occurredAt:iso(e.occurred_at),note:e.note,externalReference:e.external_reference,createdAt:iso(e.created_at)});
export const reviewOf=r=>{
  const data={id:String(r.id),bookingId:String(r.booking_id),householdId:String(r.household_id),rating:r.rating,comment:r.comment,hiddenAt:iso(r.hidden_at),hiddenReason:r.hidden_reason,createdAt:iso(r.created_at)};
  return {...data,token:digest(data)};
};
export const itemOf=i=>({id:String(i.id),kind:i.kind,roomId:i.room_id?String(i.room_id):null,serviceId:i.service_id?String(i.service_id):null,offerId:i.offer_id?String(i.offer_id):null,
  slotId:i.slot_id?String(i.slot_id):null,participants:i.participant_count,quantity:Number(i.quantity),pricingType:i.pricing_type,isExclusive:Boolean(i.is_exclusive),
  checkInDate:dateOnly(i.check_in_date),checkOutDate:dateOnly(i.check_out_date),startsAt:iso(i.starts_at),endsAt:iso(i.ends_at),unitPriceVnd:Number(i.unit_price_vnd),
  baseAmountVnd:Number(i.base_amount_vnd),addonsAmountVnd:Number(i.addons_amount_vnd),totalVnd:Number(i.total_vnd),snapshot:json(i.snapshot),addons:json(i.addons_snapshot),outcome:i.outcome});
export const cancellationOf=r=>({id:String(r.id),status:r.status,reason:r.message,createdAt:iso(r.created_at),closedAt:iso(r.closed_at),closedReason:r.closed_reason,resolutionCode:r.resolution_code});
export const notificationOf=r=>({id:String(r.id),type:r.event_type,title:r.title,body:r.body,navigation:json(r.navigation),createdAt:iso(r.created_at),readAt:iso(r.read_at)});
export function bookingOf(row,entries=[],review=null,cancellations=[]){
  const pending=['PENDING','CONFIRMED'].includes(row.status)?cancellations.find(r=>r.status==='OPEN'):null;
  const data={id:String(row.id),code:row.booking_code,householdId:String(row.household_id),customerId:row.customer_user_id?String(row.customer_user_id):null,
    status:row.status,displayStatus:pending?'CANCEL_REQUESTED':row.status,pendingCancellation:pending?cancellationOf(pending):null,source:row.source,contact:{name:row.contact_name,phone:row.contact_phone,email:row.contact_email},totalVnd:Number(row.total_vnd),
    firstStartsAt:iso(row.first_starts_at),lastEndsAt:iso(row.last_ends_at),holdExpiresAt:iso(row.hold_expires_at),confirmedAt:iso(row.confirmed_at),closedAt:iso(row.closed_at),
    closedReason:row.closed_reason,createdAt:iso(row.created_at),summary:ledgerSummary(entries,Number(row.total_vnd))};
  if(['CANCELLED','REJECTED','EXPIRED','NO_SHOW','INTERRUPTED'].includes(row.status))data.summary.balanceDueVnd=0;
  return {...data,token:digest({...data,currentSetId:String(row.current_reservation_set_id),cancellations:cancellations.map(cancellationOf),entries:entries.map(e=>String(e.id)),review:review?reviewOf(review):null})};
}
