import { Router } from 'express';
import { authenticate, requireRoles } from '../auth/middleware.js';
import { validate, paginationSchema } from '../shared/validation.js';
import { sendSuccess } from '../shared/http.js';
import { revisionReferenceSchema, reviewSchema, applicationParamsSchema } from '../households/schemas.js';
import { categoryCreateSchema, categoryUpdateSchema, categoryQuerySchema, adminCategoryQuerySchema, categoryParamsSchema,
  placeProfileSchema, placeSaveSchema, placeStatusSchema, placeParamsSchema, publicPlaceQuerySchema, placeReviewQuerySchema } from './schemas.js';

const noStore = (_req,res,next) => { res.set('Cache-Control','no-store'); next(); };

export function createPublicCatalogRouter(service) {
  const router = Router(); router.use(noStore);
  router.get('/categories',validate({ query:categoryQuerySchema }),async (_req,res) => sendSuccess(res,await service.categories(null,res.locals.validated.query)));
  router.get('/places',validate({ query:publicPlaceQuerySchema }),async (_req,res) => sendSuccess(res,await service.publicPlaces(res.locals.validated.query)));
  router.get('/places/:placeId',validate({ params:placeParamsSchema }),async (_req,res) => sendSuccess(res,await service.publicPlace(res.locals.validated.params.placeId)));
  return router;
}

export function createOwnedPlaceRouter(service,authService) {
  const router = Router(); router.use(authenticate(authService),requireRoles('HOUSEHOLD'));
  router.get('/',validate({ query:paginationSchema }),async (_req,res) => sendSuccess(res,await service.ownedPlaces(res.locals.auth,res.locals.validated.query)));
  router.post('/',validate({ body:placeProfileSchema }),async (_req,res) => sendSuccess(res,await service.createPlace(res.locals.auth,res.locals.validated.body,res.locals.requestId),{ status:201 }));
  router.get('/:placeId',validate({ params:placeParamsSchema }),async (_req,res) => sendSuccess(res,await service.ownedPlace(res.locals.auth,res.locals.validated.params.placeId)));
  router.put('/:placeId/profile',validate({ params:placeParamsSchema,body:placeSaveSchema }),async (_req,res) => {
    const { params,body } = res.locals.validated;
    sendSuccess(res,await service.savePlace(res.locals.auth,params.placeId,body,res.locals.requestId));
  });
  router.post('/:placeId/submissions',validate({ params:placeParamsSchema,body:revisionReferenceSchema }),async (_req,res) => {
    const { params,body } = res.locals.validated;
    sendSuccess(res,await service.submitPlace(res.locals.auth,params.placeId,body,res.locals.requestId));
  });
  router.get('/:placeId/revisions',validate({ params:placeParamsSchema,query:paginationSchema }),async (_req,res) => {
    const { params,query } = res.locals.validated;
    sendSuccess(res,await service.placeHistory(res.locals.auth,params.placeId,query));
  });
  router.patch('/:placeId/status',validate({ params:placeParamsSchema,body:placeStatusSchema }),async (_req,res) => {
    const { params,body } = res.locals.validated;
    sendSuccess(res,await service.setPlaceStatus(res.locals.auth,params.placeId,body,res.locals.requestId));
  });
  return router;
}

export function createCategoryAdminRouter(service,authService) {
  const router = Router(); router.use(authenticate(authService),requireRoles('ADMIN'));
  router.get('/',validate({ query:adminCategoryQuerySchema }),async (_req,res) => sendSuccess(res,await service.categories(res.locals.auth,res.locals.validated.query)));
  router.post('/',validate({ body:categoryCreateSchema }),async (_req,res) => sendSuccess(res,await service.createCategory(res.locals.auth,res.locals.validated.body,res.locals.requestId),{ status:201 }));
  router.get('/:categoryId',validate({ params:categoryParamsSchema }),async (_req,res) => sendSuccess(res,await service.category(res.locals.auth,res.locals.validated.params.categoryId)));
  router.patch('/:categoryId',validate({ params:categoryParamsSchema,body:categoryUpdateSchema }),async (_req,res) => {
    const { params,body } = res.locals.validated;
    sendSuccess(res,await service.updateCategory(res.locals.auth,params.categoryId,body,res.locals.requestId));
  });
  return router;
}

export function createPlaceReviewRouter(service,authService) {
  const router = Router(); router.use(authenticate(authService),requireRoles('ADMIN'));
  router.get('/',validate({ query:placeReviewQuerySchema }),async (_req,res) => sendSuccess(res,await service.submissions(res.locals.auth,res.locals.validated.query)));
  router.get('/:revisionId',validate({ params:applicationParamsSchema }),async (_req,res) => sendSuccess(res,await service.submission(res.locals.auth,res.locals.validated.params.revisionId)));
  router.post('/:revisionId/review',validate({ params:applicationParamsSchema,body:reviewSchema }),async (_req,res) => {
    const { params,body } = res.locals.validated;
    sendSuccess(res,await service.reviewPlace(res.locals.auth,params.revisionId,body,res.locals.requestId));
  });
  return router;
}
