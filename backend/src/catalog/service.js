import { randomBytes } from 'node:crypto';
import { AppError } from '../shared/errors.js';
import { databaseIdSchema } from '../shared/validation.js';
import { assertRoles, isActiveAccount } from '../auth/policies.js';
import { lockCurrentActor } from '../auth/transaction.js';
import { revisionReferenceSchema, reviewSchema } from '../households/schemas.js';
import { categoryKinds, categoryCreateSchema, categoryUpdateSchema, placeProfileSchema, placeSaveSchema, placeSubmissionSchema, placeStatusSchema } from './schemas.js';

const parse = (schema, input) => {
  const result = schema.safeParse(input);
  if (!result.success) throw new AppError('INVALID_REQUEST');
  return result.data;
};
const id = value => parse(databaseIdSchema, value);
const requestId = value => {
  if (typeof value !== 'string' || !value || value.length > 100) throw new AppError('INVALID_REQUEST');
  return value;
};
const paging = input => {
  if (!Number.isInteger(input?.page) || input.page < 1 || input.page > 100000 || !Number.isInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > 100) throw new AppError('INVALID_REQUEST');
  return input;
};
const timestamp = value => value ? (value instanceof Date ? value : new Date(value)).toISOString() : null;
const match = (revision, reference) => {
  if (!revision || String(revision.id) !== reference.revisionId || revision.version !== reference.version) throw new AppError('STALE_VERSION');
};
const categoryOf = row => ({ id:String(row.id),kind:row.kind,code:row.code,name:row.name,isActive:Boolean(row.is_active),createdAt:timestamp(row.created_at) });
const detailsOf = row => {
  const data = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
  const result = Object.fromEntries([
    ['address',data.address],['locality',data.locality],['directions',data.directions],['contactPhone',data.contact_phone],
  ].filter(([,value]) => typeof value === 'string'));
  if (data.coordinates === null) result.coordinates = null;
  else if (data.coordinates && Number.isFinite(data.coordinates.latitude) && Number.isFinite(data.coordinates.longitude) &&
    Math.abs(data.coordinates.latitude) <= 90 && Math.abs(data.coordinates.longitude) <= 180) {
    result.coordinates = { latitude:data.coordinates.latitude,longitude:data.coordinates.longitude };
  }
  return result;
};
const revisionOf = row => row ? ({
  revisionId:String(row.id),version:row.version,title:row.title,body:row.body,details:detailsOf(row),schemaVersion:row.schema_version,status:row.status,
  submittedAt:timestamp(row.submitted_at),reviewedBy:row.reviewed_by ? String(row.reviewed_by) : null,reviewedAt:timestamp(row.reviewed_at),reviewNote:row.review_note,createdAt:timestamp(row.created_at),
}) : null;
const placeOf = row => ({
  id:String(row.id),householdId:String(row.household_id),code:row.code,supplyStatus:row.supply_status,visibility:row.visibility,
  publishedRevisionId:row.published_revision_id ? String(row.published_revision_id) : null,archivedAt:timestamp(row.archived_at),createdAt:timestamp(row.created_at),
});
const publicPlaceOf = row => ({
  id:String(row.id),code:row.code,householdId:String(row.household_id),householdName:row.household_name,
  revisionId:String(row.revision_id),version:row.version,title:row.title,body:row.body,details:detailsOf(row),publishedAt:timestamp(row.reviewed_at),
});
const pageOf = (items, total, input) => ({ items,total,page:input.page,pageSize:input.pageSize });
const notArchived = (household, place) => { if (household.archived_at || place?.archived_at) throw new AppError('INVALID_STATE'); };
const approved = household => { if (household.approval_status !== 'APPROVED' || household.archived_at) throw new AppError('HOUSEHOLD_NOT_APPROVED'); };

