import { Router } from 'express';
import { authenticate,requireRoles } from '../auth/middleware.js';
import { validate,paginationSchema } from '../shared/validation.js';
import { sendSuccess } from '../shared/http.js';
import { reviewSchema,applicationParamsSchema } from '../households/schemas.js';
import { serviceProfileSchema,serviceSaveSchema,serviceSubmitSchema,serviceStatusSchema,serviceParamsSchema,offerParamsSchema,offerConfigSchema,offerUpdateSchema,offerPriceSchema,publicServiceQuerySchema,serviceReviewQuerySchema } from './schemas.js';

export function createOwnedServiceRouter(service,authService){
  const router=Router();router.use(authenticate(authService),requireRoles('HOUSEHOLD'));
  router.get('/',validate({query:paginationSchema}),async(_req,res)=>sendSuccess(res,await service.list(res.locals.auth,res.locals.validated.query)));
  router.post('/',validate({body:serviceProfileSchema}),async(_req,res)=>sendSuccess(res,await service.create(res.locals.auth,res.locals.validated.body,res.locals.requestId),{status:201}));
  router.get('/:serviceId',validate({params:serviceParamsSchema}),async(_req,res)=>sendSuccess(res,await service.mine(res.locals.auth,res.locals.validated.params.serviceId)));
  router.put('/:serviceId/profile',validate({params:serviceParamsSchema,body:serviceSaveSchema}),async(_req,res)=>{
    const {params,body}=res.locals.validated;sendSuccess(res,await service.save(res.locals.auth,params.serviceId,body,res.locals.requestId));
  });
  router.post('/:serviceId/submissions',validate({params:serviceParamsSchema,body:serviceSubmitSchema}),async(_req,res)=>{
    const {params,body}=res.locals.validated;sendSuccess(res,await service.submit(res.locals.auth,params.serviceId,body,res.locals.requestId));
  });
  router.get('/:serviceId/revisions',validate({params:serviceParamsSchema,query:paginationSchema}),async(_req,res)=>{
    const {params,query}=res.locals.validated;sendSuccess(res,await service.history(res.locals.auth,params.serviceId,query));
  });
  router.patch('/:serviceId/status',validate({params:serviceParamsSchema,body:serviceStatusSchema}),async(_req,res)=>{
    const {params,body}=res.locals.validated;sendSuccess(res,await service.status(res.locals.auth,params.serviceId,body,res.locals.requestId));
  });
  router.post('/:serviceId/offers',validate({params:serviceParamsSchema,body:offerConfigSchema}),async(_req,res)=>{
    const {params,body}=res.locals.validated;sendSuccess(res,await service.createOffer(res.locals.auth,params.serviceId,body,res.locals.requestId),{status:201});
  });
  router.get('/:serviceId/offers/:offerId',validate({params:offerParamsSchema}),async(_req,res)=>{
    const {params}=res.locals.validated;sendSuccess(res,await service.getOffer(res.locals.auth,params.serviceId,params.offerId));
  });
  router.put('/:serviceId/offers/:offerId',validate({params:offerParamsSchema,body:offerUpdateSchema}),async(_req,res)=>{
    const {params,body}=res.locals.validated;sendSuccess(res,await service.updateOffer(res.locals.auth,params.serviceId,params.offerId,body,res.locals.requestId));
  });
  router.patch('/:serviceId/offers/:offerId/pricing',validate({params:offerParamsSchema,body:offerPriceSchema}),async(_req,res)=>{
    const {params,body}=res.locals.validated;sendSuccess(res,await service.updatePrices(res.locals.auth,params.serviceId,params.offerId,body,res.locals.requestId));
  });
  return router;
}
export function createServiceReviewRouter(service,authService){
  const router=Router();router.use(authenticate(authService),requireRoles('ADMIN'));
  router.get('/',validate({query:serviceReviewQuerySchema}),async(_req,res)=>sendSuccess(res,await service.submissions(res.locals.auth,res.locals.validated.query)));
  router.get('/:revisionId',validate({params:applicationParamsSchema}),async(_req,res)=>sendSuccess(res,await service.submission(res.locals.auth,res.locals.validated.params.revisionId)));
  router.post('/:revisionId/review',validate({params:applicationParamsSchema,body:reviewSchema}),async(_req,res)=>{
    const {params,body}=res.locals.validated;sendSuccess(res,await service.review(res.locals.auth,params.revisionId,body,res.locals.requestId));
  });return router;
}
export function createPublicServiceRouter(service){
  const router=Router();router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  router.get('/',validate({query:publicServiceQuerySchema}),async(_req,res)=>sendSuccess(res,await service.publicList(res.locals.validated.query)));
  router.get('/:serviceId',validate({params:serviceParamsSchema}),async(_req,res)=>sendSuccess(res,await service.publicDetail(res.locals.validated.params.serviceId)));
  return router;
}
