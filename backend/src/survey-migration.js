import { MigrationError } from './migrations.js';

// Called in the explicitly selected schema BEFORE any migration-003 DDL/history
// writes. Counts only: no personal/contact information or transaction payloads.
export async function surveyPreflight(connection) {
  const [[version]] = await connection.query('SELECT VERSION() AS version');
  if (!/^8\.4\./.test(version.version)) throw new MigrationError('SURVEY_REQUIRES_MYSQL84');
  const checks = [
    ['SURVEY_INCONSISTENT_ACTIVE_BOOKING', `SELECT COUNT(*) n FROM bookings b
      LEFT JOIN reservation_sets s ON s.booking_id = b.id
      WHERE (b.status = 'CONFIRMED' AND (s.id IS NULL OR s.status <> 'COMMITTED'))
         OR (b.status = 'PENDING' AND (s.id IS NULL OR s.status <> 'HELD'))
         OR (b.confirmed_at IS NOT NULL AND s.id IS NULL)`],
    ['SURVEY_INCOMPLETE_ACTIVE_ITEMS', `SELECT COUNT(*) n FROM reservation_sets s
      WHERE s.status IN ('HELD','COMMITTED') AND (
        NOT EXISTS (SELECT 1 FROM booking_items i WHERE i.reservation_set_id = s.id)
        OR EXISTS (SELECT 1 FROM booking_items i WHERE i.reservation_set_id = s.id AND i.kind = 'SERVICE' AND i.slot_id IS NULL))`],
    ['SURVEY_INVALID_LEGACY_TERMS', `SELECT COUNT(*) n FROM reservation_sets s
      LEFT JOIN bookings b ON b.id = s.booking_id
      LEFT JOIN booking_proposals p ON p.id = s.proposal_id
      WHERE COALESCE(JSON_TYPE(COALESCE(p.terms_snapshot, b.terms_snapshot)), '') <> 'OBJECT'`],
    ['SURVEY_INCONSISTENT_REVERSAL', `SELECT COUNT(*) n FROM financial_entries f
      JOIN financial_entries original ON original.id = f.reverses_entry_id
      WHERE f.amount_vnd <> original.amount_vnd OR NOT (f.booking_id <=> original.booking_id)
         OR original.reverses_entry_id IS NOT NULL`],
  ];
  for (const [code, sql] of checks) {
    const [[row]] = await connection.query({ sql, timeout: 30_000 });
    if (Number(row.n) !== 0) throw new MigrationError(code);
  }
}
