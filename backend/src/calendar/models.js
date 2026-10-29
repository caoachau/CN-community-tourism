import { createHash } from 'node:crypto';

export const iso = value => value == null ? null : new Date(value).toISOString();
export const token = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const overlaps = (a, b) => +new Date(a.startsAt) < (b.endsAt == null ? Infinity : +new Date(b.endsAt)) &&
  +new Date(b.startsAt) < (a.endsAt == null ? Infinity : +new Date(a.endsAt));

// Half-open intervals: departures/releases precede arrivals at the same instant.
// Sum only intervals that coexist, not all rows which intersect a long range.
export function peakQuantity(rows, window = null) {
  const events = [];
  for (const row of rows) {
    const start = Math.max(+new Date(row.startsAt), window ? +new Date(window.startsAt) : -Infinity);
    const end = Math.min(row.endsAt == null ? Infinity : +new Date(row.endsAt), window?.endsAt == null ? Infinity : +new Date(window.endsAt));
    if (start < end) { events.push([start, row.quantity]); events.push([end, -row.quantity]); }
  }
  events.sort((a,b) => a[0] - b[0] || a[1] - b[1]);
  let current = 0, peak = 0;
  for (const [, change] of events) { current += change; peak = Math.max(peak, current); }
  return peak;
}
export const resourceOf = row => {
  const data = { id:String(row.id), code:row.code, name:row.name, resourceType:row.resource_type, totalQuantity:row.total_quantity,
    maxPeoplePerUnit:row.max_people_per_unit, supplyContact:row.supply_contact, archivedAt:iso(row.archived_at) };
  return { ...data, token:token(data) };
};
export const blockOf = row => {
  const data = { id:String(row.id), roomId:row.room_id ? String(row.room_id) : null, resourceId:row.resource_id ? String(row.resource_id) : null,
    startsAt:iso(row.starts_at), endsAt:iso(row.ends_at), quantity:row.quantity, reason:row.reason, releasedAt:iso(row.released_at) };
  return { ...data, token:token(data) };
};
export function slotOf(row, offers, assignments, rules) {
  const data = { id:String(row.id), serviceId:String(row.service_id), placeId:row.place_id ? String(row.place_id) : null,
    startsAt:iso(row.starts_at), endsAt:iso(row.ends_at), personCapacity:row.person_capacity, visibility:row.visibility,
    salesStatus:row.sales_status, readinessStatus:row.readiness_status, readinessNote:row.readiness_note,
    readinessConfirmedAt:iso(row.readiness_confirmed_at), archivedAt:iso(row.archived_at),
    offers:offers.map(o=>({offerId:String(o.offer_id),isEnabled:Boolean(o.is_enabled),priceOverrideVnd:o.price_override_vnd == null ? null : Number(o.price_override_vnd)})),
    assignments:assignments.filter(a=>!a.released_at).map(a=>({resourceId:String(a.resource_id),quantity:a.quantity,allocationMode:a.allocation_mode,
      preparationMinutes:a.preparation_minutes,cleanupMinutes:a.cleanup_minutes,note:a.note,
      rules:rules.filter(r=>String(r.assignment_id)===String(a.id)).map(r=>({offerId:String(r.offer_id),usageBasis:r.usage_basis,unitsRequired:r.units_required,maxPeoplePerUnit:r.max_people_per_unit}))})),
  };
  return { ...data, token:token(data) };
}
export const slotConfiguration = value => {
  const { id, token:version, archivedAt, readinessConfirmedAt, ...configuration } = value;
  return configuration;
};
export function offerAvailability(offer, slot, items, assignments, rules, usages, participants, units) {
  const occupiedPeople = items.reduce((sum,item)=>sum+item.participant_count,0);
  const exclusive = items.some(item=>item.is_exclusive);
  let remainingCapacity = exclusive || (offer.participationMode === 'EXCLUSIVE' && items.length) ? 0 : Math.max(0, slot.person_capacity - occupiedPeople);
  remainingCapacity = Math.min(remainingCapacity,offer.maxParticipants);
  let available = !exclusive && participants <= remainingCapacity && participants >= offer.minParticipants && participants <= offer.maxParticipants &&
    (offer.participationMode !== 'EXCLUSIVE' || items.length === 0);
  if (offer.pricingType === 'PER_UNIT') available &&= units <= offer.maxUnits && participants <= units * offer.participantsPerUnit;
  const constraints = rules.filter(rule=>String(rule.offer_id)===offer.id);
  for (const rule of constraints) {
    const assignment = assignments.find(a=>String(a.id)===String(rule.assignment_id) && !a.released_at);
    if (!assignment) { available = false; remainingCapacity = 0; continue; }
    const used = usages.filter(u=>String(u.assignment_id)===String(assignment.id)).reduce((sum,u)=>sum+u.quantity,0);
    const free = Math.max(0,assignment.quantity-(rule.usage_basis==='SHARED_ONCE'?0:used));
    const needed = rule.units_required * (rule.usage_basis === 'PER_PERSON' ? participants : rule.usage_basis === 'PER_UNIT' ? units :
      rule.usage_basis === 'PER_GROUP' ? Math.ceil(participants / rule.max_people_per_unit) : 1);
    if (needed > assignment.quantity - (rule.usage_basis === 'SHARED_ONCE' ? 0 : used)) available = false;
    if (rule.max_people_per_unit && (rule.usage_basis === 'SHARED_ONCE' ? participants + occupiedPeople > rule.units_required * rule.max_people_per_unit : participants > needed * rule.max_people_per_unit)) available = false;
    const freeGroups=Math.floor(free/rule.units_required);
    if(!freeGroups)remainingCapacity=0;
    if(rule.usage_basis==='PER_PERSON')remainingCapacity=Math.min(remainingCapacity,freeGroups);
    if(rule.usage_basis==='PER_GROUP')remainingCapacity=Math.min(remainingCapacity,freeGroups*rule.max_people_per_unit);
    if(rule.usage_basis==='PER_UNIT')remainingCapacity=Math.min(remainingCapacity,freeGroups*Math.min(offer.participantsPerUnit,rule.max_people_per_unit?rule.units_required*rule.max_people_per_unit:Infinity));
    if(rule.usage_basis==='FIXED'&&(!freeGroups||rule.max_people_per_unit))remainingCapacity=Math.min(remainingCapacity,freeGroups?rule.units_required*rule.max_people_per_unit:0);
    if(rule.usage_basis==='SHARED_ONCE'&&rule.max_people_per_unit)remainingCapacity=Math.min(remainingCapacity,Math.max(0,rule.units_required*rule.max_people_per_unit-occupiedPeople));
  }
  available &&= participants <= remainingCapacity;
  return { available, remainingCapacity, occupiedPeople };
}
