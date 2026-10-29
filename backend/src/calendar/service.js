import { AppError } from '../shared/errors.js';
import { lockCurrentActor } from '../auth/transaction.js';
import { databaseIdSchema } from '../shared/validation.js';
import { approvedOffers } from '../services/models.js';
import * as schemas from './schemas.js';
import { iso, token, overlaps, peakQuantity, resourceOf, blockOf, slotOf, slotConfiguration, offerAvailability } from './models.js';

const parse = (schema,value) => {const result=schema.safeParse(value);if(!result.success)throw new AppError('INVALID_REQUEST');return result.data;};
const id = value => parse(databaseIdSchema,value);
const query = (schema,input) => parse(schema,Object.fromEntries(Object.entries(input??{}).map(([key,value])=>
  [key,['page','pageSize','includeArchived','includeReleased','participants','units','guests'].includes(key)&&['number','boolean'].includes(typeof value)?String(value):value])));
const match = (current,expected) => {if(current!==expected)throw new AppError('STALE_VERSION');};
const page = (items,total,input) => ({items,total,page:input.page,pageSize:input.pageSize});
const numericSort = (a,b) => BigInt(a)<BigInt(b)?-1:BigInt(a)>BigInt(b)?1:0;
const normalize = input => {
  input.startsAt=iso(input.startsAt);input.endsAt=iso(input.endsAt);
  input.offers.sort((a,b)=>numericSort(a.offerId,b.offerId));
  input.assignments.sort((a,b)=>numericSort(a.resourceId,b.resourceId));
  for(const a of input.assignments)a.rules.sort((x,y)=>numericSort(x.offerId,y.offerId));
  return input;
};

