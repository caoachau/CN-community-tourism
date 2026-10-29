import { createCatalogQueries } from '../catalog/repository.js';

export const contentKinds = Object.freeze({
  households: { table: 'households', column: 'household_profile_id', type: 'HOUSEHOLD' },
  rooms: { table: 'rooms', column: 'room_id', type: 'ROOM' },
  services: { table: 'services', column: 'service_id', type: 'SERVICE' },
});
const definition = kind => { const item = contentKinds[kind]; if (!item) throw new TypeError('Unknown content kind'); return item; };
function queries(connection) {
  const execute = (sql, values = []) => connection.execute({ sql, timeout: 10000 }, values);
  const first = async (sql, values) => (await execute(sql, values))[0][0] ?? null;
  return {
    ...createCatalogQueries(connection),
    adminRevision: revisionId => first("SELECT * FROM content_revisions WHERE id=? AND content_type IN ('HOUSEHOLD','ROOM','SERVICE') AND submitted_at IS NOT NULL AND status<>'DRAFT'", [revisionId]),
    contentRoot(kind, resourceId, householdId) {
      const { table } = definition(kind);
      return first(`SELECT * FROM ${table} WHERE id=? AND ${kind === 'households' ? 'id' : 'household_id'}=? FOR UPDATE`, [resourceId, householdId]);
    },
    contentRevision(kind, resourceId, revisionId) {
      const { column, type } = definition(kind);
      return first(`SELECT * FROM content_revisions WHERE ${column}=? AND content_type=? ${revisionId ? 'AND id=?' : 'ORDER BY version DESC LIMIT 1'} FOR UPDATE`,
        revisionId ? [resourceId, type, revisionId] : [resourceId, type]);
    },
    async setArchived(kind, resourceId, archived) {
      const { table } = definition(kind);
      await execute(`UPDATE ${table} SET archived_at=${archived ? 'UTC_TIMESTAMP(6)' : 'NULL'}${kind === 'households' ? ',updated_at=UTC_TIMESTAMP(6)' : ''} WHERE id=?`, [resourceId]);
    },
    publicContent(kind, resourceId) {
      const { table, column, type } = definition(kind);
      const isHousehold = kind === 'households';
      let joins = isHousehold ? '' : 'JOIN households h ON h.id=t.household_id';
      let extra = isHousehold ? '' : "AND t.archived_at IS NULL AND t.visibility='VISIBLE' AND t.supply_status='AVAILABLE'";
      if (!isHousehold) {
        joins += ` JOIN places p ON p.id=t.${kind === 'rooms' ? 'place_id' : 'default_place_id'} AND p.household_id=h.id
          JOIN content_revisions pr ON pr.id=p.published_revision_id AND pr.place_id=p.id AND pr.status='APPROVED'`;
        extra += " AND p.archived_at IS NULL AND p.visibility='VISIBLE' AND p.supply_status='AVAILABLE'";
      }
      if (kind === 'services') {
        joins += " JOIN categories c ON c.id=t.category_id AND c.kind='SERVICE' AND c.is_active=1";
        extra += ` AND EXISTS (SELECT 1 FROM service_offers o WHERE o.service_id=t.id AND o.household_id=h.id AND o.is_active=1
          AND JSON_CONTAINS(cr.details,JSON_OBJECT('id',CAST(o.id AS CHAR),'structureToken',JSON_UNQUOTE(JSON_EXTRACT(o.terms,'$._structure_token'))),'$.offers_snapshot')=1)`;
      }
      const root = isHousehold ? 'h' : 't';
      return first(`SELECT ${root}.* FROM ${table} ${root} ${joins}
        JOIN users u ON u.id=h.owner_user_id
        JOIN content_revisions hr ON hr.id=h.published_revision_id AND hr.household_profile_id=h.id AND hr.status='APPROVED'
        JOIN content_revisions cr ON cr.id=${root}.published_revision_id AND cr.${column}=${root}.id AND cr.content_type=? AND cr.status='APPROVED'
        WHERE ${root}.id=? AND h.archived_at IS NULL AND h.approval_status='APPROVED' AND h.visibility='VISIBLE'
          AND u.status='ACTIVE' AND u.disabled_at IS NULL AND u.role='HOUSEHOLD' ${extra}`, [type, resourceId]);
    },
    async imageReferences(key) {
      return (await execute(`SELECT m.*,cr.content_type,cr.household_profile_id,cr.room_id,cr.service_id,
        h.owner_user_id FROM revision_media m JOIN content_revisions cr ON cr.id=m.revision_id
        LEFT JOIN rooms r ON r.id=cr.room_id LEFT JOIN services s ON s.id=cr.service_id
        JOIN households h ON h.id=COALESCE(cr.household_profile_id,r.household_id,s.household_id)
        WHERE m.object_key=? AND cr.content_type IN ('HOUSEHOLD','ROOM','SERVICE')`, [key]))[0];
    },
  };
}
export function createContentRepository(database) {
  return { read: work => database.withConnection(c => work(queries(c))), transaction: work => database.transaction(c => work(queries(c))) };
}
