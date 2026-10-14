import { z } from 'zod';
import { databaseIdSchema } from '../shared/validation.js';

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const registerSchema = z.strictObject({
  email, password: z.string().min(15).max(128), displayName: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(8).max(32).regex(/^\+?[0-9 ()-]+$/).optional(),
});
export const loginSchema = z.strictObject({ email, password: z.string().min(1).max(128) });
export const refreshSchema = z.strictObject({ refreshToken: z.string().regex(/^[\w-]{43}$/) });
export const accountStatusSchema = z.strictObject({
  status: z.enum(['ACTIVE', 'BLOCKED']), reason: z.string().trim().min(1).max(2000),
});
export const accountStatusParamsSchema = z.strictObject({ userId: databaseIdSchema });
