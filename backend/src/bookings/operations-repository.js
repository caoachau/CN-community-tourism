// All writes run under the actor/household/booking locks held by BookingService.
export function createBookingOperations(c) {
  const execute=(sql,values=[])=>c.execute({sql,timeout:10000},values);
  const rows=async(sql,values=[]) => (await execute(sql,values))[0];
  const first=async(sql,values=[]) => (await rows(sql,values))[0]??null;
  return {
    cancellations:(bookingId,lock=true)=>rows(`SELECT * FROM schedule_requests WHERE booking_id=? AND request_kind='BOOKING_CANCEL' ORDER BY id${lock?' FOR UPDATE':''}`,[bookingId]),
    async createCancellation(row,actor,reason,at,code){
      const [r]=await execute(`INSERT INTO schedule_requests (household_id,customer_user_id,request_code,message,preferences,request_kind,booking_id,created_by,base_reservation_set_id,created_at)
        VALUES (?,?,?,?,?,'BOOKING_CANCEL',?,?,?,?)`,[row.household_id,row.customer_user_id,code,reason,JSON.stringify({requestedBy:'CUSTOMER',bookingStatus:row.status}),row.id,actor.id,row.current_reservation_set_id,at]);
      return String(r.insertId);
    },
    closeCancellation:(id,status,reason,code,actorId,at)=>execute('UPDATE schedule_requests SET status=?,closed_reason=?,resolution_code=?,closed_by=?,closed_at=? WHERE id=? AND status=\'OPEN\'',[status,reason,code,actorId,at,id]),
    async closeBookingChanges(bookingId,at,reason,resolutionCode='CANCELLATION_REQUESTED'){
      const requests=await rows("SELECT id FROM schedule_requests WHERE booking_id=? AND request_kind='BOOKING_CHANGE' AND status IN ('OPEN','PROPOSED') ORDER BY id FOR UPDATE",[bookingId]);
      for(const request of requests){
        const sets=await rows("SELECT rs.id FROM reservation_sets rs JOIN booking_proposals p ON p.id=rs.proposal_id WHERE p.request_id=? AND rs.purpose='RESCHEDULE' AND rs.status IN ('DRAFT','HELD') ORDER BY rs.id FOR UPDATE",[request.id]);
        for(const set of sets){
          await execute("UPDATE reservation_sets SET status='RELEASED',released_at=?,release_reason=? WHERE id=?",[at,reason.slice(0,1000),set.id]);
          await execute('UPDATE booking_items SET released_at=COALESCE(released_at,?) WHERE reservation_set_id=?',[at,set.id]);
        }
        await execute("UPDATE booking_proposals SET status='WITHDRAWN' WHERE request_id=? AND status IN ('DRAFT','SENT')",[request.id]);
        await execute("UPDATE schedule_requests SET status='CLOSED',closed_at=?,closed_reason=?,resolution_code=? WHERE id=?",[at,reason,resolutionCode,request.id]);
      }
    },
    async hasServiceActivity(setId){
      const activity=await first(`SELECT id FROM booking_items WHERE reservation_set_id=? AND (actual_ended_at IS NOT NULL OR outcome IN ('SERVED','PARTIALLY_SERVED') OR actual_participant_count>0 OR actual_served_quantity>0) LIMIT 1`,[setId]);
      if(activity)return true;
      return Boolean(await first(`SELECT h.id FROM resource_handovers h JOIN item_resource_usages u ON u.id=h.usage_id JOIN booking_items i ON i.id=u.item_id WHERE i.reservation_set_id=? AND h.event_kind='ISSUE' LIMIT 1`,[setId]));
    },
    idempotency:(actorId,action,key)=>first('SELECT HEX(request_hash) request_hash,response_body FROM idempotency_keys WHERE actor_user_id=? AND action=? AND idempotency_key=? FOR UPDATE',[actorId,action,key]),
    saveIdempotency:(actorId,action,key,hash,body,at,status=200)=>execute('INSERT INTO idempotency_keys (actor_user_id,action,idempotency_key,request_hash,response_status,response_body,completed_at) VALUES (?,?,?,UNHEX(?),?,?,?)',[actorId,action,key,hash,status,JSON.stringify(body),at]),
    notifyBooking:(userId,row,eventKey,type,title,body,audience)=>execute('INSERT INTO notifications (user_id,event_key,event_type,title,body,navigation) VALUES (?,?,?,?,?,?)',
      [userId,eventKey,type,title,body,JSON.stringify({screen:'booking',bookingId:String(row.id),audience})]),
    async listNotifications(userId,input){
      const filter=input.unreadOnly==='true'?' AND read_at IS NULL':'';
      const count=await first(`SELECT COUNT(*) total FROM notifications WHERE user_id=?${filter}`,[userId]);
      const unread=await first('SELECT COUNT(*) total FROM notifications WHERE user_id=? AND read_at IS NULL',[userId]);
      return {total:Number(count.total),unreadCount:Number(unread.total),rows:await rows(`SELECT * FROM notifications WHERE user_id=?${filter} ORDER BY id DESC LIMIT ${input.pageSize} OFFSET ${(input.page-1)*input.pageSize}`,[userId])};
    },
    notification:(userId,id)=>first('SELECT * FROM notifications WHERE id=? AND user_id=? FOR UPDATE',[id,userId]),
    readNotification:(userId,id,at)=>execute('UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=?',[at,id,userId]),
  };
}
