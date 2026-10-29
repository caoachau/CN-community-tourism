import { z } from 'zod';
import { databaseIdSchema as id, paginationSchema, vndAmountSchema } from '../shared/validation.js';

export const instant = z.iso.datetime({offset:true}).refine(value=>{
  const time = Date.parse(value); return Number.isFinite(time) && time % 1000 === 0 && time >= Date.UTC(2000,0,1) && time < Date.UTC(2100,0,1);
});
export const reason = z.string().trim().min(1).max(1000);
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const commandSchema = z.strictObject({ expectedToken:tokenSchema, reason });
const integer = max => z.number().int().min(1).max(max);
const booleanQuery = z.enum(['true','false']).transform(v=>v==='true').default(false);
export const windowSchema = z.strictObject({ from:instant, to:instant }).refine(v=>Date.parse(v.to)>Date.parse(v.from) && Date.parse(v.to)-Date.parse(v.from)<=93*86400000);
export const slotQuerySchema = paginationSchema.extend({ from:instant,to:instant,serviceId:id.optional(),includeArchived:booleanQuery })
  .refine(v=>windowSchema.safeParse({from:v.from,to:v.to}).success);
export const resourceQuerySchema = paginationSchema.extend({ includeArchived:booleanQuery });
export const blockQuerySchema = paginationSchema.extend({from:instant,to:instant,roomId:id.optional(),resourceId:id.optional(),includeReleased:booleanQuery})
  .refine(v=>windowSchema.safeParse({from:v.from,to:v.to}).success);
export const resourceCreateSchema = z.strictObject({code:z.string().trim().regex(/^[A-Z][A-Z0-9_-]{0,39}$/),name:z.string().trim().min(1).max(150),
  resourceType:z.enum(['SINGLE','POOL']),totalQuantity:integer(100000),maxPeoplePerUnit:integer(1000).nullable().default(null),
  supplyContact:z.string().trim().max(1000).nullable().default(null)}).refine(v=>v.resourceType!=='SINGLE'||v.totalQuantity===1);
export const resourceUpdateSchema = z.strictObject({expectedToken:tokenSchema,reason,name:z.string().trim().min(1).max(150),totalQuantity:integer(100000),
  maxPeoplePerUnit:integer(1000).nullable(),supplyContact:z.string().trim().max(1000).nullable()});
const rule = z.strictObject({offerId:id,usageBasis:z.enum(['SHARED_ONCE','PER_PERSON','PER_GROUP','PER_UNIT','FIXED']),
  unitsRequired:integer(100000),maxPeoplePerUnit:integer(1000).nullable().default(null)})
  .refine(v=>v.usageBasis!=='PER_GROUP'||v.maxPeoplePerUnit!==null);
const assignment = z.strictObject({resourceId:id,quantity:integer(100000),allocationMode:z.enum(['SESSION_SHARED','PER_BOOKING_QUOTA']),
  preparationMinutes:z.number().int().min(0).max(10080).default(0),cleanupMinutes:z.number().int().min(0).max(10080).default(0),
  note:z.string().trim().max(1000).nullable().default(null),rules:z.array(rule).max(32).default([])})
  .refine(v=>new Set(v.rules.map(r=>r.offerId)).size===v.rules.length && v.rules.every(r=>
    v.allocationMode==='SESSION_SHARED' ? r.usageBasis==='SHARED_ONCE' : r.usageBasis!=='SHARED_ONCE'));
const offer = z.strictObject({offerId:id,isEnabled:z.boolean().default(true),priceOverrideVnd:vndAmountSchema.nullable().default(null)});
const slotFields = {serviceId:id,placeId:id.nullable().default(null),startsAt:instant,endsAt:instant,personCapacity:integer(100000),
  visibility:z.enum(['PUBLIC','PRIVATE']).default('PUBLIC'),salesStatus:z.enum(['DRAFT','OPEN','CLOSED','CANCELLED']).default('DRAFT'),
  readinessStatus:z.enum(['AWAITING_CONFIRMATION','CONFIRMED','UNAVAILABLE']).default('AWAITING_CONFIRMATION'),
  readinessNote:z.string().trim().max(1000).nullable().default(null),offers:z.array(offer).max(32).default([]),assignments:z.array(assignment).max(32).default([])};
const validSlot = v=>Date.parse(v.endsAt)>Date.parse(v.startsAt) && Date.parse(v.endsAt)-Date.parse(v.startsAt)<=7*86400000 &&
  new Set(v.offers.map(o=>o.offerId)).size===v.offers.length && new Set(v.assignments.map(a=>a.resourceId)).size===v.assignments.length &&
  !(v.visibility==='PRIVATE'&&v.salesStatus==='OPEN') && !(v.salesStatus==='OPEN'&&v.readinessStatus!=='CONFIRMED');
export const slotCreateSchema = z.strictObject(slotFields).refine(validSlot);
export const slotUpdateSchema = z.strictObject({...slotFields,expectedToken:tokenSchema,reason}).refine(validSlot);
const blockFields = {roomId:id.nullable().default(null),resourceId:id.nullable().default(null),startsAt:instant,endsAt:instant.nullable(),quantity:integer(100000),reason};
const validBlock = v=>Boolean(v.roomId)!==Boolean(v.resourceId) && (!v.roomId||v.quantity===1) && (v.endsAt===null||Date.parse(v.endsAt)>Date.parse(v.startsAt));
export const blockCreateSchema = z.strictObject(blockFields).refine(validBlock);
export const blockUpdateSchema = z.strictObject({...blockFields,expectedToken:tokenSchema}).refine(validBlock);
const queryInteger = max=>z.string().regex(/^[1-9][0-9]{0,5}$/).transform(Number).pipe(integer(max));
export const publicSlotQuerySchema = paginationSchema.extend({from:instant,to:instant,participants:queryInteger(100000).default(1),units:queryInteger(100000).default(1)})
  .refine(v=>windowSchema.safeParse({from:v.from,to:v.to}).success);
const day = z.iso.date();
export const roomAvailabilitySchema = z.strictObject({checkInDate:day,checkOutDate:day,guests:queryInteger(1000).default(1)})
  .refine(v=>Date.parse(v.checkOutDate)>Date.parse(v.checkInDate)&&Date.parse(v.checkOutDate)-Date.parse(v.checkInDate)<=365*86400000);
