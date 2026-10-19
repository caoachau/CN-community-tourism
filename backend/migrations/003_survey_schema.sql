-- Survey upgrade: 34 application tables; preserve every existing row and ID.
-- Run through scripts/migrate.js during a maintenance window, after backup.
-- DDL commits individually. A failed run must be inspected, never blindly replayed.
-- No seed, DROP TABLE, DROP COLUMN, TRUNCATE, or replacement of migrations 001/002.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET SESSION time_zone = '+00:00';

CREATE TABLE places (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL,
  supply_status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  visibility VARCHAR(16) NOT NULL DEFAULT 'VISIBLE',
  published_revision_id BIGINT UNSIGNED NULL,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_places_household_code (household_id, code),
  UNIQUE KEY uq_places_id_household (id, household_id),
  CONSTRAINT ck_places_supply CHECK (supply_status IN ('AVAILABLE','PAUSED','RETIRED')),
  CONSTRAINT ck_places_visibility CHECK (visibility IN ('VISIBLE','HIDDEN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE categories DROP CHECK ck_categories_kind, ADD CONSTRAINT ck_categories_kind CHECK (kind IN ('SERVICE','PRODUCT','CONTENT'));
ALTER TABLE rooms ADD COLUMN place_id BIGINT UNSIGNED NULL, ADD COLUMN terms JSON NULL, ADD CONSTRAINT ck_rooms_terms CHECK (terms IS NULL OR JSON_TYPE(terms) = 'OBJECT');
ALTER TABLE services ADD COLUMN default_place_id BIGINT UNSIGNED NULL;
ALTER TABLE cultural_articles
  ADD COLUMN content_kind VARCHAR(32) NOT NULL DEFAULT 'CULTURE',
  ADD COLUMN category_id BIGINT UNSIGNED NULL,
  ADD COLUMN category_kind VARCHAR(16) NOT NULL DEFAULT 'CONTENT',
  ADD CONSTRAINT ck_articles_kind CHECK (content_kind IN ('CULTURE','PLACE_STORY','PRODUCT_ORIGIN','EXPERIENCE_GUIDE')),
  ADD CONSTRAINT ck_articles_category CHECK (category_kind = 'CONTENT');
ALTER TABLE local_products DROP CHECK ck_local_products_2, ADD CONSTRAINT ck_local_products_2 CHECK (supply_status IN ('AVAILABLE','COMING_SOON','OUT_OF_SEASON','DISCONTINUED','CONTACT'));
ALTER TABLE content_revisions
  ADD COLUMN place_id BIGINT UNSIGNED NULL,
  ADD UNIQUE KEY uq_revisions_place_version (place_id, version),
  ADD UNIQUE KEY uq_revisions_id_place (id, place_id),
  DROP CHECK ck_content_revisions_6,
  DROP CHECK ck_content_revisions_7,
  DROP CHECK ck_content_revisions_8,
  ADD CONSTRAINT ck_content_revisions_6 CHECK (content_type IN ('HOUSEHOLD','ROOM','SERVICE','PRODUCT','ARTICLE','PLACE')),
  ADD CONSTRAINT ck_content_revisions_7 CHECK (((household_profile_id IS NOT NULL) + (room_id IS NOT NULL) + (service_id IS NOT NULL) + (product_id IS NOT NULL) + (article_id IS NOT NULL) + (place_id IS NOT NULL)) = 1),
  ADD CONSTRAINT ck_content_revisions_8 CHECK ((content_type = 'HOUSEHOLD' AND household_profile_id IS NOT NULL) OR (content_type = 'ROOM' AND room_id IS NOT NULL) OR (content_type = 'SERVICE' AND service_id IS NOT NULL) OR (content_type = 'PRODUCT' AND product_id IS NOT NULL) OR (content_type = 'ARTICLE' AND article_id IS NOT NULL) OR (content_type = 'PLACE' AND place_id IS NOT NULL));
ALTER TABLE resources ADD COLUMN supply_contact VARCHAR(1000) NULL;
ALTER TABLE service_slots
  ADD COLUMN place_id BIGINT UNSIGNED NULL,
  ADD COLUMN readiness_status VARCHAR(32) NOT NULL DEFAULT 'AWAITING_CONFIRMATION',
  ADD COLUMN readiness_note VARCHAR(1000) NULL,
  ADD COLUMN readiness_confirmed_by BIGINT UNSIGNED NULL,
  ADD COLUMN readiness_confirmed_at DATETIME(6) NULL,
  ADD CONSTRAINT ck_slots_readiness CHECK (readiness_status IN ('AWAITING_CONFIRMATION','CONFIRMED','UNAVAILABLE')),
  ADD CONSTRAINT ck_slots_confirmed CHECK (readiness_status <> 'CONFIRMED' OR (readiness_confirmed_by IS NOT NULL AND readiness_confirmed_at IS NOT NULL)),
  ADD CONSTRAINT ck_slots_confirmation_pair CHECK ((readiness_confirmed_by IS NULL) = (readiness_confirmed_at IS NULL));
-- Unknown legacy readiness is deliberately not backfilled as CONFIRMED.
-- Old bookings retain their commitments; new commitments require readiness checks.
ALTER TABLE slot_resource_assignments
  ADD COLUMN preparation_minutes INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN cleanup_minutes INT UNSIGNED NOT NULL DEFAULT 0,
  ADD CONSTRAINT ck_assignment_buffers CHECK (preparation_minutes <= 10080 AND cleanup_minutes <= 10080);
ALTER TABLE availability_blocks MODIFY COLUMN ends_at DATETIME(6) NULL;

ALTER TABLE schedule_requests
  MODIFY COLUMN customer_user_id BIGINT UNSIGNED NULL,
  ADD COLUMN request_kind VARCHAR(32) NOT NULL DEFAULT 'PRIVATE_SCHEDULE',
  ADD COLUMN booking_id BIGINT UNSIGNED NULL,
  ADD COLUMN service_id BIGINT UNSIGNED NULL,
  ADD COLUMN created_by BIGINT UNSIGNED NULL,
  ADD COLUMN contact_snapshot JSON NULL,
  ADD COLUMN reply VARCHAR(4000) NULL,
  ADD COLUMN replied_by BIGINT UNSIGNED NULL,
  ADD COLUMN replied_at DATETIME(6) NULL,
  ADD COLUMN active_change_booking_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN request_kind = 'BOOKING_CHANGE' AND status IN ('OPEN','PROPOSED') THEN booking_id ELSE NULL END) STORED,
  ADD UNIQUE KEY uq_requests_active_change (active_change_booking_id),
  ADD UNIQUE KEY uq_requests_booking_household (id, booking_id, household_id),
  DROP CHECK ck_schedule_requests_1,
  ADD CONSTRAINT ck_schedule_requests_1 CHECK (status IN ('OPEN','PROPOSED','ANSWERED','ACCEPTED','DECLINED','WITHDRAWN','EXPIRED','CLOSED')),
  ADD CONSTRAINT ck_requests_kind CHECK (request_kind IN ('PRIVATE_SCHEDULE','SERVICE_INQUIRY','BOOKING_CHANGE')),
  ADD CONSTRAINT ck_requests_target CHECK ((request_kind = 'BOOKING_CHANGE' AND booking_id IS NOT NULL AND service_id IS NULL) OR (request_kind = 'SERVICE_INQUIRY' AND booking_id IS NULL AND service_id IS NOT NULL) OR (request_kind = 'PRIVATE_SCHEDULE' AND booking_id IS NULL AND service_id IS NULL)),
  ADD CONSTRAINT ck_requests_customer CHECK (customer_user_id IS NOT NULL OR (request_kind = 'BOOKING_CHANGE' AND created_by IS NOT NULL AND contact_snapshot IS NOT NULL)),
  ADD CONSTRAINT ck_requests_contact CHECK (contact_snapshot IS NULL OR JSON_TYPE(contact_snapshot) = 'OBJECT');

ALTER TABLE booking_proposals
  ADD COLUMN booking_id BIGINT UNSIGNED NULL,
  ADD COLUMN acceptance_evidence JSON NULL,
  ADD UNIQUE KEY uq_proposals_booking_household (id, booking_id, household_id),
  ADD CONSTRAINT ck_proposals_evidence CHECK (acceptance_evidence IS NULL OR JSON_TYPE(acceptance_evidence) = 'OBJECT');
-- Keep accepted_proposal_id on bookings as the INITIAL acquisition provenance.
-- current_reservation_set_id, not accepted_proposal_id, selects the current version.
ALTER TABLE bookings
  ADD COLUMN current_reservation_set_id BIGINT UNSIGNED NULL,
  ADD COLUMN financial_resolution JSON NULL,
  ADD CONSTRAINT ck_bookings_financial_resolution CHECK (financial_resolution IS NULL OR JSON_TYPE(financial_resolution) = 'OBJECT');
ALTER TABLE reservation_sets
  DROP FOREIGN KEY fk_reservation_sets_booking_id_proposal_id_household_id,
  ADD KEY ix_sets_booking (booking_id),
  DROP INDEX uq_reservation_sets_booking_id,
  ADD COLUMN version INT UNSIGNED NOT NULL DEFAULT 1,
  ADD COLUMN purpose VARCHAR(16) NOT NULL DEFAULT 'INITIAL',
  ADD COLUMN base_set_id BIGINT UNSIGNED NULL,
  ADD COLUMN total_vnd DECIMAL(15,0) NULL,
  ADD COLUMN terms_snapshot JSON NULL,
  ADD COLUMN first_starts_at DATETIME(6) NULL,
  ADD COLUMN last_ends_at DATETIME(6) NULL,
  ADD COLUMN accepted_at DATETIME(6) NULL,
  ADD COLUMN acceptance_evidence JSON NULL,
  ADD COLUMN committed_booking_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'COMMITTED' THEN booking_id ELSE NULL END) STORED,
  ADD COLUMN change_booking_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN purpose = 'RESCHEDULE' THEN booking_id ELSE NULL END) STORED,
  ADD COLUMN initial_proposal_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN purpose = 'INITIAL' THEN proposal_id ELSE NULL END) STORED,
  ADD UNIQUE KEY uq_sets_booking_version (booking_id, version),
  ADD UNIQUE KEY uq_sets_committed_booking (committed_booking_id),
  ADD UNIQUE KEY uq_sets_id_booking_household (id, booking_id, household_id),
  DROP CHECK ck_reservation_sets_3,
  DROP CHECK ck_sets_draft,
  ADD CONSTRAINT ck_reservation_sets_3 CHECK (status <> 'HELD' OR (hold_started_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at > hold_started_at AND (purpose = 'RESCHEDULE' OR ((booking_id IS NOT NULL) + (proposal_id IS NOT NULL)) = 1))),
  ADD CONSTRAINT ck_sets_draft CHECK (status <> 'DRAFT' OR (proposal_id IS NOT NULL AND (purpose = 'RESCHEDULE' OR booking_id IS NULL) AND hold_started_at IS NULL AND expires_at IS NULL AND released_at IS NULL)),
  ADD CONSTRAINT ck_sets_version CHECK (version > 0),
  ADD CONSTRAINT ck_sets_purpose CHECK ((purpose = 'INITIAL' AND base_set_id IS NULL) OR (purpose = 'RESCHEDULE' AND base_set_id IS NOT NULL AND booking_id IS NOT NULL AND proposal_id IS NOT NULL AND version > 1)),
  ADD CONSTRAINT ck_sets_money CHECK (total_vnd IS NULL OR total_vnd >= 0),
  ADD CONSTRAINT ck_sets_terms CHECK (terms_snapshot IS NULL OR JSON_TYPE(terms_snapshot) = 'OBJECT'),
  ADD CONSTRAINT ck_sets_interval CHECK ((first_starts_at IS NULL AND last_ends_at IS NULL) OR (first_starts_at IS NOT NULL AND last_ends_at IS NOT NULL AND last_ends_at > first_starts_at)),
  ADD CONSTRAINT ck_sets_evidence CHECK (acceptance_evidence IS NULL OR JSON_TYPE(acceptance_evidence) = 'OBJECT');

