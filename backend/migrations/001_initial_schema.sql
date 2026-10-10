-- Compact database design v2 (41 tables) for Aiven MySQL 8.4.11, InnoDB.
-- Replaces the undeployed 55-table draft. This is still the INITIAL migration, not an upgrade script.
-- Run ONCE on a selected EMPTY development database. No DROP / CREATE DATABASE / USE.
-- DDL auto-commits. Do not treat this script as a rollback-able transaction.
-- Application transactions still enforce overlap, capacity, ownership and state transitions.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET SESSION time_zone = '+00:00';

-- Tài khoản dùng chung; HOUSEHOLD có quyền CUSTOMER theo policy
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

-- Phiên refresh token có thể thu hồi; chỉ lưu hash
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

-- Hộ và quyền nhận đặt độc lập trạng thái tài khoản
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

-- Quyết định duyệt hoặc thu hồi và căn cứ cho hành động hệ thống
CREATE TABLE household_approval_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NOT NULL,
  reason VARCHAR(2000) NOT NULL,
  actor_type VARCHAR(16) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_household_approval_history_id_household_id (id, household_id),
  KEY ix_household_approval_history_household_id_created_at (household_id, created_at),
  CONSTRAINT ck_household_approval_history_1 CHECK (actor_type IN ('ADMIN', 'SYSTEM'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Danh mục dịch vụ của nền tảng; không tách bảng từng trải nghiệm
CREATE TABLE service_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  is_active TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_categories_code (code),
  CONSTRAINT ck_service_categories_1 CHECK (is_active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Một dòng là một phòng thực tế, thông tin vận hành độc lập nội dung duyệt
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

-- Dịch vụ tổng quát: trải nghiệm, ẩm thực, hướng dẫn, thuê thiết bị
CREATE TABLE services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
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
  CONSTRAINT ck_services_3 CHECK (visibility IN ('VISIBLE', 'HIDDEN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Giới thiệu sản phẩm theo mùa; không phải hàng tồn kho hay đơn bán
CREATE TABLE local_products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
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
  CONSTRAINT ck_local_products_3 CHECK (visibility IN ('VISIBLE', 'HIDDEN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Bài hộ gửi hoặc bài chung của Admin
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

-- Phiên bản nội dung chung; đúng một trong năm FK chủ sở hữu, không dùng entity_id đa hình
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

-- Metadata tệp; lưu ảnh ngoài MySQL, không buộc Cloudinary
CREATE TABLE media_assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  storage_provider VARCHAR(32) NOT NULL,
  object_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  archived_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_media_assets_storage_provider_object_key (storage_provider, object_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Ảnh của revision bất kể loại nội dung; giữ nguyên ảnh bản công khai khi bản sửa chờ duyệt
CREATE TABLE content_revision_media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  revision_id BIGINT UNSIGNED NOT NULL,
  media_asset_id BIGINT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL,
  is_cover TINYINT UNSIGNED NOT NULL DEFAULT 0,
  caption VARCHAR(500) NULL,
  cover_revision_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN is_cover = 1 THEN revision_id ELSE NULL END) STORED,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_content_revision_media_revision_id_media_asset_id (revision_id, media_asset_id),
  UNIQUE KEY uq_content_revision_media_revision_id_sort_order (revision_id, sort_order),
  UNIQUE KEY uq_content_revision_media_cover_revision_id (cover_revision_id),
  CONSTRAINT ck_content_revision_media_1 CHECK (is_cover IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Cách bán/giá; SHARED và EXCLUSIVE độc lập cách tính tiền
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
  CONSTRAINT ck_service_offers_7 CHECK (is_active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Phụ phí của offer, không chiếm tài nguyên hữu hạn
CREATE TABLE service_addons (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  offer_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  unit_price_vnd DECIMAL(15,0) NOT NULL,
  max_quantity INT UNSIGNED NOT NULL,
  is_active TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_addons_id_offer_id_household_id (id, offer_id, household_id),
  CONSTRAINT ck_service_addons_1 CHECK (unit_price_vnd >= 0),
  CONSTRAINT ck_service_addons_2 CHECK (max_quantity > 0),
  CONSTRAINT ck_service_addons_3 CHECK (is_active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tài nguyên đơn chiếc hoặc pool đồng loại
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

-- Khoảng chặn thủ công [starts_at, ends_at); kiểm tra cùng cam kết hiện có
CREATE TABLE room_blocks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME(6) NOT NULL,
  ends_at DATETIME(6) NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  released_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_room_blocks_room_id_starts_at_ends_at (room_id, starts_at, ends_at),
  CONSTRAINT ck_room_blocks_1 CHECK (ends_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Khoảng chặn thủ công [starts_at, ends_at); kiểm tra cùng cam kết hiện có
CREATE TABLE resource_blocks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  resource_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME(6) NOT NULL,
  ends_at DATETIME(6) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  released_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_resource_blocks_resource_id_starts_at_ends_at (resource_id, starts_at, ends_at),
  CONSTRAINT ck_resource_blocks_1 CHECK (ends_at > starts_at),
  CONSTRAINT ck_resource_blocks_2 CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Lịch cụ thể; lịch PRIVATE vẫn chiếm tài nguyên khi có cam kết
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

-- Offer được phép bán tại slot; FK bảo đảm cùng service và hộ
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
  CONSTRAINT ck_slot_offers_2 CHECK (price_override_vnd IS NULL OR price_override_vnd >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Cấp hộ → lịch: lượng dành cho lịch, không cộng lại lượng booking
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

-- Quy tắc tường minh của từng offer tại slot; phải có assignment cùng slot
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

-- Mong muốn của khách; chưa tạo booking hay chiếm khả dụng
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

-- Phiên bản báo giá cụ thể, mỗi request tối đa một SENT và một ACCEPTED
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

-- Đơn của đúng một hộ, ba nguồn đặt, tách giá trị đơn khỏi tiền đã thu
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

-- Cam kết khả dụng; ProposalHold khi có proposal_id, giữ booking online khi có booking_id
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
  CONSTRAINT ck_reservation_sets_1 CHECK (status IN ('HELD', 'COMMITTED', 'RELEASED')),
  CONSTRAINT ck_reservation_sets_2 CHECK (booking_id IS NOT NULL OR proposal_id IS NOT NULL),
  CONSTRAINT ck_reservation_sets_3 CHECK (status <> 'HELD' OR (((booking_id IS NOT NULL) + (proposal_id IS NOT NULL)) = 1 AND hold_started_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at > hold_started_at)),
  CONSTRAINT ck_reservation_sets_4 CHECK (status <> 'COMMITTED' OR booking_id IS NOT NULL),
  CONSTRAINT ck_reservation_sets_5 CHECK (status <> 'RELEASED' OR released_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Khoảng phòng thực chiếm; dùng chung cho hold và booking, không chuyển bằng đặt lại
CREATE TABLE room_reservations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  reservation_set_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME(6) NOT NULL,
  ends_at DATETIME(6) NOT NULL,
  released_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_room_reservations_reservation_set_id_room_id (reservation_set_id, room_id),
  UNIQUE KEY uq_room_reservations_id_room_id_household_id (id, room_id, household_id),
  KEY ix_room_reservations_room_id_starts_at_ends_at (room_id, starts_at, ends_at),
  CONSTRAINT ck_room_reservations_1 CHECK (ends_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Cấp lịch → hạng mục: số người và độc quyền; một dòng cho một hạng mục
CREATE TABLE slot_reservations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  reservation_set_id BIGINT UNSIGNED NOT NULL,
  slot_id BIGINT UNSIGNED NOT NULL,
  slot_offer_id BIGINT UNSIGNED NOT NULL,
  offer_id BIGINT UNSIGNED NOT NULL,
  participant_count INT UNSIGNED NOT NULL,
  is_exclusive TINYINT UNSIGNED NOT NULL DEFAULT 0,
  released_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_slot_reservations_id_slot_id_household_id (id, slot_id, household_id),
  UNIQUE KEY uq_slot_reservations_id_slot_id_offer_id_household_id (id, slot_id, offer_id, household_id),
  KEY ix_slot_reservations_slot_id_reservation_set_id (slot_id, reservation_set_id),
  CONSTRAINT ck_slot_reservations_1 CHECK (participant_count > 0),
  CONSTRAINT ck_slot_reservations_2 CHECK (is_exclusive IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Quota tài nguyên đang chiếm bên trong lịch; không đưa vào tổng phân công cấp hộ
CREATE TABLE slot_resource_usages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  slot_id BIGINT UNSIGNED NOT NULL,
  slot_reservation_id BIGINT UNSIGNED NOT NULL,
  assignment_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  rule_snapshot JSON NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_slot_resource_usages_slot_reservation_id_assignment_id (slot_reservation_id, assignment_id),
  KEY ix_slot_resource_usages_assignment_id_slot_reservation_id (assignment_id, slot_reservation_id),
  CONSTRAINT ck_slot_resource_usages_1 CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Hạng mục phòng dùng chung cho phương án/booking; accept gắn booking_id, không tạo dòng snapshot thứ hai
CREATE TABLE room_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  proposal_id BIGINT UNSIGNED NULL,
  booking_id BIGINT UNSIGNED NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  reservation_id BIGINT UNSIGNED NULL,
  guest_count INT UNSIGNED NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  starts_at DATETIME(6) NOT NULL,
  ends_at DATETIME(6) NOT NULL,
  night_count INT UNSIGNED NOT NULL,
  room_name_snapshot VARCHAR(200) NOT NULL,
  unit_price_vnd DECIMAL(15,0) NOT NULL,
  line_total_vnd DECIMAL(15,0) NOT NULL,
  content_snapshot JSON NOT NULL,
  outcome VARCHAR(32) NOT NULL DEFAULT 'UNRESOLVED',
  reason_code VARCHAR(32) NULL,
  reason_detail VARCHAR(2000) NULL,
  served_detail VARCHAR(2000) NULL,
  unserved_detail VARCHAR(2000) NULL,
  actual_ended_at DATETIME(6) NULL,
  outcome_recorded_by BIGINT UNSIGNED NULL,
  outcome_recorded_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_room_items_booking_id_room_id (booking_id, room_id),
  UNIQUE KEY uq_room_items_proposal_id_room_id (proposal_id, room_id),
  UNIQUE KEY uq_room_items_reservation_id (reservation_id),
  CONSTRAINT ck_room_items_1 CHECK (guest_count > 0),
  CONSTRAINT ck_room_items_2 CHECK (check_out_date > check_in_date),
  CONSTRAINT ck_room_items_3 CHECK (ends_at > starts_at),
  CONSTRAINT ck_room_items_4 CHECK (night_count = DATEDIFF(check_out_date, check_in_date)),
  CONSTRAINT ck_room_items_5 CHECK (unit_price_vnd >= 0),
  CONSTRAINT ck_room_items_6 CHECK (line_total_vnd = unit_price_vnd * night_count),
  CONSTRAINT ck_room_items_7 CHECK (booking_id IS NOT NULL OR proposal_id IS NOT NULL),
  CONSTRAINT ck_room_items_8 CHECK (booking_id IS NULL OR reservation_id IS NOT NULL),
  CONSTRAINT ck_room_items_9 CHECK (outcome IN ('UNRESOLVED', 'SERVED', 'PARTIALLY_SERVED', 'NOT_SERVED')),
  CONSTRAINT ck_room_items_10 CHECK (outcome = 'UNRESOLVED' OR (booking_id IS NOT NULL AND outcome_recorded_by IS NOT NULL AND outcome_recorded_at IS NOT NULL)),
  CONSTRAINT ck_room_items_11 CHECK (outcome <> 'UNRESOLVED' OR (reason_code IS NULL AND reason_detail IS NULL AND served_detail IS NULL AND unserved_detail IS NULL AND actual_ended_at IS NULL AND outcome_recorded_by IS NULL AND outcome_recorded_at IS NULL)),
  CONSTRAINT ck_room_items_12 CHECK (outcome IN ('UNRESOLVED','SERVED') OR (reason_code IS NOT NULL AND reason_detail IS NOT NULL AND CHAR_LENGTH(TRIM(reason_detail)) > 0 AND served_detail IS NOT NULL AND unserved_detail IS NOT NULL)),
  CONSTRAINT ck_room_items_13 CHECK (outcome <> 'PARTIALLY_SERVED' OR (CHAR_LENGTH(TRIM(served_detail)) > 0 AND CHAR_LENGTH(TRIM(unserved_detail)) > 0)),
  CONSTRAINT ck_room_items_14 CHECK (reason_code IS NULL OR reason_code IN ('CUSTOMER_ABSENT', 'WEATHER', 'PROVIDER_FAILURE', 'CUSTOMER_LEFT', 'OTHER')),
  CONSTRAINT ck_room_items_15 CHECK (reason_code IS NULL OR reason_code <> 'CUSTOMER_ABSENT' OR outcome = 'NOT_SERVED')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Hạng mục dịch vụ dùng chung cho phương án/booking; accept gắn booking_id, không tạo dòng snapshot thứ hai
CREATE TABLE service_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  proposal_id BIGINT UNSIGNED NULL,
  booking_id BIGINT UNSIGNED NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  slot_id BIGINT UNSIGNED NULL,
  offer_id BIGINT UNSIGNED NOT NULL,
  reservation_id BIGINT UNSIGNED NULL,
  participant_count INT UNSIGNED NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  pricing_type_snapshot VARCHAR(32) NOT NULL,
  duration_minutes INT UNSIGNED NOT NULL,
  is_exclusive TINYINT UNSIGNED NOT NULL DEFAULT 0,
  starts_at DATETIME(6) NOT NULL,
  ends_at DATETIME(6) NOT NULL,
  service_name_snapshot VARCHAR(200) NOT NULL,
  unit_price_vnd DECIMAL(15,0) NOT NULL,
  line_total_vnd DECIMAL(15,0) NOT NULL,
  offer_snapshot JSON NOT NULL,
  resource_usage_snapshot JSON NOT NULL,
  outcome VARCHAR(32) NOT NULL DEFAULT 'UNRESOLVED',
  reason_code VARCHAR(32) NULL,
  reason_detail VARCHAR(2000) NULL,
  served_detail VARCHAR(2000) NULL,
  unserved_detail VARCHAR(2000) NULL,
  actual_ended_at DATETIME(6) NULL,
  outcome_recorded_by BIGINT UNSIGNED NULL,
  outcome_recorded_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_items_reservation_id (reservation_id),
  UNIQUE KEY uq_service_items_id_offer_id_household_id (id, offer_id, household_id),
  KEY ix_service_items_booking_id (booking_id),
  KEY ix_service_items_proposal_id (proposal_id),
  CONSTRAINT ck_service_items_1 CHECK (participant_count > 0),
  CONSTRAINT ck_service_items_2 CHECK (quantity > 0),
  CONSTRAINT ck_service_items_3 CHECK (duration_minutes > 0),
  CONSTRAINT ck_service_items_4 CHECK (ends_at > starts_at),
  CONSTRAINT ck_service_items_5 CHECK (unit_price_vnd >= 0),
  CONSTRAINT ck_service_items_6 CHECK (line_total_vnd >= 0),
  CONSTRAINT ck_service_items_7 CHECK (is_exclusive IN (0,1)),
  CONSTRAINT ck_service_items_8 CHECK (pricing_type_snapshot IN ('PER_PERSON', 'PER_GROUP', 'PER_TRIP', 'FIXED_PACKAGE', 'PER_HOUR', 'PER_UNIT')),
  CONSTRAINT ck_service_items_9 CHECK (pricing_type_snapshot <> 'PER_PERSON' OR quantity = participant_count),
  CONSTRAINT ck_service_items_10 CHECK (pricing_type_snapshot NOT IN ('PER_GROUP','PER_TRIP','FIXED_PACKAGE') OR quantity = 1),
  CONSTRAINT ck_service_items_11 CHECK (pricing_type_snapshot <> 'PER_UNIT' OR quantity = FLOOR(quantity)),
  CONSTRAINT ck_service_items_12 CHECK (duration_minutes = TIMESTAMPDIFF(MINUTE, starts_at, ends_at)),
  CONSTRAINT ck_service_items_13 CHECK ((pricing_type_snapshot = 'PER_HOUR' AND quantity = ROUND(duration_minutes / 60.0, 4) AND line_total_vnd = ROUND(unit_price_vnd * duration_minutes / 60.0, 0)) OR (pricing_type_snapshot <> 'PER_HOUR' AND line_total_vnd = ROUND(unit_price_vnd * quantity, 0))),
  CONSTRAINT ck_service_items_14 CHECK (booking_id IS NOT NULL OR proposal_id IS NOT NULL),
  CONSTRAINT ck_service_items_15 CHECK (booking_id IS NULL OR reservation_id IS NOT NULL),
  CONSTRAINT ck_service_items_16 CHECK (booking_id IS NULL OR slot_id IS NOT NULL),
  CONSTRAINT ck_service_items_17 CHECK (outcome IN ('UNRESOLVED', 'SERVED', 'PARTIALLY_SERVED', 'NOT_SERVED')),
  CONSTRAINT ck_service_items_18 CHECK (outcome = 'UNRESOLVED' OR (booking_id IS NOT NULL AND outcome_recorded_by IS NOT NULL AND outcome_recorded_at IS NOT NULL)),
  CONSTRAINT ck_service_items_19 CHECK (outcome <> 'UNRESOLVED' OR (reason_code IS NULL AND reason_detail IS NULL AND served_detail IS NULL AND unserved_detail IS NULL AND actual_ended_at IS NULL AND outcome_recorded_by IS NULL AND outcome_recorded_at IS NULL)),
  CONSTRAINT ck_service_items_20 CHECK (outcome IN ('UNRESOLVED','SERVED') OR (reason_code IS NOT NULL AND reason_detail IS NOT NULL AND CHAR_LENGTH(TRIM(reason_detail)) > 0 AND served_detail IS NOT NULL AND unserved_detail IS NOT NULL)),
  CONSTRAINT ck_service_items_21 CHECK (outcome <> 'PARTIALLY_SERVED' OR (CHAR_LENGTH(TRIM(served_detail)) > 0 AND CHAR_LENGTH(TRIM(unserved_detail)) > 0)),
  CONSTRAINT ck_service_items_22 CHECK (reason_code IS NULL OR reason_code IN ('CUSTOMER_ABSENT', 'WEATHER', 'PROVIDER_FAILURE', 'CUSTOMER_LEFT', 'OTHER')),
  CONSTRAINT ck_service_items_23 CHECK (reason_code IS NULL OR reason_code <> 'CUSTOMER_ABSENT' OR outcome = 'NOT_SERVED')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Phụ phí snapshot dùng chung, theo service_item; chỉ sửa trước khi phương án gửi/booking được tạo
CREATE TABLE service_item_addons (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  service_item_id BIGINT UNSIGNED NOT NULL,
  offer_id BIGINT UNSIGNED NOT NULL,
  addon_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  addon_name_snapshot VARCHAR(150) NOT NULL,
  unit_price_vnd DECIMAL(15,0) NOT NULL,
  line_total_vnd DECIMAL(15,0) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_item_addons_service_item_id_addon_id (service_item_id, addon_id),
  CONSTRAINT ck_service_item_addons_1 CHECK (quantity > 0),
  CONSTRAINT ck_service_item_addons_2 CHECK (unit_price_vnd >= 0),
  CONSTRAINT ck_service_item_addons_3 CHECK (line_total_vnd = quantity * unit_price_vnd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Lịch sử chuyển trạng thái, SYSTEM tham chiếu quyết định thu hồi
CREATE TABLE booking_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NOT NULL,
  actor_type VARCHAR(32) NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  approval_history_id BIGINT UNSIGNED NULL,
  reason VARCHAR(2000) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_booking_status_history_booking_id_created_at (booking_id, created_at),
  CONSTRAINT ck_booking_status_history_1 CHECK (actor_type IN ('CUSTOMER', 'HOUSEHOLD', 'SYSTEM')),
  CONSTRAINT ck_booking_status_history_2 CHECK (to_status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'INTERRUPTED')),
  CONSTRAINT ck_booking_status_history_3 CHECK (actor_type = 'SYSTEM' OR actor_user_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Khoản hoàn thống nhất, độc lập trạng thái booking và thực hoàn
CREATE TABLE refund_agreements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  amount_vnd DECIMAL(15,0) NOT NULL,
  reason VARCHAR(2000) NOT NULL,
  agreed_at DATETIME(6) NOT NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_refund_agreements_id_household_id (id, household_id),
  UNIQUE KEY uq_refund_agreements_id_booking_id_household_id (id, booking_id, household_id),
  KEY ix_refund_agreements_booking_id (booking_id),
  CONSTRAINT ck_refund_agreements_1 CHECK (amount_vnd > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Điều chỉnh nghĩa vụ hoàn bằng phần tăng/giảm; không ghi đè số cũ
CREATE TABLE refund_agreement_adjustments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  agreement_id BIGINT UNSIGNED NOT NULL,
  amount_delta_vnd DECIMAL(15,0) NOT NULL,
  reason VARCHAR(2000) NOT NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  CONSTRAINT ck_refund_agreement_adjustments_1 CHECK (amount_delta_vnd <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Sổ tiền bất biến; dòng đảo tham chiếu dòng gốc thay xóa/sửa
CREATE TABLE financial_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  refund_agreement_id BIGINT UNSIGNED NULL,
  entry_type VARCHAR(32) NOT NULL,
  receipt_purpose VARCHAR(16) NULL,
  amount_vnd DECIMAL(15,0) NOT NULL,
  payment_method VARCHAR(32) NOT NULL,
  occurred_at DATETIME(6) NOT NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  reverses_entry_id BIGINT UNSIGNED NULL,
  note VARCHAR(2000) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_financial_entries_reverses_entry_id (reverses_entry_id),
  UNIQUE KEY uq_financial_entries_id_household_id (id, household_id),
  KEY ix_financial_entries_household_id_occurred_at (household_id, occurred_at),
  KEY ix_financial_entries_booking_id_occurred_at (booking_id, occurred_at),
  KEY ix_financial_entries_refund_agreement_id (refund_agreement_id),
  CONSTRAINT ck_financial_entries_1 CHECK (entry_type IN ('RECEIPT', 'REFUND', 'OTHER_INCOME', 'EXPENSE')),
  CONSTRAINT ck_financial_entries_2 CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'OTHER')),
  CONSTRAINT ck_financial_entries_3 CHECK (amount_vnd > 0),
  CONSTRAINT ck_financial_entries_4 CHECK ((entry_type IN ('RECEIPT','REFUND') AND booking_id IS NOT NULL) OR (entry_type IN ('OTHER_INCOME','EXPENSE') AND booking_id IS NULL)),
  CONSTRAINT ck_financial_entries_5 CHECK ((entry_type = 'REFUND' AND refund_agreement_id IS NOT NULL) OR (entry_type <> 'REFUND' AND refund_agreement_id IS NULL)),
  CONSTRAINT ck_financial_entries_6 CHECK ((entry_type = 'RECEIPT' AND receipt_purpose IS NOT NULL AND receipt_purpose IN ('DEPOSIT','BALANCE')) OR (entry_type <> 'RECEIPT' AND receipt_purpose IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Một đánh giá tổng thể của khách booking hoàn thành; điều kiện trạng thái ở service
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

-- Phiếu hỏi một lần, hộ trả lời; không phải giỏ hàng, giữ tồn hay chat
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

-- Phản ánh tới Admin; không có quyền thay đổi booking/tiền
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

-- Chống gửi trùng theo actor/action/key; lưu kết quả trong cùng transaction
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

-- Lịch sử thao tác/correction; tham chiếu đa hình chỉ dùng cho audit
CREATE TABLE audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  household_id BIGINT UNSIGNED NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_type VARCHAR(16) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  reason VARCHAR(2000) NULL,
  correlation_id VARCHAR(100) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_audit_events_household_id_created_at (household_id, created_at),
  KEY ix_audit_events_entity_type_entity_id (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Thông báo trong app ghi cùng transaction nghiệp vụ; một event_key/user duy nhất
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

-- Add FKs after all tables exist, including published revision cycles. All use RESTRICT.

ALTER TABLE auth_sessions ADD CONSTRAINT fk_auth_sessions_user_id FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE households ADD CONSTRAINT fk_households_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users (id);
ALTER TABLE household_approval_history ADD CONSTRAINT fk_household_approval_history_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE household_approval_history ADD CONSTRAINT fk_household_approval_history_actor_user_id FOREIGN KEY (actor_user_id) REFERENCES users (id);
ALTER TABLE services ADD CONSTRAINT fk_services_category_id FOREIGN KEY (category_id) REFERENCES service_categories (id);
ALTER TABLE cultural_articles ADD CONSTRAINT fk_cultural_articles_author_user_id FOREIGN KEY (author_user_id) REFERENCES users (id);
ALTER TABLE rooms ADD CONSTRAINT fk_rooms_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE services ADD CONSTRAINT fk_services_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE local_products ADD CONSTRAINT fk_local_products_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE cultural_articles ADD CONSTRAINT fk_cultural_articles_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE media_assets ADD CONSTRAINT fk_media_assets_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE media_assets ADD CONSTRAINT fk_media_assets_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (id);
ALTER TABLE service_offers ADD CONSTRAINT fk_service_offers_service_id_household_id FOREIGN KEY (service_id, household_id) REFERENCES services (id, household_id);
ALTER TABLE service_addons ADD CONSTRAINT fk_service_addons_offer_id_household_id FOREIGN KEY (offer_id, household_id) REFERENCES service_offers (id, household_id);
ALTER TABLE resources ADD CONSTRAINT fk_resources_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE room_blocks ADD CONSTRAINT fk_room_blocks_room_id_household_id FOREIGN KEY (room_id, household_id) REFERENCES rooms (id, household_id);
ALTER TABLE room_blocks ADD CONSTRAINT fk_room_blocks_created_by FOREIGN KEY (created_by) REFERENCES users (id);
ALTER TABLE resource_blocks ADD CONSTRAINT fk_resource_blocks_resource_id_household_id FOREIGN KEY (resource_id, household_id) REFERENCES resources (id, household_id);
ALTER TABLE resource_blocks ADD CONSTRAINT fk_resource_blocks_created_by FOREIGN KEY (created_by) REFERENCES users (id);
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
ALTER TABLE room_reservations ADD CONSTRAINT fk_room_reservations_reservation_set_id_household_id FOREIGN KEY (reservation_set_id, household_id) REFERENCES reservation_sets (id, household_id);
ALTER TABLE room_reservations ADD CONSTRAINT fk_room_reservations_room_id_household_id FOREIGN KEY (room_id, household_id) REFERENCES rooms (id, household_id);
ALTER TABLE slot_reservations ADD CONSTRAINT fk_slot_reservations_reservation_set_id_household_id FOREIGN KEY (reservation_set_id, household_id) REFERENCES reservation_sets (id, household_id);
ALTER TABLE slot_reservations ADD CONSTRAINT fk_slot_reservations_slot_offer_id_slot_id_offer__70c9ebb5d7 FOREIGN KEY (slot_offer_id, slot_id, offer_id, household_id) REFERENCES slot_offers (id, slot_id, offer_id, household_id);
ALTER TABLE slot_resource_usages ADD CONSTRAINT fk_slot_resource_usages_slot_reservation_id_slot__4438121675 FOREIGN KEY (slot_reservation_id, slot_id, household_id) REFERENCES slot_reservations (id, slot_id, household_id);
ALTER TABLE slot_resource_usages ADD CONSTRAINT fk_slot_resource_usages_assignment_id_slot_id_household_id FOREIGN KEY (assignment_id, slot_id, household_id) REFERENCES slot_resource_assignments (id, slot_id, household_id);
ALTER TABLE booking_status_history ADD CONSTRAINT fk_booking_status_history_booking_id_household_id FOREIGN KEY (booking_id, household_id) REFERENCES bookings (id, household_id);
ALTER TABLE booking_status_history ADD CONSTRAINT fk_booking_status_history_actor_user_id FOREIGN KEY (actor_user_id) REFERENCES users (id);
ALTER TABLE booking_status_history ADD CONSTRAINT fk_booking_status_history_approval_history_id_household_id FOREIGN KEY (approval_history_id, household_id) REFERENCES household_approval_history (id, household_id);
ALTER TABLE refund_agreements ADD CONSTRAINT fk_refund_agreements_booking_id_household_id FOREIGN KEY (booking_id, household_id) REFERENCES bookings (id, household_id);
ALTER TABLE refund_agreements ADD CONSTRAINT fk_refund_agreements_recorded_by FOREIGN KEY (recorded_by) REFERENCES users (id);
ALTER TABLE refund_agreement_adjustments ADD CONSTRAINT fk_refund_agreement_adjustments_agreement_id_household_id FOREIGN KEY (agreement_id, household_id) REFERENCES refund_agreements (id, household_id);
ALTER TABLE refund_agreement_adjustments ADD CONSTRAINT fk_refund_agreement_adjustments_recorded_by FOREIGN KEY (recorded_by) REFERENCES users (id);
ALTER TABLE financial_entries ADD CONSTRAINT fk_financial_entries_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE financial_entries ADD CONSTRAINT fk_financial_entries_booking_id_household_id FOREIGN KEY (booking_id, household_id) REFERENCES bookings (id, household_id);
ALTER TABLE financial_entries ADD CONSTRAINT fk_financial_entries_refund_agreement_id_booking__309e14a3be FOREIGN KEY (refund_agreement_id, booking_id, household_id) REFERENCES refund_agreements (id, booking_id, household_id);
ALTER TABLE financial_entries ADD CONSTRAINT fk_financial_entries_recorded_by FOREIGN KEY (recorded_by) REFERENCES users (id);
ALTER TABLE financial_entries ADD CONSTRAINT fk_financial_entries_reverses_entry_id_household_id FOREIGN KEY (reverses_entry_id, household_id) REFERENCES financial_entries (id, household_id);
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
ALTER TABLE audit_events ADD CONSTRAINT fk_audit_events_household_id FOREIGN KEY (household_id) REFERENCES households (id);
ALTER TABLE audit_events ADD CONSTRAINT fk_audit_events_actor_user_id FOREIGN KEY (actor_user_id) REFERENCES users (id);
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
ALTER TABLE content_revision_media ADD CONSTRAINT fk_content_revision_media_revision_id FOREIGN KEY (revision_id) REFERENCES content_revisions (id);
ALTER TABLE content_revision_media ADD CONSTRAINT fk_content_revision_media_media_asset_id FOREIGN KEY (media_asset_id) REFERENCES media_assets (id);
ALTER TABLE room_items ADD CONSTRAINT fk_room_items_booking_id_household_id FOREIGN KEY (booking_id, household_id) REFERENCES bookings (id, household_id);
ALTER TABLE room_items ADD CONSTRAINT fk_room_items_proposal_id_household_id FOREIGN KEY (proposal_id, household_id) REFERENCES booking_proposals (id, household_id);
ALTER TABLE room_items ADD CONSTRAINT fk_room_items_booking_id_proposal_id_household_id FOREIGN KEY (booking_id, proposal_id, household_id) REFERENCES bookings (id, accepted_proposal_id, household_id);
ALTER TABLE room_items ADD CONSTRAINT fk_room_items_outcome_recorded_by FOREIGN KEY (outcome_recorded_by) REFERENCES users (id);
ALTER TABLE room_items ADD CONSTRAINT fk_room_items_room_id_household_id FOREIGN KEY (room_id, household_id) REFERENCES rooms (id, household_id);
ALTER TABLE room_items ADD CONSTRAINT fk_room_items_reservation_id_room_id_household_id FOREIGN KEY (reservation_id, room_id, household_id) REFERENCES room_reservations (id, room_id, household_id);
ALTER TABLE service_items ADD CONSTRAINT fk_service_items_booking_id_household_id FOREIGN KEY (booking_id, household_id) REFERENCES bookings (id, household_id);
ALTER TABLE service_items ADD CONSTRAINT fk_service_items_proposal_id_household_id FOREIGN KEY (proposal_id, household_id) REFERENCES booking_proposals (id, household_id);
ALTER TABLE service_items ADD CONSTRAINT fk_service_items_booking_id_proposal_id_household_id FOREIGN KEY (booking_id, proposal_id, household_id) REFERENCES bookings (id, accepted_proposal_id, household_id);
ALTER TABLE service_items ADD CONSTRAINT fk_service_items_outcome_recorded_by FOREIGN KEY (outcome_recorded_by) REFERENCES users (id);
ALTER TABLE service_items ADD CONSTRAINT fk_service_items_service_id_household_id FOREIGN KEY (service_id, household_id) REFERENCES services (id, household_id);
ALTER TABLE service_items ADD CONSTRAINT fk_service_items_slot_id_service_id_household_id FOREIGN KEY (slot_id, service_id, household_id) REFERENCES service_slots (id, service_id, household_id);
ALTER TABLE service_items ADD CONSTRAINT fk_service_items_offer_id_service_id_household_id FOREIGN KEY (offer_id, service_id, household_id) REFERENCES service_offers (id, service_id, household_id);
ALTER TABLE service_items ADD CONSTRAINT fk_service_items_reservation_id_slot_id_offer_id__468d5f8e49 FOREIGN KEY (reservation_id, slot_id, offer_id, household_id) REFERENCES slot_reservations (id, slot_id, offer_id, household_id);
ALTER TABLE service_item_addons ADD CONSTRAINT fk_service_item_addons_service_item_id_offer_id_household_id FOREIGN KEY (service_item_id, offer_id, household_id) REFERENCES service_items (id, offer_id, household_id);
ALTER TABLE service_item_addons ADD CONSTRAINT fk_service_item_addons_addon_id_offer_id_household_id FOREIGN KEY (addon_id, offer_id, household_id) REFERENCES service_addons (id, offer_id, household_id);
