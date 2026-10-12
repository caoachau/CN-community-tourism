-- Migration 002: compact v3 (30 application tables).
-- Execute ONLY with scripts/migrate.js. The runner requires an empty v2 business
-- schema, creates a staged schema, preserves v1 history and all old tables in a
-- separate backup database, then atomically swaps the complete table sets.
-- This file is the staged DDL, NOT an in-place SQL script for Workbench.
-- No seed and no DROP of the old schema.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET SESSION time_zone = '+00:00';

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(32) NULL,
  display_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER',
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  disabled_at DATETIME(6) NULL,
  updated_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT ck_users_1 CHECK (role IN ('CUSTOMER', 'HOUSEHOLD', 'ADMIN')),
  CONSTRAINT ck_users_2 CHECK (status IN ('ACTIVE', 'BLOCKED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE auth_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash BINARY(32) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
  KEY ix_auth_sessions_user_id_expires_at (user_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE households (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL,
  approval_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  visibility VARCHAR(32) NOT NULL DEFAULT 'VISIBLE',
  published_revision_id BIGINT UNSIGNED NULL,
  archived_at DATETIME(6) NULL,
  updated_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_households_owner_user_id (owner_user_id),
  UNIQUE KEY uq_households_code (code),
  CONSTRAINT ck_households_1 CHECK (approval_status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),
  CONSTRAINT ck_households_2 CHECK (visibility IN ('VISIBLE', 'HIDDEN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind VARCHAR(16) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  is_active TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_code (kind, code),
  UNIQUE KEY uq_categories_id_kind (id, kind),
  CONSTRAINT ck_categories_1 CHECK (is_active IN (0,1)),
  CONSTRAINT ck_categories_kind CHECK (kind IN ('SERVICE','PRODUCT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE rooms (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL,
  max_guests INT UNSIGNED NOT NULL,
  nightly_price_vnd DECIMAL(15,0) NOT NULL,
  check_in_time TIME NOT NULL DEFAULT '14:00:00',
  check_out_time TIME NOT NULL DEFAULT '12:00:00',
  supply_status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  visibility VARCHAR(32) NOT NULL DEFAULT 'VISIBLE',
  published_revision_id BIGINT UNSIGNED NULL,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_rooms_household_id_code (household_id, code),
  UNIQUE KEY uq_rooms_id_household_id (id, household_id),
  CONSTRAINT ck_rooms_1 CHECK (max_guests > 0),
  CONSTRAINT ck_rooms_2 CHECK (nightly_price_vnd >= 0),
  CONSTRAINT ck_rooms_3 CHECK (check_in_time >= '00:00:00' AND check_in_time < '24:00:00'),
  CONSTRAINT ck_rooms_4 CHECK (check_out_time >= '00:00:00' AND check_out_time < '24:00:00'),
  CONSTRAINT ck_rooms_5 CHECK (supply_status IN ('AVAILABLE', 'PAUSED', 'RETIRED')),
  CONSTRAINT ck_rooms_6 CHECK (visibility IN ('VISIBLE', 'HIDDEN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  category_kind VARCHAR(16) NOT NULL DEFAULT 'SERVICE',
  default_duration_minutes INT UNSIGNED NOT NULL,
  supply_status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  visibility VARCHAR(32) NOT NULL DEFAULT 'VISIBLE',
  published_revision_id BIGINT UNSIGNED NULL,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_services_household_id_code (household_id, code),
  UNIQUE KEY uq_services_id_household_id (id, household_id),
  CONSTRAINT ck_services_1 CHECK (default_duration_minutes > 0),
  CONSTRAINT ck_services_2 CHECK (supply_status IN ('AVAILABLE', 'PAUSED', 'RETIRED')),
  CONSTRAINT ck_services_3 CHECK (visibility IN ('VISIBLE', 'HIDDEN')),
  CONSTRAINT ck_services_category_kind CHECK (category_kind = 'SERVICE')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE local_products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  category_kind VARCHAR(16) NOT NULL DEFAULT 'PRODUCT',
  code VARCHAR(40) NOT NULL,
  supply_status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  reference_price_vnd DECIMAL(15,0) NULL,
  price_unit VARCHAR(60) NULL,
  visibility VARCHAR(32) NOT NULL DEFAULT 'VISIBLE',
  published_revision_id BIGINT UNSIGNED NULL,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_local_products_household_id_code (household_id, code),
  UNIQUE KEY uq_local_products_id_household_id (id, household_id),
  CONSTRAINT ck_local_products_1 CHECK (reference_price_vnd IS NULL OR reference_price_vnd >= 0),
  CONSTRAINT ck_local_products_2 CHECK (supply_status IN ('AVAILABLE', 'COMING_SOON', 'OUT_OF_SEASON', 'DISCONTINUED')),
  CONSTRAINT ck_local_products_3 CHECK (visibility IN ('VISIBLE', 'HIDDEN')),
  CONSTRAINT ck_products_category_kind CHECK (category_kind = 'PRODUCT')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cultural_articles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NULL,
  author_user_id BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(180) NOT NULL,
  visibility VARCHAR(32) NOT NULL DEFAULT 'VISIBLE',
  published_revision_id BIGINT UNSIGNED NULL,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cultural_articles_slug (slug),
  CONSTRAINT ck_cultural_articles_1 CHECK (visibility IN ('VISIBLE', 'HIDDEN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE content_revisions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  content_type VARCHAR(32) NOT NULL,
  household_profile_id BIGINT UNSIGNED NULL,
  room_id BIGINT UNSIGNED NULL,
  service_id BIGINT UNSIGNED NULL,
  product_id BIGINT UNSIGNED NULL,
  article_id BIGINT UNSIGNED NULL,
  version INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  body LONGTEXT NOT NULL,
  details JSON NOT NULL,
  schema_version INT UNSIGNED NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  submitted_by BIGINT UNSIGNED NOT NULL,
  submitted_at DATETIME(6) NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(6) NULL,
  review_note VARCHAR(2000) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_content_revisions_household_profile_id_version (household_profile_id, version),
  UNIQUE KEY uq_content_revisions_room_id_version (room_id, version),
  UNIQUE KEY uq_content_revisions_service_id_version (service_id, version),
  UNIQUE KEY uq_content_revisions_product_id_version (product_id, version),
  UNIQUE KEY uq_content_revisions_article_id_version (article_id, version),
  UNIQUE KEY uq_content_revisions_id_household_profile_id (id, household_profile_id),
  UNIQUE KEY uq_content_revisions_id_room_id (id, room_id),
  UNIQUE KEY uq_content_revisions_id_service_id (id, service_id),
  UNIQUE KEY uq_content_revisions_id_product_id (id, product_id),
  UNIQUE KEY uq_content_revisions_id_article_id (id, article_id),
  KEY ix_content_revisions_status_submitted_at (status, submitted_at),
  CONSTRAINT ck_content_revisions_1 CHECK (version > 0),
  CONSTRAINT ck_content_revisions_2 CHECK (schema_version > 0),
  CONSTRAINT ck_content_revisions_3 CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
  CONSTRAINT ck_content_revisions_4 CHECK (status NOT IN ('APPROVED','REJECTED') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
  CONSTRAINT ck_content_revisions_5 CHECK (status <> 'REJECTED' OR (review_note IS NOT NULL AND CHAR_LENGTH(TRIM(review_note)) > 0)),
  CONSTRAINT ck_content_revisions_6 CHECK (content_type IN ('HOUSEHOLD', 'ROOM', 'SERVICE', 'PRODUCT', 'ARTICLE')),
  CONSTRAINT ck_content_revisions_7 CHECK (((household_profile_id IS NOT NULL) + (room_id IS NOT NULL) + (service_id IS NOT NULL) + (product_id IS NOT NULL) + (article_id IS NOT NULL)) = 1),
  CONSTRAINT ck_content_revisions_8 CHECK ((content_type = 'HOUSEHOLD' AND household_profile_id IS NOT NULL) OR (content_type = 'ROOM' AND room_id IS NOT NULL) OR (content_type = 'SERVICE' AND service_id IS NOT NULL) OR (content_type = 'PRODUCT' AND product_id IS NOT NULL) OR (content_type = 'ARTICLE' AND article_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE revision_media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  revision_id BIGINT UNSIGNED NOT NULL,
  storage_provider VARCHAR(32) NOT NULL,
  object_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL,
  is_cover TINYINT UNSIGNED NOT NULL DEFAULT 0,
  caption VARCHAR(500) NULL,
  cover_revision_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN is_cover = 1 THEN revision_id ELSE NULL END) STORED,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_revision_media_object (revision_id, storage_provider, object_key),
  UNIQUE KEY uq_revision_media_sort (revision_id, sort_order),
  UNIQUE KEY uq_revision_media_cover (cover_revision_id),
  CONSTRAINT ck_revision_media_cover CHECK (is_cover IN (0,1)),
  CONSTRAINT ck_revision_media_size CHECK (size_bytes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE service_offers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  participation_mode VARCHAR(32) NOT NULL,
  pricing_type VARCHAR(32) NOT NULL,
  unit_price_vnd DECIMAL(15,0) NOT NULL,
  unit_label VARCHAR(60) NOT NULL,
  min_participants INT UNSIGNED NOT NULL,
  max_participants INT UNSIGNED NOT NULL,
  max_units INT UNSIGNED NULL,
  participants_per_unit INT UNSIGNED NULL,
  terms JSON NOT NULL,
  addons JSON NOT NULL DEFAULT (JSON_OBJECT('schema_version', 1, 'items', JSON_ARRAY())),
  is_active TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_offers_id_household_id (id, household_id),
  UNIQUE KEY uq_service_offers_id_service_id_household_id (id, service_id, household_id),
  CONSTRAINT ck_service_offers_1 CHECK (participation_mode IN ('SHARED', 'EXCLUSIVE')),
  CONSTRAINT ck_service_offers_2 CHECK (pricing_type IN ('PER_PERSON', 'PER_GROUP', 'PER_TRIP', 'FIXED_PACKAGE', 'PER_HOUR', 'PER_UNIT')),
  CONSTRAINT ck_service_offers_3 CHECK (unit_price_vnd >= 0),
  CONSTRAINT ck_service_offers_4 CHECK (min_participants > 0 AND max_participants >= min_participants),
  CONSTRAINT ck_service_offers_5 CHECK (max_units IS NULL OR max_units > 0),
  CONSTRAINT ck_service_offers_6 CHECK (participants_per_unit IS NULL OR participants_per_unit > 0),
  CONSTRAINT ck_service_offers_7 CHECK (is_active IN (0,1)),
  CONSTRAINT ck_offers_addons CHECK (JSON_SCHEMA_VALID('{"type":"object","additionalProperties":false,"required":["schema_version","items"],"properties":{"schema_version":{"enum":[1]},"items":{"type":"array","maxItems":32,"items":{"type":"object","additionalProperties":false,"required":["key","name","unit_price_vnd","max_quantity","is_active"],"properties":{"key":{"type":"string","pattern":"^[A-Za-z0-9_-]{1,64}$"},"name":{"type":"string","minLength":1,"maxLength":150},"unit_price_vnd":{"type":"integer","minimum":0,"maximum":999999999999999},"max_quantity":{"type":"integer","minimum":1,"maximum":100000},"is_active":{"type":"boolean"}}}}}}', addons))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE resources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(150) NOT NULL,
  resource_type VARCHAR(32) NOT NULL,
  total_quantity INT UNSIGNED NOT NULL,
  max_people_per_unit INT UNSIGNED NULL,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_resources_household_id_code (household_id, code),
  UNIQUE KEY uq_resources_id_household_id (id, household_id),
  CONSTRAINT ck_resources_1 CHECK (resource_type IN ('SINGLE', 'POOL')),
  CONSTRAINT ck_resources_2 CHECK (total_quantity > 0),
  CONSTRAINT ck_resources_3 CHECK (resource_type <> 'SINGLE' OR total_quantity = 1),
  CONSTRAINT ck_resources_4 CHECK (max_people_per_unit IS NULL OR max_people_per_unit > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE availability_blocks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NULL,
  resource_id BIGINT UNSIGNED NULL,
  starts_at DATETIME(6) NOT NULL,
  ends_at DATETIME(6) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  released_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_blocks_room_interval (room_id, starts_at, ends_at),
  KEY ix_blocks_resource_interval (resource_id, starts_at, ends_at),
  CONSTRAINT ck_blocks_target CHECK ((room_id IS NOT NULL) + (resource_id IS NOT NULL) = 1),
  CONSTRAINT ck_blocks_quantity CHECK (quantity > 0 AND (room_id IS NULL OR quantity = 1)),
  CONSTRAINT ck_blocks_interval CHECK (ends_at > starts_at),
  CONSTRAINT ck_blocks_reason CHECK (CHAR_LENGTH(TRIM(reason)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE service_slots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME(6) NOT NULL,
  ends_at DATETIME(6) NOT NULL,
  person_capacity INT UNSIGNED NOT NULL,
  visibility VARCHAR(32) NOT NULL DEFAULT 'PUBLIC',
  sales_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  created_by BIGINT UNSIGNED NOT NULL,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_slots_id_service_id_household_id (id, service_id, household_id),
  UNIQUE KEY uq_service_slots_id_household_id (id, household_id),
  KEY ix_service_slots_household_id_starts_at (household_id, starts_at),
  KEY ix_service_slots_service_id_sales_status_starts_at (service_id, sales_status, starts_at),
  CONSTRAINT ck_service_slots_1 CHECK (ends_at > starts_at),
  CONSTRAINT ck_service_slots_2 CHECK (person_capacity > 0),
  CONSTRAINT ck_service_slots_3 CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
  CONSTRAINT ck_service_slots_4 CHECK (sales_status IN ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED')),
  CONSTRAINT ck_service_slots_5 CHECK (visibility <> 'PRIVATE' OR sales_status <> 'OPEN')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE slot_offers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  slot_id BIGINT UNSIGNED NOT NULL,
  offer_id BIGINT UNSIGNED NOT NULL,
  is_enabled TINYINT UNSIGNED NOT NULL DEFAULT 1,
  price_override_vnd DECIMAL(15,0) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_slot_offers_slot_id_offer_id (slot_id, offer_id),
  UNIQUE KEY uq_slot_offers_id_slot_id_household_id (id, slot_id, household_id),
  UNIQUE KEY uq_slot_offers_id_slot_id_offer_id_household_id (id, slot_id, offer_id, household_id),
  CONSTRAINT ck_slot_offers_1 CHECK (is_enabled IN (0,1)),
  CONSTRAINT ck_slot_offers_2 CHECK (price_override_vnd IS NULL OR price_override_vnd >= 0),
  UNIQUE KEY uq_slot_offers_item_link (slot_id, offer_id, service_id, household_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE slot_resource_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  slot_id BIGINT UNSIGNED NOT NULL,
  resource_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  allocation_mode VARCHAR(32) NOT NULL,
  note VARCHAR(1000) NULL,
  released_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_slot_resource_assignments_slot_id_resource_id (slot_id, resource_id),
  UNIQUE KEY uq_slot_resource_assignments_id_slot_id_household_id (id, slot_id, household_id),
  KEY ix_slot_resource_assignments_resource_id_slot_id (resource_id, slot_id),
  CONSTRAINT ck_slot_resource_assignments_1 CHECK (quantity > 0),
  CONSTRAINT ck_slot_resource_assignments_2 CHECK (allocation_mode IN ('SESSION_SHARED', 'PER_BOOKING_QUOTA'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE slot_offer_resource_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  slot_id BIGINT UNSIGNED NOT NULL,
  slot_offer_id BIGINT UNSIGNED NOT NULL,
  assignment_id BIGINT UNSIGNED NOT NULL,
  usage_basis VARCHAR(32) NOT NULL,
  units_required INT UNSIGNED NOT NULL,
  max_people_per_unit INT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_slot_offer_resource_rules_slot_offer_id_assignment_id (slot_offer_id, assignment_id),
  CONSTRAINT ck_slot_offer_resource_rules_1 CHECK (usage_basis IN ('SHARED_ONCE', 'PER_PERSON', 'PER_GROUP', 'PER_UNIT', 'FIXED')),
  CONSTRAINT ck_slot_offer_resource_rules_2 CHECK (units_required > 0),
  CONSTRAINT ck_slot_offer_resource_rules_3 CHECK (max_people_per_unit IS NULL OR max_people_per_unit > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE schedule_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  customer_user_id BIGINT UNSIGNED NOT NULL,
  request_code VARCHAR(40) NOT NULL,
  message VARCHAR(4000) NOT NULL,
  preferences JSON NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  first_hold_started_at DATETIME(6) NULL,
  initial_hold_deadline DATETIME(6) NULL,
  closed_reason VARCHAR(2000) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_schedule_requests_request_code (request_code),
  UNIQUE KEY uq_schedule_requests_id_household_id (id, household_id),
  UNIQUE KEY uq_schedule_requests_id_customer_user_id_household_id (id, customer_user_id, household_id),
  KEY ix_schedule_requests_household_id_status_created_at (household_id, status, created_at),
  KEY ix_schedule_requests_customer_user_id_created_at (customer_user_id, created_at),
  CONSTRAINT ck_schedule_requests_1 CHECK (status IN ('OPEN', 'PROPOSED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED', 'CLOSED')),
  CONSTRAINT ck_schedule_requests_2 CHECK ((first_hold_started_at IS NULL AND initial_hold_deadline IS NULL) OR (first_hold_started_at IS NOT NULL AND initial_hold_deadline IS NOT NULL AND initial_hold_deadline > first_hold_started_at))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE booking_proposals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  request_id BIGINT UNSIGNED NOT NULL,
  version INT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  sent_at DATETIME(6) NULL,
  expires_at DATETIME(6) NULL,
  accepted_at DATETIME(6) NULL,
  total_vnd DECIMAL(15,0) NOT NULL,
  terms_snapshot JSON NOT NULL,
  active_request_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'SENT' THEN request_id ELSE NULL END) STORED,
  accepted_request_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'ACCEPTED' THEN request_id ELSE NULL END) STORED,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_booking_proposals_request_id_version (request_id, version),
  UNIQUE KEY uq_booking_proposals_active_request_id (active_request_id),
  UNIQUE KEY uq_booking_proposals_accepted_request_id (accepted_request_id),
  UNIQUE KEY uq_booking_proposals_id_request_id_household_id (id, request_id, household_id),
  UNIQUE KEY uq_booking_proposals_id_household_id (id, household_id),
  KEY ix_booking_proposals_status_expires_at (status, expires_at),
  CONSTRAINT ck_booking_proposals_1 CHECK (version > 0),
  CONSTRAINT ck_booking_proposals_2 CHECK (total_vnd >= 0),
  CONSTRAINT ck_booking_proposals_3 CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'SUPERSEDED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'INVALIDATED')),
  CONSTRAINT ck_booking_proposals_4 CHECK (status <> 'SENT' OR (sent_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at > sent_at)),
  CONSTRAINT ck_booking_proposals_5 CHECK (status <> 'ACCEPTED' OR accepted_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  booking_code VARCHAR(40) NOT NULL,
  customer_user_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  source VARCHAR(32) NOT NULL,
  offline_channel VARCHAR(40) NULL,
  accepted_proposal_id BIGINT UNSIGNED NULL,
  schedule_request_id BIGINT UNSIGNED NULL,
  status VARCHAR(32) NOT NULL,
  contact_name VARCHAR(150) NOT NULL,
  contact_phone VARCHAR(32) NOT NULL,
  contact_email VARCHAR(254) NULL,
  check_in_date DATE NULL,
  check_out_date DATE NULL,
  first_starts_at DATETIME(6) NOT NULL,
  last_ends_at DATETIME(6) NOT NULL,
  total_vnd DECIMAL(15,0) NOT NULL,
  terms_snapshot JSON NOT NULL,
  hold_expires_at DATETIME(6) NULL,
  confirmed_at DATETIME(6) NULL,
  closed_at DATETIME(6) NULL,
  closed_reason VARCHAR(2000) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_booking_code (booking_code),
  UNIQUE KEY uq_bookings_accepted_proposal_id (accepted_proposal_id),
  UNIQUE KEY uq_bookings_schedule_request_id (schedule_request_id),
  UNIQUE KEY uq_bookings_id_household_id (id, household_id),
  UNIQUE KEY uq_bookings_id_accepted_proposal_id_household_id (id, accepted_proposal_id, household_id),
  UNIQUE KEY uq_bookings_id_customer_user_id_household_id (id, customer_user_id, household_id),
  KEY ix_bookings_household_id_status_first_starts_at (household_id, status, first_starts_at),
  KEY ix_bookings_customer_user_id_created_at (customer_user_id, created_at),
  KEY ix_bookings_status_hold_expires_at (status, hold_expires_at),
  CONSTRAINT ck_bookings_1 CHECK (source IN ('ONLINE', 'CUSTOM_PROPOSAL', 'OFFLINE')),
  CONSTRAINT ck_bookings_2 CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'INTERRUPTED')),
  CONSTRAINT ck_bookings_3 CHECK (last_ends_at > first_starts_at),
  CONSTRAINT ck_bookings_4 CHECK (total_vnd >= 0),
  CONSTRAINT ck_bookings_5 CHECK ((source = 'OFFLINE' AND customer_user_id IS NULL AND offline_channel IS NOT NULL) OR (source <> 'OFFLINE' AND customer_user_id IS NOT NULL AND offline_channel IS NULL)),
  CONSTRAINT ck_bookings_6 CHECK ((source = 'CUSTOM_PROPOSAL' AND accepted_proposal_id IS NOT NULL AND schedule_request_id IS NOT NULL) OR (source <> 'CUSTOM_PROPOSAL' AND accepted_proposal_id IS NULL AND schedule_request_id IS NULL)),
  CONSTRAINT ck_bookings_7 CHECK ((check_in_date IS NULL AND check_out_date IS NULL) OR (check_in_date IS NOT NULL AND check_out_date IS NOT NULL AND check_out_date > check_in_date)),
  CONSTRAINT ck_bookings_8 CHECK (status <> 'PENDING' OR (source = 'ONLINE' AND hold_expires_at IS NOT NULL)),
  CONSTRAINT ck_bookings_9 CHECK (status NOT IN ('CONFIRMED','COMPLETED','NO_SHOW','INTERRUPTED') OR confirmed_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE reservation_sets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  proposal_id BIGINT UNSIGNED NULL,
  status VARCHAR(32) NOT NULL,
  hold_started_at DATETIME(6) NULL,
  expires_at DATETIME(6) NULL,
  released_at DATETIME(6) NULL,
  release_reason VARCHAR(1000) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_reservation_sets_booking_id (booking_id),
  UNIQUE KEY uq_reservation_sets_proposal_id (proposal_id),
  UNIQUE KEY uq_reservation_sets_id_household_id (id, household_id),
  KEY ix_reservation_sets_status_expires_at (status, expires_at),
  CONSTRAINT ck_reservation_sets_1 CHECK (status IN ('DRAFT', 'HELD', 'COMMITTED', 'RELEASED')),
  CONSTRAINT ck_reservation_sets_2 CHECK (booking_id IS NOT NULL OR proposal_id IS NOT NULL),
  CONSTRAINT ck_reservation_sets_3 CHECK (status <> 'HELD' OR (((booking_id IS NOT NULL) + (proposal_id IS NOT NULL)) = 1 AND hold_started_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at > hold_started_at)),
  CONSTRAINT ck_reservation_sets_4 CHECK (status <> 'COMMITTED' OR booking_id IS NOT NULL),
  CONSTRAINT ck_reservation_sets_5 CHECK (status <> 'RELEASED' OR released_at IS NOT NULL),
  CONSTRAINT ck_sets_draft CHECK (status <> 'DRAFT' OR (proposal_id IS NOT NULL AND booking_id IS NULL AND hold_started_at IS NULL AND expires_at IS NULL AND released_at IS NULL)),
  CONSTRAINT ck_sets_active_release CHECK (status = 'RELEASED' OR released_at IS NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE booking_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  reservation_set_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(16) NOT NULL,
  room_id BIGINT UNSIGNED NULL,
  service_id BIGINT UNSIGNED NULL,
  offer_id BIGINT UNSIGNED NULL,
  slot_id BIGINT UNSIGNED NULL,
  participant_count INT UNSIGNED NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  pricing_type VARCHAR(32) NOT NULL,
  is_exclusive TINYINT UNSIGNED NOT NULL DEFAULT 0,
  check_in_date DATE NULL,
  check_out_date DATE NULL,
  starts_at DATETIME(6) NOT NULL,
  ends_at DATETIME(6) NOT NULL,
  unit_price_vnd DECIMAL(15,0) NOT NULL,
  base_amount_vnd DECIMAL(15,0) NOT NULL,
  addons_amount_vnd DECIMAL(15,0) NOT NULL DEFAULT 0,
  total_vnd DECIMAL(16,0) GENERATED ALWAYS AS (base_amount_vnd + addons_amount_vnd) STORED,
  snapshot JSON NOT NULL,
  addons_snapshot JSON NOT NULL DEFAULT (JSON_ARRAY()),
  occupied_starts_at DATETIME(6) NULL,
  occupied_ends_at DATETIME(6) NULL,
  released_at DATETIME(6) NULL,
  outcome VARCHAR(32) NOT NULL DEFAULT 'UNRESOLVED',
  reason_code VARCHAR(32) NULL,
  outcome_detail JSON NULL,
  actual_ended_at DATETIME(6) NULL,
  outcome_recorded_by BIGINT UNSIGNED NULL,
  outcome_recorded_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_items_set_room (reservation_set_id, room_id),
  UNIQUE KEY uq_items_id_household (id, household_id),
  UNIQUE KEY uq_items_id_slot_household (id, slot_id, household_id),
  KEY ix_items_room_interval (room_id, occupied_starts_at, occupied_ends_at),
  KEY ix_items_slot_set (slot_id, reservation_set_id),
  CONSTRAINT ck_items_kind CHECK (kind IN ('ROOM','SERVICE')),
  CONSTRAINT ck_items_target CHECK (
    (kind = 'ROOM' AND room_id IS NOT NULL AND service_id IS NULL AND offer_id IS NULL AND slot_id IS NULL
      AND check_in_date IS NOT NULL AND check_out_date IS NOT NULL AND pricing_type = 'PER_NIGHT' AND is_exclusive = 1)
    OR (kind = 'SERVICE' AND room_id IS NULL AND service_id IS NOT NULL AND offer_id IS NOT NULL
      AND check_in_date IS NULL AND check_out_date IS NULL AND pricing_type <> 'PER_NIGHT')),
  CONSTRAINT ck_items_participants CHECK (participant_count > 0),
  CONSTRAINT ck_items_quantity CHECK (quantity > 0),
  CONSTRAINT ck_items_exclusive CHECK (is_exclusive IN (0,1)),
  CONSTRAINT ck_items_interval CHECK (ends_at > starts_at),
  CONSTRAINT ck_items_prices CHECK (unit_price_vnd >= 0 AND base_amount_vnd >= 0 AND addons_amount_vnd >= 0),
  CONSTRAINT ck_items_pricing CHECK (pricing_type IN ('PER_NIGHT','PER_PERSON','PER_GROUP','PER_TRIP','FIXED_PACKAGE','PER_HOUR','PER_UNIT')),
  CONSTRAINT ck_items_room_nights CHECK (kind <> 'ROOM' OR (check_out_date > check_in_date AND quantity = DATEDIFF(check_out_date,check_in_date))),
  CONSTRAINT ck_items_person_quantity CHECK (pricing_type <> 'PER_PERSON' OR quantity = participant_count),
  CONSTRAINT ck_items_fixed_quantity CHECK (pricing_type NOT IN ('PER_GROUP','PER_TRIP','FIXED_PACKAGE') OR quantity = 1),
  CONSTRAINT ck_items_units_integer CHECK (pricing_type <> 'PER_UNIT' OR quantity = FLOOR(quantity)),
  CONSTRAINT ck_items_hour_minutes CHECK (pricing_type <> 'PER_HOUR' OR (SECOND(starts_at) = 0 AND MICROSECOND(starts_at) = 0 AND SECOND(ends_at) = 0 AND MICROSECOND(ends_at) = 0)),
  CONSTRAINT ck_items_base_amount CHECK (
    (pricing_type = 'PER_HOUR' AND quantity = ROUND(TIMESTAMPDIFF(MINUTE,starts_at,ends_at) / 60.0,4)
      AND base_amount_vnd = ROUND(unit_price_vnd * TIMESTAMPDIFF(MINUTE,starts_at,ends_at) / 60.0,0))
    OR (pricing_type <> 'PER_HOUR' AND base_amount_vnd = ROUND(unit_price_vnd * quantity,0))),
  CONSTRAINT ck_items_snapshot CHECK (JSON_TYPE(snapshot) = 'OBJECT'),
  CONSTRAINT ck_items_occupancy CHECK (
    (occupied_starts_at IS NULL AND occupied_ends_at IS NULL)
    OR (occupied_starts_at IS NOT NULL AND occupied_ends_at IS NOT NULL AND occupied_ends_at > occupied_starts_at
      AND occupied_starts_at >= starts_at AND occupied_ends_at <= ends_at AND (kind = 'ROOM' OR slot_id IS NOT NULL))),
  CONSTRAINT ck_items_outcome CHECK (outcome IN ('UNRESOLVED','SERVED','PARTIALLY_SERVED','NOT_SERVED')),
  CONSTRAINT ck_items_outcome_actor CHECK (outcome = 'UNRESOLVED' OR (outcome_recorded_by IS NOT NULL AND outcome_recorded_at IS NOT NULL)),
  CONSTRAINT ck_items_unresolved CHECK (outcome <> 'UNRESOLVED' OR (reason_code IS NULL AND outcome_detail IS NULL AND actual_ended_at IS NULL AND outcome_recorded_by IS NULL AND outcome_recorded_at IS NULL)),
  CONSTRAINT ck_items_reason CHECK (reason_code IS NULL OR reason_code IN ('CUSTOMER_ABSENT','WEATHER','PROVIDER_FAILURE','CUSTOMER_LEFT','OTHER')),
  CONSTRAINT ck_items_absent CHECK (reason_code IS NULL OR reason_code <> 'CUSTOMER_ABSENT' OR outcome = 'NOT_SERVED'),
  CONSTRAINT ck_items_incomplete CHECK (outcome IN ('UNRESOLVED','SERVED') OR (reason_code IS NOT NULL AND outcome_detail IS NOT NULL)),
  CONSTRAINT ck_items_addons CHECK (JSON_SCHEMA_VALID('{"type":"array","maxItems":32,"items":{"type":"object","additionalProperties":false,"required":["key","name","quantity","unit_price_vnd","amount_vnd"],"properties":{"key":{"type":"string","pattern":"^[A-Za-z0-9_-]{1,64}$"},"name":{"type":"string","minLength":1,"maxLength":150},"quantity":{"type":"integer","minimum":1,"maximum":100000},"unit_price_vnd":{"type":"integer","minimum":0,"maximum":999999999999999},"amount_vnd":{"type":"integer","minimum":0,"maximum":999999999999999}}}}', addons_snapshot)),
  CONSTRAINT ck_items_room_addons CHECK (kind <> 'ROOM' OR (JSON_LENGTH(addons_snapshot) = 0 AND addons_amount_vnd = 0)),
  CONSTRAINT ck_items_detail CHECK (outcome_detail IS NULL OR JSON_SCHEMA_VALID('{"type":"object","additionalProperties":false,"required":["reason","served","unserved"],"properties":{"reason":{"type":"string","minLength":1,"maxLength":2000},"served":{"type":"string","maxLength":2000},"unserved":{"type":"string","minLength":1,"maxLength":2000}}}', outcome_detail)),
  CONSTRAINT ck_items_partial CHECK (outcome <> 'PARTIALLY_SERVED' OR COALESCE(CHAR_LENGTH(TRIM(JSON_UNQUOTE(JSON_EXTRACT(outcome_detail,'$.served')))),0) > 0),
  CONSTRAINT ck_items_reason_text CHECK (outcome IN ('UNRESOLVED','SERVED') OR (COALESCE(CHAR_LENGTH(TRIM(JSON_UNQUOTE(JSON_EXTRACT(outcome_detail,'$.reason')))),0) > 0 AND COALESCE(CHAR_LENGTH(TRIM(JSON_UNQUOTE(JSON_EXTRACT(outcome_detail,'$.unserved')))),0) > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE item_resource_usages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  slot_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  assignment_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  rule_snapshot JSON NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usages_item_assignment (item_id, assignment_id),
  KEY ix_usages_assignment_item (assignment_id, item_id),
  CONSTRAINT ck_usages_quantity CHECK (quantity > 0),
  CONSTRAINT ck_usages_rule CHECK (JSON_TYPE(rule_snapshot) = 'OBJECT')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE financial_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  entry_type VARCHAR(32) NOT NULL,
  receipt_purpose VARCHAR(16) NULL,
  amount_vnd DECIMAL(15,0) NOT NULL,
  payment_method VARCHAR(32) NULL,
  occurred_at DATETIME(6) NOT NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  agreement_id BIGINT UNSIGNED NULL,
  agreement_type VARCHAR(32) GENERATED ALWAYS AS (CASE WHEN agreement_id IS NOT NULL THEN 'REFUND_AGREEMENT' ELSE NULL END) STORED,
  reverses_entry_id BIGINT UNSIGNED NULL,
  note VARCHAR(2000) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_reversal (reverses_entry_id),
  UNIQUE KEY uq_finance_id_household (id, household_id),
  UNIQUE KEY uq_finance_reversal_kind (id, household_id, entry_type),
  UNIQUE KEY uq_finance_root (id, booking_id, household_id, entry_type),
  KEY ix_finance_household_time (household_id, occurred_at),
  KEY ix_finance_booking_time (booking_id, occurred_at),
  KEY ix_finance_agreement (agreement_id),
  CONSTRAINT ck_finance_type CHECK (entry_type IN ('RECEIPT','REFUND','OTHER_INCOME','EXPENSE','REFUND_AGREEMENT','REFUND_ADJUSTMENT')),
  CONSTRAINT ck_finance_amount CHECK ((entry_type = 'REFUND_ADJUSTMENT' AND amount_vnd <> 0) OR (entry_type <> 'REFUND_ADJUSTMENT' AND amount_vnd > 0)),
  CONSTRAINT ck_finance_booking CHECK ((entry_type IN ('OTHER_INCOME','EXPENSE') AND booking_id IS NULL) OR (entry_type NOT IN ('OTHER_INCOME','EXPENSE') AND booking_id IS NOT NULL)),
  CONSTRAINT ck_finance_agreement CHECK ((entry_type IN ('REFUND','REFUND_ADJUSTMENT') AND agreement_id IS NOT NULL) OR (entry_type NOT IN ('REFUND','REFUND_ADJUSTMENT') AND agreement_id IS NULL)),
  CONSTRAINT ck_finance_payment CHECK ((entry_type IN ('REFUND_AGREEMENT','REFUND_ADJUSTMENT') AND payment_method IS NULL AND reverses_entry_id IS NULL) OR (entry_type NOT IN ('REFUND_AGREEMENT','REFUND_ADJUSTMENT') AND payment_method IS NOT NULL AND payment_method IN ('CASH','BANK_TRANSFER','OTHER'))),
  CONSTRAINT ck_finance_receipt CHECK ((entry_type = 'RECEIPT' AND receipt_purpose IS NOT NULL AND receipt_purpose IN ('DEPOSIT','BALANCE')) OR (entry_type <> 'RECEIPT' AND receipt_purpose IS NULL)),
  CONSTRAINT ck_finance_note CHECK (CHAR_LENGTH(TRIM(note)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  customer_user_id BIGINT UNSIGNED NOT NULL,
  rating INT UNSIGNED NOT NULL,
  comment VARCHAR(4000) NOT NULL,
  hidden_by BIGINT UNSIGNED NULL,
  hidden_at DATETIME(6) NULL,
  hidden_reason VARCHAR(2000) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_reviews_booking_id (booking_id),
  CONSTRAINT ck_reviews_1 CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT ck_reviews_2 CHECK (hidden_at IS NULL OR (hidden_by IS NOT NULL AND hidden_reason IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE product_inquiries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  customer_user_id BIGINT UNSIGNED NOT NULL,
  message VARCHAR(2000) NOT NULL,
  contact_snapshot VARCHAR(500) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  reply VARCHAR(2000) NULL,
  replied_by BIGINT UNSIGNED NULL,
  replied_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_product_inquiries_household_id_status_created_at (household_id, status, created_at),
  CONSTRAINT ck_product_inquiries_1 CHECK (status IN ('OPEN', 'ANSWERED', 'CLOSED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE complaints (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NULL,
  booking_id BIGINT UNSIGNED NULL,
  reported_by BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(200) NOT NULL,
  description VARCHAR(4000) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  handled_by BIGINT UNSIGNED NULL,
  resolution_note VARCHAR(2000) NULL,
  resolved_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_complaints_status_created_at (status, created_at),
  CONSTRAINT ck_complaints_1 CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED')),
  CONSTRAINT ck_complaints_2 CHECK (booking_id IS NULL OR household_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE idempotency_keys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(80) NOT NULL,
  idempotency_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_hash BINARY(32) NOT NULL,
  response_status INT UNSIGNED NOT NULL,
  response_body JSON NOT NULL,
  completed_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_idempotency_keys_actor_user_id_action_idempotency_key (actor_user_id, action, idempotency_key),
  CONSTRAINT ck_idempotency_keys_1 CHECK (response_status BETWEEN 200 AND 599)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE activity_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NULL,
  booking_id BIGINT UNSIGNED NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_type VARCHAR(16) NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  reason VARCHAR(2000) NULL,
  caused_by_event_id BIGINT UNSIGNED NULL,
  correlation_id VARCHAR(100) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_events_id_household (id, household_id),
  KEY ix_events_household_time (household_id, created_at),
  KEY ix_events_booking_time (booking_id, created_at),
  KEY ix_events_entity (entity_type, entity_id),
  CONSTRAINT ck_events_actor CHECK (actor_type IN ('CUSTOMER','HOUSEHOLD','ADMIN','SYSTEM')),
  CONSTRAINT ck_events_user CHECK (actor_type = 'SYSTEM' OR actor_user_id IS NOT NULL),
  CONSTRAINT ck_events_type CHECK (event_type IN ('HOUSEHOLD_APPROVAL','BOOKING_STATUS','CONTENT_REVIEW','ITEM_OUTCOME','FINANCIAL_ENTRY','OTHER')),
  CONSTRAINT ck_events_booking CHECK (booking_id IS NULL OR household_id IS NOT NULL),
  CONSTRAINT ck_events_approval CHECK (event_type <> 'HOUSEHOLD_APPROVAL' OR (household_id IS NOT NULL AND booking_id IS NULL AND actor_type IN ('ADMIN','SYSTEM') AND to_status IS NOT NULL AND to_status IN ('DRAFT','PENDING','APPROVED','REJECTED','REVOKED') AND reason IS NOT NULL AND CHAR_LENGTH(TRIM(reason)) > 0)),
  CONSTRAINT ck_events_booking_status CHECK (event_type <> 'BOOKING_STATUS' OR (booking_id IS NOT NULL AND actor_type IN ('CUSTOMER','HOUSEHOLD','SYSTEM') AND to_status IS NOT NULL AND to_status IN ('PENDING','CONFIRMED','REJECTED','EXPIRED','CANCELLED','COMPLETED','NO_SHOW','INTERRUPTED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  event_key VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body VARCHAR(2000) NOT NULL,
  navigation JSON NOT NULL,
  read_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_notifications_event_key_user_id (event_key, user_id),
  KEY ix_notifications_user_id_read_at_created_at (user_id, read_at, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add explicit foreign keys after creating all tables. Default RESTRICT actions.

ALTER TABLE auth_sessions ADD CONSTRAINT fk_auth_sessions_user_id FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE households ADD CONSTRAINT fk_households_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users (id);
ALTER TABLE cultural_articles ADD CONSTRAINT fk_cultural_articles_author_user_id FOREIGN KEY (author_user_id) REFERENCES users (id);
ALTER TABLE rooms ADD CONSTRAINT fk_rooms_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE services ADD CONSTRAINT fk_services_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE local_products ADD CONSTRAINT fk_local_products_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE cultural_articles ADD CONSTRAINT fk_cultural_articles_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE service_offers ADD CONSTRAINT fk_service_offers_service_id_household_id FOREIGN KEY (service_id, household_id) REFERENCES services (id, household_id);
ALTER TABLE resources ADD CONSTRAINT fk_resources_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE service_slots ADD CONSTRAINT fk_service_slots_service_id_household_id FOREIGN KEY (service_id, household_id) REFERENCES services (id, household_id);
ALTER TABLE service_slots ADD CONSTRAINT fk_service_slots_created_by FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE slot_offers ADD CONSTRAINT fk_slot_offers_slot_id_service_id_household_id FOREIGN KEY (slot_id, service_id, household_id) REFERENCES service_slots (id, service_id, household_id);
ALTER TABLE slot_offers ADD CONSTRAINT fk_slot_offers_offer_id_service_id_household_id FOREIGN KEY (offer_id, service_id, household_id) REFERENCES service_offers (id, service_id, household_id);
ALTER TABLE slot_resource_assignments ADD CONSTRAINT fk_slot_resource_assignments_slot_id_household_id FOREIGN KEY (slot_id, household_id) REFERENCES service_slots (id, household_id);
ALTER TABLE slot_resource_assignments ADD CONSTRAINT fk_slot_resource_assignments_resource_id_household_id FOREIGN KEY (resource_id, household_id) REFERENCES resources (id, household_id);
ALTER TABLE slot_offer_resource_rules ADD CONSTRAINT fk_slot_offer_resource_rules_slot_offer_id_slot_i_e5885221e6 FOREIGN KEY (slot_offer_id, slot_id, household_id) REFERENCES slot_offers (id, slot_id, household_id);
ALTER TABLE slot_offer_resource_rules ADD CONSTRAINT fk_slot_offer_resource_rules_assignment_id_slot_i_e4ee4571d9 FOREIGN KEY (assignment_id, slot_id, household_id) REFERENCES slot_resource_assignments (id, slot_id, household_id);
ALTER TABLE schedule_requests ADD CONSTRAINT fk_schedule_requests_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE schedule_requests ADD CONSTRAINT fk_schedule_requests_customer_user_id FOREIGN KEY (customer_user_id) REFERENCES users (id);
ALTER TABLE booking_proposals ADD CONSTRAINT fk_booking_proposals_request_id_household_id FOREIGN KEY (request_id, household_id) REFERENCES schedule_requests (id, household_id);
ALTER TABLE booking_proposals ADD CONSTRAINT fk_booking_proposals_created_by FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_customer_user_id FOREIGN KEY (customer_user_id) REFERENCES users (id);
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_created_by FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_accepted_proposal_id_schedule_request_b9753cabaa FOREIGN KEY (accepted_proposal_id, schedule_request_id, household_id) REFERENCES booking_proposals (id, request_id, household_id);
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_schedule_request_id_customer_user_id__d88feff164 FOREIGN KEY (schedule_request_id, customer_user_id, household_id) REFERENCES schedule_requests (id, customer_user_id, household_id);
ALTER TABLE reservation_sets ADD CONSTRAINT fk_reservation_sets_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE reservation_sets ADD CONSTRAINT fk_reservation_sets_booking_id_household_id FOREIGN KEY (booking_id, household_id) REFERENCES bookings (id, household_id);
ALTER TABLE reservation_sets ADD CONSTRAINT fk_reservation_sets_proposal_id_household_id FOREIGN KEY (proposal_id, household_id) REFERENCES booking_proposals (id, household_id);
ALTER TABLE reservation_sets ADD CONSTRAINT fk_reservation_sets_booking_id_proposal_id_household_id FOREIGN KEY (booking_id, proposal_id, household_id) REFERENCES bookings (id, accepted_proposal_id, household_id);
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_booking_id_customer_user_id_household_id FOREIGN KEY (booking_id, customer_user_id, household_id) REFERENCES bookings (id, customer_user_id, household_id);
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_hidden_by FOREIGN KEY (hidden_by) REFERENCES users (id);
ALTER TABLE product_inquiries ADD CONSTRAINT fk_product_inquiries_product_id_household_id FOREIGN KEY (product_id, household_id) REFERENCES local_products (id, household_id);
ALTER TABLE product_inquiries ADD CONSTRAINT fk_product_inquiries_customer_user_id FOREIGN KEY (customer_user_id) REFERENCES users (id);
ALTER TABLE product_inquiries ADD CONSTRAINT fk_product_inquiries_replied_by FOREIGN KEY (replied_by) REFERENCES users (id);
ALTER TABLE complaints ADD CONSTRAINT fk_complaints_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE complaints ADD CONSTRAINT fk_complaints_booking_id_household_id FOREIGN KEY (booking_id, household_id) REFERENCES bookings (id, household_id);
ALTER TABLE complaints ADD CONSTRAINT fk_complaints_reported_by FOREIGN KEY (reported_by) REFERENCES users (id);
ALTER TABLE complaints ADD CONSTRAINT fk_complaints_handled_by FOREIGN KEY (handled_by) REFERENCES users (id);
ALTER TABLE idempotency_keys ADD CONSTRAINT fk_idempotency_keys_actor_user_id FOREIGN KEY (actor_user_id) REFERENCES users (id);
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE content_revisions ADD CONSTRAINT fk_content_revisions_household_profile_id FOREIGN KEY (household_profile_id) REFERENCES households (id);
ALTER TABLE households ADD CONSTRAINT fk_households_published_revision_id_id FOREIGN KEY (published_revision_id, id) REFERENCES content_revisions (id, household_profile_id);
ALTER TABLE content_revisions ADD CONSTRAINT fk_content_revisions_room_id FOREIGN KEY (room_id) REFERENCES rooms (id);
ALTER TABLE rooms ADD CONSTRAINT fk_rooms_published_revision_id_id FOREIGN KEY (published_revision_id, id) REFERENCES content_revisions (id, room_id);
ALTER TABLE content_revisions ADD CONSTRAINT fk_content_revisions_service_id FOREIGN KEY (service_id) REFERENCES services (id);
ALTER TABLE services ADD CONSTRAINT fk_services_published_revision_id_id FOREIGN KEY (published_revision_id, id) REFERENCES content_revisions (id, service_id);
ALTER TABLE content_revisions ADD CONSTRAINT fk_content_revisions_product_id FOREIGN KEY (product_id) REFERENCES local_products (id);
ALTER TABLE local_products ADD CONSTRAINT fk_local_products_published_revision_id_id FOREIGN KEY (published_revision_id, id) REFERENCES content_revisions (id, product_id);
ALTER TABLE content_revisions ADD CONSTRAINT fk_content_revisions_article_id FOREIGN KEY (article_id) REFERENCES cultural_articles (id);
ALTER TABLE cultural_articles ADD CONSTRAINT fk_cultural_articles_published_revision_id_id FOREIGN KEY (published_revision_id, id) REFERENCES content_revisions (id, article_id);
ALTER TABLE content_revisions ADD CONSTRAINT fk_content_revisions_submitted_by FOREIGN KEY (submitted_by) REFERENCES users (id);
ALTER TABLE content_revisions ADD CONSTRAINT fk_content_revisions_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id);
ALTER TABLE services ADD CONSTRAINT fk_v3_service_category FOREIGN KEY (category_id, category_kind) REFERENCES categories (id, kind);
ALTER TABLE local_products ADD CONSTRAINT fk_v3_product_category FOREIGN KEY (category_id, category_kind) REFERENCES categories (id, kind);
ALTER TABLE revision_media ADD CONSTRAINT fk_v3_media_revision FOREIGN KEY (revision_id) REFERENCES content_revisions (id);
ALTER TABLE revision_media ADD CONSTRAINT fk_v3_media_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id);
ALTER TABLE availability_blocks ADD CONSTRAINT fk_v3_block_room FOREIGN KEY (room_id, household_id) REFERENCES rooms (id, household_id);
ALTER TABLE availability_blocks ADD CONSTRAINT fk_v3_block_resource FOREIGN KEY (resource_id, household_id) REFERENCES resources (id, household_id);
ALTER TABLE availability_blocks ADD CONSTRAINT fk_v3_block_actor FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE booking_items ADD CONSTRAINT fk_v3_item_set FOREIGN KEY (reservation_set_id, household_id) REFERENCES reservation_sets (id, household_id);
ALTER TABLE booking_items ADD CONSTRAINT fk_v3_item_room FOREIGN KEY (room_id, household_id) REFERENCES rooms (id, household_id);
ALTER TABLE booking_items ADD CONSTRAINT fk_v3_item_offer FOREIGN KEY (offer_id, service_id, household_id) REFERENCES service_offers (id, service_id, household_id);
ALTER TABLE booking_items ADD CONSTRAINT fk_v3_item_slot_offer FOREIGN KEY (slot_id, offer_id, service_id, household_id) REFERENCES slot_offers (slot_id, offer_id, service_id, household_id);
ALTER TABLE booking_items ADD CONSTRAINT fk_v3_item_outcome_actor FOREIGN KEY (outcome_recorded_by) REFERENCES users (id);
ALTER TABLE item_resource_usages ADD CONSTRAINT fk_v3_usage_item FOREIGN KEY (item_id, slot_id, household_id) REFERENCES booking_items (id, slot_id, household_id);
ALTER TABLE item_resource_usages ADD CONSTRAINT fk_v3_usage_assignment FOREIGN KEY (assignment_id, slot_id, household_id) REFERENCES slot_resource_assignments (id, slot_id, household_id);
ALTER TABLE financial_entries ADD CONSTRAINT fk_v3_finance_household FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE financial_entries ADD CONSTRAINT fk_v3_finance_booking FOREIGN KEY (booking_id, household_id) REFERENCES bookings (id, household_id);
ALTER TABLE financial_entries ADD CONSTRAINT fk_v3_finance_actor FOREIGN KEY (recorded_by) REFERENCES users (id);
ALTER TABLE financial_entries ADD CONSTRAINT fk_v3_finance_agreement FOREIGN KEY (agreement_id, booking_id, household_id, agreement_type) REFERENCES financial_entries (id, booking_id, household_id, entry_type);
ALTER TABLE financial_entries ADD CONSTRAINT fk_v3_finance_reversal FOREIGN KEY (reverses_entry_id, household_id, entry_type) REFERENCES financial_entries (id, household_id, entry_type);
ALTER TABLE activity_events ADD CONSTRAINT fk_v3_event_household FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE activity_events ADD CONSTRAINT fk_v3_event_booking FOREIGN KEY (booking_id, household_id) REFERENCES bookings (id, household_id);
ALTER TABLE activity_events ADD CONSTRAINT fk_v3_event_actor FOREIGN KEY (actor_user_id) REFERENCES users (id);
ALTER TABLE activity_events ADD CONSTRAINT fk_v3_event_cause FOREIGN KEY (caused_by_event_id) REFERENCES activity_events (id);
