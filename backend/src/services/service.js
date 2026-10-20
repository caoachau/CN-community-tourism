import { randomBytes } from 'node:crypto';
import { AppError } from '../shared/errors.js';
import { databaseIdSchema } from '../shared/validation.js';
import { assertRoles,isActiveAccount } from '../auth/policies.js';
import { lockCurrentActor } from '../auth/transaction.js';
import { reviewSchema } from '../households/schemas.js';
import { serviceProfileSchema,serviceSaveSchema,serviceSubmitSchema,serviceStatusSchema,offerConfigSchema,offerUpdateSchema,offerPriceSchema,pricingTypes,participationModes } from './schemas.js';
import { json,timestamp,digest,offerOf,offerConfiguration,structureToken,offersToken,snapshotOf,snapshotsOf,approvedOffers,profileInput,profileOf,rootOf } from './models.js';

const parse=(schema,input)=>{const result=schema.safeParse(input);if(!result.success)throw new AppError('INVALID_REQUEST');return result.data;};
const id=value=>parse(databaseIdSchema,value);
const correlation=value=>{if(typeof value!=='string'||!value||value.length>100)throw new AppError('INVALID_REQUEST');return value;};
const paging=input=>{if(!Number.isInteger(input?.page)||input.page<1||input.page>100000||!Number.isInteger(input.pageSize)||input.pageSize<1||input.pageSize>100)throw new AppError('INVALID_REQUEST');return input;};
const page=(items,total,input)=>({items,total,page:input.page,pageSize:input.pageSize});
const match=(revision,ref)=>{if(!revision||String(revision.id)!==ref.revisionId||revision.version!==ref.version)throw new AppError('STALE_VERSION');};
const availableHousehold=household=>{if(household.approval_status!=='APPROVED'||household.archived_at)throw new AppError('HOUSEHOLD_NOT_APPROVED');};
const writable=(household,root)=>{if(household.archived_at||root?.archived_at)throw new AppError('INVALID_STATE');};
const editable=(household,root)=>{availableHousehold(household);writable(household,root);if(root?.supply_status==='RETIRED')throw new AppError('INVALID_STATE');};
const activeLimit=(rows,config,offerId)=>{if(rows.filter(row=>String(row.id)!==offerId&&row.is_active).length+Number(config.isActive)>32)throw new AppError('SERVICE_OFFER_LIMIT');};
const publicLocation=row=>{
  const data=json(row.place_details)??{};const details=Object.fromEntries([['address',data.address],['locality',data.locality],['directions',data.directions],['contactPhone',data.contact_phone]].filter(([,v])=>typeof v==='string'));
  if(data.coordinates&&Number.isFinite(data.coordinates.latitude)&&Number.isFinite(data.coordinates.longitude)&&Math.abs(data.coordinates.latitude)<=90&&Math.abs(data.coordinates.longitude)<=180)details.coordinates={latitude:data.coordinates.latitude,longitude:data.coordinates.longitude};
  return {id:String(row.default_place_id),code:row.place_code,title:row.place_name,details};
};

