import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../shared/validation.js';
import { sendSuccess } from '../shared/http.js';
import { AppError } from '../shared/errors.js';
import { authenticate } from './middleware.js';

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const password = z.string().min(15).max(128);
export const registerSchema = z.strictObject({
  email, password, displayName: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(8).max(32).regex(/^\+?[0-9 ()-]+$/).optional(),
});
export const loginSchema = z.strictObject({ email, password: z.string().min(1).max(128) });
export const refreshSchema = z.strictObject({ refreshToken: z.string().regex(/^[\w-]{43}$/) });

// Single-instance MVP limiter; bounded state, no tokens/email/IP in logs.
export function createAuthLimiter({ now = Date.now, windowMs = 900000, maxIp = 60, maxEmail = 12, maxEntries = 10000 } = {}) {
  const buckets = new Map();
  return (request, response, next) => {
    const time = now();
    const keys = [[`ip:${request.ip}`, maxIp]];
    if (typeof request.body?.email === 'string' && request.body.email.length <= 300) {
      keys.push([`email:${createHash('sha256').update(request.body.email.trim().toLowerCase()).digest('hex')}`, maxEmail]);
    }
    for (const [key, maximum] of keys) {
      let bucket = buckets.get(key);
      if (!bucket || bucket.until <= time) {
        if (buckets.size >= maxEntries) {
          for (const [entry, value] of buckets) if (value.until <= time) buckets.delete(entry);
          if (buckets.size >= maxEntries && !bucket) {
            response.set('Retry-After', String(Math.ceil(windowMs / 1000)));
            throw new AppError('RATE_LIMITED');
          }
        }
        bucket = { count: 0, until: time + windowMs }; buckets.set(key, bucket);
      }
      if (bucket.count >= maximum) {
        response.set('Retry-After', String(Math.ceil((bucket.until - time) / 1000)));
        throw new AppError('RATE_LIMITED');
      }
      bucket.count++;
    }
    next();
  };
}

export function createAuthRouter(service, { limiter = createAuthLimiter() } = {}) {
  const router = Router();
  router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
  router.post('/register', limiter, validate({ body: registerSchema }), async (_request, response) => {
    sendSuccess(response, await service.register(response.locals.validated.body), { status: 201 });
  });
  router.post('/login', limiter, validate({ body: loginSchema }), async (_request, response) => {
    sendSuccess(response, await service.login(response.locals.validated.body));
  });
  router.post('/refresh', limiter, validate({ body: refreshSchema }), async (_request, response) => {
    sendSuccess(response, await service.refresh(response.locals.validated.body.refreshToken));
  });
  router.get('/me', authenticate(service), (_request, response) => sendSuccess(response, { user: response.locals.auth.user }));
  router.post('/logout', authenticate(service), async (_request, response) => {
    await service.logout(response.locals.auth);
    sendSuccess(response, { loggedOut: true });
  });
  return router;
}
