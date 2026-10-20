import { z } from 'zod';
import { databaseIdSchema, paginationSchema } from '../shared/validation.js';

const text = (max) => z.string().trim().min(1).max(max);
const phone = z.string().trim().min(8).max(32).regex(/^\+?[0-9 ()-]+$/);
const section = z.strictObject({ heading: text(150), text: text(4000) });
const details = z.strictObject({
  address: text(500).optional(), locality: text(200).optional(), contactPhone: phone.optional(),
  zaloContact: text(200).optional(), introductionSections: z.array(section).max(20).default([]),
});
export const profileSchema = z.strictObject({
  title: text(200), body: z.string().trim().max(20000).default(''), details: details.default({ introductionSections: [] }),
});
export const submissionProfileSchema = profileSchema.extend({
  title: text(200).min(3), body: text(20000).min(20),
  details: details.extend({ address: text(500).min(5), locality: text(200).min(2), contactPhone: phone }),
});
export const revisionReferenceSchema = z.strictObject({
  revisionId: databaseIdSchema, version: z.number().int().min(1).max(4294967295),
});
export const saveProfileSchema = profileSchema.extend(revisionReferenceSchema.shape);
export const reviewSchema = z.strictObject({
  version: revisionReferenceSchema.shape.version, decision: z.enum(['APPROVED', 'REJECTED']),
  reason: text(2000).optional(),
}).refine(input => input.decision !== 'REJECTED' || Boolean(input.reason), { path: ['reason'] });
export const applicationParamsSchema = z.strictObject({ revisionId: databaseIdSchema });
export const applicationListSchema = paginationSchema.extend({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING') });