-- Copy only newly introduced snapshot columns; never rewrite source history.
UPDATE reservation_sets rs
LEFT JOIN bookings b ON b.id = rs.booking_id AND b.household_id = rs.household_id
LEFT JOIN booking_proposals p ON p.id = rs.proposal_id AND p.household_id = rs.household_id
SET rs.total_vnd = COALESCE(p.total_vnd, b.total_vnd),
    rs.terms_snapshot = COALESCE(p.terms_snapshot, b.terms_snapshot),
    rs.first_starts_at = COALESCE(b.first_starts_at, (SELECT MIN(i.starts_at) FROM booking_items i WHERE i.reservation_set_id = rs.id)),
    rs.last_ends_at = COALESCE(b.last_ends_at, (SELECT MAX(i.ends_at) FROM booking_items i WHERE i.reservation_set_id = rs.id)),
    rs.accepted_at = COALESCE(p.accepted_at, b.confirmed_at)
WHERE rs.total_vnd IS NULL;
UPDATE bookings b JOIN reservation_sets rs ON rs.booking_id = b.id AND rs.household_id = b.household_id
SET b.current_reservation_set_id = rs.id
WHERE b.current_reservation_set_id IS NULL AND b.confirmed_at IS NOT NULL;

ALTER TABLE reservation_sets ADD CONSTRAINT ck_sets_active_snapshot CHECK (status NOT IN ('HELD','COMMITTED') OR (total_vnd IS NOT NULL AND terms_snapshot IS NOT NULL AND first_starts_at IS NOT NULL AND last_ends_at IS NOT NULL));

