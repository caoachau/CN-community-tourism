import express, { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/middleware.js';
import { validate, databaseIdSchema } from '../shared/validation.js';
import { sendSuccess } from '../shared/http.js';
import { AppError } from '../shared/errors.js';
import { archiveSchema, imageReferenceSchema, imageOrderSchema, uploadQuerySchema, imageListSchema } from './schemas.js';
import { MAX_UPLOAD_BYTES } from './images.js';

export const contentPaths = [
  ['households', '/households/me'], ['rooms', '/households/me/rooms/:resourceId'], ['services', '/households/me/services/:resourceId'],
];
export function createContentRouter(service, authService) {
  const router = Router(), auth = authenticate(authService);
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/admin/revisions/:revisionId/images', auth, validate({ params: z.strictObject({ revisionId: databaseIdSchema }) }), async (_req, res) => {
    sendSuccess(res, await service.adminImages(res.locals.auth, res.locals.validated.params.revisionId));
  });
  for (const [kind, base] of contentPaths) {
    const params = z.strictObject(kind === 'households' ? {} : { resourceId: databaseIdSchema });
    router.get(`${base}/images`, auth, validate({ params, query: imageListSchema }), async (_req, res) => {
      const { params: p, query } = res.locals.validated;
      sendSuccess(res, await service.list(res.locals.auth, kind, p.resourceId, query.revisionId));
    });
    router.post(`${base}/images`, auth, validate({ params, query: uploadQuerySchema }),
      (req, _res, next) => { if (!req.is(['image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'])) throw new AppError('UNSUPPORTED_MEDIA_TYPE'); next(); },
      express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES, inflate: false }), async (req, res) => {
        const { params: p, query } = res.locals.validated;
        sendSuccess(res, await service.upload(res.locals.auth, kind, p.resourceId, query, req.body, res.locals.requestId), { status: 201 });
      });
    router.put(`${base}/images/order`, auth, validate({ params, body: imageOrderSchema }), async (_req, res) => {
      const { params: p, body } = res.locals.validated;
      sendSuccess(res, await service.order(res.locals.auth, kind, p.resourceId, body, res.locals.requestId));
    });
    router.delete(`${base}/images/:imageId`, auth, validate({ params: params.extend({ imageId: databaseIdSchema }), body: imageReferenceSchema }), async (_req, res) => {
      const { params: p, body } = res.locals.validated;
      sendSuccess(res, await service.remove(res.locals.auth, kind, p.resourceId, p.imageId, body, res.locals.requestId));
    });
    for (const [method, suffix, archived] of [['delete', '', true], ['post', '/restore', false]]) {
      router[method](`${base}${suffix}`, auth, validate({ params, body: archiveSchema }), async (_req, res) => {
        const { params: p, body } = res.locals.validated;
        sendSuccess(res, await service.archive(res.locals.auth, kind, p.resourceId, body, archived, res.locals.requestId));
      });
    }
    router.get(`/public/${kind}/:resourceId/images`, validate({ params: z.strictObject({ resourceId: databaseIdSchema }) }), async (_req, res) => {
      sendSuccess(res, await service.publicImages(kind, res.locals.validated.params.resourceId));
    });
  }
  router.get('/media/:key', async (req, res, next) => {
    if (req.headers.authorization) return auth(req, res, next);
    next();
  }, async (req, res) => {
    const bytes = await service.file(req.params.key, res.locals.auth);
    res.set({ 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'", 'Cache-Control': 'private, no-store' });
    res.send(bytes);
  });
  return router;
}
