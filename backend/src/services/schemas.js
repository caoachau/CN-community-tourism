import { z } from 'zod';
import { databaseIdSchema, paginationSchema, vndAmountSchema } from '../shared/validation.js';
import { revisionReferenceSchema } from '../households/schemas.js';

export const pricingTypes = ['PER_PERSON','PER_GROUP','PER_TRIP','FIXED_PACKAGE','PER_HOUR','PER_UNIT'];
export const participationModes = ['SHARED','EXCLUSIVE'];
export const quantityRules = { PER_PERSON:'PARTICIPANT_COUNT',PER_GROUP:'ONE',PER_TRIP:'ONE',FIXED_PACKAGE:'ONE',PER_HOUR:'SLOT_DURATION_HOURS',PER_UNIT:'SELECTED_UNITS' };
const labels = { PER_PERSON:'người',PER_GROUP:'nhóm',PER_TRIP:'chuyến',FIXED_PACKAGE:'gói',PER_HOUR:'giờ' };
const text = max => z.string().trim().min(1).max(max);
const positive = z.number().int().min(1).max(100000);
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const terms = z.strictObject({ scopeDescription:z.string().trim().max(2000).default(''),includedItems:z.array(text(500)).max(32).default([]),excludedItems:z.array(text(500)).max(32).default([]) });
const addon = z.strictObject({ key:z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),name:text(150),unitPriceVnd:vndAmountSchema,maxQuantity:positive,isActive:z.boolean(),resourceFree:z.literal(true) });
export const offerFieldsSchema = z.strictObject({
  name:text(150),participationMode:z.enum(participationModes),pricingType:z.enum(pricingTypes),unitPriceVnd:vndAmountSchema,
  unitLabel:text(60).optional(),minParticipants:positive,maxParticipants:positive,maxUnits:positive.nullable().default(null),participantsPerUnit:positive.nullable().default(null),
  terms:terms.default({scopeDescription:'',includedItems:[],excludedItems:[]}),addons:z.array(addon).max(32).default([]),isActive:z.boolean().default(true),
});
export const offerConfigSchema = offerFieldsSchema.superRefine((value,ctx)=>{
  if (value.maxParticipants < value.minParticipants) ctx.addIssue({code:'custom',path:['maxParticipants']});
  if (value.pricingType === 'PER_UNIT') {
    if (!value.unitLabel) ctx.addIssue({code:'custom',path:['unitLabel']});
    if (value.maxUnits === null) ctx.addIssue({code:'custom',path:['maxUnits']});
    if (value.participantsPerUnit === null) ctx.addIssue({code:'custom',path:['participantsPerUnit']});
    if (value.maxUnits !== null && value.participantsPerUnit !== null && value.maxParticipants > value.maxUnits * value.participantsPerUnit) ctx.addIssue({code:'custom',path:['maxParticipants']});
  } else {
    if (value.maxUnits !== null || value.participantsPerUnit !== null) ctx.addIssue({code:'custom',path:['maxUnits']});
    if (value.unitLabel !== undefined && value.unitLabel !== labels[value.pricingType]) ctx.addIssue({code:'custom',path:['unitLabel']});
  }
  if (new Set(value.addons.map(item=>item.key)).size !== value.addons.length) ctx.addIssue({code:'custom',path:['addons']});
}).transform(value=>({...value,unitLabel:value.unitLabel??labels[value.pricingType]}));
export const offerUpdateSchema = z.strictObject({expectedToken:tokenSchema,reason:text(2000),configuration:offerConfigSchema});
const priceChange = z.strictObject({key:z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),unitPriceVnd:vndAmountSchema.optional(),isActive:z.boolean().optional()})
  .refine(value=>value.unitPriceVnd!==undefined||value.isActive!==undefined);
export const offerPriceSchema = z.strictObject({
  expectedToken:tokenSchema,reason:text(2000),unitPriceVnd:vndAmountSchema.optional(),isActive:z.boolean().optional(),addonPrices:z.array(priceChange).min(1).max(32).optional(),
}).refine(value=>value.unitPriceVnd!==undefined||value.isActive!==undefined||value.addonPrices!==undefined)
  .refine(value=>!value.addonPrices||new Set(value.addonPrices.map(item=>item.key)).size===value.addonPrices.length);

const details = z.strictObject({ participationConditions:z.array(text(1000)).max(20).default([]),preparationNotes:z.array(text(1000)).max(20).default([]) });
export const serviceProfileSchema = z.strictObject({
  title:text(200),body:z.string().trim().max(20000).default(''),categoryId:databaseIdSchema,defaultPlaceId:databaseIdSchema.nullable().default(null),
  defaultDurationMinutes:z.number().int().min(1).max(10080),details:details.default({participationConditions:[],preparationNotes:[]}),
});
export const serviceSaveSchema = serviceProfileSchema.extend(revisionReferenceSchema.shape);
export const serviceSubmitSchema = revisionReferenceSchema.extend({offersToken:tokenSchema});
export const serviceParamsSchema = z.strictObject({serviceId:databaseIdSchema});
export const offerParamsSchema = serviceParamsSchema.extend({offerId:databaseIdSchema});
const state = z.strictObject({supplyStatus:z.enum(['AVAILABLE','PAUSED','RETIRED']),visibility:z.enum(['VISIBLE','HIDDEN'])});
export const serviceStatusSchema = state.extend({expectedState:state,reason:text(2000)});
export const publicServiceQuerySchema = paginationSchema.extend({
  householdId:databaseIdSchema.optional(),categoryId:databaseIdSchema.optional(),placeId:databaseIdSchema.optional(),q:text(100).optional(),
  pricingType:z.enum(pricingTypes).optional(),participationMode:z.enum(participationModes).optional(),
});
export const serviceReviewQuerySchema = paginationSchema.extend({status:z.enum(['PENDING','APPROVED','REJECTED']).default('PENDING'),householdId:databaseIdSchema.optional()});
