// SQL identifiers and ownership paths are code-owned, never request input.
const queries = new Map();
const add = (type, sql, modes) => queries.set(type, Object.freeze({ sql, modes: Object.freeze(modes) }));
add('household', 'SELECT id, id AS household_id FROM households WHERE id = ?', ['household']);
for (const [type, table] of Object.entries({
  room: 'rooms', service: 'services', product: 'local_products', article: 'cultural_articles',
  offer: 'service_offers', resource: 'resources', availabilityBlock: 'availability_blocks',
  serviceSlot: 'service_slots', slotOffer: 'slot_offers', resourceAssignment: 'slot_resource_assignments',
  resourceRule: 'slot_offer_resource_rules', resourceUsage: 'item_resource_usages', financialEntry: 'financial_entries',
})) add(type, `SELECT id, household_id FROM ${table} WHERE id = ?`, ['household']);
for (const [type, table] of Object.entries({ booking: 'bookings', scheduleRequest: 'schedule_requests', productInquiry: 'product_inquiries' })) {
  add(type, `SELECT id, household_id, customer_user_id FROM ${table} WHERE id = ?`, ['household', 'customer']);
}
add('proposal', `SELECT p.id, p.household_id, r.customer_user_id FROM booking_proposals p
  JOIN schedule_requests r ON r.id = p.request_id AND r.household_id = p.household_id WHERE p.id = ?`, ['household', 'customer']);
const setJoins = `LEFT JOIN bookings b ON b.id = rs.booking_id AND b.household_id = rs.household_id
  LEFT JOIN booking_proposals p ON p.id = rs.proposal_id AND p.household_id = rs.household_id
  LEFT JOIN schedule_requests r ON r.id = p.request_id AND r.household_id = p.household_id`;
add('reservationSet', `SELECT rs.id, rs.household_id, COALESCE(b.customer_user_id, r.customer_user_id) AS customer_user_id
  FROM reservation_sets rs ${setJoins} WHERE rs.id = ?`, ['household', 'customer']);
add('bookingItem', `SELECT i.id, i.household_id, COALESCE(b.customer_user_id, r.customer_user_id) AS customer_user_id
  FROM booking_items i JOIN reservation_sets rs ON rs.id = i.reservation_set_id AND rs.household_id = i.household_id
  ${setJoins} WHERE i.id = ?`, ['household', 'customer']);
const revisionJoins = `LEFT JOIN rooms ro ON ro.id = cr.room_id LEFT JOIN services s ON s.id = cr.service_id
  LEFT JOIN local_products p ON p.id = cr.product_id LEFT JOIN cultural_articles a ON a.id = cr.article_id`;
const revisionHousehold = 'COALESCE(cr.household_profile_id, ro.household_id, s.household_id, p.household_id, a.household_id)';
add('contentRevision', `SELECT cr.id, ${revisionHousehold} AS household_id FROM content_revisions cr
  ${revisionJoins} WHERE cr.id = ?`, ['household']);
add('revisionMedia', `SELECT m.id, ${revisionHousehold} AS household_id FROM revision_media m
  JOIN content_revisions cr ON cr.id = m.revision_id ${revisionJoins} WHERE m.id = ?`, ['household']);
add('review', 'SELECT id, customer_user_id FROM reviews WHERE id = ?', ['customer']);
add('complaint', 'SELECT id, reported_by AS customer_user_id FROM complaints WHERE id = ?', ['customer']);
add('notification', 'SELECT id, user_id FROM notifications WHERE id = ?', ['user']);
export const ownershipTypes = Object.freeze([...queries.keys()]);

export function ownershipRule(type, as) {
  const rule = queries.get(type);
  if (!rule || (as !== undefined && !rule.modes.includes(as))) throw new TypeError('Unsupported ownership policy');
  return rule;
}
