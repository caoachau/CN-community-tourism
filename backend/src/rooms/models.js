import { createHash } from 'node:crypto';

export const json = value => typeof value === 'string' ? JSON.parse(value) : value;
export const timestamp = value => value ? (value instanceof Date ? value : new Date(value)).toISOString() : null;
const strings = value => Array.isArray(value) ? value.filter(item=>typeof item==='string') : [];
const time = value => String(value).slice(0,5);
const termsOf = value => { const data=json(value)??{}; return { includedItems:strings(data.included_items), excludedItems:strings(data.excluded_items) }; };
export const encodeTerms = terms => ({included_items:terms.includedItems,excluded_items:terms.excludedItems});
export const pricingToken = root => createHash('sha256').update(JSON.stringify({id:String(root.id),nightlyPriceVnd:Number(root.nightly_price_vnd)})).digest('hex');
export function profileInput(revision, root) {
  const data=json(revision.details)??{};
  return { title:revision.title,body:revision.body,
    placeId:Object.hasOwn(data,'place_id') ? data.place_id===null?null:String(data.place_id) : root.place_id?String(root.place_id):null,
    maxGuests:data.max_guests??root.max_guests,checkInTime:time(data.check_in_time??root.check_in_time),checkOutTime:time(data.check_out_time??root.check_out_time),
    terms:termsOf(data.terms??root.terms),details:{amenities:strings(data.amenities),houseRules:strings(data.house_rules)} };
}
export function encodeProfile(profile) {
  return {place_id:profile.placeId,max_guests:profile.maxGuests,check_in_time:profile.checkInTime,check_out_time:profile.checkOutTime,
    terms:encodeTerms(profile.terms),amenities:profile.details.amenities,house_rules:profile.details.houseRules};
}
export function profileOf(revision,root) {
  if (!revision) return null;
  const price=json(revision.details)?.nightly_price_snapshot_vnd;
  return { revisionId:String(revision.id),version:revision.version,...profileInput(revision,root),nightlyPriceSnapshotVnd:price===undefined?null:Number(price),
    schemaVersion:revision.schema_version,status:revision.status,submittedAt:timestamp(revision.submitted_at),reviewedBy:revision.reviewed_by?String(revision.reviewed_by):null,
    reviewedAt:timestamp(revision.reviewed_at),reviewNote:revision.review_note,createdAt:timestamp(revision.created_at) };
}
export const rootOf = row => ({id:String(row.id),householdId:String(row.household_id),code:row.code,placeId:row.place_id?String(row.place_id):null,
  maxGuests:row.max_guests,nightlyPriceVnd:Number(row.nightly_price_vnd),pricingToken:pricingToken(row),pricingType:'PER_NIGHT',
  checkInTime:time(row.check_in_time),checkOutTime:time(row.check_out_time),terms:termsOf(row.terms),
  supplyStatus:row.supply_status,visibility:row.visibility,publishedRevisionId:row.published_revision_id?String(row.published_revision_id):null,
  archivedAt:timestamp(row.archived_at),createdAt:timestamp(row.created_at)});
export function structureChanged(root,profile) {
  return (root.place_id?String(root.place_id):null)!==profile.placeId || root.max_guests!==profile.maxGuests ||
    time(root.check_in_time)!==profile.checkInTime || time(root.check_out_time)!==profile.checkOutTime;
}
export function publicRoomOf(row) {
  const profile=profileInput(row,row),data=json(row.place_details)??{};
  const location=Object.fromEntries([['address',data.address],['locality',data.locality],['directions',data.directions],['contactPhone',data.contact_phone]].filter(([,value])=>typeof value==='string'));
  if(data.coordinates && Number.isFinite(data.coordinates.latitude) && Math.abs(data.coordinates.latitude)<=90 && Number.isFinite(data.coordinates.longitude) && Math.abs(data.coordinates.longitude)<=180) location.coordinates={latitude:data.coordinates.latitude,longitude:data.coordinates.longitude};
  return {id:String(row.id),code:row.code,householdId:String(row.household_id),householdName:row.household_name,revisionId:String(row.revision_id),version:row.revision_version,
    ...profile,nightlyPriceVnd:Number(row.nightly_price_vnd),pricingType:'PER_NIGHT',timeZone:'Asia/Ho_Chi_Minh',
    place:{id:String(row.place_id),code:row.place_code,title:row.place_name,details:location},publishedAt:timestamp(row.published_at)};
}