ALTER TABLE booking_items
  ADD COLUMN source_item_id BIGINT UNSIGNED NULL,
  ADD COLUMN requested_snapshot JSON NULL,
  ADD COLUMN preparations JSON NOT NULL DEFAULT (JSON_ARRAY()),
  ADD COLUMN actual_participant_count INT UNSIGNED NULL,
  ADD COLUMN actual_served_quantity DECIMAL(12,4) NULL,
  ADD COLUMN actual_served_unit VARCHAR(60) NULL,
  ADD UNIQUE KEY uq_items_source_in_version (reservation_set_id, source_item_id),
  ADD CONSTRAINT ck_items_requested CHECK (requested_snapshot IS NULL OR JSON_TYPE(requested_snapshot) = 'OBJECT'),
  ADD CONSTRAINT ck_items_actual_quantity CHECK ((actual_served_quantity IS NULL AND actual_served_unit IS NULL) OR (actual_served_quantity IS NOT NULL AND actual_served_quantity >= 0 AND actual_served_unit IS NOT NULL AND CHAR_LENGTH(TRIM(actual_served_unit)) > 0)),
  ADD CONSTRAINT ck_items_preparations CHECK (JSON_SCHEMA_VALID('{"type":"array","maxItems":100,"items":{"type":"object","additionalProperties":false,"required":["key","name","required_quantity","prepared_quantity","unit","status","recorded_by","recorded_at"],"properties":{"key":{"type":"string","minLength":1,"maxLength":64},"name":{"type":"string","minLength":1,"maxLength":150},"required_quantity":{"type":"number","minimum":0},"prepared_quantity":{"type":"number","minimum":0},"unit":{"type":"string","minLength":1,"maxLength":60},"status":{"enum":["NOT_STARTED","PREPARING","READY","UNAVAILABLE"]},"assignee_note":{"type":"string","maxLength":150},"due_at":{"type":"string","format":"date-time"},"recorded_by":{"type":"string","pattern":"^[1-9][0-9]{0,19}$"},"recorded_at":{"type":"string","format":"date-time"},"note":{"type":"string","maxLength":1000}}}}', preparations));
