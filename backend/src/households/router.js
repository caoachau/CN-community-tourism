import { Router } from 'express';
import { authenticate, requireRoles } from '../auth/middleware.js';
import { validate, paginationSchema } from '../shared/validation.js';
import { sendSuccess } from '../shared/http.js';
import { profileSchema, saveProfileSchema, revisionReferenceSchema, reviewSchema, applicationParamsSchema, applicationListSchema } from './schemas.js';

export function createHouseholdRouter(service, authService) {
  const router = Router();
  router.use(authenticate(authService), requireRoles('CUSTOMER'));
  router.post('/', validate({ body: profileSchema }), async (_req, res) => {
    sendSuccess(res, await service.open(res.locals.auth, res.locals.validated.body, res.locals.requestId), { status: 201 });
  });
  router.get('/me', async (_req, res) => sendSuccess(res, await service.mine(res.locals.auth)));
  router.put('/me/profile', validate({ body: saveProfileSchema }), async (_req, res) => {
    sendSuccess(res, await service.save(res.locals.auth, res.locals.validated.body, res.locals.requestId));
  });
  router.post('/me/submissions', validate({ body: revisionReferenceSchema }), async (_req, res) => {
    sendSuccess(res, await service.submit(res.locals.auth, res.locals.validated.body, res.locals.requestId));
  });
  router.get('/me/revisions', validate({ query: paginationSchema }), async (_req, res) => {
    sendSuccess(res, await service.history(res.locals.auth, res.locals.validated.query));
  });
  return router;
}

export function createHouseholdAdminRouter(service, authService) {
  const router = Router();
  router.use(authenticate(authService), requireRoles('ADMIN'));
  router.get('/', validate({ query: applicationListSchema }), async (_req, res) => {
    sendSuccess(res, await service.list(res.locals.auth, res.locals.validated.query));
  });
  router.get('/:revisionId', validate({ params: applicationParamsSchema }), async (_req, res) => {
    sendSuccess(res, await service.application(res.locals.auth, res.locals.validated.params.revisionId));
  });
  router.post('/:revisionId/review', validate({ params: applicationParamsSchema, body: reviewSchema }), async (_req, res) => {
    const { body, params } = res.locals.validated;
    sendSuccess(res, await service.review(res.locals.auth, params.revisionId, body, res.locals.requestId));
  });
  return router;
}
