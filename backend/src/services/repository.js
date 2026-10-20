import { createCatalogQueries } from '../catalog/repository.js';
import { AppError } from '../shared/errors.js';
import { encodeOffer, json } from './models.js';

const execute=(c,sql,values=[])=>c.execute({sql,timeout:10000},values);
const first=async(c,sql,values=[]) => (await execute(c,sql,values))[0][0]??null;
const rootFields='id,household_id,code,category_id,default_place_id,default_duration_minutes,supply_status,visibility,published_revision_id,archived_at,created_at';
const revisionFields='id,service_id,version,title,body,details,schema_version,status,submitted_by,submitted_at,reviewed_by,reviewed_at,review_note,created_at';
const limit=({page,pageSize})=>{
  if (!Number.isInteger(page)||page<1||page>100000||!Number.isInteger(pageSize)||pageSize<1||pageSize>100) throw new AppError('INVALID_REQUEST');
  return `LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`;
};
const publicFrom=`FROM services s JOIN households h ON h.id=s.household_id JOIN users u ON u.id=h.owner_user_id
  JOIN categories c ON c.id=s.category_id AND c.kind='SERVICE' AND c.is_active=1
  JOIN content_revisions cr ON cr.id=s.published_revision_id AND cr.service_id=s.id AND cr.content_type='SERVICE' AND cr.status='APPROVED'
  JOIN content_revisions hr ON hr.id=h.published_revision_id AND hr.household_profile_id=h.id AND hr.content_type='HOUSEHOLD' AND hr.status='APPROVED'
  JOIN places p ON p.id=s.default_place_id AND p.household_id=s.household_id
  JOIN content_revisions pr ON pr.id=p.published_revision_id AND pr.place_id=p.id AND pr.content_type='PLACE' AND pr.status='APPROVED'`;
const publicWhere=`s.supply_status='AVAILABLE' AND s.visibility='VISIBLE' AND s.archived_at IS NULL
  AND h.approval_status='APPROVED' AND h.visibility='VISIBLE' AND h.archived_at IS NULL
  AND u.status='ACTIVE' AND u.disabled_at IS NULL AND u.role='HOUSEHOLD'
  AND p.supply_status='AVAILABLE' AND p.visibility='VISIBLE' AND p.archived_at IS NULL`;
const publicColumns=`s.*,cr.id revision_id,cr.version revision_version,cr.title,cr.body,cr.details,cr.reviewed_at published_at,
  hr.title household_name,c.code category_code,c.name category_name,p.code place_code,pr.title place_name,pr.details place_details`;
