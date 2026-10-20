import { Router } from 'express';
import { authenticate, requireRoles } from '../auth/middleware.js';
import { validate, paginationSchema } from '../shared/validation.js';
import { sendSuccess } from '../shared/http.js';
import { reviewSchema, applicationParamsSchema } from '../households/schemas.js';
import { roomCreateSchema, roomSaveSchema, roomSubmitSchema, roomPriceSchema, roomStatusSchema, roomParamsSchema, publicRoomQuerySchema, roomReviewQuerySchema } from './schemas.js';

export function createOwnedRoomRouter(service,authService) {
  const router=Router();router.use(authenticate(authService),requireRoles('HOUSEHOLD'));
  router.get('/',validate({query:paginationSchema}),async(_req,res)=>sendSuccess(res,await service.list(res.locals.auth,res.locals.validated.query)));
  router.post('/',validate({body:roomCreateSchema}),async(_req,res)=>sendSuccess(res,await service.create(res.locals.auth,res.locals.validated.body,res.locals.requestId),{status:201}));
  router.get('/:roomId',validate({params:roomParamsSchema}),async(_req,res)=>sendSuccess(res,await service.mine(res.locals.auth,res.locals.validated.params.roomId)));
  router.put('/:roomId/profile',validate({params:roomParamsSchema,body:roomSaveSchema}),async(_req,res)=>{
    const {params,body}=res.locals.validated;sendSuccess(res,await service.save(res.locals.auth,params.roomId,body,res.locals.requestId));
  });
  router.post('/:roomId/submissions',validate({params:roomParamsSchema,body:roomSubmitSchema}),async(_req,res)=>{
    const {params,body}=res.locals.validated;sendSuccess(res,await service.submit(res.locals.auth,params.roomId,body,res.locals.requestId));
  });
  router.get('/:roomId/revisions',validate({params:roomParamsSchema,query:paginationSchema}),async(_req,res)=>{
    const {params,query}=res.locals.validated;sendSuccess(res,await service.history(res.locals.auth,params.roomId,query));
  });
  router.patch('/:roomId/status',validate({params:roomParamsSchema,body:roomStatusSchema}),async(_req,res)=>{
    const {params,body}=res.locals.validated;sendSuccess(res,await service.status(res.locals.auth,params.roomId,body,res.locals.requestId));
  });
  router.patch('/:roomId/pricing',validate({params:roomParamsSchema,body:roomPriceSchema}),async(_req,res)=>{
    const {params,body}=res.locals.validated;sendSuccess(res,await service.updatePrice(res.locals.auth,params.roomId,body,res.locals.requestId));
  });return router;
}
export function createRoomReviewRouter(service,authService) {
  const router=Router();router.use(authenticate(authService),requireRoles('ADMIN'));
  router.get('/',validate({query:roomReviewQuerySchema}),async(_req,res)=>sendSuccess(res,await service.submissions(res.locals.auth,res.locals.validated.query)));
  router.get('/:revisionId',validate({params:applicationParamsSchema}),async(_req,res)=>sendSuccess(res,await service.submission(res.locals.auth,res.locals.validated.params.revisionId)));
  router.post('/:revisionId/review',validate({params:applicationParamsSchema,body:reviewSchema}),async(_req,res)=>{
    const {params,body}=res.locals.validated;sendSuccess(res,await service.review(res.locals.auth,params.revisionId,body,res.locals.requestId));
  });return router;
}
export function createPublicRoomRouter(service) {
  const router=Router();router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  router.get('/',validate({query:publicRoomQuerySchema}),async(_req,res)=>sendSuccess(res,await service.publicList(res.locals.validated.query)));
  router.get('/:roomId',validate({params:roomParamsSchema}),async(_req,res)=>sendSuccess(res,await service.publicDetail(res.locals.validated.params.roomId)));
  return router;
}
