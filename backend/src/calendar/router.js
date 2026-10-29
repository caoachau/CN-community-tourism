import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRoles } from '../auth/middleware.js';
import { validate, databaseIdSchema } from '../shared/validation.js';
import { sendSuccess } from '../shared/http.js';
import * as schemas from './schemas.js';

export function createCalendarRouter(service,authService) {
  const router=Router();router.use(authenticate(authService),requireRoles('HOUSEHOLD'));
  for(const [path,name,singular,createSchema,updateSchema,querySchema,remove] of [
    ['slots','Slot','slot',schemas.slotCreateSchema,schemas.slotUpdateSchema,schemas.slotQuerySchema,'archiveSlot'],
    ['resources','Resource','resource',schemas.resourceCreateSchema,schemas.resourceUpdateSchema,schemas.resourceQuerySchema,'archiveResource'],
    ['blocks','Block','block',schemas.blockCreateSchema,schemas.blockUpdateSchema,schemas.blockQuerySchema,'releaseBlock'],
  ]) {
    const params=z.strictObject({[`${singular}Id`]:databaseIdSchema});
    router.get(`/${path}`,validate({query:querySchema}),async(_req,res)=>sendSuccess(res,await service[`list${path[0].toUpperCase()+path.slice(1)}`](res.locals.auth,res.locals.validated.query)));
    router.post(`/${path}`,validate({body:createSchema}),async(_req,res)=>sendSuccess(res,await service[`create${name}`](res.locals.auth,res.locals.validated.body,res.locals.requestId),{status:201}));
    router.get(`/${path}/:${singular}Id`,validate({params}),async(_req,res)=>sendSuccess(res,await service[`get${name}`](res.locals.auth,res.locals.validated.params[`${singular}Id`])));
    router.put(`/${path}/:${singular}Id`,validate({params,body:updateSchema}),async(_req,res)=>sendSuccess(res,await service[`update${name}`](res.locals.auth,res.locals.validated.params[`${singular}Id`],res.locals.validated.body,res.locals.requestId)));
    router.delete(`/${path}/:${singular}Id`,validate({params,body:schemas.commandSchema}),async(_req,res)=>sendSuccess(res,await service[remove](res.locals.auth,res.locals.validated.params[`${singular}Id`],res.locals.validated.body,res.locals.requestId)));
  }
  return router;
}
export function createPublicCalendarRouter(service) {
  const router=Router();router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  router.get('/services/:serviceId/slots',validate({params:z.strictObject({serviceId:databaseIdSchema}),query:schemas.publicSlotQuerySchema}),async(_req,res)=>
    sendSuccess(res,await service.publicSlots(res.locals.validated.params.serviceId,res.locals.validated.query)));
  router.get('/rooms/:roomId/availability',validate({params:z.strictObject({roomId:databaseIdSchema}),query:schemas.roomAvailabilitySchema}),async(_req,res)=>
    sendSuccess(res,await service.roomAvailability(res.locals.validated.params.roomId,res.locals.validated.query)));
  return router;
}