const offerEligible=(input,values)=>{
  let extra='';
  if(input.pricingType){extra+=' AND o.pricing_type=?';values.push(input.pricingType);}
  if(input.participationMode){extra+=' AND o.participation_mode=?';values.push(input.participationMode);}
  return `EXISTS (SELECT 1 FROM service_offers o WHERE o.service_id=s.id AND o.household_id=s.household_id AND o.is_active=1
    AND JSON_CONTAINS(cr.details,JSON_OBJECT('id',CAST(o.id AS CHAR),'structureToken',JSON_UNQUOTE(JSON_EXTRACT(o.terms,'$._structure_token'))),'$.offers_snapshot')=1${extra})`;
};
function queries(connection){
  return {
    // Shared live-auth locks, household/category/place lookups and audit writer.
    ...createCatalogQueries(connection),
    root:(serviceId,lock=false)=>first(connection,`SELECT ${rootFields} FROM services WHERE id=?${lock?' FOR UPDATE':''}`,[serviceId]),
    ownedRoot:(serviceId,householdId)=>first(connection,`SELECT ${rootFields} FROM services WHERE id=? AND household_id=? FOR UPDATE`,[serviceId,householdId]),
    async createRoot(householdId,code,profile){
      await execute(connection,'INSERT INTO services (household_id,code,category_id,default_place_id,default_duration_minutes) VALUES (?,?,?,?,?)',[householdId,code,profile.categoryId,profile.defaultPlaceId,profile.defaultDurationMinutes]);
      const row=await first(connection,'SELECT CAST(LAST_INSERT_ID() AS CHAR) id');return this.root(row.id);
    },
    latestService:(serviceId,lock=false)=>first(connection,`SELECT ${revisionFields} FROM content_revisions WHERE service_id=? AND content_type='SERVICE' ORDER BY version DESC LIMIT 1${lock?' FOR UPDATE':''}`,[serviceId]),
    serviceRevision:(revisionId,serviceId)=>first(connection,`SELECT ${revisionFields} FROM content_revisions WHERE id=? AND service_id=? AND content_type='SERVICE'`,[revisionId,serviceId]),
    async createServiceRevision(serviceId,version,profile,actorId){
      const details={category_id:profile.categoryId,default_place_id:profile.defaultPlaceId,default_duration_minutes:profile.defaultDurationMinutes,
        participation_conditions:profile.details.participationConditions,preparation_notes:profile.details.preparationNotes};
      await execute(connection,`INSERT INTO content_revisions (content_type,service_id,version,title,body,details,schema_version,submitted_by) VALUES ('SERVICE',?,?,?,?,?,1,?)`,[serviceId,version,profile.title,profile.body,JSON.stringify(details),actorId]);
      return this.latestService(serviceId);
    },
    async submitService(revision,offers){
      const details={...json(revision.details),offers_snapshot:offers};
      await execute(connection,"UPDATE content_revisions SET details=?,status='PENDING',submitted_at=UTC_TIMESTAMP(6) WHERE id=?",[JSON.stringify(details),revision.id]);
    },
    async reviewService(revisionId,actorId,decision,reason){await execute(connection,'UPDATE content_revisions SET status=?,reviewed_by=?,reviewed_at=UTC_TIMESTAMP(6),review_note=? WHERE id=?',[decision,actorId,reason,revisionId]);},
    async publishService(serviceId,revisionId,profile){await execute(connection,'UPDATE services SET published_revision_id=?,category_id=?,default_place_id=?,default_duration_minutes=? WHERE id=?',[revisionId,profile.categoryId,profile.defaultPlaceId,profile.defaultDurationMinutes,serviceId]);},
    async setServiceStatus(serviceId,input){await execute(connection,'UPDATE services SET supply_status=?,visibility=? WHERE id=?',[input.supplyStatus,input.visibility,serviceId]);},
    serviceReviewTarget:revisionId=>first(connection,`SELECT s.id service_id,s.household_id,h.owner_user_id FROM content_revisions cr JOIN services s ON s.id=cr.service_id JOIN households h ON h.id=s.household_id
      WHERE cr.id=? AND cr.content_type='SERVICE' AND cr.submitted_at IS NOT NULL AND cr.status<>'DRAFT'`,[revisionId]),
    readyPlace:(placeId,householdId)=>first(connection,`SELECT p.id FROM places p JOIN content_revisions cr ON cr.id=p.published_revision_id AND cr.place_id=p.id AND cr.content_type='PLACE' AND cr.status='APPROVED'
      WHERE p.id=? AND p.household_id=? AND p.supply_status='AVAILABLE' AND p.visibility='VISIBLE' AND p.archived_at IS NULL FOR UPDATE`,[placeId,householdId]),
    offer:(offerId,serviceId,householdId,lock=false)=>first(connection,`SELECT * FROM service_offers WHERE id=? AND service_id=? AND household_id=?${lock?' FOR UPDATE':''}`,[offerId,serviceId,householdId]),
    async offers(serviceIds,lock=false){
      if(!serviceIds.length)return [];
      const [rows]=await execute(connection,`SELECT * FROM service_offers WHERE service_id IN (${serviceIds.map(()=>'?').join(',')}) ORDER BY id${lock?' FOR UPDATE':''}`,serviceIds);return rows;
    },
    async createOffer(serviceId,householdId,config){
      const encoded=encodeOffer(config);
      await execute(connection,`INSERT INTO service_offers (service_id,household_id,name,participation_mode,pricing_type,unit_price_vnd,unit_label,min_participants,max_participants,max_units,participants_per_unit,terms,addons,is_active)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[serviceId,householdId,config.name,config.participationMode,config.pricingType,config.unitPriceVnd,config.unitLabel,config.minParticipants,config.maxParticipants,config.maxUnits,config.participantsPerUnit,encoded.terms,encoded.addons,Number(config.isActive)]);
      const row=await first(connection,'SELECT CAST(LAST_INSERT_ID() AS CHAR) id');return this.offer(row.id,serviceId,householdId);
    },
    async updateOffer(offerId,config){
      const encoded=encodeOffer(config);
      await execute(connection,`UPDATE service_offers SET name=?,participation_mode=?,pricing_type=?,unit_price_vnd=?,unit_label=?,min_participants=?,max_participants=?,max_units=?,participants_per_unit=?,terms=?,addons=?,is_active=? WHERE id=?`,
        [config.name,config.participationMode,config.pricingType,config.unitPriceVnd,config.unitLabel,config.minParticipants,config.maxParticipants,config.maxUnits,config.participantsPerUnit,encoded.terms,encoded.addons,Number(config.isActive),offerId]);
    },
    async updateOfferPrices(offerId,config){
      const encoded=encodeOffer(config);
      // Structural fields and technical approval token stay untouched.
      await execute(connection,'UPDATE service_offers SET unit_price_vnd=?,is_active=?,addons=? WHERE id=?',[config.unitPriceVnd,Number(config.isActive),encoded.addons,offerId]);
    },
    async protectedOffer(offerId,serviceId){
      const row=await first(connection,`SELECT (
        EXISTS (SELECT 1 FROM slot_offers WHERE offer_id=?) OR EXISTS (SELECT 1 FROM booking_items WHERE offer_id=?)
        OR EXISTS (SELECT 1 FROM content_revisions WHERE service_id=? AND submitted_at IS NOT NULL AND JSON_CONTAINS(details,JSON_OBJECT('id',CAST(? AS CHAR)),'$.offers_snapshot')=1)
      ) protected`,[offerId,offerId,serviceId,offerId]);return Number(row.protected)===1;
    },
    async ownedServices(householdId,paging){
      const [[count]]=await execute(connection,'SELECT COUNT(*) total FROM services WHERE household_id=?',[householdId]);
      const [rows]=await execute(connection,`SELECT ${rootFields} FROM services WHERE household_id=? ORDER BY id DESC ${limit(paging)}`,[householdId]);return {rows,total:Number(count.total)};
    },
    async serviceViewRevisions(serviceIds){
      if(!serviceIds.length)return [];
      const [rows]=await execute(connection,`SELECT cr.* FROM content_revisions cr JOIN services s ON s.id=cr.service_id WHERE s.id IN (${serviceIds.map(()=>'?').join(',')}) AND cr.content_type='SERVICE'
        AND (cr.id=s.published_revision_id OR cr.version=(SELECT MAX(latest.version) FROM content_revisions latest WHERE latest.service_id=s.id))`,serviceIds);return rows;
    },
    async serviceHistory(serviceId,paging){
      const [[count]]=await execute(connection,'SELECT COUNT(*) total FROM content_revisions WHERE service_id=?',[serviceId]);
      const [rows]=await execute(connection,`SELECT ${revisionFields} FROM content_revisions WHERE service_id=? ORDER BY version DESC ${limit(paging)}`,[serviceId]);return {rows,total:Number(count.total)};
    },
    async serviceSubmissions(input){
      const values=[input.status];let where="cr.content_type='SERVICE' AND cr.status=? AND cr.submitted_at IS NOT NULL AND s.archived_at IS NULL AND h.archived_at IS NULL";
      if(input.householdId){where+=' AND s.household_id=?';values.push(input.householdId);}
      const from='FROM content_revisions cr JOIN services s ON s.id=cr.service_id JOIN households h ON h.id=s.household_id';
      const [[count]]=await execute(connection,`SELECT COUNT(*) total ${from} WHERE ${where}`,values);
      const [rows]=await execute(connection,`SELECT cr.id revision_id,cr.version,cr.title,cr.status,cr.submitted_at,cr.reviewed_at,s.id service_id,s.household_id ${from} WHERE ${where} ORDER BY cr.submitted_at DESC,cr.id DESC ${limit(input)}`,values);return {rows,total:Number(count.total)};
    },
    async publicServices(input,serviceId){
      let where=publicWhere;const values=[];
      if(serviceId){where+=' AND s.id=?';values.push(serviceId);}
      for(const [key,column] of [['householdId','s.household_id'],['categoryId','s.category_id'],['placeId','s.default_place_id']])if(input[key]){where+=` AND ${column}=?`;values.push(input[key]);}
      if(input.q){where+=" AND (cr.title LIKE ? ESCAPE '!' OR cr.body LIKE ? ESCAPE '!')";const pattern=`%${input.q.replace(/[!%_]/g,char=>`!${char}`)}%`;values.push(pattern,pattern);}
      where+=` AND ${offerEligible(input,values)}`;
      const [[count]]=await execute(connection,`SELECT COUNT(*) total ${publicFrom} WHERE ${where}`,values);
      const [rows]=await execute(connection,`SELECT ${publicColumns} ${publicFrom} WHERE ${where} ORDER BY cr.title,s.id ${limit(input)}`,values);return {rows,total:Number(count.total)};
    },
    async notifyServiceReview(userId,serviceId,householdId,revisionId,decision){
      await execute(connection,'INSERT INTO notifications (user_id,event_key,event_type,title,body,navigation) VALUES (?,?,?,?,?,?)',[userId,`service-review:${revisionId}`,'SERVICE_REVIEW',decision==='APPROVED'?'Dịch vụ đã được duyệt':'Dịch vụ cần điều chỉnh',
        'Vui lòng xem kết quả xét duyệt trong phần quản lý dịch vụ.',JSON.stringify({screen:'serviceProfile',serviceId:String(serviceId),householdId:String(householdId),revisionId:String(revisionId)})]);
    },
  };
}
export function createServiceRepository(database){return {
  read:work=>database.withConnection(connection=>work(queries(connection))),transaction:work=>database.transaction(connection=>work(queries(connection))),
};}
