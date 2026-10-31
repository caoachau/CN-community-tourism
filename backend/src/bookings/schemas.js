import { z } from 'zod';
import { databaseIdSchema as id, paginationSchema } from '../shared/validation.js';

export const statuses=['PENDING','CONFIRMED','REJECTED','EXPIRED','CANCELLED','COMPLETED','NO_SHOW','INTERRUPTED'];
export const token=z.string().regex(/^[a-f0-9]{64}$/);
export const key=z.string().min(16).max(100).regex(/^[A-Za-z0-9_-]+$/);
export const reason=z.string().trim().min(1).max(2000);
const day=z.iso.date().refine(s=>s>='2000-01-01'&&s<='2099-12-31');
const count=z.number().int().min(1).max(100000);
const addon=z.strictObject({key:z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),quantity:count});
export const roomItem=z.strictObject({kind:z.literal('ROOM'),roomId:id,checkInDate:day,checkOutDate:day,participants:count.max(1000)})
  .refine(i=>i.checkOutDate>i.checkInDate&&(Date.parse(i.checkOutDate)-Date.parse(i.checkInDate))/86400000<=365);
export const serviceItem=z.strictObject({kind:z.literal('SERVICE'),slotId:id,offerId:id,participants:count.max(1000),units:count.default(1),addons:z.array(addon).max(32).default([])})
  .refine(i=>new Set(i.addons.map(a=>a.key)).size===i.addons.length);
export const cart=z.strictObject({householdId:id,items:z.array(z.union([roomItem,serviceItem])).min(1).max(20)})
  .refine(c=>new Set(c.items.map(i=>i.kind==='ROOM'?`R${i.roomId}`:`S${i.slotId}`)).size===c.items.length);
export const contact=z.strictObject({name:z.string().trim().min(1).max(150),phone:z.string().trim().regex(/^\+?[0-9][0-9 ()-]{6,30}$/),email:z.email().max(254).nullable().default(null)});
export const hold=cart.safeExtend({contact,expectedQuoteToken:token,idempotencyKey:key});
export const command=z.strictObject({expectedToken:token,reason});
export const entry=z.strictObject({expectedToken:token,idempotencyKey:key,type:z.enum(['RECEIPT','REFUND_AGREEMENT','REFUND_ADJUSTMENT','REFUND']),amountVnd:z.number().int().min(-999999999999999).max(999999999999999).refine(n=>n!==0),
  paymentMethod:z.enum(['CASH','BANK_TRANSFER','OTHER']).nullable().default(null),receiptPurpose:z.enum(['DEPOSIT','BALANCE']).nullable().default(null),agreementId:id.nullable().default(null),
  occurredAt:z.iso.datetime({offset:true}),note:reason,externalReference:z.string().trim().max(150).nullable().default(null)})
  .refine(i=>(i.type==='REFUND_ADJUSTMENT'||i.amountVnd>0)&&(i.type==='RECEIPT'?i.receiptPurpose!==null&&i.agreementId===null:i.receiptPurpose===null)&&
    (['REFUND_AGREEMENT','REFUND_ADJUSTMENT'].includes(i.type)?i.paymentMethod===null:i.paymentMethod!==null)&&
    (['REFUND','REFUND_ADJUSTMENT'].includes(i.type)?i.agreementId!==null:i.agreementId===null));
export const reversal=z.strictObject({expectedToken:token,idempotencyKey:key,note:reason,occurredAt:z.iso.datetime({offset:true})});
export const review=z.strictObject({rating:z.number().int().min(1).max(5),comment:z.string().trim().min(1).max(4000)});
export const moderate=command.extend({hidden:z.boolean()});
export const list=paginationSchema.extend({status:z.enum([...statuses,'CANCEL_REQUESTED']).optional(),householdId:id.optional(),from:z.iso.datetime({offset:true}).optional(),to:z.iso.datetime({offset:true}).optional(),source:z.enum(['ONLINE','OFFLINE','CUSTOM_PROPOSAL']).optional()}).refine(v=>(!v.from&&!v.to)||(!!v.from&&!!v.to&&Date.parse(v.to)>Date.parse(v.from)&&Date.parse(v.to)-Date.parse(v.from)<=93*86400000));
export const ledgerList=paginationSchema.extend({householdId:id.optional(),bookingId:id.optional()});
export const reviewList=paginationSchema.extend({householdId:id.optional()});
export function query(schema,input){return schema.parse({...input,...Object.fromEntries(['page','pageSize'].filter(k=>typeof input?.[k]==='number').map(k=>[k,String(input[k])]))});}

export const cancellation=command.extend({idempotencyKey:key});
export const notificationList=paginationSchema.extend({unreadOnly:z.enum(['true','false']).default('false')});
