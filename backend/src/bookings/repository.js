import { createCalendarQueries } from '../calendar/repository.js';
import { randomUUID } from 'node:crypto';

export function createBookingQueries(c){
  const execute=(sql,values=[])=>c.execute({sql,timeout:10000},values);
  const rows=async(sql,values=[]) => (await execute(sql,values))[0];
  const first=async(sql,values=[]) => (await rows(sql,values))[0]??null;
  const insert=async(table,data)=>{
    const fields=Object.keys(data);
    const [result]=await execute(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`,Object.values(data));
    return String(result.insertId);
  };
  const limit=i=>{if(!Number.isInteger(i.page)||!Number.isInteger(i.pageSize)||i.page<1||i.pageSize<1||i.pageSize>100||i.page>100000)throw new TypeError('Pagination');return `LIMIT ${i.pageSize} OFFSET ${(i.page-1)*i.pageSize}`;};
  return {
    ...createCalendarQueries(c),
    databaseNow:()=>first('SELECT UTC_TIMESTAMP(6) now_at'),
    household:(id,lock=false)=>first(`SELECT * FROM households WHERE id=?${lock?' FOR UPDATE':''}`,[id]),
    householdTarget:id=>first('SELECT id,owner_user_id FROM households WHERE id=?',[id]),
    bookingTarget:id=>first('SELECT b.household_id,h.owner_user_id FROM bookings b JOIN households h ON h.id=b.household_id WHERE b.id=?',[id]),
    booking:(id,householdId)=>first('SELECT * FROM bookings WHERE id=? AND household_id=? FOR UPDATE',[id,householdId]),
    bookingByCode:code=>first('SELECT * FROM bookings WHERE booking_code=? FOR UPDATE',[code]),
    bookingSet:id=>first('SELECT * FROM reservation_sets WHERE id=? FOR UPDATE',[id]),
    bookingItems:setId=>rows('SELECT * FROM booking_items WHERE reservation_set_id=? ORDER BY id FOR UPDATE',[setId]),
    entries:(bookingId,lock=true)=>rows(`SELECT * FROM financial_entries WHERE booking_id=? ORDER BY id${lock?' FOR UPDATE':''}`,[bookingId]),
    bookingReview:(id,lock=true)=>first(`SELECT * FROM reviews WHERE booking_id=?${lock?' FOR UPDATE':''}`,[id]),
    reviewTarget:id=>first('SELECT r.booking_id,b.household_id,h.owner_user_id FROM reviews r JOIN bookings b ON b.id=r.booking_id JOIN households h ON h.id=b.household_id WHERE r.id=?',[id]),
    createBooking:data=>insert('bookings',data),createSet:data=>insert('reservation_sets',data),createItem:data=>insert('booking_items',data),createUsage:data=>insert('item_resource_usages',data),
    createEntry:data=>insert('financial_entries',data),createReview:data=>insert('reviews',data),
    setCurrent:(bookingId,setId)=>execute('UPDATE bookings SET current_reservation_set_id=? WHERE id=?',[setId,bookingId]),
    history:(householdId,bookingId,from,to,actorId,actorType,reason)=>insert('activity_events',{household_id:householdId,booking_id:bookingId,entity_type:'BOOKING',entity_id:bookingId,event_type:'BOOKING_STATUS',from_status:from,to_status:to,actor_type:actorType,actor_user_id:actorId,reason,correlation_id:randomUUID()}),
    histories:id=>rows("SELECT from_status,to_status,actor_type,reason,created_at FROM activity_events WHERE booking_id=? AND event_type='BOOKING_STATUS' ORDER BY id",[id]),
    expired:householdId=>rows("SELECT * FROM bookings WHERE household_id=? AND status='PENDING' AND hold_expires_at<=UTC_TIMESTAMP(6) ORDER BY id FOR UPDATE",[householdId]),
    pendingCount:async customerId=>Number((await first("SELECT COUNT(*) total FROM bookings WHERE customer_user_id=? AND status='PENDING' AND hold_expires_at>UTC_TIMESTAMP(6)",[customerId])).total),
    expiryTargets:()=>rows("SELECT DISTINCT b.household_id,h.owner_user_id FROM bookings b JOIN households h ON h.id=b.household_id WHERE b.status='PENDING' AND b.hold_expires_at<=UTC_TIMESTAMP(6) ORDER BY b.household_id LIMIT 100"),
    async transition(row,status,reason,at){
      const terminal=!['PENDING','CONFIRMED'].includes(status);
      await execute('UPDATE bookings SET status=?,confirmed_at=IF(?=\'CONFIRMED\',?,confirmed_at),closed_at=?,closed_reason=? WHERE id=?',
        [status,status,at,terminal?at:null,terminal?reason:null,row.id]);
      if(status==='CONFIRMED')await execute("UPDATE reservation_sets SET status='COMMITTED',accepted_at=? WHERE id=?",[at,row.current_reservation_set_id]);
      if(terminal){
        await execute("UPDATE reservation_sets SET status='RELEASED',released_at=?,release_reason=? WHERE id=?",[at,reason.slice(0,1000),row.current_reservation_set_id]);
        await execute('UPDATE booking_items SET released_at=COALESCE(released_at,?) WHERE reservation_set_id=?',[at,row.current_reservation_set_id]);
      }
    },
    markServed:(setId,actorId,at)=>execute("UPDATE booking_items SET outcome='SERVED',actual_ended_at=ends_at,outcome_recorded_by=?,outcome_recorded_at=? WHERE reservation_set_id=? AND outcome='UNRESOLVED'",[actorId,at,setId]),
    moderate:(id,hidden,actorId,reason)=>execute('UPDATE reviews SET hidden_at=?,hidden_by=?,hidden_reason=? WHERE id=?',[hidden?new Date():null,hidden?actorId:null,hidden?reason:null,id]),
    async listBookings(scope,input){
      const filters=[],values=[];
      if(scope.householdId){filters.push('household_id=?');values.push(scope.householdId);}
      if(scope.customerId){filters.push('customer_user_id=?');values.push(scope.customerId);}
      if(input.householdId){filters.push('household_id=?');values.push(input.householdId);}
      if(input.status){filters.push("(CASE WHEN status='PENDING' AND hold_expires_at<=UTC_TIMESTAMP(6) THEN 'EXPIRED' ELSE status END)=?");values.push(input.status);}
      const where=filters.length?`WHERE ${filters.join(' AND ')}`:'';
      const count=await first(`SELECT COUNT(*) total FROM bookings ${where}`,values);
      return {rows:await rows(`SELECT * FROM bookings ${where} ORDER BY id DESC ${limit(input)}`,values),total:Number(count.total)};
    },
    async listEntries(scope,input){
      const values=[],filters=['booking_id IS NOT NULL'];
      for(const [field,value]of [['household_id',scope.householdId??input.householdId],['booking_id',input.bookingId]])if(value){filters.push(`${field}=?`);values.push(value);}
      const where=`WHERE ${filters.join(' AND ')}`,count=await first(`SELECT COUNT(*) total FROM financial_entries ${where}`,values);
      return {rows:await rows(`SELECT * FROM financial_entries ${where} ORDER BY id DESC ${limit(input)}`,values),total:Number(count.total)};
    },
    async listReviews(input,publicOnly=false){
      const filters=[],values=[];
      if(input.householdId){filters.push('r.household_id=?');values.push(input.householdId);}
      if(publicOnly)filters.push("r.hidden_at IS NULL AND b.status='COMPLETED' AND h.approval_status='APPROVED' AND h.visibility='VISIBLE' AND h.archived_at IS NULL AND u.role='HOUSEHOLD' AND u.status='ACTIVE' AND u.disabled_at IS NULL");
      const from=`FROM reviews r JOIN bookings b ON b.id=r.booking_id JOIN households h ON h.id=r.household_id JOIN users u ON u.id=h.owner_user_id ${filters.length?`WHERE ${filters.join(' AND ')}`:''}`;
      const count=await first(`SELECT COUNT(*) total,AVG(r.rating) averageRating ${from}`,values);
      return {rows:await rows(`SELECT r.* ${from} ORDER BY r.id DESC ${limit(input)}`,values),total:Number(count.total),averageRating:count.averageRating===null?null:Number(count.averageRating)};
    },
  };
}
export function createBookingRepository(database){return {transaction:work=>database.transaction(c=>work(createBookingQueries(c)))};}
