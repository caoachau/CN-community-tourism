import { AppError } from '../shared/errors.js';
import { createAuthQueries } from '../auth/repository.js';

const execute = (c, sql, values = []) => c.execute({ sql, timeout: 10000 }, values);
const first = async (c, sql, values = []) => (await execute(c, sql, values))[0][0] ?? null;
const categoryFields = 'id,kind,code,name,is_active,created_at';
const placeFields = 'id,household_id,code,supply_status,visibility,published_revision_id,archived_at,created_at';
const revisionFields = 'id,place_id,version,title,body,details,schema_version,status,submitted_by,submitted_at,reviewed_by,reviewed_at,review_note,created_at';
const limit = ({ page, pageSize }) => {
  if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new AppError('INVALID_REQUEST');
  return `LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
};
const like = value => `%${value.replace(/[!%_]/g, char => `!${char}`)}%`;

// Project only the approved pointers. Never join the latest draft to public
// results or expose users/contact details from the account table.
const publicFrom = `FROM places p JOIN households h ON h.id=p.household_id
  JOIN users u ON u.id=h.owner_user_id
  JOIN content_revisions cr ON cr.id=p.published_revision_id AND cr.place_id=p.id AND cr.content_type='PLACE' AND cr.status='APPROVED'
  JOIN content_revisions hr ON hr.id=h.published_revision_id AND hr.household_profile_id=h.id AND hr.content_type='HOUSEHOLD' AND hr.status='APPROVED'`;
const publicWhere = `p.archived_at IS NULL AND p.visibility='VISIBLE' AND p.supply_status='AVAILABLE'
  AND h.archived_at IS NULL AND h.visibility='VISIBLE' AND h.approval_status='APPROVED'
  AND u.status='ACTIVE' AND u.disabled_at IS NULL AND u.role='HOUSEHOLD'`;
const publicColumns = 'p.id,p.code,p.household_id,hr.title household_name,cr.id revision_id,cr.version,cr.title,cr.body,cr.details,cr.reviewed_at';

function queries(connection) {
  return {
    ...createAuthQueries(connection),
    ownedHousehold: ownerId => first(connection, 'SELECT id,owner_user_id,approval_status,visibility,archived_at FROM households WHERE owner_user_id=?', [ownerId]),
    household: (id, lock = false) => first(connection, `SELECT id,owner_user_id,approval_status,visibility,archived_at FROM households WHERE id=?${lock ? ' FOR UPDATE' : ''}`, [id]),
    category: (id, lock = false) => first(connection, `SELECT ${categoryFields} FROM categories WHERE id=?${lock ? ' FOR UPDATE' : ''}`, [id]),
    async createCategory(input) {
      try {
        await execute(connection, 'INSERT INTO categories (kind,code,name,is_active) VALUES (?,?,?,?)', [input.kind,input.code,input.name,Number(input.isActive)]);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') throw new AppError('CATEGORY_ALREADY_EXISTS');
        throw error;
      }
      const row = await first(connection, 'SELECT CAST(LAST_INSERT_ID() AS CHAR) id');
      return this.category(row.id);
    },
    async updateCategory(id, name, active) {
      await execute(connection, 'UPDATE categories SET name=?,is_active=? WHERE id=?', [name,Number(active),id]);
    },
    async categories(input, publicOnly = false) {
      const predicates = [], values = [];
      if (input.kind) { predicates.push('kind=?'); values.push(input.kind); }
      if (publicOnly || input.isActive !== undefined) { predicates.push('is_active=?'); values.push(publicOnly ? 1 : Number(input.isActive)); }
      const where = predicates.length ? `WHERE ${predicates.join(' AND ')}` : '';
      const [[count]] = await execute(connection, `SELECT COUNT(*) total FROM categories ${where}`, values);
      const [rows] = await execute(connection, `SELECT ${categoryFields} FROM categories ${where} ORDER BY kind,name,id ${limit(input)}`, values);
      return { rows, total: Number(count.total) };
    },
    place: (id, lock = false) => first(connection, `SELECT ${placeFields} FROM places WHERE id=?${lock ? ' FOR UPDATE' : ''}`, [id]),
    ownedPlace: (id, householdId) => first(connection, `SELECT ${placeFields} FROM places WHERE id=? AND household_id=? FOR UPDATE`, [id,householdId]),
    async createPlace(householdId, code) {
      await execute(connection, 'INSERT INTO places (household_id,code) VALUES (?,?)', [householdId,code]);
      const row = await first(connection, 'SELECT CAST(LAST_INSERT_ID() AS CHAR) id');
      return this.place(row.id);
    },
    latest: (placeId, lock = false) => first(connection, `SELECT ${revisionFields} FROM content_revisions
      WHERE place_id=? AND content_type='PLACE' ORDER BY version DESC LIMIT 1${lock ? ' FOR UPDATE' : ''}`, [placeId]),
    revision: (revisionId, placeId) => first(connection, `SELECT ${revisionFields} FROM content_revisions WHERE id=? AND place_id=? AND content_type='PLACE'`, [revisionId,placeId]),
    async createRevision(placeId, version, profile, actorId) {
      const { details } = profile;
      const data = { ...details };
      delete data.contactPhone;
      if (details.contactPhone) data.contact_phone = details.contactPhone;
      await execute(connection, `INSERT INTO content_revisions
        (content_type,place_id,version,title,body,details,schema_version,submitted_by) VALUES ('PLACE',?,?,?,?,?,1,?)`,
      [placeId,version,profile.title,profile.body,JSON.stringify(data),actorId]);
      return this.latest(placeId);
    },
    async submit(revisionId) { await execute(connection, "UPDATE content_revisions SET status='PENDING',submitted_at=UTC_TIMESTAMP(6) WHERE id=?", [revisionId]); },
    async review(revisionId, actorId, decision, reason) {
      await execute(connection, 'UPDATE content_revisions SET status=?,reviewed_by=?,reviewed_at=UTC_TIMESTAMP(6),review_note=? WHERE id=?', [decision,actorId,reason,revisionId]);
    },
    async publish(placeId, revisionId) { await execute(connection, 'UPDATE places SET published_revision_id=? WHERE id=?', [revisionId,placeId]); },
    async setPlaceStatus(placeId, input) { await execute(connection, 'UPDATE places SET supply_status=?,visibility=? WHERE id=?', [input.supplyStatus,input.visibility,placeId]); },
    reviewTarget: revisionId => first(connection, `SELECT p.id place_id,p.household_id,h.owner_user_id FROM content_revisions cr
      JOIN places p ON p.id=cr.place_id JOIN households h ON h.id=p.household_id
      WHERE cr.id=? AND cr.content_type='PLACE' AND cr.submitted_at IS NOT NULL AND cr.status<>'DRAFT'`, [revisionId]),
    async ownedPlaces(householdId, paging) {
      const [[count]] = await execute(connection, 'SELECT COUNT(*) total FROM places WHERE household_id=?', [householdId]);
      const [rows] = await execute(connection, `SELECT ${placeFields} FROM places WHERE household_id=? ORDER BY id DESC ${limit(paging)}`, [householdId]);
      return { rows, total: Number(count.total) };
    },
    async viewRevisions(placeIds) {
      if (!placeIds.length) return [];
      // At most the newest and the published revision for each listed place;
      // one round trip rather than fetching two profiles per result row.
      const [rows] = await execute(connection, `SELECT cr.* FROM content_revisions cr JOIN places p ON p.id=cr.place_id
        WHERE p.id IN (${placeIds.map(()=>'?').join(',')}) AND cr.content_type='PLACE'
        AND (cr.id=p.published_revision_id OR cr.version=(SELECT MAX(latest.version) FROM content_revisions latest WHERE latest.place_id=p.id))`,placeIds);
      return rows;
    },
    async revisions(placeId, paging) {
      const [[count]] = await execute(connection, 'SELECT COUNT(*) total FROM content_revisions WHERE place_id=?', [placeId]);
      const [rows] = await execute(connection, `SELECT ${revisionFields} FROM content_revisions WHERE place_id=? ORDER BY version DESC ${limit(paging)}`, [placeId]);
      return { rows, total: Number(count.total) };
    },
    async submissions(input) {
      const values = [input.status];
      let where = "cr.content_type='PLACE' AND cr.status=? AND cr.submitted_at IS NOT NULL AND p.archived_at IS NULL AND h.archived_at IS NULL";
      if (input.householdId) { where += ' AND p.household_id=?'; values.push(input.householdId); }
      const from = 'FROM content_revisions cr JOIN places p ON p.id=cr.place_id JOIN households h ON h.id=p.household_id';
      const [[count]] = await execute(connection, `SELECT COUNT(*) total ${from} WHERE ${where}`, values);
      const [rows] = await execute(connection, `SELECT cr.id revision_id,cr.version,cr.title,cr.status,cr.submitted_at,cr.reviewed_at,p.id place_id,p.household_id ${from}
        WHERE ${where} ORDER BY cr.submitted_at DESC,cr.id DESC ${limit(input)}`, values);
      return { rows, total: Number(count.total) };
    },
    async publicPlaces(input) {
      let where = publicWhere; const values = [];
      if (input.householdId) { where += ' AND p.household_id=?'; values.push(input.householdId); }
      if (input.locality) { where += " AND JSON_UNQUOTE(JSON_EXTRACT(cr.details,'$.locality'))=?"; values.push(input.locality); }
      if (input.q) { where += " AND (cr.title LIKE ? ESCAPE '!' OR JSON_UNQUOTE(JSON_EXTRACT(cr.details,'$.address')) LIKE ? ESCAPE '!')"; values.push(like(input.q),like(input.q)); }
      const [[count]] = await execute(connection, `SELECT COUNT(*) total ${publicFrom} WHERE ${where}`, values);
      const [rows] = await execute(connection, `SELECT ${publicColumns} ${publicFrom} WHERE ${where} ORDER BY cr.title,p.id ${limit(input)}`, values);
      return { rows, total: Number(count.total) };
    },
    publicPlace: id => first(connection, `SELECT ${publicColumns} ${publicFrom} WHERE p.id=? AND ${publicWhere}`, [id]),
    async event({ householdId = null, actor, entityType, entityId, action, from = null, to = null, reason = null, requestId, before = null, after = null, review = false }) {
      await execute(connection, `INSERT INTO activity_events
        (household_id,actor_user_id,actor_type,event_type,entity_type,entity_id,from_status,to_status,before_data,after_data,reason,correlation_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [householdId,actor.id,actor.role,review?'CONTENT_REVIEW':'OTHER',entityType,entityId,from,to,
        before ? JSON.stringify(before) : null,JSON.stringify({ action,...after }),reason,requestId]);
    },
    async notifyReview(userId, placeId, householdId, revisionId, decision) {
      await execute(connection, 'INSERT INTO notifications (user_id,event_key,event_type,title,body,navigation) VALUES (?,?,?,?,?,?)',
        [userId,`place-review:${revisionId}`,'PLACE_REVIEW',decision==='APPROVED'?'Điểm phục vụ đã được duyệt':'Điểm phục vụ cần điều chỉnh',
          'Vui lòng xem kết quả xét duyệt trong phần quản lý điểm phục vụ.',JSON.stringify({ screen:'placeProfile',placeId:String(placeId),householdId:String(householdId),revisionId:String(revisionId) })]);
    },
  };
}

export function createCatalogRepository(database) {
  return {
    read: work => database.withConnection(connection => work(queries(connection))),
    transaction: work => database.transaction(connection => work(queries(connection))),
  };
}
