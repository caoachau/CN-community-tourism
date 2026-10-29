import { AppError } from '../shared/errors.js';
import { assertRoles } from '../auth/policies.js';
import { lockCurrentActor } from '../auth/transaction.js';
import { databaseIdSchema } from '../shared/validation.js';
import { archiveSchema, imageReferenceSchema, imageOrderSchema } from './schemas.js';
import { contentKinds } from './repository.js';
import { MAX_IMAGES, imageOf, mediaToken } from './images.js';
import { normalizeImage, validObjectKey } from './storage.js';

const parse = (schema, input) => { const result = schema.safeParse(input); if (!result.success) throw new AppError('INVALID_REQUEST'); return result.data; };
const match = (revision, input) => {
  if (!revision || String(revision.id) !== input.revisionId || revision.version !== input.version) throw new AppError('STALE_VERSION');
};
const requestId = value => { if (typeof value !== 'string' || !value || value.length > 100) throw new AppError('INVALID_REQUEST'); };

export function createContentService({ repository, storage }) {
  async function context(tx, auth, kind, resourceId) {
    if (!Object.hasOwn(contentKinds, kind)) throw new AppError('INVALID_REQUEST');
    const { actor } = await lockCurrentActor(tx, auth, [kind === 'households' ? 'CUSTOMER' : 'HOUSEHOLD']);
    const found = await tx.ownedHousehold(actor.id);
    if (!found) throw new AppError('NOT_FOUND');
    const household = await tx.household(found.id, true);
    if (!household || String(household.owner_user_id) !== actor.id) throw new AppError('FORBIDDEN');
    const rootId = kind === 'households' ? String(household.id) : parse(databaseIdSchema, resourceId);
    const root = await tx.contentRoot(kind, rootId, household.id);
    if (!root) throw new AppError('FORBIDDEN');
    return { actor, household, root };
  }
  async function snapshot(tx, revision) {
    const rows = await tx.revisionImages(revision.id);
    return { revisionId: String(revision.id), version: revision.version, status: revision.status, images: rows.map(imageOf), mediaToken: mediaToken(rows) };
  }
  async function editable(tx, auth, kind, resourceId, input) {
    const state = await context(tx, auth, kind, resourceId);
    if (state.household.archived_at || state.root.archived_at || state.root.supply_status === 'RETIRED') throw new AppError('INVALID_STATE');
    if (kind !== 'households' && state.household.approval_status !== 'APPROVED') throw new AppError('HOUSEHOLD_NOT_APPROVED');
    const revision = await tx.contentRevision(kind, state.root.id);
    match(revision, input);
    if (revision.status !== 'DRAFT') throw new AppError('INVALID_STATE');
    const rows = await tx.revisionImages(revision.id);
    if (mediaToken(rows) !== input.expectedToken) throw new AppError('STALE_VERSION');
    return { ...state, revision, rows };
  }
  async function event(tx, state, action, correlation, before, after, reason = null) {
    await tx.event({ householdId: state.household.id, actor: state.actor, entityType: state.revision ? 'CONTENT_REVISION' : contentKinds[state.kind].type,
      entityId: state.revision?.id ?? state.root.id, action, requestId: correlation, before, after, reason });
  }
  return {
    async adminImages(auth, revisionId) {
      parse(databaseIdSchema, revisionId);
      return repository.transaction(async tx => {
        await lockCurrentActor(tx, auth, ['ADMIN']);
        const revision = await tx.adminRevision(revisionId);
        if (!revision) throw new AppError('NOT_FOUND');
        return snapshot(tx, revision);
      });
    },
    async list(auth, kind, resourceId, revisionId) {
      if (revisionId !== undefined) parse(databaseIdSchema, revisionId);
      return repository.transaction(async tx => {
        const { root } = await context(tx, auth, kind, resourceId);
        const revision = await tx.contentRevision(kind, root.id, revisionId);
        if (!revision) throw new AppError('NOT_FOUND');
        return snapshot(tx, revision);
      });
    },
    async publicImages(kind, resourceId) {
      parse(databaseIdSchema, resourceId);
      return repository.read(async tx => {
        const root = await tx.publicContent(kind, resourceId);
        if (!root) throw new AppError('NOT_FOUND');
        return { images: (await tx.revisionImages(root.published_revision_id)).map(imageOf) };
      });
    },
    async upload(auth, kind, resourceId, input, bytes, correlation) {
      input = parse(imageReferenceSchema, input); requestId(correlation);
      await repository.transaction(async tx => {
        const state = await editable(tx, auth, kind, resourceId, input);
        if (state.rows.length >= MAX_IMAGES) throw new AppError('IMAGE_LIMIT');
      });
      const normalized = await normalizeImage(bytes);
      const file = await storage.put(normalized);
      try {
        return await repository.transaction(async tx => {
          const state = await editable(tx, auth, kind, resourceId, input);
          if (state.rows.length >= MAX_IMAGES) throw new AppError('IMAGE_LIMIT');
          await tx.addImage(state.revision.id, state.actor.id, file, state.rows.length, !state.rows.length);
          await event(tx, state, 'IMAGE_UPLOADED', correlation, null, { objectKey: file.key, revisionId: String(state.revision.id) });
          return snapshot(tx, state.revision);
        });
      } catch (error) {
        try { await storage.remove(file); } catch { /* preserve transaction error */ }
        throw error;
      }
    },
    async order(auth, kind, resourceId, input, correlation) {
      input = parse(imageOrderSchema, input); requestId(correlation);
      return repository.transaction(async tx => {
        const state = await editable(tx, auth, kind, resourceId, input);
        if (input.imageIds.length !== state.rows.length || input.imageIds.some(id => !state.rows.some(row => String(row.id) === id))) throw new AppError('INVALID_REQUEST');
        await tx.arrangeImages(state.revision.id, input.imageIds, input.coverImageId);
        await event(tx, state, 'IMAGES_REORDERED', correlation, { imageIds: state.rows.map(row => String(row.id)) }, { imageIds: input.imageIds, coverImageId: input.coverImageId });
        return snapshot(tx, state.revision);
      });
    },
    async remove(auth, kind, resourceId, imageId, input, correlation) {
      parse(databaseIdSchema, imageId); input = parse(imageReferenceSchema, input); requestId(correlation);
      return repository.transaction(async tx => {
        const state = await editable(tx, auth, kind, resourceId, input);
        const removed = state.rows.find(row => String(row.id) === imageId);
        if (!removed) throw new AppError('NOT_FOUND');
        const remaining = state.rows.filter(row => String(row.id) !== imageId);
        await tx.removeImage(state.revision.id, imageId);
        const cover = remaining.find(row => row.is_cover) ?? remaining[0];
        await tx.arrangeImages(state.revision.id, remaining.map(row => String(row.id)), cover ? String(cover.id) : null);
        await event(tx, state, 'IMAGE_REMOVED', correlation, { imageId }, null);
        // Files used by old publications/history remain immutable and available.
        return snapshot(tx, state.revision);
      });
    },
    async archive(auth, kind, resourceId, input, archived, correlation) {
      input = parse(archiveSchema, input); requestId(correlation);
      return repository.transaction(async tx => {
        const state = await context(tx, auth, kind, resourceId);
        const revision = await tx.contentRevision(kind, state.root.id); match(revision, input);
        if (!archived && kind !== 'households' && state.household.archived_at) throw new AppError('INVALID_STATE');
        const changed = Boolean(state.root.archived_at) !== archived;
        if (changed) {
          await tx.setArchived(kind, state.root.id, archived);
          await event(tx, { ...state, kind }, archived ? 'CONTENT_ARCHIVED' : 'CONTENT_RESTORED', correlation,
            { archived: !archived }, { archived }, input.reason);
        }
        const root = await tx.contentRoot(kind, state.root.id, state.household.id);
        return { id: String(root.id), archivedAt: root.archived_at ? new Date(root.archived_at).toISOString() : null, changed };
      });
    },
    async file(key, auth) {
      if (!validObjectKey(key)) throw new AppError('NOT_FOUND');
      const file = await repository.read(async tx => {
        const references = await tx.imageReferences(key);
        for (const row of references) {
          if (auth) {
            assertRoles(auth, ['CUSTOMER', 'ADMIN']);
            if (auth.user.role === 'ADMIN' || String(row.owner_user_id) === auth.user.id) return row;
          }
          const kind = row.content_type === 'HOUSEHOLD' ? 'households' : row.content_type === 'ROOM' ? 'rooms' : 'services';
          const rootId = row.household_profile_id ?? row.room_id ?? row.service_id;
          const root = await tx.publicContent(kind, String(rootId));
          if (root && String(root.published_revision_id) === String(row.revision_id)) return row;
        }
        throw new AppError('NOT_FOUND');
      });
      return storage.get(key, file.storage_provider);
    },
  };
}