export function createServiceService({repository}){
  async function context(tx,auth,serviceId){
    const {actor}=await lockCurrentActor(tx,auth,['HOUSEHOLD']);const found=await tx.ownedHousehold(actor.id);
    if(!found)throw new AppError('FORBIDDEN');const household=await tx.household(found.id,true);
    if(!household||String(household.owner_user_id)!==auth.user.id)throw new AppError('FORBIDDEN');
    const root=serviceId?await tx.ownedRoot(serviceId,household.id):null;
    if(serviceId&&!root)throw new AppError('FORBIDDEN');return {actor,household,root};
  }
  function loadedView(root,latest,published,offers){return {service:rootOf(root),profile:profileOf(latest,root),publishedProfile:profileOf(published,root),offers:offers.map(offerOf),offersToken:offersToken(offers)};}
  async function view(tx,root,revision){
    const latest=revision??await tx.latestService(root.id);const published=root.published_revision_id?await tx.serviceRevision(root.published_revision_id,root.id):null;
    return loadedView(root,latest,published,await tx.offers([root.id]));
  }
  async function validateReferences(tx,householdId,profile,publication=false){
    const category=await tx.category(profile.categoryId,true);
    if(!category||category.kind!=='SERVICE'||!category.is_active)throw new AppError('INVALID_SERVICE_CATEGORY');
    if(profile.defaultPlaceId){
      const place=await tx.place(profile.defaultPlaceId,true);
      if(!place||String(place.household_id)!==String(householdId))throw new AppError('FORBIDDEN');
      if(place.archived_at||place.supply_status==='RETIRED')throw new AppError('INVALID_STATE');
    }
    if(publication&&(!profile.defaultPlaceId||!await tx.readyPlace(profile.defaultPlaceId,householdId)))throw new AppError('SERVICE_PLACE_NOT_READY');
  }
  async function target(auth,revisionId){
    assertRoles(auth,['ADMIN']);id(revisionId);const row=await repository.read(tx=>tx.serviceReviewTarget(revisionId));if(!row)throw new AppError('NOT_FOUND');
    return {serviceId:String(row.service_id),householdId:String(row.household_id),ownerId:String(row.owner_user_id)};
  }
  async function adminContext(tx,auth,object){
    const {actor,users}=await lockCurrentActor(tx,auth,['ADMIN'],[object.ownerId]);const household=await tx.household(object.householdId,true);const root=await tx.root(object.serviceId,true);
    if(!household||!root||String(household.owner_user_id)!==object.ownerId||String(root.household_id)!==object.householdId)throw new AppError('STALE_VERSION');
    return {actor,owner:users.get(object.ownerId),household,root};
  }
  async function fetchOffer(tx,root,offerId,token){
    const row=await tx.offer(offerId,root.id,root.household_id,true);if(!row)throw new AppError('FORBIDDEN');
    if(token&&offerOf(row).token!==token)throw new AppError('STALE_VERSION');return row;
  }
  const offerResponse=async(tx,root,row,changed)=>({offer:offerOf(row),offersToken:offersToken(await tx.offers([root.id])),...(changed!==undefined?{changed}:{})});
  function publicOf(row,rows,filters){
    const offers=approvedOffers({details:row.details},rows,filters);if(!offers.length)return null;
    return {id:String(row.id),code:row.code,householdId:String(row.household_id),householdName:row.household_name,
      revisionId:String(row.revision_id),version:row.revision_version,title:row.title,body:row.body,details:profileInput(row,row).details,
      defaultDurationMinutes:row.default_duration_minutes,category:{id:String(row.category_id),code:row.category_code,name:row.category_name},place:publicLocation(row),offers,publishedAt:timestamp(row.published_at)};
  }
  return {
    async create(auth,input,requestId){
      input=parse(serviceProfileSchema,input);correlation(requestId);
      return repository.transaction(async tx=>{const {actor,household}=await context(tx,auth);editable(household);await validateReferences(tx,household.id,input);
        const root=await tx.createRoot(household.id,`SV-${randomBytes(12).toString('hex').toUpperCase()}`,input);const revision=await tx.createServiceRevision(root.id,1,input,actor.id);
        await tx.event({householdId:household.id,actor,entityType:'SERVICE',entityId:root.id,action:'SERVICE_CREATED',to:'DRAFT',requestId,after:{revisionId:String(revision.id),version:1}});return view(tx,root,revision);});
    },
    async list(auth,input){
      paging(input);return repository.transaction(async tx=>{const {household}=await context(tx,auth);const {rows,total}=await tx.ownedServices(household.id,input);
        const ids=rows.map(root=>root.id);const revisions=await tx.serviceViewRevisions(ids),offers=await tx.offers(ids);
        return page(rows.map(root=>{const relevant=revisions.filter(r=>String(r.service_id)===String(root.id));const latest=relevant.reduce((a,b)=>!a||b.version>a.version?b:a,null);
          return loadedView(root,latest,relevant.find(r=>String(r.id)===String(root.published_revision_id)),offers.filter(o=>String(o.service_id)===String(root.id)));}),total,input);});
    },
    async mine(auth,serviceId){id(serviceId);return repository.transaction(async tx=>{const {root}=await context(tx,auth,serviceId);return view(tx,root);});},
    async save(auth,serviceId,input,requestId){
      id(serviceId);input=parse(serviceSaveSchema,input);correlation(requestId);
      return repository.transaction(async tx=>{const {actor,household,root}=await context(tx,auth,serviceId);editable(household,root);const latest=await tx.latestService(serviceId,true);match(latest,input);
        if(latest.status==='PENDING'||latest.version===4294967295)throw new AppError('INVALID_STATE');await validateReferences(tx,household.id,input);
        const revision=await tx.createServiceRevision(serviceId,latest.version+1,input,actor.id);await tx.event({householdId:household.id,actor,entityType:'SERVICE',entityId:serviceId,action:'SERVICE_PROFILE_SAVED',requestId,before:{revisionId:String(latest.id)},after:{revisionId:String(revision.id),version:revision.version}});
        return view(tx,root,revision);});
    },
    async submit(auth,serviceId,input,requestId){
      id(serviceId);input=parse(serviceSubmitSchema,input);correlation(requestId);
      return repository.transaction(async tx=>{const {actor,household,root}=await context(tx,auth,serviceId);editable(household,root);const latest=await tx.latestService(serviceId,true);match(latest,input);
        if(latest.status==='PENDING')return {...await view(tx,root,latest),changed:false};if(latest.status!=='DRAFT')throw new AppError('INVALID_STATE');
        const offers=await tx.offers([serviceId],true);if(offersToken(offers)!==input.offersToken)throw new AppError('STALE_VERSION');
        const profile=profileInput(latest,root);if(profile.title.length<3||profile.body.trim().length<20)throw new AppError('SERVICE_PROFILE_INCOMPLETE');
        await validateReferences(tx,household.id,profile,true);const active=offers.filter(o=>o.is_active);
        if(!active.length||active.length>32||active.some(o=>{const result=offerConfigSchema.safeParse(offerConfiguration(o));return !result.success||result.data.terms.scopeDescription.length<10;}))throw new AppError('SERVICE_OFFER_INVALID');
        await tx.submitService(latest,active.map(snapshotOf));await tx.event({householdId:household.id,actor,entityType:'SERVICE',entityId:serviceId,action:'SERVICE_SUBMITTED',from:'DRAFT',to:'PENDING',requestId,after:{revisionId:String(latest.id),version:latest.version}});
        return {...await view(tx,root),changed:true};});
    },
    async history(auth,serviceId,input){id(serviceId);paging(input);return repository.transaction(async tx=>{const {root}=await context(tx,auth,serviceId);const {rows,total}=await tx.serviceHistory(serviceId,input);return page(rows.map(r=>profileOf(r,root)),total,input);});},
    async status(auth,serviceId,input,requestId){
      id(serviceId);input=parse(serviceStatusSchema,input);correlation(requestId);
      return repository.transaction(async tx=>{const {actor,household,root}=await context(tx,auth,serviceId);writable(household,root);
        if(root.supply_status!==input.expectedState.supplyStatus||root.visibility!==input.expectedState.visibility)throw new AppError('STALE_VERSION');
        if(root.supply_status==='RETIRED'&&input.supplyStatus!=='RETIRED')throw new AppError('INVALID_STATE');
        if(household.approval_status!=='APPROVED'&&(input.supplyStatus==='AVAILABLE'||input.visibility==='VISIBLE'))throw new AppError('HOUSEHOLD_NOT_APPROVED');
        const changed=root.supply_status!==input.supplyStatus||root.visibility!==input.visibility;if(changed){await tx.setServiceStatus(serviceId,input);await tx.event({householdId:household.id,actor,entityType:'SERVICE',entityId:serviceId,action:'SERVICE_STATUS_CHANGED',requestId,reason:input.reason,before:{supplyStatus:root.supply_status,visibility:root.visibility},after:{supplyStatus:input.supplyStatus,visibility:input.visibility}});}
        return {...await view(tx,await tx.root(serviceId)),changed};});
    },
    async createOffer(auth,serviceId,input,requestId){
      id(serviceId);input=parse(offerConfigSchema,input);correlation(requestId);
      return repository.transaction(async tx=>{const {actor,household,root}=await context(tx,auth,serviceId);editable(household,root);const latest=await tx.latestService(serviceId,true);if(latest?.status==='PENDING')throw new AppError('INVALID_STATE');
        const offers=await tx.offers([serviceId],true);activeLimit(offers,input);const offer=await tx.createOffer(serviceId,household.id,input);
        await tx.event({householdId:household.id,actor,entityType:'SERVICE_OFFER',entityId:offer.id,action:'SERVICE_OFFER_CREATED',requestId,after:offerOf(offer)});return offerResponse(tx,root,offer);});
    },
    async getOffer(auth,serviceId,offerId){id(serviceId);id(offerId);return repository.transaction(async tx=>{const {root}=await context(tx,auth,serviceId);return offerResponse(tx,root,await fetchOffer(tx,root,offerId));});},
    async updateOffer(auth,serviceId,offerId,input,requestId){
      id(serviceId);id(offerId);input=parse(offerUpdateSchema,input);correlation(requestId);
      return repository.transaction(async tx=>{const {actor,household,root}=await context(tx,auth,serviceId);editable(household,root);const row=await fetchOffer(tx,root,offerId,input.expectedToken);const current=offerConfiguration(row),next=input.configuration;
        const structural=structureToken(current)!==structureToken(next);
        if(structural){const latest=await tx.latestService(serviceId,true);if(latest?.status==='PENDING')throw new AppError('INVALID_STATE');if(await tx.protectedOffer(offerId,serviceId))throw new AppError('OFFER_CONFIGURATION_LOCKED');}
        activeLimit(await tx.offers([serviceId],true),next,offerId);const changed=digest(current)!==digest(next);
        if(changed){await tx.updateOffer(offerId,next);await tx.event({householdId:household.id,actor,entityType:'SERVICE_OFFER',entityId:offerId,action:'SERVICE_OFFER_UPDATED',requestId,reason:input.reason,before:current,after:next});}
        return offerResponse(tx,root,await tx.offer(offerId,serviceId,household.id),changed);});
    },
    async updatePrices(auth,serviceId,offerId,input,requestId){
      id(serviceId);id(offerId);input=parse(offerPriceSchema,input);correlation(requestId);
      return repository.transaction(async tx=>{const {actor,household,root}=await context(tx,auth,serviceId);writable(household,root);const row=await fetchOffer(tx,root,offerId,input.expectedToken);const current=offerConfiguration(row);
        if((household.approval_status!=='APPROVED'||root.supply_status==='RETIRED')&&(input.isActive!==false||input.addonPrices!==undefined||(input.unitPriceVnd!==undefined&&input.unitPriceVnd!==current.unitPriceVnd)))throw new AppError('HOUSEHOLD_NOT_APPROVED');
        const next={...current,unitPriceVnd:input.unitPriceVnd??current.unitPriceVnd,isActive:input.isActive??current.isActive,addons:current.addons.map(item=>({...item}))};
        for(const update of input.addonPrices??[]){const addon=next.addons.find(item=>item.key===update.key);if(!addon)throw new AppError('INVALID_REQUEST');if(update.unitPriceVnd!==undefined)addon.unitPriceVnd=update.unitPriceVnd;if(update.isActive!==undefined)addon.isActive=update.isActive;}
        activeLimit(await tx.offers([serviceId],true),next,offerId);const changed=digest(current)!==digest(next);
        if(changed){await tx.updateOfferPrices(offerId,next);await tx.event({householdId:household.id,actor,entityType:'SERVICE_OFFER',entityId:offerId,action:'SERVICE_OFFER_PRICE_CHANGED',requestId,reason:input.reason,before:current,after:next});}
        return offerResponse(tx,root,await tx.offer(offerId,serviceId,household.id),changed);});
    },
    async submissions(auth,input){
      paging(input);if(!['PENDING','APPROVED','REJECTED'].includes(input.status))throw new AppError('INVALID_REQUEST');if(input.householdId)id(input.householdId);
      return repository.transaction(async tx=>{await lockCurrentActor(tx,auth,['ADMIN']);const {rows,total}=await tx.serviceSubmissions(input);return page(rows.map(r=>({revisionId:String(r.revision_id),serviceId:String(r.service_id),householdId:String(r.household_id),version:r.version,title:r.title,status:r.status,submittedAt:timestamp(r.submitted_at),reviewedAt:timestamp(r.reviewed_at)})),total,input);});
    },
    async submission(auth,revisionId){const object=await target(auth,revisionId);return repository.transaction(async tx=>{const {root}=await adminContext(tx,auth,object);const revision=await tx.serviceRevision(revisionId,root.id);if(!revision?.submitted_at||revision.status==='DRAFT')throw new AppError('NOT_FOUND');return view(tx,root,revision);});},
    async review(auth,revisionId,input,requestId){
      input=parse(reviewSchema,input);correlation(requestId);const object=await target(auth,revisionId),reason=input.reason??'Nội dung dịch vụ đáp ứng yêu cầu công khai';
      return repository.transaction(async tx=>{const {actor,owner,household,root}=await adminContext(tx,auth,object);writable(household,root);const latest=await tx.latestService(root.id,true);match(latest,{revisionId,version:input.version});
        if(latest.status!=='PENDING'){if(latest.status===input.decision&&String(latest.reviewed_by)===auth.user.id&&latest.review_note===reason)return {...await view(tx,root,latest),changed:false};throw new AppError('INVALID_STATE');}
        const profile=profileInput(latest,root);
        if(input.decision==='APPROVED'){
          editable(household,root);if(!isActiveAccount(owner)||owner.role!=='HOUSEHOLD')throw new AppError('INVALID_STATE');await validateReferences(tx,household.id,profile,true);
          const snapshots=snapshotsOf(latest),offers=await tx.offers([root.id],true),byId=new Map(offers.map(o=>[String(o.id),o]));
          if(!snapshots.length||snapshots.some(s=>!byId.has(s.id)||structureToken(offerConfiguration(byId.get(s.id)))!==s.structureToken))throw new AppError('SERVICE_OFFER_INVALID');
        }
        await tx.reviewService(latest.id,actor.id,input.decision,reason);if(input.decision==='APPROVED')await tx.publishService(root.id,latest.id,profile);
        await tx.event({householdId:household.id,actor,entityType:'CONTENT_REVISION',entityId:latest.id,action:'SERVICE_REVIEWED',from:'PENDING',to:input.decision,requestId,reason,review:true});
        await tx.notifyServiceReview(owner.id,root.id,household.id,latest.id,input.decision);return {...await view(tx,await tx.root(root.id)),changed:true};});
    },
    async publicList(input){
      paging(input);for(const key of ['householdId','categoryId','placeId'])if(input[key]!==undefined)id(input[key]);
      if(input.pricingType!==undefined&&!pricingTypes.includes(input.pricingType))throw new AppError('INVALID_REQUEST');if(input.participationMode!==undefined&&!participationModes.includes(input.participationMode))throw new AppError('INVALID_REQUEST');
      if(input.q!==undefined&&(typeof input.q!=='string'||!input.q.trim()||input.q.length>100))throw new AppError('INVALID_REQUEST');
      return repository.transaction(async tx=>{const {rows,total}=await tx.publicServices(input),offers=await tx.offers(rows.map(r=>r.id));return page(rows.map(row=>publicOf(row,offers.filter(o=>String(o.service_id)===String(row.id)),input)).filter(Boolean),total,input);});
    },
    async publicDetail(serviceId){id(serviceId);return repository.transaction(async tx=>{const {rows}=await tx.publicServices({page:1,pageSize:1},serviceId);const row=rows[0];if(!row)throw new AppError('NOT_FOUND');const service=publicOf(row,await tx.offers([row.id]),{});if(!service)throw new AppError('NOT_FOUND');return {service};});},
  };
}
