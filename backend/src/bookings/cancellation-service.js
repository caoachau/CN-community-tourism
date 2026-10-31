import { randomUUID } from 'node:crypto';
import { AppError } from '../shared/errors.js';
import { digest, json } from '../services/models.js';
import { databaseIdSchema } from '../shared/validation.js';
import { cancellation, notificationList } from './schemas.js';
import { notificationOf } from './models.js';
import { lockCurrentActor } from '../auth/transaction.js';

export function cancellationMethods({repository,parse,query,bookingContext,detail,expire,audit,notify}) {
  return {
    async cancellation(auth,bookingId,action,requestId,input,correlationId){
      input=parse(cancellation,input);
      if(requestId)parse(databaseIdSchema,requestId);
      if(!['request','withdraw','confirm'].includes(action))throw new AppError('INVALID_REQUEST');
      const result=await repository.transaction(async tx=>{
        const state=await bookingContext(tx,auth,bookingId),{row}=state;
        if(state.actor.role==='ADMIN'||(action==='confirm'?!state.owner:!state.customer))throw new AppError('FORBIDDEN');
        const operation=`booking-cancellation-${action}`,hash=digest({bookingId,requestId:requestId??null,input});
        const replay=await tx.idempotency(state.actor.id,operation,input.idempotencyKey);
        if(replay){
          if(replay.request_hash.toLowerCase()!==hash)throw new AppError('IDEMPOTENCY_CONFLICT');
          return {...json(replay.response_body),replayed:true};
        }
        // Commit expiry even when the attempted command must return an error.
        if(await expire(tx,row,state.at))return {error:'HOLD_EXPIRED'};
        const before=await detail(tx,row,state);
        if(before.booking.token!==input.expectedToken)throw new AppError('STALE_VERSION');
        if(!['PENDING','CONFIRMED'].includes(row.status))throw new AppError('INVALID_STATE');
        const pending=before.booking.pendingCancellation;
        let cancellationId;
        if(action==='request'){
          if(pending)throw new AppError('CANCELLATION_PENDING');
          if(+state.at>=+row.first_starts_at)throw new AppError('INVALID_STATE');
          if(await tx.hasServiceActivity(row.current_reservation_set_id))throw new AppError('SERVICE_ALREADY_STARTED');
          await tx.closeBookingChanges(row.id,state.at,'Khách đã gửi yêu cầu hủy booking');
          cancellationId=await tx.createCancellation(row,state.actor,input.reason,state.at,`CR-${randomUUID()}`);
        }else{
          if(!pending||pending.id!==requestId)throw new AppError('INVALID_STATE');
          const request=(await tx.cancellations(row.id)).find(r=>String(r.id)===requestId);
          if(String(request.base_reservation_set_id)!==String(row.current_reservation_set_id))throw new AppError('STALE_VERSION');
          if(action==='withdraw'&&+state.at>=+row.first_starts_at)throw new AppError('INVALID_STATE');
          if(action==='confirm'){
            if(+request.created_at>=+row.first_starts_at)throw new AppError('INVALID_STATE');
            if(await tx.hasServiceActivity(row.current_reservation_set_id))throw new AppError('SERVICE_ALREADY_STARTED');
            await tx.transition(row,'CANCELLED',input.reason,state.at);
            await tx.history(row.household_id,row.id,row.status,'CANCELLED',state.actor.id,'HOUSEHOLD',input.reason);
          }
          cancellationId=requestId;
          await tx.closeCancellation(requestId,action==='confirm'?'ACCEPTED':'WITHDRAWN',input.reason,action==='confirm'?'HOUSEHOLD_CONFIRMED':'CUSTOMER_WITHDREW',state.actor.id,state.at);
        }
        const after=await detail(tx,await tx.booking(row.id,row.household_id),state);
        await audit(tx,state,`CANCELLATION_${action.toUpperCase()}`,correlationId,before.booking,after.booking,input.reason,'SCHEDULE_REQUEST',cancellationId);
        const title={request:'Khách đề nghị hủy booking',withdraw:'Khách đã rút yêu cầu hủy',confirm:'Hộ dân đã xác nhận hủy'}[action];
        await notify(tx,row,`cancel:${cancellationId}:${action}`,`CANCELLATION_${action.toUpperCase()}`,title,
          action==='request'?'Đơn vẫn giữ chỗ cho đến khi hộ xác nhận hủy. Đơn chưa xác nhận vẫn hết hạn theo thời hạn cũ.':action==='confirm'?'Chỗ đã được giải phóng. Khoản thu và hoàn tiền được theo dõi riêng.':'Booking tiếp tục theo thời hạn và điều kiện đã chốt.');
        const response={...after,replayed:false};
        await tx.saveIdempotency(state.actor.id,operation,input.idempotencyKey,hash,response,state.at,action==='request'?201:200);
        return response;
      });
      if(result.error)throw new AppError(result.error);
      return result;
    },
    async notifications(auth,input){
      input=query(notificationList,input);
      return repository.transaction(async tx=>{
        const {actor}=await lockCurrentActor(tx,auth,['CUSTOMER','HOUSEHOLD','ADMIN']);
        const result=await tx.listNotifications(actor.id,input);
        return {items:result.rows.map(notificationOf),total:result.total,unreadCount:result.unreadCount,page:input.page,pageSize:input.pageSize};
      });
    },
    async readNotification(auth,id){
      parse(databaseIdSchema,id);
      return repository.transaction(async tx=>{
        const {actor}=await lockCurrentActor(tx,auth,['CUSTOMER','HOUSEHOLD','ADMIN']);
        if(!await tx.notification(actor.id,id))throw new AppError('NOT_FOUND');
        await tx.readNotification(actor.id,id,(await tx.databaseNow()).now_at);
        return {notification:notificationOf(await tx.notification(actor.id,id))};
      });
    },
  };
}
