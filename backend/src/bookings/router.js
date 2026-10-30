import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRoles } from '../auth/middleware.js';
import { validate, databaseIdSchema as id } from '../shared/validation.js';
import { sendSuccess } from '../shared/http.js';
import * as s from './schemas.js';

export function createBookingRouter(service,authService){
  const router=Router();router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  router.get('/public/households/:householdId/reviews',validate({params:z.strictObject({householdId:id}),query:s.reviewList.omit({householdId:true})}),async(_req,res)=>
    sendSuccess(res,await service.reviews(null,{...res.locals.validated.query,householdId:res.locals.validated.params.householdId})));
  router.use(['/bookings','/households/me/bookings','/households/me/financial-entries','/admin/bookings','/admin/financial-entries','/admin/reviews'],authenticate(authService));
  const params=z.strictObject({bookingId:id});
  const customers=requireRoles('CUSTOMER','HOUSEHOLD'),hosts=requireRoles('HOUSEHOLD'),admins=requireRoles('ADMIN');
  router.post('/bookings/quote',customers,validate({body:s.cart}),async(_req,res)=>sendSuccess(res,await service.quote(res.locals.auth,res.locals.validated.body)));
  router.post('/bookings',customers,validate({body:s.hold}),async(_req,res)=>sendSuccess(res,await service.hold(res.locals.auth,res.locals.validated.body,res.locals.requestId),{status:201}));
  router.get('/bookings',customers,validate({query:s.list}),async(_req,res)=>sendSuccess(res,await service.list(res.locals.auth,res.locals.validated.query)));
  router.get('/households/me/bookings',hosts,validate({query:s.list}),async(_req,res)=>sendSuccess(res,await service.list(res.locals.auth,res.locals.validated.query,{audience:'host'})));
  router.get('/admin/bookings',admins,validate({query:s.list}),async(_req,res)=>sendSuccess(res,await service.list(res.locals.auth,res.locals.validated.query,{adminOnly:true})));
  for(const [base,guard]of [['/bookings',customers],['/households/me/bookings',hosts],['/admin/bookings',admins]]){
    router.get(`${base}/:bookingId`,guard,validate({params}),async(_req,res)=>sendSuccess(res,await service.get(res.locals.auth,res.locals.validated.params.bookingId)));
  }
  for(const action of ['confirm','reject','cancel','complete']){
    const base=action==='cancel'?'/bookings':'/households/me/bookings';
    router.post(`${base}/:bookingId/${action}`,action==='cancel'?customers:hosts,validate({params,body:s.command}),async(_req,res)=>
      sendSuccess(res,await service.transition(res.locals.auth,res.locals.validated.params.bookingId,action,res.locals.validated.body,res.locals.requestId)));
  }
  router.post('/bookings/:bookingId/review',customers,validate({params,body:s.review}),async(_req,res)=>sendSuccess(res,await service.review(res.locals.auth,res.locals.validated.params.bookingId,res.locals.validated.body,res.locals.requestId),{status:201}));
  router.post('/households/me/bookings/:bookingId/financial-entries',hosts,validate({params,body:s.entry}),async(_req,res)=>sendSuccess(res,await service.addEntry(res.locals.auth,res.locals.validated.params.bookingId,res.locals.validated.body,res.locals.requestId),{status:201}));
  router.post('/households/me/bookings/:bookingId/financial-entries/:entryId/reverse',hosts,validate({params:params.extend({entryId:id}),body:s.reversal}),async(_req,res)=>
    sendSuccess(res,await service.reverseEntry(res.locals.auth,res.locals.validated.params.bookingId,res.locals.validated.params.entryId,res.locals.validated.body,res.locals.requestId),{status:201}));
  for(const [base,guard,adminOnly]of [['/households/me',hosts,false],['/admin',admins,true]]){
    router.get(`${base}/financial-entries`,guard,validate({query:s.ledgerList}),async(_req,res)=>sendSuccess(res,await service.ledger(res.locals.auth,res.locals.validated.query,{adminOnly})));
  }
  router.get('/admin/reviews',admins,validate({query:s.reviewList}),async(_req,res)=>sendSuccess(res,await service.reviews(res.locals.auth,res.locals.validated.query)));
  router.patch('/admin/reviews/:reviewId',admins,validate({params:z.strictObject({reviewId:id}),body:s.moderate}),async(_req,res)=>
    sendSuccess(res,await service.moderateReview(res.locals.auth,res.locals.validated.params.reviewId,res.locals.validated.body,res.locals.requestId)));
  return router;
}
