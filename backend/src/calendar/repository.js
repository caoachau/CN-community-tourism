import { createCatalogQueries } from '../catalog/repository.js';

const live = `i.released_at IS NULL AND i.ends_at>UTC_TIMESTAMP(6) AND rs.released_at IS NULL
  AND (rs.status='COMMITTED' OR (rs.status='HELD' AND rs.expires_at>UTC_TIMESTAMP(6)))`;
const limit = input => {
  if (!Number.isInteger(input.page)||input.page<1||input.page>100000||!Number.isInteger(input.pageSize)||input.pageSize<1||input.pageSize>100) throw new TypeError('Invalid pagination');
  return `LIMIT ${input.pageSize} OFFSET ${(input.page-1)*input.pageSize}`;
};
export function createCalendarQueries(c) {
  const execute = (sql, values=[]) => c.execute({sql,timeout:10000},values);
  const first = async(sql,values=[]) => (await execute(sql,values))[0][0]??null;
  const rows = async(sql,values=[]) => (await execute(sql,values))[0];
  return {
    ...createCatalogQueries(c),
    service: (id,householdId) => first('SELECT * FROM services WHERE id=? AND household_id=? FOR UPDATE',[id,householdId]),
    room: (id,householdId) => first('SELECT * FROM rooms WHERE id=? AND household_id=? FOR UPDATE',[id,householdId]),
    resource: (id,householdId) => first('SELECT * FROM resources WHERE id=? AND household_id=? FOR UPDATE',[id,householdId]),
    slot: (id,householdId) => first('SELECT * FROM service_slots WHERE id=? AND household_id=? FOR UPDATE',[id,householdId]),
    block: (id,householdId) => first('SELECT * FROM availability_blocks WHERE id=? AND household_id=? FOR UPDATE',[id,householdId]),
    revision: id => first('SELECT * FROM content_revisions WHERE id=?',[id]),
    serviceOffers: serviceId => rows('SELECT * FROM service_offers WHERE service_id=? ORDER BY id FOR UPDATE',[serviceId]),
    slotOffers: slotId => rows('SELECT * FROM slot_offers WHERE slot_id=? ORDER BY offer_id FOR UPDATE',[slotId]),
    assignments: slotId => rows('SELECT * FROM slot_resource_assignments WHERE slot_id=? ORDER BY resource_id FOR UPDATE',[slotId]),
    rules: slotId => rows(`SELECT r.*,o.offer_id FROM slot_offer_resource_rules r JOIN slot_offers o ON o.id=r.slot_offer_id
      WHERE r.slot_id=? ORDER BY r.assignment_id,o.offer_id FOR UPDATE`,[slotId]),
    readyPlace: (placeId,householdId) => first(`SELECT p.id FROM places p JOIN content_revisions cr ON cr.id=p.published_revision_id AND cr.place_id=p.id AND cr.status='APPROVED'
      WHERE p.id=? AND p.household_id=? AND p.archived_at IS NULL AND p.supply_status='AVAILABLE' AND p.visibility='VISIBLE' FOR UPDATE`,[placeId,householdId]),
    async liveItems({slotId,roomId}) {
      return rows(`SELECT i.id,i.offer_id,i.slot_id,i.participant_count,i.quantity,i.is_exclusive,i.starts_at,i.ends_at
        FROM booking_items i JOIN reservation_sets rs ON rs.id=i.reservation_set_id AND rs.household_id=i.household_id
        WHERE i.${slotId?'slot_id':'room_id'}=? AND ${live} ORDER BY i.id FOR UPDATE`,[slotId??roomId]);
    },
    usages: slotId => rows(`SELECT u.assignment_id,u.quantity FROM item_resource_usages u JOIN booking_items i ON i.id=u.item_id AND i.household_id=u.household_id
      JOIN reservation_sets rs ON rs.id=i.reservation_set_id AND rs.household_id=i.household_id WHERE u.slot_id=? AND ${live} ORDER BY u.id FOR UPDATE`,[slotId]),
    async resourceIntervals(resourceId,{excludeSlotId=null,excludeBlockId=null}={}) {
      const allocations = await rows(`SELECT a.quantity,DATE_SUB(s.starts_at,INTERVAL a.preparation_minutes MINUTE) starts_at,
        DATE_ADD(s.ends_at,INTERVAL a.cleanup_minutes MINUTE) ends_at FROM slot_resource_assignments a JOIN service_slots s ON s.id=a.slot_id AND s.household_id=a.household_id
        WHERE a.resource_id=? AND a.released_at IS NULL AND s.archived_at IS NULL AND s.sales_status<>'CANCELLED'
          AND DATE_ADD(s.ends_at,INTERVAL a.cleanup_minutes MINUTE)>UTC_TIMESTAMP(6) AND (? IS NULL OR s.id<>?) ORDER BY s.id FOR UPDATE`,[resourceId,excludeSlotId,excludeSlotId]);
      const blocks = await rows(`SELECT quantity,starts_at,ends_at FROM availability_blocks WHERE resource_id=? AND released_at IS NULL
        AND (ends_at IS NULL OR ends_at>UTC_TIMESTAMP(6)) AND (? IS NULL OR id<>?) ORDER BY id FOR UPDATE`,[resourceId,excludeBlockId,excludeBlockId]);
      return [...allocations,...blocks].map(r=>({quantity:r.quantity,startsAt:r.starts_at,endsAt:r.ends_at}));
    },
    roomBlocks: (roomId,excludeId=null) => rows(`SELECT * FROM availability_blocks WHERE room_id=? AND released_at IS NULL
      AND (? IS NULL OR id<>?) ORDER BY id FOR UPDATE`,[roomId,excludeId,excludeId]),
    async createResource(householdId,input) {
      await execute(`INSERT INTO resources (household_id,code,name,resource_type,total_quantity,max_people_per_unit,supply_contact) VALUES (?,?,?,?,?,?,?)`,
        [householdId,input.code,input.name,input.resourceType,input.totalQuantity,input.maxPeoplePerUnit,input.supplyContact]);
      return String((await first('SELECT CAST(LAST_INSERT_ID() AS CHAR) id')).id);
    },
    updateResource: (id,input) => execute('UPDATE resources SET name=?,total_quantity=?,max_people_per_unit=?,supply_contact=? WHERE id=?',
      [input.name,input.totalQuantity,input.maxPeoplePerUnit,input.supplyContact,id]),
    archiveResource: id => execute('UPDATE resources SET archived_at=UTC_TIMESTAMP(6) WHERE id=?',[id]),
    async listResources(householdId,input) {
      const where=`household_id=?${input.includeArchived?'':' AND archived_at IS NULL'}`;
      const count=await first(`SELECT COUNT(*) total FROM resources WHERE ${where}`,[householdId]);
      return {rows:await rows(`SELECT * FROM resources WHERE ${where} ORDER BY id DESC ${limit(input)}`,[householdId]),total:Number(count.total)};
    },
    async createSlot(householdId,actorId,input) {
      await execute(`INSERT INTO service_slots (household_id,service_id,place_id,starts_at,ends_at,person_capacity,visibility,sales_status,created_by,
        readiness_status,readiness_note,readiness_confirmed_by,readiness_confirmed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [householdId,input.serviceId,input.placeId,new Date(input.startsAt),new Date(input.endsAt),input.personCapacity,input.visibility,input.salesStatus,actorId,
          input.readinessStatus,input.readinessNote,input.readinessStatus==='CONFIRMED'?actorId:null,input.readinessStatus==='CONFIRMED'?new Date():null]);
      return String((await first('SELECT CAST(LAST_INSERT_ID() AS CHAR) id')).id);
    },
    updateSlot: (id,actorId,input) => execute(`UPDATE service_slots SET place_id=?,starts_at=?,ends_at=?,person_capacity=?,visibility=?,sales_status=?,
      readiness_status=?,readiness_note=?,readiness_confirmed_by=?,readiness_confirmed_at=? WHERE id=?`,
      [input.placeId,new Date(input.startsAt),new Date(input.endsAt),input.personCapacity,input.visibility,input.salesStatus,input.readinessStatus,input.readinessNote,
        input.readinessStatus==='CONFIRMED'?actorId:null,input.readinessStatus==='CONFIRMED'?new Date():null,id]),
    async saveSlotConfiguration(slot, input) {
      await execute('UPDATE slot_offers SET is_enabled=0 WHERE slot_id=?',[slot.id]);
      for (const offer of input.offers) await execute(`INSERT INTO slot_offers (household_id,service_id,slot_id,offer_id,is_enabled,price_override_vnd)
        VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE is_enabled=VALUES(is_enabled),price_override_vnd=VALUES(price_override_vnd)`,
        [slot.household_id,slot.service_id,slot.id,offer.offerId,Number(offer.isEnabled),offer.priceOverrideVnd]);
      await execute('UPDATE slot_resource_assignments SET released_at=COALESCE(released_at,UTC_TIMESTAMP(6)) WHERE slot_id=?',[slot.id]);
      for (const assignment of input.assignments) await execute(`INSERT INTO slot_resource_assignments
        (household_id,slot_id,resource_id,quantity,allocation_mode,preparation_minutes,cleanup_minutes,note) VALUES (?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE quantity=VALUES(quantity),allocation_mode=VALUES(allocation_mode),preparation_minutes=VALUES(preparation_minutes),
        cleanup_minutes=VALUES(cleanup_minutes),note=VALUES(note),released_at=NULL`,
        [slot.household_id,slot.id,assignment.resourceId,assignment.quantity,assignment.allocationMode,assignment.preparationMinutes,assignment.cleanupMinutes,assignment.note]);
      await execute('DELETE FROM slot_offer_resource_rules WHERE slot_id=?',[slot.id]);
      const offers=await this.slotOffers(slot.id),assignments=await this.assignments(slot.id);
      for (const assignment of input.assignments) for (const rule of assignment.rules) await execute(`INSERT INTO slot_offer_resource_rules
        (household_id,slot_id,slot_offer_id,assignment_id,usage_basis,units_required,max_people_per_unit) VALUES (?,?,?,?,?,?,?)`,
        [slot.household_id,slot.id,offers.find(o=>String(o.offer_id)===rule.offerId).id,assignments.find(a=>String(a.resource_id)===assignment.resourceId).id,
          rule.usageBasis,rule.unitsRequired,rule.maxPeoplePerUnit]);
    },
    async archiveSlot(id) {
      await execute("UPDATE service_slots SET archived_at=UTC_TIMESTAMP(6),sales_status='CANCELLED' WHERE id=?",[id]);
      await execute('UPDATE slot_resource_assignments SET released_at=COALESCE(released_at,UTC_TIMESTAMP(6)) WHERE slot_id=?',[id]);
    },
    async listSlots(householdId,input,publicOnly=false) {
      let where='s.household_id=? AND s.starts_at<? AND s.ends_at>?';const values=[householdId,new Date(input.to),new Date(input.from)];
      if(input.serviceId){where+=' AND s.service_id=?';values.push(input.serviceId);}
      if(!input.includeArchived)where+=' AND s.archived_at IS NULL';
      if(publicOnly)where+=` AND s.visibility='PUBLIC' AND s.sales_status='OPEN' AND s.readiness_status='CONFIRMED' AND s.starts_at>UTC_TIMESTAMP(6)
        AND EXISTS (SELECT 1 FROM places p JOIN content_revisions pr ON pr.id=p.published_revision_id AND pr.place_id=p.id AND pr.status='APPROVED'
          WHERE p.id=s.place_id AND p.household_id=s.household_id AND p.archived_at IS NULL AND p.visibility='VISIBLE' AND p.supply_status='AVAILABLE')
        AND EXISTS (SELECT 1 FROM slot_offers so JOIN service_offers o ON o.id=so.offer_id AND o.service_id=s.service_id
          JOIN services sv ON sv.id=s.service_id JOIN content_revisions cr ON cr.id=sv.published_revision_id AND cr.status='APPROVED'
          WHERE so.slot_id=s.id AND so.is_enabled=1 AND o.is_active=1
            AND JSON_CONTAINS(cr.details,JSON_OBJECT('id',CAST(o.id AS CHAR),'structureToken',JSON_UNQUOTE(JSON_EXTRACT(o.terms,'$._structure_token'))),'$.offers_snapshot')=1)`;
      const count=await first(`SELECT COUNT(*) total FROM service_slots s WHERE ${where}`,values);
      return {rows:await rows(`SELECT s.* FROM service_slots s WHERE ${where} ORDER BY s.starts_at,s.id ${limit(input)}`,values),total:Number(count.total)};
    },
    async createBlock(householdId,actorId,input) {
      await execute('INSERT INTO availability_blocks (household_id,room_id,resource_id,starts_at,ends_at,quantity,reason,created_by) VALUES (?,?,?,?,?,?,?,?)',
        [householdId,input.roomId,input.resourceId,new Date(input.startsAt),input.endsAt?new Date(input.endsAt):null,input.quantity,input.reason,actorId]);
      return String((await first('SELECT CAST(LAST_INSERT_ID() AS CHAR) id')).id);
    },
    updateBlock: (id,input) => execute('UPDATE availability_blocks SET starts_at=?,ends_at=?,quantity=?,reason=? WHERE id=?',
      [new Date(input.startsAt),input.endsAt?new Date(input.endsAt):null,input.quantity,input.reason,id]),
    releaseBlock: id => execute('UPDATE availability_blocks SET released_at=UTC_TIMESTAMP(6) WHERE id=?',[id]),
    async listBlocks(householdId,input) {
      let where='household_id=? AND starts_at<? AND (ends_at IS NULL OR ends_at>?)';const values=[householdId,new Date(input.to),new Date(input.from)];
      if(!input.includeReleased)where+=' AND released_at IS NULL';
      for(const [field,column] of [['roomId','room_id'],['resourceId','resource_id']])if(input[field]){where+=` AND ${column}=?`;values.push(input[field]);}
      const count=await first(`SELECT COUNT(*) total FROM availability_blocks WHERE ${where}`,values);
      return {rows:await rows(`SELECT * FROM availability_blocks WHERE ${where} ORDER BY starts_at,id ${limit(input)}`,values),total:Number(count.total)};
    },
  };
}
export function createCalendarRepository(database) {
  return {transaction:work=>database.transaction(c=>work(createCalendarQueries(c)))};
}