ALTER TABLE item_resource_usages ADD UNIQUE KEY uq_usages_id_household (id, household_id);
ALTER TABLE complaints
  ADD COLUMN feedback_kind VARCHAR(16) NOT NULL DEFAULT 'COMPLAINT',
  ADD COLUMN item_id BIGINT UNSIGNED NULL,
  ADD CONSTRAINT ck_complaints_kind CHECK (feedback_kind IN ('COMPLAINT','INCIDENT')),
  ADD CONSTRAINT ck_complaints_item CHECK (item_id IS NULL OR (feedback_kind = 'INCIDENT' AND booking_id IS NOT NULL));

-- The existing typed ledger already separates cash from obligations.
-- REFUND_AGREEMENT/REFUND_ADJUSTMENT are NONCASH; preserve their original IDs.
ALTER TABLE financial_entries
  ADD COLUMN deposit_credit_id BIGINT UNSIGNED NULL,
  ADD COLUMN external_reference VARCHAR(150) NULL,
  ADD COLUMN evidence JSON NULL,
  ADD UNIQUE KEY uq_finance_deposit_source (id, booking_id, household_id, entry_type, receipt_purpose),
  ADD UNIQUE KEY uq_finance_credit_root (id, deposit_credit_id, household_id, entry_type),
  ADD UNIQUE KEY uq_finance_reversal_amount (id, household_id, entry_type, amount_vnd),
  DROP CHECK ck_finance_booking,
  ADD CONSTRAINT ck_finance_booking CHECK (
    (entry_type IN ('OTHER_INCOME','EXPENSE') AND booking_id IS NULL AND deposit_credit_id IS NULL)
    OR (entry_type = 'RECEIPT' AND booking_id IS NOT NULL AND deposit_credit_id IS NULL)
    OR (entry_type IN ('REFUND','REFUND_AGREEMENT','REFUND_ADJUSTMENT') AND ((booking_id IS NOT NULL) + (deposit_credit_id IS NOT NULL)) = 1)),
  ADD CONSTRAINT ck_finance_evidence CHECK (evidence IS NULL OR JSON_TYPE(evidence) = 'OBJECT');

