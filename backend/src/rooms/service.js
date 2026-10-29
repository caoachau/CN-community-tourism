import { randomBytes } from 'node:crypto';
import { AppError } from '../shared/errors.js';
import { databaseIdSchema } from '../shared/validation.js';
import { assertRoles, isActiveAccount } from '../auth/policies.js';
import { lockCurrentActor } from '../auth/transaction.js';
import { reviewSchema } from '../households/schemas.js';
import { roomCreateSchema, roomSaveSchema, roomSubmitSchema, roomPriceSchema, roomStatusSchema, roomProfileSchema } from './schemas.js';
import { pricingToken, profileInput, profileOf, rootOf, structureChanged, publicRoomOf, timestamp } from './models.js';

const parse = (schema,input) => {const result=schema.safeParse(input);if(!result.success)throw new AppError('INVALID_REQUEST');return result.data;};
const id = value => parse(databaseIdSchema,value);
const correlation = value => {if(typeof value!=='string'||!value||value.length>100)throw new AppError('INVALID_REQUEST');};
const paging = input => {if(!Number.isInteger(input?.page)||input.page<1||input.page>100000||!Number.isInteger(input.pageSize)||input.pageSize<1||input.pageSize>100)throw new AppError('INVALID_REQUEST');};
const page = (items,total,input) => ({items,total,page:input.page,pageSize:input.pageSize});
const match = (revision,ref) => {if(!revision||String(revision.id)!==ref.revisionId||revision.version!==ref.version)throw new AppError('STALE_VERSION');};
const writable = (household,room) => {if(household.archived_at||room?.archived_at)throw new AppError('INVALID_STATE');};
const editable = (household,room) => {
  writable(household,room);if(household.approval_status!=='APPROVED')throw new AppError('HOUSEHOLD_NOT_APPROVED');
  if(room?.supply_status==='RETIRED')throw new AppError('INVALID_STATE');
};

