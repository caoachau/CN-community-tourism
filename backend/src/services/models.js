import { createHash } from 'node:crypto';
import { offerConfigSchema, quantityRules, tokenSchema } from './schemas.js';
import { databaseIdSchema } from '../shared/validation.js';

export const json = value => typeof value === 'string' ? JSON.parse(value) : value;
export const timestamp = value => value ? (value instanceof Date ? value : new Date(value)).toISOString() : null;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value==='object'
  ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
export const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const strings = value => Array.isArray(value) ? value.filter(item=>typeof item==='string') : [];

export function offerConfiguration(row) {
  const terms=json(row.terms)??{},addons=json(row.addons)?.items??[];
  return {
    name:row.name,participationMode:row.participation_mode,pricingType:row.pricing_type,unitPriceVnd:Number(row.unit_price_vnd),unitLabel:row.unit_label,
    minParticipants:row.min_participants,maxParticipants:row.max_participants,maxUnits:row.max_units,participantsPerUnit:row.participants_per_unit,
    terms:{scopeDescription:typeof terms.scope_description==='string'?terms.scope_description:'',includedItems:strings(terms.included_items),excludedItems:strings(terms.excluded_items)},
    addons:addons.map(item=>({key:item.key,name:item.name,unitPriceVnd:item.unit_price_vnd,maxQuantity:item.max_quantity,isActive:item.is_active,resourceFree:true})),isActive:Boolean(row.is_active),
  };
}
export function structureToken(configuration) {
  const {unitPriceVnd,isActive,addons,...fixed}=configuration;
  return digest({...fixed,addons:addons.map(({unitPriceVnd:price,isActive:active,...rest})=>rest)});
}
export function offerOf(row) {
  const config=offerConfiguration(row);
  return {id:String(row.id),...config,quantityRule:quantityRules[config.pricingType],token:digest({id:String(row.id),...config}),structureToken:structureToken(config),createdAt:timestamp(row.created_at)};
}
export const offersToken = rows => digest(rows.map(row=>{const offer=offerOf(row);return {id:offer.id,token:offer.token};}));
export const snapshotOf = row => { const {token,quantityRule,createdAt,...snapshot}=offerOf(row);return snapshot; };
export function encodeOffer(config) {
  return {
    terms:JSON.stringify({scope_description:config.terms.scopeDescription,included_items:config.terms.includedItems,excluded_items:config.terms.excludedItems,_structure_token:structureToken(config)}),
    addons:JSON.stringify({schema_version:1,items:config.addons.map(item=>({key:item.key,name:item.name,unit_price_vnd:item.unitPriceVnd,max_quantity:item.maxQuantity,is_active:item.isActive}))}),
  };
}
export function snapshotsOf(revision) {
  const data=json(revision.details)??{};
  if (!Array.isArray(data.offers_snapshot)) return [];
  return data.offers_snapshot.flatMap(snapshot=>{
    if (!snapshot || !databaseIdSchema.safeParse(snapshot.id).success || !tokenSchema.safeParse(snapshot.structureToken).success) return [];
    const {id,structureToken:storedToken,...config}=snapshot;
    const result=offerConfigSchema.safeParse(config);
    if (!result.success || structureToken(result.data)!==storedToken) return [];
    return [{id,...result.data,structureToken:storedToken}];
  });
}
export function approvedOffers(revision, rows, filters={}) {
  const byId=new Map(rows.map(row=>[String(row.id),row]));
  return snapshotsOf(revision).flatMap(snapshot=>{
    const row=byId.get(snapshot.id);
    if (!row || !row.is_active) return [];
    const live=offerConfiguration(row);
    if (structureToken(live)!==snapshot.structureToken || (filters.pricingType&&snapshot.pricingType!==filters.pricingType) ||
        (filters.participationMode&&snapshot.participationMode!==filters.participationMode)) return [];
    const addons=snapshot.addons.flatMap(addon=>{const current=live.addons.find(item=>item.key===addon.key);return current?.isActive?[{...addon,unitPriceVnd:current.unitPriceVnd,isActive:true}]:[];});
    const {structureToken:internal,...safe}=snapshot;
    return [{...safe,unitPriceVnd:live.unitPriceVnd,isActive:true,addons,quantityRule:quantityRules[snapshot.pricingType]}];
  });
}
export function profileInput(revision, root) {
  const details=json(revision.details)??{};
  return {title:revision.title,body:revision.body,categoryId:String(details.category_id??root.category_id),
    defaultPlaceId:Object.hasOwn(details,'default_place_id')?details.default_place_id:root.default_place_id?String(root.default_place_id):null,
    defaultDurationMinutes:details.default_duration_minutes??root.default_duration_minutes,
    details:{participationConditions:strings(details.participation_conditions),preparationNotes:strings(details.preparation_notes)}};
}
export function profileOf(revision, root) {
  return revision ? {revisionId:String(revision.id),version:revision.version,...profileInput(revision,root),offerSnapshots:snapshotsOf(revision),schemaVersion:revision.schema_version,
    status:revision.status,submittedAt:timestamp(revision.submitted_at),reviewedBy:revision.reviewed_by?String(revision.reviewed_by):null,reviewedAt:timestamp(revision.reviewed_at),reviewNote:revision.review_note,createdAt:timestamp(revision.created_at)} : null;
}
export const rootOf = row => ({id:String(row.id),householdId:String(row.household_id),code:row.code,categoryId:String(row.category_id),defaultPlaceId:row.default_place_id?String(row.default_place_id):null,
  defaultDurationMinutes:row.default_duration_minutes,supplyStatus:row.supply_status,visibility:row.visibility,publishedRevisionId:row.published_revision_id?String(row.published_revision_id):null,archivedAt:timestamp(row.archived_at),createdAt:timestamp(row.created_at)});
