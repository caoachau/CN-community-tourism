import { randomBytes } from 'node:crypto';
import { AppError } from '../shared/errors.js';
import { publicUser } from '../auth/service.js';
import { assertRoles, isActiveAccount } from '../auth/policies.js';
import { lockCurrentActor as lockActor } from '../auth/transaction.js';
import { databaseIdSchema } from '../shared/validation.js';
import { profileSchema, saveProfileSchema, revisionReferenceSchema, reviewSchema, submissionProfileSchema } from './schemas.js';

const iso = value => value ? (value instanceof Date ? value : new Date(value)).toISOString() : null;
const parse = (schema, input) => {
  const result = schema.safeParse(input);
  if (!result.success) throw new AppError('INVALID_REQUEST');
  return result.data;
};
const referenceMatches = (revision, input) => {
  if (!revision || String(revision.id) !== input.revisionId || revision.version !== input.version) throw new AppError('STALE_VERSION');
};
const assertWritable = household => {
  if (household.archived_at) throw new AppError('INVALID_STATE');
};
const pagination = input => {
  if (!Number.isInteger(input?.page) || input.page < 1 || input.page > 100000 ||
      !Number.isInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > 100) throw new AppError('INVALID_REQUEST');
  return input;
};
const detailsOf = revision => {
  const details = typeof revision.details === 'string' ? JSON.parse(revision.details) : revision.details;
  return {
    ...(details.address ? { address: details.address } : {}), ...(details.locality ? { locality: details.locality } : {}),
    ...(details.contact_phone ? { contactPhone: details.contact_phone } : {}), ...(details.zalo_contact ? { zaloContact: details.zalo_contact } : {}),
    introductionSections: details.introduction_sections ?? [],
  };
};
const profileOf = revision => revision ? ({
  revisionId: String(revision.id), version: revision.version, title: revision.title, body: revision.body, details: detailsOf(revision),
  status: revision.status, schemaVersion: revision.schema_version, submittedAt: iso(revision.submitted_at),
  reviewedBy: revision.reviewed_by ? String(revision.reviewed_by) : null, reviewedAt: iso(revision.reviewed_at),
  reviewNote: revision.review_note, createdAt: iso(revision.created_at),
}) : null;
const householdOf = h => ({
  id: String(h.id), ownerUserId: String(h.owner_user_id), code: h.code, approvalStatus: h.approval_status,
  visibility: h.visibility, publishedRevisionId: h.published_revision_id ? String(h.published_revision_id) : null,
  archivedAt: iso(h.archived_at), createdAt: iso(h.created_at), updatedAt: iso(h.updated_at),
});