export function createCatalogService({ repository }) {
  async function ownerContext(tx, auth, placeId) {
    const { actor } = await lockCurrentActor(tx, auth, ['HOUSEHOLD']);
    const found = await tx.ownedHousehold(actor.id);
    if (!found) throw new AppError('FORBIDDEN');
    const household = await tx.household(found.id, true);
    if (!household || String(household.owner_user_id) !== auth.user.id) throw new AppError('FORBIDDEN');
    const place = placeId ? await tx.ownedPlace(placeId, household.id) : null;
    if (placeId && !place) throw new AppError('FORBIDDEN');
    return { actor,household,place };
  }
  async function view(tx, place, revision) {
    return {
      place:placeOf(place),profile:revisionOf(revision ?? await tx.latest(place.id)),
      publishedProfile:revisionOf(place.published_revision_id ? await tx.revision(place.published_revision_id,place.id) : null),
    };
  }
  async function reviewTarget(auth, revisionId) {
    assertRoles(auth,['ADMIN']); id(revisionId);
    const row = await repository.read(tx => tx.reviewTarget(revisionId));
    if (!row) throw new AppError('NOT_FOUND');
    return { placeId:String(row.place_id),householdId:String(row.household_id),ownerId:String(row.owner_user_id) };
  }
  async function adminContext(tx, auth, target) {
    const { actor,users } = await lockCurrentActor(tx,auth,['ADMIN'],[target.ownerId]);
    const household = await tx.household(target.householdId,true);
    const place = await tx.place(target.placeId,true);
    if (!household || !place || String(household.owner_user_id) !== target.ownerId || String(place.household_id) !== target.householdId) throw new AppError('STALE_VERSION');
    return { actor,owner:users.get(target.ownerId),household,place };
  }
  function categoryQuery(input) {
    paging(input);
    if (input.kind !== undefined && !categoryKinds.includes(input.kind)) throw new AppError('INVALID_REQUEST');
    if (input.isActive !== undefined && typeof input.isActive !== 'boolean') throw new AppError('INVALID_REQUEST');
    return input;
  }
  return {
    async createCategory(auth, input, correlationId) {
      input = parse(categoryCreateSchema,input); requestId(correlationId);
      return repository.transaction(async tx => {
        const { actor } = await lockCurrentActor(tx,auth,['ADMIN']);
        const row = await tx.createCategory(input);
        await tx.event({ actor,entityType:'CATEGORY',entityId:row.id,action:'CATEGORY_CREATED',requestId:correlationId,reason:input.reason,after:categoryOf(row) });
        return { category:categoryOf(row) };
      });
    },
    async updateCategory(auth, categoryId, input, correlationId) {
      id(categoryId); input = parse(categoryUpdateSchema,input); requestId(correlationId);
      return repository.transaction(async tx => {
        const { actor } = await lockCurrentActor(tx,auth,['ADMIN']);
        const row = await tx.category(categoryId,true);
        if (!row) throw new AppError('NOT_FOUND');
        if (row.name !== input.expectedState.name || Boolean(row.is_active) !== input.expectedState.isActive) throw new AppError('STALE_VERSION');
        const name = input.name ?? row.name, active = input.isActive ?? Boolean(row.is_active);
        const changed = name !== row.name || active !== Boolean(row.is_active);
        if (changed) {
          await tx.updateCategory(categoryId,name,active);
          await tx.event({ actor,entityType:'CATEGORY',entityId:categoryId,action:'CATEGORY_UPDATED',requestId:correlationId,reason:input.reason,
            before:categoryOf(row),after:categoryOf(await tx.category(categoryId)) });
        }
        return { category:categoryOf(await tx.category(categoryId)),changed };
      });
    },
    async categories(auth, input) {
      input = categoryQuery(input);
      if (!auth) return repository.transaction(async tx => { const { rows,total } = await tx.categories(input,true); return pageOf(rows.map(categoryOf),total,input); });
      return repository.transaction(async tx => {
        await lockCurrentActor(tx,auth,['ADMIN']); const { rows,total } = await tx.categories(input);
        return pageOf(rows.map(categoryOf),total,input);
      });
    },
    async category(auth, categoryId) {
      id(categoryId);
      return repository.transaction(async tx => {
        await lockCurrentActor(tx,auth,['ADMIN']); const row = await tx.category(categoryId);
        if (!row) throw new AppError('NOT_FOUND'); return { category:categoryOf(row) };
      });
    },
    async createPlace(auth, input, correlationId) {
      input = parse(placeProfileSchema,input); requestId(correlationId);
      return repository.transaction(async tx => {
        const { actor,household } = await ownerContext(tx,auth); approved(household);
        const place = await tx.createPlace(household.id,`PL-${randomBytes(12).toString('hex').toUpperCase()}`);
        const revision = await tx.createRevision(place.id,1,input,actor.id);
        await tx.event({ householdId:household.id,actor,entityType:'PLACE',entityId:place.id,action:'PLACE_CREATED',to:'DRAFT',requestId:correlationId,after:{ revisionId:String(revision.id),version:1 } });
        return view(tx,place,revision);
      });
    },
    async ownedPlaces(auth, input) {
      paging(input);
      return repository.transaction(async tx => {
        const { household } = await ownerContext(tx,auth); const { rows,total } = await tx.ownedPlaces(household.id,input);
        const revisions = await tx.viewRevisions(rows.map(place=>place.id));
        return pageOf(rows.map(place => {
          const relevant = revisions.filter(revision=>String(revision.place_id)===String(place.id));
          const latest = relevant.reduce((a,b)=>!a || b.version>a.version ? b : a,null);
          return { place:placeOf(place),profile:revisionOf(latest),publishedProfile:revisionOf(relevant.find(revision=>String(revision.id)===String(place.published_revision_id))) };
        }),total,input);
      });
    },
    async ownedPlace(auth, placeId) {
      id(placeId);
      return repository.transaction(async tx => { const { place } = await ownerContext(tx,auth,placeId); return view(tx,place); });
    },
    async savePlace(auth, placeId, input, correlationId) {
      id(placeId); input = parse(placeSaveSchema,input); requestId(correlationId);
      return repository.transaction(async tx => {
        const { actor,household,place } = await ownerContext(tx,auth,placeId); approved(household); notArchived(household,place);
        if (place.supply_status === 'RETIRED') throw new AppError('INVALID_STATE');
        const latest = await tx.latest(placeId,true); match(latest,input);
        if (latest.status === 'PENDING' || latest.version === 4294967295) throw new AppError('INVALID_STATE');
        const revision = await tx.createRevision(placeId,latest.version+1,input,actor.id);
        await tx.event({ householdId:household.id,actor,entityType:'PLACE',entityId:placeId,action:'PLACE_PROFILE_SAVED',requestId:correlationId,
          before:{ revisionId:String(latest.id),version:latest.version },after:{ revisionId:String(revision.id),version:revision.version } });
        return view(tx,place,revision);
      });
    },
    async submitPlace(auth, placeId, input, correlationId) {
      id(placeId); input = parse(revisionReferenceSchema,input); requestId(correlationId);
      return repository.transaction(async tx => {
        const { actor,household,place } = await ownerContext(tx,auth,placeId); approved(household); notArchived(household,place);
        if (place.supply_status === 'RETIRED') throw new AppError('INVALID_STATE');
        const latest = await tx.latest(placeId,true); match(latest,input);
        if (latest.status === 'PENDING') return { ...await view(tx,place,latest),changed:false };
        if (latest.status !== 'DRAFT') throw new AppError('INVALID_STATE');
        if (!placeSubmissionSchema.safeParse({ title:latest.title,body:latest.body,details:detailsOf(latest) }).success) throw new AppError('PLACE_PROFILE_INCOMPLETE');
        await tx.submit(latest.id);
        await tx.event({ householdId:household.id,actor,entityType:'PLACE',entityId:placeId,action:'PLACE_SUBMITTED',from:'DRAFT',to:'PENDING',requestId:correlationId,
          after:{ revisionId:String(latest.id),version:latest.version } });
        return { ...await view(tx,place),changed:true };
      });
    },
    async placeHistory(auth, placeId, input) {
      id(placeId); paging(input);
      return repository.transaction(async tx => {
        await ownerContext(tx,auth,placeId); const { rows,total } = await tx.revisions(placeId,input);
        return pageOf(rows.map(revisionOf),total,input);
      });
    },
    async setPlaceStatus(auth, placeId, input, correlationId) {
      id(placeId); input = parse(placeStatusSchema,input); requestId(correlationId);
      return repository.transaction(async tx => {
        const { actor,household,place } = await ownerContext(tx,auth,placeId); notArchived(household,place);
        if (place.supply_status !== input.expectedState.supplyStatus || place.visibility !== input.expectedState.visibility) throw new AppError('STALE_VERSION');
        if (place.supply_status === 'RETIRED' && input.supplyStatus !== 'RETIRED') throw new AppError('INVALID_STATE');
        if (household.approval_status !== 'APPROVED' && (input.supplyStatus === 'AVAILABLE' || input.visibility === 'VISIBLE')) throw new AppError('HOUSEHOLD_NOT_APPROVED');
        const changed = place.supply_status !== input.supplyStatus || place.visibility !== input.visibility;
        if (changed) {
          await tx.setPlaceStatus(placeId,input);
          await tx.event({ householdId:household.id,actor,entityType:'PLACE',entityId:placeId,action:'PLACE_STATUS_CHANGED',requestId:correlationId,reason:input.reason,
            before:{ supplyStatus:place.supply_status,visibility:place.visibility },after:{ supplyStatus:input.supplyStatus,visibility:input.visibility } });
        }
        return { ...await view(tx,await tx.place(placeId)),changed };
      });
    },
    async submissions(auth, input) {
      paging(input);
      if (!['PENDING','APPROVED','REJECTED'].includes(input.status)) throw new AppError('INVALID_REQUEST');
      if (input.householdId) id(input.householdId);
      return repository.transaction(async tx => {
        await lockCurrentActor(tx,auth,['ADMIN']); const { rows,total } = await tx.submissions(input);
        return pageOf(rows.map(r => ({ revisionId:String(r.revision_id),placeId:String(r.place_id),householdId:String(r.household_id),version:r.version,title:r.title,status:r.status,submittedAt:timestamp(r.submitted_at),reviewedAt:timestamp(r.reviewed_at) })),total,input);
      });
    },
    async submission(auth, revisionId) {
      const target = await reviewTarget(auth,revisionId);
      return repository.transaction(async tx => {
        const { place } = await adminContext(tx,auth,target); const revision = await tx.revision(revisionId,place.id);
        if (!revision?.submitted_at || revision.status === 'DRAFT') throw new AppError('NOT_FOUND');
        return view(tx,place,revision);
      });
    },
    async reviewPlace(auth, revisionId, input, correlationId) {
      input = parse(reviewSchema,input); requestId(correlationId); const target = await reviewTarget(auth,revisionId);
      const reason = input.reason ?? 'Nội dung điểm phục vụ đáp ứng yêu cầu công khai';
      return repository.transaction(async tx => {
        const { actor,owner,household,place } = await adminContext(tx,auth,target); notArchived(household,place);
        const latest = await tx.latest(place.id,true); match(latest,{ revisionId,version:input.version });
        if (latest.status !== 'PENDING') {
          if (latest.status === input.decision && String(latest.reviewed_by) === auth.user.id && latest.review_note === reason) return { ...await view(tx,place,latest),changed:false };
          throw new AppError('INVALID_STATE');
        }
        if (input.decision === 'APPROVED') {
          approved(household);
          if (!isActiveAccount(owner) || owner.role !== 'HOUSEHOLD' || place.supply_status === 'RETIRED') throw new AppError('INVALID_STATE');
        }
        await tx.review(latest.id,actor.id,input.decision,reason);
        if (input.decision === 'APPROVED') await tx.publish(place.id,latest.id);
        await tx.event({ householdId:household.id,actor,entityType:'CONTENT_REVISION',entityId:latest.id,action:'PLACE_REVIEWED',from:'PENDING',to:input.decision,requestId:correlationId,reason,review:true });
        await tx.notifyReview(owner.id,place.id,household.id,latest.id,input.decision);
        return { ...await view(tx,await tx.place(place.id)),changed:true };
      });
    },
    async publicPlaces(input) {
      paging(input);
      if (input.householdId !== undefined) id(input.householdId);
      for (const [key,max] of [['q',100],['locality',200]]) if (input[key] !== undefined && (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > max)) throw new AppError('INVALID_REQUEST');
      return repository.transaction(async tx => { const { rows,total } = await tx.publicPlaces(input); return pageOf(rows.map(publicPlaceOf),total,input); });
    },
    async publicPlace(placeId) {
      id(placeId);
      return repository.read(async tx => { const row = await tx.publicPlace(placeId); if (!row) throw new AppError('NOT_FOUND'); return { place:publicPlaceOf(row) }; });
    },
  };
}