CREATE TABLE deposit_credits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  credit_code VARCHAR(40) NOT NULL,
  source_receipt_id BIGINT UNSIGNED NOT NULL,
  source_booking_id BIGINT UNSIGNED NOT NULL,
  source_type VARCHAR(32) NOT NULL DEFAULT 'RECEIPT',
  source_purpose VARCHAR(16) NOT NULL DEFAULT 'DEPOSIT',
  customer_user_id BIGINT UNSIGNED NULL,
  beneficiary_snapshot JSON NOT NULL,
  amount_vnd DECIMAL(15,0) NOT NULL,
  agreed_at DATETIME(6) NOT NULL,
  expires_at DATETIME(6) NULL,
  no_expiry_agreed TINYINT UNSIGNED NOT NULL DEFAULT 0,
  terms_snapshot JSON NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  recorded_by BIGINT UNSIGNED NOT NULL,
  operation_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_credits_code (credit_code),
  UNIQUE KEY uq_credits_operation (household_id, operation_key),
  UNIQUE KEY uq_credits_id_household (id, household_id),
  KEY ix_credits_customer_status (customer_user_id, status, expires_at),
  KEY ix_credits_source (source_receipt_id),
  CONSTRAINT ck_credits_source CHECK (source_type = 'RECEIPT' AND source_purpose = 'DEPOSIT'),
  CONSTRAINT ck_credits_amount CHECK (amount_vnd > 0),
  CONSTRAINT ck_credits_expiry CHECK ((no_expiry_agreed = 1 AND expires_at IS NULL) OR (no_expiry_agreed = 0 AND expires_at IS NOT NULL AND expires_at > agreed_at)),
  CONSTRAINT ck_credits_status CHECK (status IN ('ACTIVE','SUSPENDED','EXPIRED','CLOSED')),
  CONSTRAINT ck_credits_beneficiary CHECK (JSON_TYPE(beneficiary_snapshot) = 'OBJECT'),
  CONSTRAINT ck_credits_terms CHECK (JSON_TYPE(terms_snapshot) = 'OBJECT'),
  CONSTRAINT ck_credits_operation CHECK (CHAR_LENGTH(TRIM(operation_key)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE deposit_credit_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  credit_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  movement_kind VARCHAR(16) NOT NULL,
  amount_vnd DECIMAL(15,0) NOT NULL,
  restores_movement_id BIGINT UNSIGNED NULL,
  origin_kind VARCHAR(16) GENERATED ALWAYS AS (CASE WHEN restores_movement_id IS NOT NULL THEN 'APPLY' ELSE NULL END) STORED,
  occurred_at DATETIME(6) NOT NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  consent_snapshot JSON NOT NULL,
  reason VARCHAR(2000) NOT NULL,
  operation_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_credit_movements_operation (household_id, operation_key),
  UNIQUE KEY uq_credit_movements_origin (id, credit_id, booking_id, household_id, movement_kind),
  KEY ix_credit_movements_balance (credit_id, occurred_at),
  KEY ix_credit_movements_booking (booking_id, occurred_at),
  CONSTRAINT ck_credit_movements_kind CHECK ((movement_kind = 'APPLY' AND restores_movement_id IS NULL) OR (movement_kind = 'RESTORE' AND restores_movement_id IS NOT NULL)),
  CONSTRAINT ck_credit_movements_amount CHECK (amount_vnd > 0),
  CONSTRAINT ck_credit_movements_consent CHECK (JSON_TYPE(consent_snapshot) = 'OBJECT'),
  CONSTRAINT ck_credit_movements_reason CHECK (CHAR_LENGTH(TRIM(reason)) > 0),
  CONSTRAINT ck_credit_movements_operation CHECK (CHAR_LENGTH(TRIM(operation_key)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE resource_handovers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  usage_id BIGINT UNSIGNED NOT NULL,
  event_kind VARCHAR(16) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  returns_event_id BIGINT UNSIGNED NULL,
  origin_kind VARCHAR(16) GENERATED ALWAYS AS (CASE WHEN returns_event_id IS NOT NULL THEN 'ISSUE' ELSE NULL END) STORED,
  condition_note VARCHAR(1000) NOT NULL,
  occurred_at DATETIME(6) NOT NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  incident_id BIGINT UNSIGNED NULL,
  operation_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_handovers_operation (household_id, operation_key),
  UNIQUE KEY uq_handovers_origin (id, usage_id, household_id, event_kind),
  KEY ix_handovers_usage_time (usage_id, occurred_at),
  CONSTRAINT ck_handovers_kind CHECK ((event_kind = 'ISSUE' AND returns_event_id IS NULL) OR (event_kind = 'RETURN' AND returns_event_id IS NOT NULL)),
  CONSTRAINT ck_handovers_quantity CHECK (quantity > 0),
  CONSTRAINT ck_handovers_condition CHECK (CHAR_LENGTH(TRIM(condition_note)) > 0),
  CONSTRAINT ck_handovers_operation CHECK (CHAR_LENGTH(TRIM(operation_key)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE complaints ADD UNIQUE KEY uq_complaints_id_household_kind (id, household_id, feedback_kind);
ALTER TABLE resource_handovers ADD COLUMN incident_kind VARCHAR(16) GENERATED ALWAYS AS (CASE WHEN incident_id IS NOT NULL THEN 'INCIDENT' ELSE NULL END) STORED;

ALTER TABLE places ADD CONSTRAINT fk_places_household FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE content_revisions ADD CONSTRAINT fk_revisions_place FOREIGN KEY (place_id) REFERENCES places (id);
ALTER TABLE places ADD CONSTRAINT fk_places_published FOREIGN KEY (published_revision_id, id) REFERENCES content_revisions (id, place_id);
ALTER TABLE rooms ADD CONSTRAINT fk_rooms_place FOREIGN KEY (place_id, household_id) REFERENCES places (id, household_id);
ALTER TABLE services ADD CONSTRAINT fk_services_place FOREIGN KEY (default_place_id, household_id) REFERENCES places (id, household_id);
ALTER TABLE service_slots ADD CONSTRAINT fk_slots_place FOREIGN KEY (place_id, household_id) REFERENCES places (id, household_id);
ALTER TABLE service_slots ADD CONSTRAINT fk_slots_confirmation_actor FOREIGN KEY (readiness_confirmed_by) REFERENCES users (id);
ALTER TABLE cultural_articles ADD CONSTRAINT fk_articles_category FOREIGN KEY (category_id, category_kind) REFERENCES categories (id, kind);
ALTER TABLE schedule_requests ADD CONSTRAINT fk_requests_booking FOREIGN KEY (booking_id, household_id) REFERENCES bookings (id, household_id);
ALTER TABLE schedule_requests ADD CONSTRAINT fk_requests_booking_customer FOREIGN KEY (booking_id, customer_user_id, household_id) REFERENCES bookings (id, customer_user_id, household_id);
ALTER TABLE schedule_requests ADD CONSTRAINT fk_requests_service FOREIGN KEY (service_id, household_id) REFERENCES services (id, household_id);
ALTER TABLE schedule_requests ADD CONSTRAINT fk_requests_actor FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE schedule_requests ADD CONSTRAINT fk_requests_reply_actor FOREIGN KEY (replied_by) REFERENCES users (id);
ALTER TABLE booking_proposals ADD CONSTRAINT fk_proposals_change_request FOREIGN KEY (request_id, booking_id, household_id) REFERENCES schedule_requests (id, booking_id, household_id);
ALTER TABLE reservation_sets ADD CONSTRAINT fk_sets_base FOREIGN KEY (base_set_id, booking_id, household_id) REFERENCES reservation_sets (id, booking_id, household_id);
ALTER TABLE reservation_sets ADD CONSTRAINT fk_sets_change_proposal FOREIGN KEY (proposal_id, change_booking_id, household_id) REFERENCES booking_proposals (id, booking_id, household_id);
ALTER TABLE reservation_sets ADD CONSTRAINT fk_sets_initial_proposal FOREIGN KEY (booking_id, initial_proposal_id, household_id) REFERENCES bookings (id, accepted_proposal_id, household_id);
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_current_set FOREIGN KEY (current_reservation_set_id, id, household_id) REFERENCES reservation_sets (id, booking_id, household_id);
ALTER TABLE booking_items ADD CONSTRAINT fk_items_source FOREIGN KEY (source_item_id, household_id) REFERENCES booking_items (id, household_id);
ALTER TABLE complaints ADD CONSTRAINT fk_incident_item FOREIGN KEY (item_id, household_id) REFERENCES booking_items (id, household_id);
ALTER TABLE deposit_credits ADD CONSTRAINT fk_credits_source FOREIGN KEY (source_receipt_id, source_booking_id, household_id, source_type, source_purpose) REFERENCES financial_entries (id, booking_id, household_id, entry_type, receipt_purpose);
ALTER TABLE deposit_credits ADD CONSTRAINT fk_credits_customer FOREIGN KEY (source_booking_id, customer_user_id, household_id) REFERENCES bookings (id, customer_user_id, household_id);
ALTER TABLE deposit_credits ADD CONSTRAINT fk_credits_actor FOREIGN KEY (recorded_by) REFERENCES users (id);
ALTER TABLE financial_entries ADD CONSTRAINT fk_finance_credit FOREIGN KEY (deposit_credit_id, household_id) REFERENCES deposit_credits (id, household_id);
ALTER TABLE financial_entries ADD CONSTRAINT fk_finance_any_agreement FOREIGN KEY (agreement_id, household_id, agreement_type) REFERENCES financial_entries (id, household_id, entry_type);
ALTER TABLE financial_entries ADD CONSTRAINT fk_finance_credit_agreement FOREIGN KEY (agreement_id, deposit_credit_id, household_id, agreement_type) REFERENCES financial_entries (id, deposit_credit_id, household_id, entry_type);
ALTER TABLE financial_entries ADD CONSTRAINT fk_finance_reversal_booking FOREIGN KEY (reverses_entry_id, booking_id, household_id, entry_type) REFERENCES financial_entries (id, booking_id, household_id, entry_type);
ALTER TABLE financial_entries ADD CONSTRAINT fk_finance_reversal_credit FOREIGN KEY (reverses_entry_id, deposit_credit_id, household_id, entry_type) REFERENCES financial_entries (id, deposit_credit_id, household_id, entry_type);
ALTER TABLE financial_entries ADD CONSTRAINT fk_finance_reversal_amount FOREIGN KEY (reverses_entry_id, household_id, entry_type, amount_vnd) REFERENCES financial_entries (id, household_id, entry_type, amount_vnd);
ALTER TABLE deposit_credit_movements ADD CONSTRAINT fk_movements_credit FOREIGN KEY (credit_id, household_id) REFERENCES deposit_credits (id, household_id);
ALTER TABLE deposit_credit_movements ADD CONSTRAINT fk_movements_booking FOREIGN KEY (booking_id, household_id) REFERENCES bookings (id, household_id);
ALTER TABLE deposit_credit_movements ADD CONSTRAINT fk_movements_actor FOREIGN KEY (recorded_by) REFERENCES users (id);
ALTER TABLE deposit_credit_movements ADD CONSTRAINT fk_movements_origin FOREIGN KEY (restores_movement_id, credit_id, booking_id, household_id, origin_kind) REFERENCES deposit_credit_movements (id, credit_id, booking_id, household_id, movement_kind);
ALTER TABLE resource_handovers ADD CONSTRAINT fk_handovers_usage FOREIGN KEY (usage_id, household_id) REFERENCES item_resource_usages (id, household_id);
ALTER TABLE resource_handovers ADD CONSTRAINT fk_handovers_actor FOREIGN KEY (recorded_by) REFERENCES users (id);
ALTER TABLE resource_handovers ADD CONSTRAINT fk_handovers_origin FOREIGN KEY (returns_event_id, usage_id, household_id, origin_kind) REFERENCES resource_handovers (id, usage_id, household_id, event_kind);
ALTER TABLE resource_handovers ADD CONSTRAINT fk_handovers_incident FOREIGN KEY (incident_id, household_id, incident_kind) REFERENCES complaints (id, household_id, feedback_kind);