export function createCalendarService({repository,serviceService,roomService,now=()=>new Date()}) {
  async function context(tx,auth,{approved=false,write=false}={}) {
    const {actor}=await lockCurrentActor(tx,auth,['HOUSEHOLD']);
    const found=await tx.ownedHousehold(actor.id);
    if(!found)throw new AppError('FORBIDDEN');
    const household=await tx.household(found.id,true);
    if(!household||String(household.owner_user_id)!==actor.id)throw new AppError('FORBIDDEN');
    if(write&&household.archived_at)throw new AppError('INVALID_STATE');
    if(approved&&household.approval_status!=='APPROVED')throw new AppError('HOUSEHOLD_NOT_APPROVED');
    return {actor,household};
  }
  async function audit(tx,state,entityType,entityId,action,requestId,reason,before,after) {
    if(typeof requestId!=='string'||!requestId||requestId.length>100)throw new AppError('INVALID_REQUEST');
    await tx.event({householdId:state.household.id,actor:state.actor,entityType,entityId,action,requestId,reason:reason??null,before:before??null,after:after??null});
  }
  async function owned(tx,method,resourceId,householdId) {
    id(resourceId);const row=await tx[method](resourceId,householdId);if(!row)throw new AppError('FORBIDDEN');return row;
  }
  async function loadSlot(tx,row) {
    const offers=await tx.slotOffers(row.id),assignments=await tx.assignments(row.id),rules=await tx.rules(row.id);
    return {row,offers,assignments,rules,slot:slotOf(row,offers,assignments,rules)};
  }
  async function availableOffers(tx,service) {
    return service.published_revision_id ? approvedOffers(await tx.revision(service.published_revision_id),await tx.serviceOffers(service.id)) : [];
  }
  async function validateSlot(tx,state,input,slotId=null) {
    const service=await owned(tx,'service',input.serviceId,state.household.id);
    if(service.archived_at||service.supply_status==='RETIRED')throw new AppError('INVALID_STATE');
    input.placeId??=service.default_place_id?String(service.default_place_id):null;
    if(input.placeId) {
      const place=await tx.place(input.placeId,true);
      if(!place||String(place.household_id)!==String(state.household.id))throw new AppError('FORBIDDEN');
      if(place.archived_at)throw new AppError('INVALID_STATE');
    }
    const allOffers=await tx.serviceOffers(service.id);
    if(input.offers.some(o=>!allOffers.some(row=>String(row.id)===o.offerId)))throw new AppError('FORBIDDEN');
    const enabled=input.offers.filter(o=>o.isEnabled);
    if(input.salesStatus==='OPEN') {
      if(state.household.approval_status!=='APPROVED')throw new AppError('HOUSEHOLD_NOT_APPROVED');
      const category=await tx.category(service.category_id,true);
      const approved=await availableOffers(tx,service);
      if(service.supply_status!=='AVAILABLE'||service.visibility!=='VISIBLE'||state.household.visibility!=='VISIBLE'||
        !category?.is_active||!input.placeId||!await tx.readyPlace(input.placeId,state.household.id)||
        !service.default_place_id||!await tx.readyPlace(service.default_place_id,state.household.id)||
        !enabled.length||enabled.some(o=>!approved.some(a=>a.id===o.offerId)))throw new AppError('SLOT_NOT_READY');
      if(Date.parse(input.startsAt)<=now().getTime())throw new AppError('INVALID_STATE');
      if(enabled.some(o=>allOffers.find(a=>String(a.id)===o.offerId)?.pricing_type==='PER_HOUR') &&
        (Date.parse(input.startsAt)%60000||Date.parse(input.endsAt)%60000))throw new AppError('SLOT_NOT_READY');
    }
    for(const assignment of input.assignments) {
      const resource=await owned(tx,'resource',assignment.resourceId,state.household.id);
      if(resource.archived_at)throw new AppError('INVALID_STATE');
      const interval={startsAt:new Date(Date.parse(input.startsAt)-assignment.preparationMinutes*60000),endsAt:new Date(Date.parse(input.endsAt)+assignment.cleanupMinutes*60000),quantity:assignment.quantity};
      const intervals=await tx.resourceIntervals(resource.id,{excludeSlotId:slotId});
      if(peakQuantity([...intervals,interval],interval)>resource.total_quantity)throw new AppError('AVAILABILITY_CONFLICT');
      for(const rule of assignment.rules) {
        const offer=allOffers.find(o=>String(o.id)===rule.offerId);
        if(!offer||!input.offers.some(o=>o.offerId===rule.offerId))throw new AppError('INVALID_REQUEST');
        if(rule.unitsRequired>assignment.quantity||(rule.usageBasis==='PER_UNIT'&&offer.pricing_type!=='PER_UNIT')||
          (resource.max_people_per_unit&&rule.maxPeoplePerUnit>resource.max_people_per_unit))throw new AppError('INVALID_REQUEST');
        rule.maxPeoplePerUnit??=resource.max_people_per_unit;
      }
      if(input.salesStatus==='OPEN'&&enabled.some(o=>!assignment.rules.some(r=>r.offerId===o.offerId)))throw new AppError('SLOT_NOT_READY');
    }
    return service;
  }
  async function validateBlock(tx,state,input,excludeId=null) {
    if(input.endsAt&&Date.parse(input.endsAt)<=now().getTime())throw new AppError('INVALID_REQUEST');
    if(input.roomId) {
      const room=await owned(tx,'room',input.roomId,state.household.id);
      if(room.archived_at)throw new AppError('INVALID_STATE');
      const blocks=await tx.roomBlocks(room.id,excludeId),items=await tx.liveItems({roomId:room.id});
      if([...blocks,...items].some(row=>overlaps(input,{startsAt:row.starts_at,endsAt:row.ends_at})))throw new AppError('AVAILABILITY_CONFLICT');
    } else {
      const resource=await owned(tx,'resource',input.resourceId,state.household.id);
      if(resource.archived_at)throw new AppError('INVALID_STATE');
      const intervals=await tx.resourceIntervals(resource.id,{excludeBlockId:excludeId});
      if(peakQuantity([...intervals,input],input)>resource.total_quantity)throw new AppError('AVAILABILITY_CONFLICT');
    }
  }
  return {
    async listResources(auth,input) {
      input=query(schemas.resourceQuerySchema,input);return repository.transaction(async tx=>{
        const {household}=await context(tx,auth),result=await tx.listResources(household.id,input);
        return page(result.rows.map(resourceOf),result.total,input);
      });
    },
    async getResource(auth,resourceId) {
      return repository.transaction(async tx=>{const {household}=await context(tx,auth);return {resource:resourceOf(await owned(tx,'resource',resourceId,household.id))};});
    },
    async createResource(auth,input,requestId) {
      input=parse(schemas.resourceCreateSchema,input);return repository.transaction(async tx=>{
        const state=await context(tx,auth,{approved:true,write:true});let resourceId;
        try {resourceId=await tx.createResource(state.household.id,input);}catch(error){if(error.code==='ER_DUP_ENTRY')throw new AppError('RESOURCE_CODE_EXISTS');throw error;}
        const resource=resourceOf(await tx.resource(resourceId,state.household.id));
        await audit(tx,state,'RESOURCE',resourceId,'RESOURCE_CREATED',requestId,null,null,resource);return {resource};
      });
    },
    async updateResource(auth,resourceId,input,requestId) {
      input=parse(schemas.resourceUpdateSchema,input);return repository.transaction(async tx=>{
        const state=await context(tx,auth,{approved:true,write:true}),row=await owned(tx,'resource',resourceId,state.household.id),before=resourceOf(row);
        if(row.archived_at)throw new AppError('INVALID_STATE');match(before.token,input.expectedToken);
        const intervals=await tx.resourceIntervals(resourceId);
        if((row.resource_type==='SINGLE'&&input.totalQuantity!==1)||peakQuantity(intervals)>input.totalQuantity)throw new AppError('AVAILABILITY_CONFLICT');
        if(row.max_people_per_unit!==input.maxPeoplePerUnit&&intervals.length)throw new AppError('CALENDAR_COMMITMENT_CONFLICT');
        await tx.updateResource(resourceId,input);const resource=resourceOf(await tx.resource(resourceId,state.household.id));
        if(resource.token!==before.token)await audit(tx,state,'RESOURCE',resourceId,'RESOURCE_UPDATED',requestId,input.reason,before,resource);
        return {resource,changed:resource.token!==before.token};
      });
    },
    async archiveResource(auth,resourceId,input,requestId) {
      input=parse(schemas.commandSchema,input);return repository.transaction(async tx=>{
        const state=await context(tx,auth,{write:true}),row=await owned(tx,'resource',resourceId,state.household.id),before=resourceOf(row);
        match(before.token,input.expectedToken);
        if(!row.archived_at){if((await tx.resourceIntervals(resourceId)).length)throw new AppError('CALENDAR_COMMITMENT_CONFLICT');
          await tx.archiveResource(resourceId);await audit(tx,state,'RESOURCE',resourceId,'RESOURCE_ARCHIVED',requestId,input.reason,before,null);}
        return {resource:resourceOf(await tx.resource(resourceId,state.household.id)),changed:!row.archived_at};
      });
    },
    async listSlots(auth,input) {
      input=query(schemas.slotQuerySchema,input);return repository.transaction(async tx=>{
        const {household}=await context(tx,auth);if(input.serviceId)await owned(tx,'service',input.serviceId,household.id);
        const result=await tx.listSlots(household.id,input),items=[];
        for(const row of result.rows)items.push((await loadSlot(tx,row)).slot);
        return page(items,result.total,input);
      });
    },
    async getSlot(auth,slotId) {
      return repository.transaction(async tx=>{
        const {household}=await context(tx,auth),row=await owned(tx,'slot',slotId,household.id),view=await loadSlot(tx,row),items=await tx.liveItems({slotId});
        return {slot:view.slot,occupiedPeople:items.reduce((sum,item)=>sum+item.participant_count,0),hasExclusiveReservation:items.some(i=>i.is_exclusive)};
      });
    },
    async createSlot(auth,input,requestId) {
      input=normalize(parse(schemas.slotCreateSchema,input));
      if(Date.parse(input.startsAt)<=now().getTime()||input.salesStatus==='CANCELLED')throw new AppError('INVALID_REQUEST');
      return repository.transaction(async tx=>{
        const state=await context(tx,auth,{approved:true,write:true});await validateSlot(tx,state,input);
        const slotId=await tx.createSlot(state.household.id,state.actor.id,input),row=await tx.slot(slotId,state.household.id);
        await tx.saveSlotConfiguration(row,input);const {slot}=await loadSlot(tx,row);
        await audit(tx,state,'SERVICE_SLOT',slotId,'SLOT_CREATED',requestId,null,null,slot);return {slot};
      });
    },
    async updateSlot(auth,slotId,input,requestId) {
      input=normalize(parse(schemas.slotUpdateSchema,input));return repository.transaction(async tx=>{
        const state=await context(tx,auth,{write:true}),row=await owned(tx,'slot',slotId,state.household.id),before=(await loadSlot(tx,row)).slot;
        match(before.token,input.expectedToken);if(row.archived_at)throw new AppError('INVALID_STATE');
        if(input.serviceId!==String(row.service_id))throw new AppError('INVALID_REQUEST');
        const {expectedToken,reason,...configuration}=input;
        if(token(slotConfiguration(before))===token(configuration))return {slot:before,changed:false};
        if(row.sales_status==='CANCELLED')throw new AppError('INVALID_STATE');
        const items=await tx.liveItems({slotId}),occupied=items.reduce((sum,item)=>sum+item.participant_count,0);
        const structural=before.startsAt!==input.startsAt||before.endsAt!==input.endsAt||before.placeId!==input.placeId||token(before.assignments)!==token(input.assignments);
        if(items.length&&(structural||input.salesStatus==='CANCELLED'||input.personCapacity<occupied))throw new AppError('CALENDAR_COMMITMENT_CONFLICT');
        if(state.household.approval_status!=='APPROVED'&&(structural||input.salesStatus==='OPEN'||input.personCapacity!==before.personCapacity||token(input.offers)!==token(before.offers)))throw new AppError('HOUSEHOLD_NOT_APPROVED');
        if(input.salesStatus==='CANCELLED')input.assignments=[];
        await validateSlot(tx,state,input,slotId);
        await tx.updateSlot(slotId,state.actor.id,input);await tx.saveSlotConfiguration(row,input);
        const {slot}=await loadSlot(tx,await tx.slot(slotId,state.household.id));
        await audit(tx,state,'SERVICE_SLOT',slotId,'SLOT_UPDATED',requestId,input.reason,before,slot);return {slot,changed:true};
      });
    },
    async archiveSlot(auth,slotId,input,requestId) {
      input=parse(schemas.commandSchema,input);return repository.transaction(async tx=>{
        const state=await context(tx,auth,{write:true}),row=await owned(tx,'slot',slotId,state.household.id),before=(await loadSlot(tx,row)).slot;
        match(before.token,input.expectedToken);
        if(!row.archived_at){if((await tx.liveItems({slotId})).length)throw new AppError('CALENDAR_COMMITMENT_CONFLICT');
          await tx.archiveSlot(slotId);await audit(tx,state,'SERVICE_SLOT',slotId,'SLOT_ARCHIVED',requestId,input.reason,before,null);}
        return {slot:(await loadSlot(tx,await tx.slot(slotId,state.household.id))).slot,changed:!row.archived_at};
      });
    },
    async listBlocks(auth,input) {
      input=query(schemas.blockQuerySchema,input);return repository.transaction(async tx=>{
        const {household}=await context(tx,auth);
        if(input.roomId)await owned(tx,'room',input.roomId,household.id);if(input.resourceId)await owned(tx,'resource',input.resourceId,household.id);
        const result=await tx.listBlocks(household.id,input);return page(result.rows.map(blockOf),result.total,input);
      });
    },
    async getBlock(auth,blockId) {
      return repository.transaction(async tx=>{const {household}=await context(tx,auth);return {block:blockOf(await owned(tx,'block',blockId,household.id))};});
    },
    async createBlock(auth,input,requestId) {
      input=parse(schemas.blockCreateSchema,input);return repository.transaction(async tx=>{
        const state=await context(tx,auth,{write:true});await validateBlock(tx,state,input);
        const blockId=await tx.createBlock(state.household.id,state.actor.id,input),block=blockOf(await tx.block(blockId,state.household.id));
        await audit(tx,state,'AVAILABILITY_BLOCK',blockId,'BLOCK_CREATED',requestId,input.reason,null,block);return {block};
      });
    },
    async updateBlock(auth,blockId,input,requestId) {
      input=parse(schemas.blockUpdateSchema,input);return repository.transaction(async tx=>{
        const state=await context(tx,auth,{write:true}),row=await owned(tx,'block',blockId,state.household.id),before=blockOf(row);
        match(before.token,input.expectedToken);if(row.released_at)throw new AppError('INVALID_STATE');
        if(before.roomId!==input.roomId||before.resourceId!==input.resourceId)throw new AppError('INVALID_REQUEST');
        await validateBlock(tx,state,input,blockId);await tx.updateBlock(blockId,input);const block=blockOf(await tx.block(blockId,state.household.id));
        if(before.token!==block.token)await audit(tx,state,'AVAILABILITY_BLOCK',blockId,'BLOCK_UPDATED',requestId,input.reason,before,block);
        return {block,changed:before.token!==block.token};
      });
    },
    async releaseBlock(auth,blockId,input,requestId) {
      input=parse(schemas.commandSchema,input);return repository.transaction(async tx=>{
        const state=await context(tx,auth,{write:true}),row=await owned(tx,'block',blockId,state.household.id),before=blockOf(row);
        match(before.token,input.expectedToken);
        if(!row.released_at){await tx.releaseBlock(blockId);await audit(tx,state,'AVAILABILITY_BLOCK',blockId,'BLOCK_RELEASED',requestId,input.reason,before,null);}
        return {block:blockOf(await tx.block(blockId,state.household.id)),changed:!row.released_at};
      });
    },
    async publicSlots(serviceId,input) {
      id(serviceId);input=query(schemas.publicSlotQuerySchema,input);
      const {service}=await serviceService.publicDetail(serviceId);
      return repository.transaction(async tx=>{
        await tx.household(service.householdId,true);
        const result=await tx.listSlots(service.householdId,{...input,serviceId,includeArchived:false},true),items=[];
        for(const row of result.rows) {
          if(!row.place_id||!await tx.readyPlace(row.place_id,row.household_id))continue;
          const data=await loadSlot(tx,row),booked=await tx.liveItems({slotId:row.id}),usages=await tx.usages(row.id);
          let resourceReady=true;
          for(const assignment of data.assignments.filter(a=>!a.released_at)) {
            const resource=await tx.resource(assignment.resource_id,row.household_id);
            const interval={startsAt:new Date(+row.starts_at-assignment.preparation_minutes*60000),endsAt:new Date(+row.ends_at+assignment.cleanup_minutes*60000)};
            if(!resource||resource.archived_at||peakQuantity(await tx.resourceIntervals(assignment.resource_id),interval)>resource.total_quantity)resourceReady=false;
          }
          const offers=data.offers.filter(o=>o.is_enabled).flatMap(o=>{
            const offer=service.offers.find(item=>item.id===String(o.offer_id));if(!offer)return [];
            const availability=offerAvailability(offer,row,booked,data.assignments,data.rules,usages,input.participants,input.units);
            return [{offerId:offer.id,pricingType:offer.pricingType,participationMode:offer.participationMode,unitPriceVnd:o.price_override_vnd==null?offer.unitPriceVnd:Number(o.price_override_vnd),
              available:availability.available&&resourceReady,remainingCapacity:resourceReady?availability.remainingCapacity:0}];
          });
          if(!offers.length)continue;
          items.push({id:String(row.id),serviceId,placeId:String(row.place_id),startsAt:iso(row.starts_at),endsAt:iso(row.ends_at),personCapacity:row.person_capacity,
            remainingCapacity:Math.max(0,...offers.map(o=>o.remainingCapacity)),available:offers.some(o=>o.available),offers});
        }
        return {...page(items,result.total,input),timeZone:'Asia/Ho_Chi_Minh'};
      });
    },
    async roomAvailability(roomId,input) {
      id(roomId);input=query(schemas.roomAvailabilitySchema,input);const {room}=await roomService.publicDetail(roomId);
      const startsAt=iso(`${input.checkInDate}T${room.checkInTime}:00+07:00`),endsAt=iso(`${input.checkOutDate}T${room.checkOutTime}:00+07:00`);
      return repository.transaction(async tx=>{
        await tx.household(room.householdId,true);
        const items=await tx.liveItems({roomId}),blocks=await tx.roomBlocks(roomId),window={startsAt,endsAt};
        const reason=Date.parse(startsAt)<=now().getTime()?'PAST':input.guests>room.maxGuests?'CAPACITY':
          blocks.some(b=>overlaps(window,{startsAt:b.starts_at,endsAt:b.ends_at}))?'BLOCKED':items.some(i=>overlaps(window,{startsAt:i.starts_at,endsAt:i.ends_at}))?'OCCUPIED':'AVAILABLE';
        return {roomId,startsAt,endsAt,timeZone:'Asia/Ho_Chi_Minh',available:reason==='AVAILABLE',reason};
      });
    },
  };
}
