import { AppError } from '../shared/errors.js';
import { lockCurrentActor } from '../auth/transaction.js';
import { databaseIdSchema } from '../shared/validation.js';
import { digest, json } from '../services/models.js';
import { iso } from '../calendar/models.js';
import { createAvailabilityService } from './availability-service.js';
import { bookingOf, itemOf, entryOf, reviewOf, ledgerSummary, cancellationOf } from './models.js';
import { holdWindow } from './hold-policy.js';
import { cancellationMethods } from './cancellation-service.js';
import * as schemas from './schemas.js';

const parse=(schema,value)=>{const result=schema.safeParse(value);if(!result.success)throw new AppError('INVALID_REQUEST');return result.data;};
const query=(schema,input)=>{try{return schemas.query(schema,input);}catch{throw new AppError('INVALID_REQUEST');}};
const match=(a,b)=>{if(a!==b)throw new AppError('STALE_VERSION');};
const page=(items,total,input)=>({items,total,page:input.page,pageSize:input.pageSize});
const activeOwner=u=>u&&u.role==='HOUSEHOLD'&&u.status==='ACTIVE'&&!u.disabled_at;

export function createBookingService({repository,availabilityService=createAvailabilityService()}){
  async function context(tx,auth,target,{acquire=false}={}){
    if(!target)throw new AppError('NOT_FOUND');
    const {actor,users}=await lockCurrentActor(tx,auth,acquire?['CUSTOMER','HOUSEHOLD']:['CUSTOMER','HOUSEHOLD','ADMIN'],[target.owner_user_id,target.customer_user_id].filter(Boolean).map(String));
    const household=await tx.household(target.household_id??target.id,true);
    if(!household||String(household.owner_user_id)!==String(target.owner_user_id))throw new AppError('NOT_FOUND');
    if(acquire&&(!activeOwner(users.get(String(target.owner_user_id)))||actor.id===String(target.owner_user_id)))throw new AppError('FORBIDDEN');
    return {actor,household,at:(await tx.databaseNow()).now_at};
  }
  async function bookingContext(tx,auth,bookingId){
    parse(databaseIdSchema,bookingId);const state=await context(tx,auth,await tx.bookingTarget(bookingId));
    const row=await tx.booking(bookingId,state.household.id);
    const owner=state.actor.role==='HOUSEHOLD'&&String(state.household.owner_user_id)===state.actor.id;
    const customer=String(row?.customer_user_id)===state.actor.id;
    if(!row||(!owner&&!customer&&state.actor.role!=='ADMIN'))throw new AppError('FORBIDDEN');
    return {...state,row,owner,customer};
  }
  async function audit(tx,state,action,requestId,before,after,reason=null,entityType='BOOKING',entityId=state.row?.id){
    if(typeof requestId!=='string'||!requestId||requestId.length>100)throw new AppError('INVALID_REQUEST');
    await tx.event({householdId:state.household.id,actor:state.actor,entityType,entityId,action,requestId,reason,before:before??null,after:after??null});
  }
  async function notify(tx,row,key,type,title,body){
    const target=await tx.householdTarget(row.household_id);
    await tx.notifyBooking(target.owner_user_id,row,key,type,title,body,'host');
    if(row.customer_user_id)await tx.notifyBooking(row.customer_user_id,row,key,type,title,body,'customer');
  }
  async function expire(tx,row,at){
    if(row.status!=='PENDING')return false;
    const set=await tx.bookingSet(row.current_reservation_set_id);
    if(+row.hold_expires_at>+at&&set?.status==='HELD'&&!set.released_at&&+set.expires_at>+at)return false;
    await tx.transition(row,'EXPIRED','Hết thời hạn giữ chỗ',at);
    await tx.history(row.household_id,row.id,'PENDING','EXPIRED',null,'SYSTEM','Hết thời hạn giữ chỗ');
    for(const request of await tx.cancellations(row.id))if(request.status==='OPEN')await tx.closeCancellation(request.id,'CLOSED','Hết thời hạn giữ chỗ','HOLD_EXPIRED',null,at);
    await tx.closeBookingChanges(row.id,at,'Hết thời hạn giữ chỗ','HOLD_EXPIRED');
    await notify(tx,row,`booking:${row.id}:EXPIRED`,'BOOKING_EXPIRED','Booking đã hết hạn giữ chỗ','Hộ chưa xác nhận trong thời hạn. Chỗ đã được giải phóng.');
    row.status='EXPIRED';row.closed_at=at;row.closed_reason='Hết thời hạn giữ chỗ';return true;
  }
  async function detail(tx,row,state){
    const entries=await tx.entries(row.id),review=await tx.bookingReview(row.id),cancellations=await tx.cancellations(row.id);
    const booking=bookingOf(row,entries,review,cancellations),at=(await tx.databaseNow()).now_at;
    const owner=state?.actor.role==='HOUSEHOLD'&&String(state.household.owner_user_id)===state.actor.id;
    const customer=String(row.customer_user_id)===state?.actor.id,live=['PENDING','CONFIRMED'].includes(row.status),future=+at<+row.first_starts_at;
    const allowedActions=[];
    if(live){
      if(booking.pendingCancellation){
        if(customer&&future)allowedActions.push('withdrawCancellation');
        if(owner&&!await tx.hasServiceActivity(row.current_reservation_set_id))allowedActions.push('confirmCancellation');
      }else{
        if(future&&!await tx.hasServiceActivity(row.current_reservation_set_id)){
          if(customer)allowedActions.push('requestCancellation');
          if(owner)allowedActions.push('cancel');
        }
        if(owner&&row.status==='PENDING'&&+at<+row.hold_expires_at){
          allowedActions.push('reject');
          if(future&&!state.household.archived_at&&state.household.approval_status==='APPROVED')allowedActions.push('confirm');
        }
        if(owner&&row.status==='CONFIRMED'&&+at>=+row.last_ends_at)allowedActions.push('complete');
      }
    }
    return {booking,allowedActions,cancellations:cancellations.map(cancellationOf),serverNow:iso(at),items:(await tx.bookingItems(row.current_reservation_set_id)).map(itemOf),entries:entries.map(entryOf),review:review?reviewOf(review):null,
      terms:json(row.terms_snapshot)?.contract??{},history:(await tx.histories(row.id)).map(h=>({from:h.from_status,to:h.to_status,actorType:h.actor_type,reason:h.reason,createdAt:iso(h.created_at)}))};
  }
  async function scope(tx,auth,adminOnly=false,audience='host'){
    const {actor}=await lockCurrentActor(tx,auth,adminOnly?['ADMIN']:['CUSTOMER','HOUSEHOLD','ADMIN']);
    if(actor.role==='ADMIN')return {actor,filter:{}};
    if(actor.role==='CUSTOMER'||audience==='customer')return {actor,filter:{customerId:actor.id}};
    const found=await tx.ownedHousehold(actor.id);if(!found)throw new AppError('FORBIDDEN');
    const household=await tx.household(found.id,true);return {actor,household,filter:{householdId:String(household.id)}};
  }
  const moneyRequest=(kind,input)=>digest({kind,input});
  function existingEntry(entries,input,requestDigest){
    const found=entries.find(e=>json(e.evidence)?.idempotencyKey===input.idempotencyKey);
    if(found&&json(found.evidence).requestDigest!==requestDigest)throw new AppError('IDEMPOTENCY_CONFLICT');
    return found;
  }
  function validateBalances(entries,total){
    const summary=ledgerSummary(entries,total);
    if(summary.receivedVnd<0||summary.refundedVnd<0||summary.refundAgreedVnd<0||summary.refundedVnd>summary.receivedVnd||summary.receivedVnd>total||summary.refundAgreedVnd>summary.receivedVnd||summary.refundedVnd>summary.refundAgreedVnd)throw new AppError('FINANCIAL_CONFLICT');
    for(const agreement of entries.filter(e=>e.entry_type==='REFUND_AGREEMENT')){
      const related=entries.filter(e=>String(e.agreement_id)===String(agreement.id));
      const allowed=Number(agreement.amount_vnd)+related.filter(e=>e.entry_type==='REFUND_ADJUSTMENT').reduce((s,e)=>s+Number(e.amount_vnd),0);
      const paid=related.filter(e=>e.entry_type==='REFUND').reduce((s,e)=>s+Number(e.amount_vnd)*(e.reverses_entry_id?-1:1),0);
      if(allowed<0||paid<0||paid>allowed)throw new AppError('FINANCIAL_CONFLICT');
    }
  }
  return {
    ...cancellationMethods({repository,parse,query,bookingContext,detail,expire,audit,notify}),
    async quote(auth,input){input=parse(schemas.cart,input);return repository.transaction(async tx=>{
      const state=await context(tx,auth,await tx.householdTarget(input.householdId),{acquire:true});
      const quote=await availabilityService.quote(tx,state.household,input,state.at);
      return {quote:{...quote,...holdWindow(state.at,quote.firstStartsAt)}};
    });},
    async hold(auth,input,requestId){input=parse(schemas.hold,input);return repository.transaction(async tx=>{
      const state=await context(tx,auth,await tx.householdTarget(input.householdId),{acquire:true});
      const code=`BK-${digest({customerId:state.actor.id,key:input.idempotencyKey}).slice(0,32)}`,requestDigest=digest(input),existing=await tx.bookingByCode(code);
      if(existing){
        if(String(existing.customer_user_id)!==state.actor.id||json(existing.terms_snapshot)?.requestDigest!==requestDigest)throw new AppError('IDEMPOTENCY_CONFLICT');
        await expire(tx,existing,state.at);return {...await detail(tx,await tx.booking(existing.id,state.household.id),state),replayed:true};
      }
      if(await tx.pendingCount(state.actor.id)>=5)throw new AppError('HOLD_LIMIT');
      const quote=await availabilityService.quote(tx,state.household,input,state.at);
      if(quote.token!==input.expectedQuoteToken)throw new AppError('QUOTE_CHANGED');
      const window=holdWindow(state.at,quote.firstStartsAt);
      if(!window.canHold)throw new AppError('HOLD_WINDOW_TOO_SHORT');
      const expiresAt=new Date(window.holdExpiresAt);
      const contract={householdTitle:quote.householdTitle,timeZone:quote.timeZone,confirmation:'Chờ hộ xác nhận trước khi hết hạn giữ chỗ',holdPolicyVersion:window.holdPolicyVersion,hold:'Tối đa 24 giờ, hết hạn trước giờ sử dụng 2 giờ, cần ít nhất 30 phút phản hồi.',cancellation:'Khách gửi hủy trước giờ bắt đầu. Chỗ được giữ đến khi hộ xác nhận hủy; đơn chưa xác nhận vẫn hết hạn theo hạn cũ. Thu/hoàn tiền ghi riêng.'};
      const bookingId=await tx.createBooking({household_id:state.household.id,booking_code:code,customer_user_id:state.actor.id,created_by:state.actor.id,source:'ONLINE',status:'PENDING',
        contact_name:input.contact.name,contact_phone:input.contact.phone,contact_email:input.contact.email,first_starts_at:new Date(quote.firstStartsAt),last_ends_at:new Date(quote.lastEndsAt),total_vnd:quote.totalVnd,
        terms_snapshot:JSON.stringify({contract,requestDigest}),hold_expires_at:expiresAt});
      const setId=await tx.createSet({household_id:state.household.id,booking_id:bookingId,status:'HELD',hold_started_at:state.at,expires_at:expiresAt,total_vnd:quote.totalVnd,
        terms_snapshot:JSON.stringify(contract),first_starts_at:new Date(quote.firstStartsAt),last_ends_at:new Date(quote.lastEndsAt)});
      await tx.setCurrent(bookingId,setId);
      for(const i of quote.items){
        const itemId=await tx.createItem({household_id:state.household.id,reservation_set_id:setId,kind:i.kind,room_id:i.roomId,service_id:i.serviceId,offer_id:i.offerId,slot_id:i.slotId,
          participant_count:i.participants,quantity:i.quantity,pricing_type:i.pricingType,is_exclusive:Number(i.isExclusive),check_in_date:i.checkInDate,check_out_date:i.checkOutDate,
          starts_at:new Date(i.startsAt),ends_at:new Date(i.endsAt),occupied_starts_at:new Date(i.startsAt),occupied_ends_at:new Date(i.endsAt),unit_price_vnd:i.unitPriceVnd,
          base_amount_vnd:i.baseAmountVnd,addons_amount_vnd:i.addonsAmountVnd,snapshot:JSON.stringify(i.snapshot),addons_snapshot:JSON.stringify(i.addons)});
        for(const usage of i.usages)await tx.createUsage({household_id:state.household.id,slot_id:i.slotId,item_id:itemId,assignment_id:usage.assignmentId,quantity:usage.quantity,rule_snapshot:JSON.stringify(usage.snapshot)});
      }
      await tx.history(state.household.id,bookingId,null,'PENDING',state.actor.id,'CUSTOMER','Khách gửi yêu cầu giữ chỗ');
      state.row=await tx.booking(bookingId,state.household.id);await audit(tx,state,'BOOKING_HELD',requestId,null,{status:'PENDING',totalVnd:quote.totalVnd});
      await notify(tx,state.row,`booking:${bookingId}:PENDING`,'BOOKING_HELD','Có yêu cầu đặt chỗ mới','Vui lòng xử lý trước thời hạn giữ chỗ ghi trên booking.');
      return {...await detail(tx,state.row,state),replayed:false};
    });},
    async get(auth,bookingId){return repository.transaction(async tx=>{const state=await bookingContext(tx,auth,bookingId);await expire(tx,state.row,state.at);return detail(tx,await tx.booking(bookingId,state.household.id),state);});},
    async list(auth,input,{adminOnly=false,audience='customer'}={}){input=query(schemas.list,input);return repository.transaction(async tx=>{
      const state=await scope(tx,auth,adminOnly,audience),result=await tx.listBookings(state.filter,input);
      // Expiry is evaluated at reads as well as by the worker. List filters are
      // refreshed by the worker; individual rows always carry an effective state.
      const at=(await tx.databaseNow()).now_at;
      const items=[];for(const row of result.rows)items.push(bookingOf(row.status==='PENDING'&&+row.hold_expires_at<=+at?{...row,status:'EXPIRED'}:row,await tx.entries(row.id,false),await tx.bookingReview(row.id,false),await tx.cancellations(row.id,false)));
      return page(items,result.total,input);
    });},
    async transition(auth,bookingId,action,input,requestId){
      input=parse(schemas.command,input);
      const result=await repository.transaction(async tx=>{
        const state=await bookingContext(tx,auth,bookingId),{row}=state;
        if(state.actor.role==='ADMIN')throw new AppError('FORBIDDEN');
        if(action==='cancel'&&!state.owner)throw new AppError('CANCELLATION_REQUEST_REQUIRED');
        if(await expire(tx,row,state.at))return {error:'HOLD_EXPIRED'};
        const before=(await detail(tx,row,state)).booking;match(before.token,input.expectedToken);
        if(before.pendingCancellation)throw new AppError('CANCELLATION_PENDING');
        const next={confirm:'CONFIRMED',reject:'REJECTED',cancel:'CANCELLED',complete:'COMPLETED'}[action];
        if(!next)throw new AppError('INVALID_REQUEST');
        if(action==='cancel'){
          if(!['PENDING','CONFIRMED'].includes(row.status)||+state.at>=+row.first_starts_at||!state.owner)throw new AppError('INVALID_STATE');
        }else if(!state.owner)throw new AppError('FORBIDDEN');
        else if(action==='confirm'){
          if(row.status!=='PENDING'||state.household.archived_at||state.household.approval_status!=='APPROVED'||+state.at>=+row.first_starts_at)throw new AppError('INVALID_STATE');
          const set=await tx.bookingSet(row.current_reservation_set_id);
          if(set?.status!=='HELD'||set.released_at||+set.expires_at<=+state.at)return {error:'HOLD_EXPIRED'};
        }else if(action==='reject'&&row.status!=='PENDING')throw new AppError('INVALID_STATE');
        else if(action==='complete'&&(row.status!=='CONFIRMED'||+state.at<+row.last_ends_at))throw new AppError('INVALID_STATE');
        if(action==='cancel'&&await tx.hasServiceActivity(row.current_reservation_set_id))throw new AppError('SERVICE_ALREADY_STARTED');
        if(action==='complete')await tx.markServed(row.current_reservation_set_id,state.actor.id,state.at);
        await tx.transition(row,next,input.reason,state.at);
        await tx.history(row.household_id,row.id,row.status,next,state.actor.id,state.owner?'HOUSEHOLD':'CUSTOMER',input.reason);
        const after=await detail(tx,await tx.booking(row.id,row.household_id),state);await audit(tx,state,`BOOKING_${next}`,requestId,before,after.booking,input.reason);
        if(['cancel','reject'].includes(action))await tx.closeBookingChanges(row.id,state.at,input.reason,`BOOKING_${next}`);
        await notify(tx,row,`booking:${row.id}:${next}`,`BOOKING_${next}`,{CONFIRMED:'Booking đã được xác nhận',REJECTED:'Hộ dân đã từ chối booking',CANCELLED:'Hộ dân đã hủy booking',COMPLETED:'Booking đã hoàn thành'}[next],input.reason);
        return after;
      });
      if(result.error)throw new AppError(result.error);return result;
    },
    async addEntry(auth,bookingId,input,requestId){input=parse(schemas.entry,input);return repository.transaction(async tx=>{
      const state=await bookingContext(tx,auth,bookingId);if(!state.owner)throw new AppError('FORBIDDEN');
      const entries=await tx.entries(bookingId),review=await tx.bookingReview(bookingId),before=bookingOf(state.row,entries,review,await tx.cancellations(bookingId)),requestDigest=moneyRequest('entry',input);
      const existing=existingEntry(entries,input,requestDigest);if(existing)return {...await detail(tx,state.row,state),entry:entryOf(existing),replayed:true};
      match(before.token,input.expectedToken);
      if(Date.parse(input.occurredAt)>+state.at+60000||Date.parse(input.occurredAt)<+state.row.created_at-1000)throw new AppError('INVALID_REQUEST');
      if(input.type==='RECEIPT'&&!['CONFIRMED','COMPLETED'].includes(state.row.status))throw new AppError('INVALID_STATE');
      if(['PENDING','REJECTED','EXPIRED'].includes(state.row.status))throw new AppError('INVALID_STATE');
      if(['REFUND','REFUND_ADJUSTMENT'].includes(input.type)&&!entries.some(e=>String(e.id)===input.agreementId&&e.entry_type==='REFUND_AGREEMENT'))throw new AppError('FINANCIAL_CONFLICT');
      const data={household_id:state.household.id,booking_id:bookingId,entry_type:input.type,receipt_purpose:input.receiptPurpose,amount_vnd:input.amountVnd,payment_method:input.paymentMethod,
        occurred_at:new Date(input.occurredAt),recorded_by:state.actor.id,agreement_id:input.agreementId,note:input.note,external_reference:input.externalReference,
        evidence:JSON.stringify({idempotencyKey:input.idempotencyKey,requestDigest})};
      validateBalances([...entries,{...data,id:'new'}],Number(state.row.total_vnd));
      const entryId=await tx.createEntry(data);await audit(tx,state,'FINANCIAL_ENTRY_RECORDED',requestId,null,{entryId,type:input.type,amountVnd:input.amountVnd},input.note,'FINANCIAL_ENTRY',entryId);
      const after=await detail(tx,state.row,state);return {...after,entry:after.entries.find(e=>e.id===entryId),replayed:false};
    });},
    async reverseEntry(auth,bookingId,entryId,input,requestId){parse(databaseIdSchema,entryId);input=parse(schemas.reversal,input);return repository.transaction(async tx=>{
      const state=await bookingContext(tx,auth,bookingId);if(!state.owner)throw new AppError('FORBIDDEN');
      const entries=await tx.entries(bookingId),review=await tx.bookingReview(bookingId),requestDigest=moneyRequest(`reverse-${entryId}`,input),existing=existingEntry(entries,input,requestDigest);
      if(existing)return {...await detail(tx,state.row,state),entry:entryOf(existing),replayed:true};
      match(bookingOf(state.row,entries,review,await tx.cancellations(bookingId)).token,input.expectedToken);
      const original=entries.find(e=>String(e.id)===entryId);
      if(!original||original.reverses_entry_id||!['RECEIPT','REFUND'].includes(original.entry_type)||entries.some(e=>String(e.reverses_entry_id)===entryId))throw new AppError('FINANCIAL_CONFLICT');
      if(Date.parse(input.occurredAt)>+state.at+60000||Date.parse(input.occurredAt)<+original.occurred_at)throw new AppError('INVALID_REQUEST');
      const data={household_id:state.household.id,booking_id:bookingId,entry_type:original.entry_type,receipt_purpose:original.receipt_purpose,amount_vnd:original.amount_vnd,
        payment_method:original.payment_method,occurred_at:new Date(input.occurredAt),recorded_by:state.actor.id,agreement_id:original.agreement_id,reverses_entry_id:entryId,note:input.note,
        evidence:JSON.stringify({idempotencyKey:input.idempotencyKey,requestDigest})};
      validateBalances([...entries,data],Number(state.row.total_vnd));const id=await tx.createEntry(data);
      await audit(tx,state,'FINANCIAL_ENTRY_REVERSED',requestId,{entryId},{reversalId:id},input.note,'FINANCIAL_ENTRY',id);
      const after=await detail(tx,state.row,state);return {...after,entry:after.entries.find(e=>e.id===id),replayed:false};
    });},
    async ledger(auth,input,{adminOnly=false}={}){input=query(schemas.ledgerList,input);return repository.transaction(async tx=>{
      const state=await scope(tx,auth,adminOnly);if(state.actor.role==='CUSTOMER')throw new AppError('FORBIDDEN');
      if(state.filter.householdId&&input.householdId&&state.filter.householdId!==input.householdId)throw new AppError('FORBIDDEN');
      const result=await tx.listEntries(state.filter,input);return page(result.rows.map(entryOf),result.total,input);
    });},
    async review(auth,bookingId,input,requestId){input=parse(schemas.review,input);return repository.transaction(async tx=>{
      const state=await bookingContext(tx,auth,bookingId);if(!state.customer)throw new AppError('FORBIDDEN');
      if(state.row.status!=='COMPLETED')throw new AppError('INVALID_STATE');
      const existing=await tx.bookingReview(bookingId);
      if(existing){if(existing.rating!==input.rating||existing.comment!==input.comment)throw new AppError('REVIEW_ALREADY_EXISTS');return {review:reviewOf(existing),replayed:true};}
      const id=await tx.createReview({household_id:state.household.id,booking_id:bookingId,customer_user_id:state.actor.id,rating:input.rating,comment:input.comment});
      await audit(tx,state,'REVIEW_CREATED',requestId,null,{rating:input.rating},null,'REVIEW',id);
      return {review:reviewOf(await tx.bookingReview(bookingId)),replayed:false};
    });},
    async reviews(auth,input){input=query(schemas.reviewList,input);return repository.transaction(async tx=>{
      if(auth)await lockCurrentActor(tx,auth,['ADMIN']);else if(!input.householdId)throw new AppError('INVALID_REQUEST');
      const result=await tx.listReviews(input,!auth);
      const items=result.rows.map(row=>auth?reviewOf(row):{id:String(row.id),rating:row.rating,comment:row.comment,createdAt:iso(row.created_at)});
      return {...page(items,result.total,input),averageRating:result.averageRating};
    });},
    async moderateReview(auth,reviewId,input,requestId){parse(databaseIdSchema,reviewId);input=parse(schemas.moderate,input);return repository.transaction(async tx=>{
      const target=await tx.reviewTarget(reviewId),state=await context(tx,auth,target);if(state.actor.role!=='ADMIN')throw new AppError('FORBIDDEN');
      const row=await tx.bookingReview(target.booking_id),before=reviewOf(row);match(before.token,input.expectedToken);
      await tx.moderate(reviewId,input.hidden,state.actor.id,input.reason);const review=reviewOf(await tx.bookingReview(target.booking_id));
      await audit(tx,state,'REVIEW_MODERATED',requestId,before,review,input.reason,'REVIEW',reviewId);return {review};
    });},
    async expireHolds(){
      const targets=await repository.transaction(tx=>tx.expiryTargets());let count=0;
      for(const target of targets)count+=await repository.transaction(async tx=>{
        const ids=[...new Set([target.owner_user_id,target.customer_user_id].filter(Boolean).map(String))].sort((a,b)=>BigInt(a)<BigInt(b)?-1:1);
        for(const id of ids)await tx.findUserById(id,true);
        await tx.household(target.household_id,true);const at=(await tx.databaseNow()).now_at;
        const row=await tx.booking(target.booking_id,target.household_id);
        return row&&await expire(tx,row,at)?1:0;
      });return {expired:count};
    },
  };
}

export function startBookingExpiry(service,logger,{intervalMs=30000}={}){
  let running=null,stopped=false;
  const sweep=()=>{if(stopped||running)return;running=service.expireHolds().catch(()=>logger.error({event:'booking_expiry_failed'},'Booking expiry failed')).finally(()=>{running=null;});};
  const timer=setInterval(sweep,intervalMs);timer.unref();sweep();
  return async()=>{stopped=true;clearInterval(timer);await running;};
}
