import { Router } from 'express';
import { validate } from '../shared/validation.js';
import { sendSuccess } from '../shared/http.js';
import { authenticate, requireRoles } from './middleware.js';
import { accountStatusSchema, accountStatusParamsSchema } from './schemas.js';

export function createAdminAccountRouter(service) {
  const router = Router();
  router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });
  router.use(authenticate(service), requireRoles('ADMIN'));
  router.patch('/users/:userId/status', validate({ params: accountStatusParamsSchema, body: accountStatusSchema }), async (_request, response) => {
    const { body, params } = response.locals.validated;
    sendSuccess(response, await service.setAccountStatus(response.locals.auth, params.userId, body, response.locals.requestId));
  });
  return router;
}