export function createHouseholdService({ repository }) {
  const correlation = id => {
    if (typeof id !== 'string' || !id || id.length > 100) throw new AppError('INVALID_REQUEST');
    return id;
  };
  async function ownerContext(tx, auth) {
    const { actor } = await lockActor(tx, auth, ['CUSTOMER']);
    const existing = await tx.householdByOwner(actor.id);
    if (!existing) throw new AppError('NOT_FOUND');
    const household = await tx.householdById(existing.id, true);
    if (!household || String(household.owner_user_id) !== auth.user.id) throw new AppError('FORBIDDEN');
    return { actor, household };
  }
  async function view(tx, household, user, revision) {
    const latest = revision ?? await tx.latestRevision(household.id);
    const published = household.published_revision_id ? await tx.revision(household.published_revision_id, household.id) : null;
    return { household: householdOf(household), profile: profileOf(latest), publishedProfile: profileOf(published), user: publicUser(user) };
  }
  async function target(auth, revisionId) {
    assertRoles(auth, ['ADMIN']);
    if (!databaseIdSchema.safeParse(revisionId).success) throw new AppError('INVALID_REQUEST');
    const result = await repository.read(tx=>tx.applicationTarget(revisionId));
    if (!result) throw new AppError('NOT_FOUND');
    return { householdId: String(result.household_id), ownerId: String(result.owner_user_id) };
  }
  async function adminContext(tx, auth, application) {
    const { actor, users } = await lockActor(tx, auth, ['ADMIN'], [application.ownerId]);
    const household = await tx.householdById(application.householdId, true);
    if (!household || String(household.owner_user_id) !== application.ownerId) throw new AppError('STALE_VERSION');
    return { actor, owner: users.get(application.ownerId), household };
  }
  return {
    async open(auth, input, requestId) {
      const profile = parse(profileSchema, input); const correlationId = correlation(requestId);
      return repository.transaction(async tx => {
        const { actor } = await lockActor(tx, auth, ['CUSTOMER']);
        if (await tx.householdByOwner(actor.id)) throw new AppError('HOUSEHOLD_ALREADY_EXISTS');
        const household = await tx.createHousehold(actor.id, `HH-${randomBytes(12).toString('hex').toUpperCase()}`);
        const revision = await tx.createRevision(household.id, 1, profile, actor.id);
        await tx.recordEvent({ householdId: household.id, actor, action: 'HOUSEHOLD_OPENED', to: 'DRAFT', correlationId, after: { revisionId: String(revision.id), version: 1 } });
        return view(tx, await tx.householdById(household.id), actor, revision);
      });
    },
    async mine(auth) {
      return repository.transaction(async tx => {
        const { actor, household } = await ownerContext(tx, auth);
        return view(tx, household, actor);
      });
    },
    async save(auth, input, requestId) {
      const profile = parse(saveProfileSchema, input); const correlationId = correlation(requestId);
      return repository.transaction(async tx => {
        const { actor, household } = await ownerContext(tx, auth); assertWritable(household);
        const latest = await tx.latestRevision(household.id, true); referenceMatches(latest, profile);
        if (household.approval_status === 'PENDING' || latest.status === 'PENDING' || latest.version === 4294967295) throw new AppError('INVALID_STATE');
        const revision = await tx.createRevision(household.id, latest.version + 1, profile, actor.id);
        await tx.copyRevisionImages(latest.id, revision.id);
        await tx.recordEvent({ householdId: household.id, actor, action: 'HOUSEHOLD_PROFILE_SAVED', from: latest.status, to: 'DRAFT', correlationId,
          before: { revisionId: String(latest.id), version: latest.version }, after: { revisionId: String(revision.id), version: revision.version } });
        return view(tx, await tx.householdById(household.id), actor, revision);
      });
    },
    async submit(auth, input, requestId) {
      const reference = parse(revisionReferenceSchema, input); const correlationId = correlation(requestId);
      return repository.transaction(async tx => {
        const { actor, household } = await ownerContext(tx, auth); assertWritable(household);
        const latest = await tx.latestRevision(household.id, true); referenceMatches(latest, reference);
        if (latest.status === 'PENDING') return { ...await view(tx, household, actor, latest), changed: false };
        if (latest.status !== 'DRAFT' || household.approval_status === 'PENDING') throw new AppError('INVALID_STATE');
        if (!submissionProfileSchema.safeParse({ title: latest.title, body: latest.body, details: detailsOf(latest) }).success) throw new AppError('HOUSEHOLD_PROFILE_INCOMPLETE');
        const approvalStatus = household.approval_status === 'APPROVED' ? 'APPROVED' : 'PENDING';
        await tx.submit(latest.id, household.id, approvalStatus);
        await tx.recordEvent({ householdId: household.id, actor, action: 'HOUSEHOLD_SUBMITTED', from: household.approval_status, to: approvalStatus, correlationId,
          after: { revisionId: String(latest.id), version: latest.version } });
        return { ...await view(tx, await tx.householdById(household.id), actor), changed: true };
      });
    },
    async history(auth, input) {
      const paging = pagination(input);
      return repository.transaction(async tx => {
        const { household } = await ownerContext(tx, auth);
        const { rows, total } = await tx.revisions(household.id, paging);
        return { items: rows.map(profileOf), page: paging.page, pageSize: paging.pageSize, total };
      });
    },
    async list(auth, input) {
      const paging = pagination(input);
      if (!['PENDING','APPROVED','REJECTED'].includes(input.status)) throw new AppError('INVALID_REQUEST');
      return repository.transaction(async tx => {
        await lockActor(tx, auth, ['ADMIN']);
        const { rows, total } = await tx.listApplications(paging);
        return { items: rows.map(r=>({ revisionId: String(r.revision_id), householdId: String(r.household_id), ownerUserId: String(r.owner_user_id),
          version: r.version, title: r.title, status: r.status, code: r.code, approvalStatus: r.approval_status, submittedAt: iso(r.submitted_at), reviewedAt: iso(r.reviewed_at) })),
        page: paging.page, pageSize: paging.pageSize, total };
      });
    },
    async application(auth, revisionId) {
      const application = await target(auth, revisionId);
      return repository.transaction(async tx => {
        const { owner, household } = await adminContext(tx, auth, application);
        const revision = await tx.revision(revisionId, household.id);
        if (!revision?.submitted_at || revision.status === 'DRAFT') throw new AppError('NOT_FOUND');
        return view(tx, household, owner, revision);
      });
    },
    async review(auth, revisionId, input, requestId) {
      const decision = parse(reviewSchema, input); const correlationId = correlation(requestId);
      const application = await target(auth, revisionId);
      const reason = decision.reason ?? 'Hồ sơ đáp ứng điều kiện tham gia nền tảng';
      return repository.transaction(async tx => {
        const { actor, owner, household } = await adminContext(tx, auth, application); assertWritable(household);
        const latest = await tx.latestRevision(household.id, true);
        referenceMatches(latest, { revisionId, version: decision.version });
        if (latest.status !== 'PENDING') {
          if (latest.status === decision.decision && String(latest.reviewed_by) === auth.user.id && latest.review_note === reason) {
            return { ...await view(tx, household, owner, latest), changed: false };
          }
          throw new AppError('INVALID_STATE');
        }
        if (!['PENDING','APPROVED'].includes(household.approval_status)) throw new AppError('INVALID_STATE');
        if (decision.decision === 'APPROVED' && (!isActiveAccount(owner) || !['CUSTOMER','HOUSEHOLD'].includes(owner.role))) throw new AppError('INVALID_STATE');
        await tx.review(latest.id, actor.id, decision.decision, reason);
        const approvalStatus = decision.decision === 'APPROVED' ? 'APPROVED' : household.approval_status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
        const publishedId = decision.decision === 'APPROVED' ? latest.id : household.published_revision_id;
        await tx.setApproval(household.id, approvalStatus, publishedId);
        await tx.recordEvent({ householdId: household.id, actor, eventType: 'CONTENT_REVIEW', entityType: 'CONTENT_REVISION', entityId: latest.id,
          action: 'HOUSEHOLD_PROFILE_REVIEWED', from: 'PENDING', to: decision.decision, reason, correlationId });
        if (household.approval_status !== approvalStatus) await tx.recordEvent({ householdId: household.id, actor, eventType: 'HOUSEHOLD_APPROVAL',
          action: 'HOUSEHOLD_APPROVAL_CHANGED', from: household.approval_status, to: approvalStatus, reason, correlationId });
        if (decision.decision === 'APPROVED' && owner.role === 'CUSTOMER') {
          await tx.promoteOwner(owner.id);
          await tx.recordEvent({ householdId: household.id, actor, entityType: 'USER', entityId: owner.id,
            action: 'HOUSEHOLD_ROLE_GRANTED', from: 'CUSTOMER', to: 'HOUSEHOLD', reason, correlationId });
        }
        await tx.notifyReview(owner.id, household.id, latest.id, decision.decision);
        return { ...await view(tx, await tx.householdById(household.id), await tx.findUserById(owner.id)), changed: true };
      });
    },
  };
}
