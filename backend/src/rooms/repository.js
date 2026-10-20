import { createCatalogQueries } from '../catalog/repository.js';
import { AppError } from '../shared/errors.js';
import { encodeProfile, encodeTerms, json } from './models.js';

const execute = (c,sql,values=[]) => c.execute({sql,timeout:10000},values);
const first = async(c,sql,values=[]) => (await execute(c,sql,values))[0][0]??null;
const fields = 'id,household_id,code,place_id,max_guests,nightly_price_vnd,check_in_time,check_out_time,terms,supply_status,visibility,published_revision_id,archived_at,created_at';
const revisionFields = 'id,room_id,version,title,body,details,schema_version,status,submitted_by,submitted_at,reviewed_by,reviewed_at,review_note,created_at';
const limit = ({page,pageSize}) => {
  if(!Number.isInteger(page)||page<1||page>100000||!Number.isInteger(pageSize)||pageSize<1||pageSize>100) throw new AppError('INVALID_REQUEST');
  return `LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`;
};
const publicFrom = `FROM rooms r JOIN households h ON h.id=r.household_id JOIN users u ON u.id=h.owner_user_id
  JOIN content_revisions cr ON cr.id=r.published_revision_id AND cr.room_id=r.id AND cr.content_type='ROOM' AND cr.status='APPROVED'
  JOIN content_revisions hr ON hr.id=h.published_revision_id AND hr.household_profile_id=h.id AND hr.content_type='HOUSEHOLD' AND hr.status='APPROVED'
  JOIN places p ON p.id=r.place_id AND p.household_id=r.household_id
  JOIN content_revisions pr ON pr.id=p.published_revision_id AND pr.place_id=p.id AND pr.content_type='PLACE' AND pr.status='APPROVED'`;
const publicWhere = `r.supply_status='AVAILABLE' AND r.visibility='VISIBLE' AND r.archived_at IS NULL
  AND h.approval_status='APPROVED' AND h.visibility='VISIBLE' AND h.archived_at IS NULL
  AND u.status='ACTIVE' AND u.disabled_at IS NULL AND u.role='HOUSEHOLD'
  AND p.supply_status='AVAILABLE' AND p.visibility='VISIBLE' AND p.archived_at IS NULL`;
const publicColumns = `r.*,cr.id revision_id,cr.version revision_version,cr.title,cr.body,cr.details,cr.reviewed_at published_at,
  hr.title household_name,p.code place_code,pr.title place_name,pr.details place_details`;

