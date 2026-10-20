import { z } from 'zod';
import { databaseIdSchema, paginationSchema, vndAmountSchema } from '../shared/validation.js';
import { revisionReferenceSchema } from '../households/schemas.js';

const text = max => z.string().trim().min(1).max(max);
const strings = max => z.array(text(500)).max(max);
export const roomTimeSchema = z.string().regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/);
export const pricingTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const terms = z.strictObject({ includedItems:strings(32).default([]), excludedItems:strings(32).default([]) });
const details = z.strictObject({ amenities:strings(50).default([]), houseRules:strings(32).default([]) });
export const roomProfileSchema = z.strictObject({
  title:text(200), body:z.string().trim().max(20000).default(''), placeId:databaseIdSchema.nullable().default(null),
  maxGuests:z.number().int().min(1).max(1000), checkInTime:roomTimeSchema.default('14:00'), checkOutTime:roomTimeSchema.default('12:00'),
  terms:terms.default({includedItems:[],excludedItems:[]}), details:details.default({amenities:[],houseRules:[]}),
});
export const roomCreateSchema = roomProfileSchema.extend({ nightlyPriceVnd:vndAmountSchema });
export const roomSaveSchema = roomProfileSchema.extend(revisionReferenceSchema.shape);
export const roomSubmitSchema = revisionReferenceSchema.extend({ pricingToken:pricingTokenSchema });
export const roomPriceSchema = z.strictObject({ expectedToken:pricingTokenSchema, nightlyPriceVnd:vndAmountSchema, reason:text(2000) });
export const roomParamsSchema = z.strictObject({ roomId:databaseIdSchema });
const state = z.strictObject({ supplyStatus:z.enum(['AVAILABLE','PAUSED','RETIRED']), visibility:z.enum(['VISIBLE','HIDDEN']) });
export const roomStatusSchema = state.extend({ expectedState:state, reason:text(2000) });
const queryInteger = max => z.string().max(15).regex(/^(0|[1-9][0-9]*)$/).transform(Number).refine(value=>value<=max);
export const publicRoomQuerySchema = paginationSchema.extend({
  householdId:databaseIdSchema.optional(), placeId:databaseIdSchema.optional(), q:text(100).optional(),
  guests:queryInteger(1000).refine(value=>value>=1).optional(),
  minPriceVnd:queryInteger(999999999999999).optional(), maxPriceVnd:queryInteger(999999999999999).optional(),
}).refine(value=>value.minPriceVnd===undefined || value.maxPriceVnd===undefined || value.minPriceVnd<=value.maxPriceVnd);
export const roomReviewQuerySchema = paginationSchema.extend({ status:z.enum(['PENDING','APPROVED','REJECTED']).default('PENDING'), householdId:databaseIdSchema.optional() });
