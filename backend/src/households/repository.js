import { createAuthQueries } from '../auth/repository.js';
import { createMediaQueries } from '../content/images.js';

const execute = (connection, sql, values = []) => connection.execute({ sql, timeout: 10000 }, values);
const first = async (connection, sql, values = []) => (await execute(connection, sql, values))[0][0] ?? null;
const householdFields = 'id, owner_user_id, code, approval_status, visibility, published_revision_id, archived_at, created_at, updated_at';
const revisionFields = 'id, household_profile_id, version, title, body, details, schema_version, status, submitted_by, submitted_at, reviewed_by, reviewed_at, review_note, created_at';

function queries(connection) {
  return {
    ...createAuthQueries(connection),
    ...createMediaQueries(connection),
    householdByOwner: (ownerId) => first(connection, `SELECT ${householdFields} FROM households WHERE owner_user_id=?`, [ownerId]),
    householdById: (id, lock = false) => first(connection, `SELECT ${householdFields} FROM households WHERE id=?${lock ? ' FOR UPDATE' : ''}`, [id]),
    async createHousehold(ownerId, code) {
      await execute(connection, "INSERT INTO households (owner_user_id,code,updated_at) VALUES (?,?,UTC_TIMESTAMP(6))", [ownerId, code]);
      return this.householdByOwner(ownerId);
    },
    latestRevision: (householdId, lock = false) => first(connection, `SELECT ${revisionFields} FROM content_revisions
      WHERE household_profile_id=? AND content_type='HOUSEHOLD' ORDER BY version DESC LIMIT 1${lock ? ' FOR UPDATE' : ''}`, [householdId]),
    revision: (revisionId, householdId) => first(connection, `SELECT ${revisionFields} FROM content_revisions
      WHERE id=? AND household_profile_id=? AND content_type='HOUSEHOLD'`, [revisionId, householdId]),
    applicationTarget: (revisionId) => first(connection, `SELECT cr.household_profile_id household_id,h.owner_user_id
      FROM content_revisions cr JOIN households h ON h.id=cr.household_profile_id
      WHERE cr.id=? AND cr.content_type='HOUSEHOLD' AND cr.submitted_at IS NOT NULL AND cr.status<>'DRAFT'`, [revisionId]),
    async createRevision(householdId, version, profile, userId) {
      const details = {
        ...(profile.details.address ? { address: profile.details.address } : {}),
        ...(profile.details.locality ? { locality: profile.details.locality } : {}),
        ...(profile.details.contactPhone ? { contact_phone: profile.details.contactPhone } : {}),
        ...(profile.details.zaloContact ? { zalo_contact: profile.details.zaloContact } : {}),
        introduction_sections: profile.details.introductionSections,
      };
      await execute(connection, `INSERT INTO content_revisions
        (content_type,household_profile_id,version,title,body,details,schema_version,submitted_by)
        VALUES ('HOUSEHOLD',?,?,?,?,?,1,?)`, [householdId, version, profile.title, profile.body, JSON.stringify(details), userId]);
      await execute(connection, 'UPDATE households SET updated_at=UTC_TIMESTAMP(6) WHERE id=?', [householdId]);
      return this.latestRevision(householdId);
    },
    async submit(revisionId, householdId, approvalStatus) {
      await execute(connection, "UPDATE content_revisions SET status='PENDING',submitted_at=UTC_TIMESTAMP(6) WHERE id=?", [revisionId]);
      await execute(connection, 'UPDATE households SET approval_status=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?', [approvalStatus, householdId]);
    },
    async review(revisionId, actorId, decision, reason) {
      await execute(connection, 'UPDATE content_revisions SET status=?,reviewed_by=?,reviewed_at=UTC_TIMESTAMP(6),review_note=? WHERE id=?', [decision, actorId, reason, revisionId]);
    },
    async setApproval(householdId, status, publishedRevisionId) {
      await execute(connection, 'UPDATE households SET approval_status=?,published_revision_id=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?', [status, publishedRevisionId, householdId]);
    },
    async promoteOwner(userId) {
      await execute(connection, "UPDATE users SET role='HOUSEHOLD',updated_at=UTC_TIMESTAMP(6) WHERE id=? AND role='CUSTOMER'", [userId]);
    },
    async recordEvent({ householdId, actor, eventType = 'OTHER', entityType = 'HOUSEHOLD', entityId = householdId, from, to, action, reason = null, correlationId, before = null, after = null }) {
      await execute(connection, `INSERT INTO activity_events
        (household_id,actor_user_id,actor_type,event_type,entity_type,entity_id,from_status,to_status,before_data,after_data,reason,correlation_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [householdId, actor.id, actor.role, eventType, entityType, entityId, from ?? null, to ?? null,
        before ? JSON.stringify(before) : null, JSON.stringify({ action, ...after }), reason, correlationId]);
    },
    async notifyReview(userId, householdId, revisionId, decision) {
      await execute(connection, `INSERT INTO notifications (user_id,event_key,event_type,title,body,navigation) VALUES (?,?,?,?,?,?)`, [
        userId, `household-review:${revisionId}`, 'HOUSEHOLD_REVIEW',
        decision === 'APPROVED' ? 'Hồ sơ hộ dân đã được duyệt' : 'Hồ sơ hộ dân cần điều chỉnh',
        decision === 'APPROVED' ? 'Thông tin được duyệt đã được công khai. Bạn có thể xem kết quả trong hồ sơ hộ dân.' : 'Vui lòng xem lý do từ chối, chỉnh sửa hồ sơ và gửi xét duyệt lại.',
        JSON.stringify({ screen: 'householdApplication', householdId: String(householdId), revisionId: String(revisionId) }),
      ]);
    },
    async listApplications({ status, page, pageSize }) {
      const where = "cr.content_type='HOUSEHOLD' AND cr.status=? AND cr.submitted_at IS NOT NULL AND h.archived_at IS NULL";
      const [[count]] = await execute(connection, `SELECT COUNT(*) total FROM content_revisions cr JOIN households h ON h.id=cr.household_profile_id WHERE ${where}`, [status]);
      // Pagination values are validated integers; mysql2/MySQL LIMIT parameter
      // typing varies, so only these bounded server-validated values are literal.
      const [rows] = await execute(connection, `SELECT cr.id revision_id,cr.household_profile_id household_id,cr.version,cr.title,cr.status,
        cr.submitted_at,cr.reviewed_at,h.code,h.approval_status,h.owner_user_id
        FROM content_revisions cr JOIN households h ON h.id=cr.household_profile_id WHERE ${where}
        ORDER BY cr.submitted_at DESC,cr.id DESC LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`, [status]);
      return { rows, total: Number(count.total) };
    },
    async revisions(householdId, { page, pageSize }) {
      const [[count]] = await execute(connection, 'SELECT COUNT(*) total FROM content_revisions WHERE household_profile_id=?', [householdId]);
      const [rows] = await execute(connection, `SELECT ${revisionFields} FROM content_revisions WHERE household_profile_id=?
        ORDER BY version DESC LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`, [householdId]);
      return { rows, total: Number(count.total) };
    },
  };
}

export function createHouseholdRepository(database) {
  return {
    read: work => database.withConnection(connection => work(queries(connection))),
    transaction: work => database.transaction(connection => work(queries(connection))),
  };
}