function queries(connection) {
  return {
    ...createCatalogQueries(connection),
    room:(roomId,lock=false)=>first(connection,`SELECT ${fields} FROM rooms WHERE id=?${lock?' FOR UPDATE':''}`,[roomId]),
    ownedRoom:(roomId,householdId)=>first(connection,`SELECT ${fields} FROM rooms WHERE id=? AND household_id=? FOR UPDATE`,[roomId,householdId]),
    async createRoom(householdId,code,input) {
      await execute(connection,`INSERT INTO rooms (household_id,code,place_id,max_guests,nightly_price_vnd,check_in_time,check_out_time,terms) VALUES (?,?,?,?,?,?,?,?)`,
        [householdId,code,input.placeId,input.maxGuests,input.nightlyPriceVnd,input.checkInTime,input.checkOutTime,JSON.stringify(encodeTerms(input.terms))]);
      const row=await first(connection,'SELECT CAST(LAST_INSERT_ID() AS CHAR) id');return this.room(row.id);
    },
    latestRoom:(roomId,lock=false)=>first(connection,`SELECT ${revisionFields} FROM content_revisions WHERE room_id=? AND content_type='ROOM' ORDER BY version DESC LIMIT 1${lock?' FOR UPDATE':''}`,[roomId]),
    roomRevision:(revisionId,roomId)=>first(connection,`SELECT ${revisionFields} FROM content_revisions WHERE id=? AND room_id=? AND content_type='ROOM'`,[revisionId,roomId]),
    async createRoomRevision(roomId,version,profile,actorId) {
      await execute(connection,`INSERT INTO content_revisions (content_type,room_id,version,title,body,details,schema_version,submitted_by) VALUES ('ROOM',?,?,?,?,?,1,?)`,
        [roomId,version,profile.title,profile.body,JSON.stringify(encodeProfile(profile)),actorId]);return this.latestRoom(roomId);
    },
    async submitRoom(revision,price) {
      await execute(connection,"UPDATE content_revisions SET details=?,status='PENDING',submitted_at=UTC_TIMESTAMP(6) WHERE id=?",
        [JSON.stringify({...json(revision.details),nightly_price_snapshot_vnd:price}),revision.id]);
    },
    async reviewRoom(revisionId,actorId,decision,reason) {
      await execute(connection,'UPDATE content_revisions SET status=?,reviewed_by=?,reviewed_at=UTC_TIMESTAMP(6),review_note=? WHERE id=?',[decision,actorId,reason,revisionId]);
    },
    async publishRoom(roomId,revisionId,profile) {
      await execute(connection,'UPDATE rooms SET published_revision_id=?,place_id=?,max_guests=?,check_in_time=?,check_out_time=?,terms=? WHERE id=?',
        [revisionId,profile.placeId,profile.maxGuests,profile.checkInTime,profile.checkOutTime,JSON.stringify(encodeTerms(profile.terms)),roomId]);
    },
    async setRoomPrice(roomId,price) { await execute(connection,'UPDATE rooms SET nightly_price_vnd=? WHERE id=?',[price,roomId]); },
    async setRoomStatus(roomId,input) { await execute(connection,'UPDATE rooms SET supply_status=?,visibility=? WHERE id=?',[input.supplyStatus,input.visibility,roomId]); },
    readyRoomPlace:(placeId,householdId)=>first(connection,`SELECT p.id FROM places p JOIN content_revisions cr ON cr.id=p.published_revision_id AND cr.place_id=p.id AND cr.content_type='PLACE' AND cr.status='APPROVED'
      WHERE p.id=? AND p.household_id=? AND p.supply_status='AVAILABLE' AND p.visibility='VISIBLE' AND p.archived_at IS NULL FOR UPDATE`,[placeId,householdId]),
    async hasRoomCommitments(roomId) {
      // Current locking read: a transaction may already have an older consistent
      // snapshot from resolving the household before acquiring its lock.
      const row=await first(connection,`SELECT i.id
        FROM booking_items i JOIN reservation_sets rs ON rs.id=i.reservation_set_id AND rs.household_id=i.household_id
        WHERE i.room_id=? AND i.released_at IS NULL AND i.ends_at>UTC_TIMESTAMP(6) AND rs.released_at IS NULL
          AND (rs.status='COMMITTED' OR (rs.status='HELD' AND rs.expires_at>UTC_TIMESTAMP(6)))
        ORDER BY i.id LIMIT 1 FOR UPDATE`,[roomId]);return Boolean(row);
    },
    roomReviewTarget:revisionId=>first(connection,`SELECT r.id room_id,r.household_id,h.owner_user_id FROM content_revisions cr JOIN rooms r ON r.id=cr.room_id JOIN households h ON h.id=r.household_id
      WHERE cr.id=? AND cr.content_type='ROOM' AND cr.submitted_at IS NOT NULL AND cr.status<>'DRAFT'`,[revisionId]),
    async ownedRooms(householdId,paging) {
      const [[count]]=await execute(connection,'SELECT COUNT(*) total FROM rooms WHERE household_id=?',[householdId]);
      const [rows]=await execute(connection,`SELECT ${fields} FROM rooms WHERE household_id=? ORDER BY id DESC ${limit(paging)}`,[householdId]);return {rows,total:Number(count.total)};
    },
    async roomViewRevisions(roomIds) {
      if(!roomIds.length)return [];
      const [rows]=await execute(connection,`SELECT cr.* FROM content_revisions cr JOIN rooms r ON r.id=cr.room_id WHERE r.id IN (${roomIds.map(()=>'?').join(',')}) AND cr.content_type='ROOM'
        AND (cr.id=r.published_revision_id OR cr.version=(SELECT MAX(latest.version) FROM content_revisions latest WHERE latest.room_id=r.id))`,roomIds);return rows;
    },
    async roomHistory(roomId,paging) {
      const [[count]]=await execute(connection,'SELECT COUNT(*) total FROM content_revisions WHERE room_id=?',[roomId]);
      const [rows]=await execute(connection,`SELECT ${revisionFields} FROM content_revisions WHERE room_id=? ORDER BY version DESC ${limit(paging)}`,[roomId]);return {rows,total:Number(count.total)};
    },
    async roomSubmissions(input) {
      const values=[input.status];let where="cr.content_type='ROOM' AND cr.status=? AND cr.submitted_at IS NOT NULL AND r.archived_at IS NULL AND h.archived_at IS NULL";
      if(input.householdId){where+=' AND r.household_id=?';values.push(input.householdId);}
      const from='FROM content_revisions cr JOIN rooms r ON r.id=cr.room_id JOIN households h ON h.id=r.household_id';
      const [[count]]=await execute(connection,`SELECT COUNT(*) total ${from} WHERE ${where}`,values);
      const [rows]=await execute(connection,`SELECT cr.id revision_id,cr.version,cr.title,cr.status,cr.submitted_at,cr.reviewed_at,r.id room_id,r.household_id ${from} WHERE ${where} ORDER BY cr.submitted_at DESC,cr.id DESC ${limit(input)}`,values);return {rows,total:Number(count.total)};
    },
    async publicRooms(input,roomId) {
      const values=[];let where=publicWhere;
      if(roomId){where+=' AND r.id=?';values.push(roomId);}
      for(const [key,column,operator] of [['householdId','r.household_id','='],['placeId','r.place_id','='],['guests','r.max_guests','>='],['minPriceVnd','r.nightly_price_vnd','>='],['maxPriceVnd','r.nightly_price_vnd','<=']]) {
        if(input[key]!==undefined){where+=` AND ${column}${operator}?`;values.push(input[key]);}
      }
      if(input.q){where+=" AND (cr.title LIKE ? ESCAPE '!' OR cr.body LIKE ? ESCAPE '!')";const pattern=`%${input.q.replace(/[!%_]/g,char=>`!${char}`)}%`;values.push(pattern,pattern);}
      const [[count]]=await execute(connection,`SELECT COUNT(*) total ${publicFrom} WHERE ${where}`,values);
      const [rows]=await execute(connection,`SELECT ${publicColumns} ${publicFrom} WHERE ${where} ORDER BY cr.title,r.id ${limit(input)}`,values);return {rows,total:Number(count.total)};
    },
    async notifyRoomReview(userId,roomId,householdId,revisionId,decision) {
      await execute(connection,'INSERT INTO notifications (user_id,event_key,event_type,title,body,navigation) VALUES (?,?,?,?,?,?)',
        [userId,`room-review:${revisionId}`,'ROOM_REVIEW',decision==='APPROVED'?'Phòng lưu trú đã được duyệt':'Phòng lưu trú cần điều chỉnh',
          'Vui lòng xem kết quả xét duyệt trong phần quản lý phòng.',JSON.stringify({screen:'roomProfile',roomId:String(roomId),householdId:String(householdId),revisionId:String(revisionId)})]);
    },
  };
}
export function createRoomRepository(database) {
  return {read:work=>database.withConnection(connection=>work(queries(connection))),transaction:work=>database.transaction(connection=>work(queries(connection)))};
}