export function createRoomService({repository}) {
  async function context(tx,auth,roomId) {
    const {actor}=await lockCurrentActor(tx,auth,['HOUSEHOLD']);const found=await tx.ownedHousehold(actor.id);
    if(!found)throw new AppError('FORBIDDEN');const household=await tx.household(found.id,true);
    if(!household||String(household.owner_user_id)!==auth.user.id)throw new AppError('FORBIDDEN');
    const room=roomId?await tx.ownedRoom(roomId,household.id):null;
    if(roomId&&!room)throw new AppError('FORBIDDEN');return {actor,household,room};
  }
  const loadedView = (room,latest,published) => ({room:rootOf(room),profile:profileOf(latest,room),publishedProfile:profileOf(published,room)});
  async function view(tx,room,revision) {
    return loadedView(room,revision??await tx.latestRoom(room.id),room.published_revision_id?await tx.roomRevision(room.published_revision_id,room.id):null);
  }
  async function validatePlace(tx,householdId,profile,publication=false) {
    if(profile.placeId) {
      const place=await tx.place(profile.placeId,true);
      if(!place||String(place.household_id)!==String(householdId))throw new AppError('FORBIDDEN');
      if(place.archived_at||place.supply_status==='RETIRED')throw new AppError('INVALID_STATE');
    }
    if(publication&&(!profile.placeId||!await tx.readyRoomPlace(profile.placeId,householdId)))throw new AppError('ROOM_PLACE_NOT_READY');
  }
  async function publication(tx,room,household,profile) {
    if(!roomProfileSchema.safeParse(profile).success||profile.title.length<3||profile.body.trim().length<20)throw new AppError('ROOM_PROFILE_INCOMPLETE');
    await validatePlace(tx,household.id,profile,true);
    if(structureChanged(room,profile)&&await tx.hasRoomCommitments(room.id))throw new AppError('ROOM_CONFIGURATION_LOCKED');
  }
  async function target(auth,revisionId) {
    assertRoles(auth,['ADMIN']);id(revisionId);const row=await repository.read(tx=>tx.roomReviewTarget(revisionId));if(!row)throw new AppError('NOT_FOUND');
    return {roomId:String(row.room_id),householdId:String(row.household_id),ownerId:String(row.owner_user_id)};
  }
  async function adminContext(tx,auth,object) {
    const {actor,users}=await lockCurrentActor(tx,auth,['ADMIN'],[object.ownerId]);
    const household=await tx.household(object.householdId,true),room=await tx.room(object.roomId,true);
    if(!household||!room||String(household.owner_user_id)!==object.ownerId||String(room.household_id)!==object.householdId)throw new AppError('STALE_VERSION');
    return {actor,owner:users.get(object.ownerId),household,room};
  }
  return {
    async create(auth,input,requestId) {
      input=parse(roomCreateSchema,input);correlation(requestId);
      return repository.transaction(async tx=>{
        const {actor,household}=await context(tx,auth);editable(household);await validatePlace(tx,household.id,input);
        const room=await tx.createRoom(household.id,`RM-${randomBytes(12).toString('hex').toUpperCase()}`,input);
        const revision=await tx.createRoomRevision(room.id,1,input,actor.id);
        await tx.event({householdId:household.id,actor,entityType:'ROOM',entityId:room.id,action:'ROOM_CREATED',to:'DRAFT',requestId,after:{revisionId:String(revision.id),version:1,nightlyPriceVnd:input.nightlyPriceVnd}});
        return view(tx,room,revision);
      });
    },
    async list(auth,input) {
      paging(input);return repository.transaction(async tx=>{
        const {household}=await context(tx,auth);const {rows,total}=await tx.ownedRooms(household.id,input),revisions=await tx.roomViewRevisions(rows.map(row=>row.id));
        return page(rows.map(room=>{
          const relevant=revisions.filter(r=>String(r.room_id)===String(room.id));
          const latest=relevant.reduce((a,b)=>!a||b.version>a.version?b:a,null);
          return loadedView(room,latest,relevant.find(r=>String(r.id)===String(room.published_revision_id)));
        }),total,input);
      });
    },
    async mine(auth,roomId) {id(roomId);return repository.transaction(async tx=>{const {room}=await context(tx,auth,roomId);return view(tx,room);});},
    async save(auth,roomId,input,requestId) {
      id(roomId);input=parse(roomSaveSchema,input);correlation(requestId);
      return repository.transaction(async tx=>{
        const {actor,household,room}=await context(tx,auth,roomId);editable(household,room);
        const latest=await tx.latestRoom(roomId,true);match(latest,input);
        if(latest.status==='PENDING'||latest.version===4294967295)throw new AppError('INVALID_STATE');
        await validatePlace(tx,household.id,input);const revision=await tx.createRoomRevision(roomId,latest.version+1,input,actor.id);
        await tx.copyRevisionImages(latest.id,revision.id);
        await tx.event({householdId:household.id,actor,entityType:'ROOM',entityId:roomId,action:'ROOM_PROFILE_SAVED',requestId,before:{revisionId:String(latest.id)},after:{revisionId:String(revision.id),version:revision.version}});
        return view(tx,room,revision);
      });
    },
    async submit(auth,roomId,input,requestId) {
      id(roomId);input=parse(roomSubmitSchema,input);correlation(requestId);
      return repository.transaction(async tx=>{
        const {actor,household,room}=await context(tx,auth,roomId);editable(household,room);
        const latest=await tx.latestRoom(roomId,true);match(latest,input);
        if(latest.status==='PENDING')return {...await view(tx,room,latest),changed:false};
        if(latest.status!=='DRAFT')throw new AppError('INVALID_STATE');
        if(pricingToken(room)!==input.pricingToken)throw new AppError('STALE_VERSION');
        await publication(tx,room,household,profileInput(latest,room));
        await tx.submitRoom(latest,Number(room.nightly_price_vnd));
        await tx.event({householdId:household.id,actor,entityType:'ROOM',entityId:roomId,action:'ROOM_SUBMITTED',from:'DRAFT',to:'PENDING',requestId,after:{revisionId:String(latest.id),version:latest.version}});
        return {...await view(tx,room),changed:true};
      });
    },
    async history(auth,roomId,input) {
      id(roomId);paging(input);return repository.transaction(async tx=>{
        const {room}=await context(tx,auth,roomId),{rows,total}=await tx.roomHistory(roomId,input);return page(rows.map(row=>profileOf(row,room)),total,input);
      });
    },
    async status(auth,roomId,input,requestId) {
      id(roomId);input=parse(roomStatusSchema,input);correlation(requestId);
      return repository.transaction(async tx=>{
        const {actor,household,room}=await context(tx,auth,roomId);writable(household,room);
        if(room.supply_status!==input.expectedState.supplyStatus||room.visibility!==input.expectedState.visibility)throw new AppError('STALE_VERSION');
        if(room.supply_status==='RETIRED'&&input.supplyStatus!=='RETIRED')throw new AppError('INVALID_STATE');
        if(household.approval_status!=='APPROVED'&&(input.supplyStatus==='AVAILABLE'||input.visibility==='VISIBLE'))throw new AppError('HOUSEHOLD_NOT_APPROVED');
        const changed=room.supply_status!==input.supplyStatus||room.visibility!==input.visibility;
        if(changed) {
          await tx.setRoomStatus(roomId,input);
          await tx.event({householdId:household.id,actor,entityType:'ROOM',entityId:roomId,action:'ROOM_STATUS_CHANGED',requestId,reason:input.reason,
            before:{supplyStatus:room.supply_status,visibility:room.visibility},after:{supplyStatus:input.supplyStatus,visibility:input.visibility}});
        }
        return {...await view(tx,await tx.room(roomId)),changed};
      });
    },
    async updatePrice(auth,roomId,input,requestId) {
      id(roomId);input=parse(roomPriceSchema,input);correlation(requestId);
      return repository.transaction(async tx=>{
        const {actor,household,room}=await context(tx,auth,roomId);editable(household,room);
        if(pricingToken(room)!==input.expectedToken)throw new AppError('STALE_VERSION');
        const previous=Number(room.nightly_price_vnd),changed=previous!==input.nightlyPriceVnd;
        if(changed) {
          await tx.setRoomPrice(roomId,input.nightlyPriceVnd);
          await tx.event({householdId:household.id,actor,entityType:'ROOM',entityId:roomId,action:'ROOM_PRICE_CHANGED',requestId,reason:input.reason,
            before:{nightlyPriceVnd:previous},after:{nightlyPriceVnd:input.nightlyPriceVnd}});
        }
        return {...await view(tx,await tx.room(roomId)),changed};
      });
    },
    async submissions(auth,input) {
      paging(input);if(!['PENDING','APPROVED','REJECTED'].includes(input.status))throw new AppError('INVALID_REQUEST');if(input.householdId)id(input.householdId);
      return repository.transaction(async tx=>{
        await lockCurrentActor(tx,auth,['ADMIN']);const {rows,total}=await tx.roomSubmissions(input);
        return page(rows.map(row=>({revisionId:String(row.revision_id),roomId:String(row.room_id),householdId:String(row.household_id),version:row.version,title:row.title,status:row.status,
          submittedAt:timestamp(row.submitted_at),reviewedAt:timestamp(row.reviewed_at)})),total,input);
      });
    },
    async submission(auth,revisionId) {
      const object=await target(auth,revisionId);return repository.transaction(async tx=>{
        const {room}=await adminContext(tx,auth,object),revision=await tx.roomRevision(revisionId,room.id);
        if(!revision?.submitted_at||revision.status==='DRAFT')throw new AppError('NOT_FOUND');return view(tx,room,revision);
      });
    },
    async review(auth,revisionId,input,requestId) {
      input=parse(reviewSchema,input);correlation(requestId);const object=await target(auth,revisionId),reason=input.reason??'Nội dung phòng lưu trú đáp ứng yêu cầu công khai';
      return repository.transaction(async tx=>{
        const {actor,owner,household,room}=await adminContext(tx,auth,object);writable(household,room);
        const latest=await tx.latestRoom(room.id,true);match(latest,{revisionId,version:input.version});
        if(latest.status!=='PENDING') {
          if(latest.status===input.decision&&String(latest.reviewed_by)===auth.user.id&&latest.review_note===reason)return {...await view(tx,room,latest),changed:false};
          throw new AppError('INVALID_STATE');
        }
        const profile=profileInput(latest,room);
        if(input.decision==='APPROVED') {
          editable(household,room);if(!isActiveAccount(owner)||owner.role!=='HOUSEHOLD')throw new AppError('INVALID_STATE');
          await publication(tx,room,household,profile);
        }
        await tx.reviewRoom(latest.id,actor.id,input.decision,reason);
        if(input.decision==='APPROVED')await tx.publishRoom(room.id,latest.id,profile);
        await tx.event({householdId:household.id,actor,entityType:'CONTENT_REVISION',entityId:latest.id,action:'ROOM_REVIEWED',from:'PENDING',to:input.decision,requestId,reason,review:true});
        await tx.notifyRoomReview(owner.id,room.id,household.id,latest.id,input.decision);
        return {...await view(tx,await tx.room(room.id)),changed:true};
      });
    },
    async publicList(input) {
      paging(input);for(const key of ['householdId','placeId'])if(input[key]!==undefined)id(input[key]);
      if(input.q!==undefined&&(typeof input.q!=='string'||!input.q.trim()||input.q.length>100))throw new AppError('INVALID_REQUEST');
      for(const [key,min,max] of [['guests',1,1000],['minPriceVnd',0,999999999999999],['maxPriceVnd',0,999999999999999]]) {
        if(input[key]!==undefined&&(!Number.isInteger(input[key])||input[key]<min||input[key]>max))throw new AppError('INVALID_REQUEST');
      }
      if(input.minPriceVnd!==undefined&&input.maxPriceVnd!==undefined&&input.minPriceVnd>input.maxPriceVnd)throw new AppError('INVALID_REQUEST');
      return repository.transaction(async tx=>{const {rows,total}=await tx.publicRooms(input);return page(rows.map(publicRoomOf),total,input);});
    },
    async publicDetail(roomId) {
      id(roomId);return repository.read(async tx=>{const {rows}=await tx.publicRooms({page:1,pageSize:1},roomId);if(!rows.length)throw new AppError('NOT_FOUND');return {room:publicRoomOf(rows[0])};});
    },
  };
}
