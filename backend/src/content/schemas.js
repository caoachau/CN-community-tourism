import { z } from 'zod';
import { databaseIdSchema } from '../shared/validation.js';
import { revisionReferenceSchema } from '../households/schemas.js';
import { MAX_IMAGES } from './images.js';

export const imageReferenceSchema = revisionReferenceSchema.extend({ expectedToken: z.string().regex(/^[a-f0-9]{64}$/) });
export const uploadQuerySchema = imageReferenceSchema.extend({
  version: z.string().regex(/^[1-9][0-9]{0,9}$/).transform(Number).pipe(revisionReferenceSchema.shape.version),
});
export const imageListSchema = z.strictObject({ revisionId: databaseIdSchema.optional() });
export const imageOrderSchema = imageReferenceSchema.extend({
  imageIds: z.array(databaseIdSchema).max(MAX_IMAGES), coverImageId: databaseIdSchema.nullable(),
}).refine(value => new Set(value.imageIds).size === value.imageIds.length &&
  (value.imageIds.length ? value.imageIds.includes(value.coverImageId) : value.coverImageId === null));
export const archiveSchema = revisionReferenceSchema.extend({ reason: z.string().trim().min(1).max(2000) });
