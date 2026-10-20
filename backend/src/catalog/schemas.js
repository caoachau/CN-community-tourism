import { z } from 'zod';
import { databaseIdSchema, paginationSchema } from '../shared/validation.js';
import { revisionReferenceSchema } from '../households/schemas.js';

export const categoryKinds = ['SERVICE', 'PRODUCT', 'CONTENT'];
const text = max => z.string().trim().min(1).max(max);
const reason = text(2000);
const categoryState = z.strictObject({ name: text(150), isActive: z.boolean() });
export const categoryCreateSchema = categoryState.extend({
  kind: z.enum(categoryKinds), code: z.string().trim().toUpperCase().min(1).max(50).regex(/^[A-Z][A-Z0-9_]*$/), reason,
});
export const categoryUpdateSchema = z.strictObject({
  expectedState: categoryState, name: text(150).optional(), isActive: z.boolean().optional(), reason,
}).refine(value => value.name !== undefined || value.isActive !== undefined);
export const categoryQuerySchema = paginationSchema.extend({ kind: z.enum(categoryKinds).optional() });
export const adminCategoryQuerySchema = categoryQuerySchema.extend({ isActive: z.enum(['true','false']).transform(value => value === 'true').optional() });
export const categoryParamsSchema = z.strictObject({ categoryId: databaseIdSchema });

const coordinates = z.strictObject({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
const placeDetails = z.strictObject({
  address: text(500).optional(), locality: text(200).optional(), coordinates: coordinates.nullable().optional(),
  directions: text(4000).optional(), contactPhone: z.string().trim().min(8).max(32).regex(/^\+?[0-9 ()-]+$/).optional(),
});
export const placeProfileSchema = z.strictObject({ title: text(200), body: z.string().trim().max(20000).default(''), details: placeDetails.default({}) });
export const placeSubmissionSchema = placeProfileSchema.extend({
  title: text(200).min(3), body: text(20000).min(20), details: placeDetails.extend({ address: text(500).min(5), locality: text(200).min(2) }),
});
export const placeSaveSchema = placeProfileSchema.extend(revisionReferenceSchema.shape);
const placeState = z.strictObject({ supplyStatus: z.enum(['AVAILABLE','PAUSED','RETIRED']), visibility: z.enum(['VISIBLE','HIDDEN']) });
export const placeStatusSchema = placeState.extend({ expectedState: placeState, reason });
export const placeParamsSchema = z.strictObject({ placeId: databaseIdSchema });
export const publicPlaceQuerySchema = paginationSchema.extend({ householdId: databaseIdSchema.optional(), q: text(100).optional(), locality: text(200).optional() });
export const placeReviewQuerySchema = paginationSchema.extend({ status: z.enum(['PENDING','APPROVED','REJECTED']).default('PENDING'), householdId: databaseIdSchema.optional() });
