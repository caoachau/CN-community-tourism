# Từ điển dữ liệu — thiết kế rút gọn v2

Gồm **41 bảng**, 101 khóa ngoại. Nguồn định nghĩa thực thi: [001_initial_schema.sql](../../backend/migrations/001_initial_schema.sql). Diễn giải nghiệp vụ và giới hạn ở [Thiết kế CSDL](README.md).

Mọi bảng có `id BIGINT UNSIGNED` làm PK và `created_at` UTC. PK không phải mã public hoặc quyền truy cập. Các FK đều RESTRICT; không xóa cứng lịch sử. `household_id` lặp ở một số bảng để tạo FK ghép ngăn tham chiếu chéo hộ.

Các mã trạng thái dùng VARCHAR + CHECK để thay đổi qua migration. JSON chỉ chứa nội dung có phiên bản hoặc snapshot; số người, quota, khoảng thời gian và tiền dùng để kiểm tra nằm ở cột quan hệ.

## users

Tài khoản dùng chung; HOUSEHOLD có quyền CUSTOMER theo policy.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `email` | `VARCHAR(254) NOT NULL` |  |
| `phone` | `VARCHAR(32) NULL` | Không tự liên kết khách ngoài ứng dụng bằng điện thoại |
| `display_name` | `VARCHAR(150) NOT NULL` |  |
| `password_hash` | `VARCHAR(255) NOT NULL` |  |
| `role` | `VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER'` | CUSTOMER / HOUSEHOLD / ADMIN |
| `status` | `VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'` | ACTIVE / BLOCKED |
| `disabled_at` | `DATETIME(6) NULL` | UTC |
| `updated_at` | `DATETIME(6) NOT NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `email`.


**CHECK:**
- `role IN ('CUSTOMER', 'HOUSEHOLD', 'ADMIN')`.
- `status IN ('ACTIVE', 'BLOCKED')`.

## auth_sessions

Phiên refresh token có thể thu hồi; chỉ lưu hash.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `user_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `token_hash` | `BINARY(32) NOT NULL` | SHA-256 token ngẫu nhiên |
| `expires_at` | `DATETIME(6) NOT NULL` | UTC |
| `revoked_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `token_hash`.

- FK `(user_id)` → `users(id)`.

## households

Hộ và quyền nhận đặt độc lập trạng thái tài khoản.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `owner_user_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `code` | `VARCHAR(40) NOT NULL` |  |
| `approval_status` | `VARCHAR(32) NOT NULL DEFAULT 'DRAFT'` | DRAFT / PENDING / APPROVED / REJECTED / REVOKED |
| `visibility` | `VARCHAR(32) NOT NULL DEFAULT 'VISIBLE'` | VISIBLE / HIDDEN |
| `published_revision_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `archived_at` | `DATETIME(6) NULL` | UTC |
| `updated_at` | `DATETIME(6) NOT NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `owner_user_id`; `code`.

- FK `(owner_user_id)` → `users(id)`.
- FK `(published_revision_id, id)` → `content_revisions(id, household_profile_id)`.

**CHECK:**
- `approval_status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED')`.
- `visibility IN ('VISIBLE', 'HIDDEN')`.

## household_approval_history

Quyết định duyệt hoặc thu hồi và căn cứ cho hành động hệ thống.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `actor_user_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `from_status` | `VARCHAR(32) NULL` |  |
| `to_status` | `VARCHAR(32) NOT NULL` |  |
| `reason` | `VARCHAR(2000) NOT NULL` |  |
| `actor_type` | `VARCHAR(16) NOT NULL` |  |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `id, household_id`.

- FK `(household_id)` → `households(id)`.
- FK `(actor_user_id)` → `users(id)`.

**CHECK:**
- `actor_type IN ('ADMIN', 'SYSTEM')`.

## service_categories

Danh mục dịch vụ của nền tảng; không tách bảng từng trải nghiệm.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `code` | `VARCHAR(50) NOT NULL` |  |
| `name` | `VARCHAR(150) NOT NULL` |  |
| `is_active` | `TINYINT UNSIGNED NOT NULL DEFAULT 1` | 0 hoặc 1 |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `code`.


**CHECK:**
- `is_active IN (0,1)`.

## rooms

Một dòng là một phòng thực tế, thông tin vận hành độc lập nội dung duyệt.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `code` | `VARCHAR(40) NOT NULL` |  |
| `max_guests` | `INT UNSIGNED NOT NULL` |  |
| `nightly_price_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `check_in_time` | `TIME NOT NULL DEFAULT '14:00:00'` | Giờ địa phương |
| `check_out_time` | `TIME NOT NULL DEFAULT '12:00:00'` | Giờ địa phương |
| `supply_status` | `VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE'` | AVAILABLE / PAUSED / RETIRED |
| `visibility` | `VARCHAR(32) NOT NULL DEFAULT 'VISIBLE'` | VISIBLE / HIDDEN |
| `published_revision_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `archived_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `household_id, code`; `id, household_id`.

- FK `(household_id)` → `households(id)`.
- FK `(published_revision_id, id)` → `content_revisions(id, room_id)`.

**CHECK:**
- `max_guests > 0`.
- `nightly_price_vnd >= 0`.
- `check_in_time >= '00:00:00' AND check_in_time < '24:00:00'`.
- `check_out_time >= '00:00:00' AND check_out_time < '24:00:00'`.
- `supply_status IN ('AVAILABLE', 'PAUSED', 'RETIRED')`.
- `visibility IN ('VISIBLE', 'HIDDEN')`.

## services

Dịch vụ tổng quát: trải nghiệm, ẩm thực, hướng dẫn, thuê thiết bị.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `code` | `VARCHAR(40) NOT NULL` |  |
| `category_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `default_duration_minutes` | `INT UNSIGNED NOT NULL` |  |
| `supply_status` | `VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE'` | AVAILABLE / PAUSED / RETIRED |
| `visibility` | `VARCHAR(32) NOT NULL DEFAULT 'VISIBLE'` | VISIBLE / HIDDEN |
| `published_revision_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `archived_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `household_id, code`; `id, household_id`.

- FK `(category_id)` → `service_categories(id)`.
- FK `(household_id)` → `households(id)`.
- FK `(published_revision_id, id)` → `content_revisions(id, service_id)`.

**CHECK:**
- `default_duration_minutes > 0`.
- `supply_status IN ('AVAILABLE', 'PAUSED', 'RETIRED')`.
- `visibility IN ('VISIBLE', 'HIDDEN')`.

## local_products

Giới thiệu sản phẩm theo mùa; không phải hàng tồn kho hay đơn bán.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `code` | `VARCHAR(40) NOT NULL` |  |
| `supply_status` | `VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE'` | AVAILABLE / COMING_SOON / OUT_OF_SEASON / DISCONTINUED |
| `reference_price_vnd` | `DECIMAL(15,0) NULL` | Số tiền VND nguyên |
| `price_unit` | `VARCHAR(60) NULL` |  |
| `visibility` | `VARCHAR(32) NOT NULL DEFAULT 'VISIBLE'` | VISIBLE / HIDDEN |
| `published_revision_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `archived_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `household_id, code`; `id, household_id`.

- FK `(household_id)` → `households(id)`.
- FK `(published_revision_id, id)` → `content_revisions(id, product_id)`.

**CHECK:**
- `reference_price_vnd IS NULL OR reference_price_vnd >= 0`.
- `supply_status IN ('AVAILABLE', 'COMING_SOON', 'OUT_OF_SEASON', 'DISCONTINUED')`.
- `visibility IN ('VISIBLE', 'HIDDEN')`.

## cultural_articles

Bài hộ gửi hoặc bài chung của Admin.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `author_user_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `slug` | `VARCHAR(180) NOT NULL` |  |
| `visibility` | `VARCHAR(32) NOT NULL DEFAULT 'VISIBLE'` | VISIBLE / HIDDEN |
| `published_revision_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `archived_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `slug`.

- FK `(author_user_id)` → `users(id)`.
- FK `(household_id)` → `households(id)`.
- FK `(published_revision_id, id)` → `content_revisions(id, article_id)`.

**CHECK:**
- `visibility IN ('VISIBLE', 'HIDDEN')`.

## content_revisions

Phiên bản nội dung chung; đúng một trong năm FK chủ sở hữu, không dùng entity_id đa hình.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `content_type` | `VARCHAR(32) NOT NULL` | HOUSEHOLD / ROOM / SERVICE / PRODUCT / ARTICLE |
| `household_profile_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `room_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `service_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `product_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `article_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `version` | `INT UNSIGNED NOT NULL` |  |
| `title` | `VARCHAR(200) NOT NULL` |  |
| `body` | `LONGTEXT NOT NULL` | Mô tả/bài viết; lọc nội dung ở API |
| `details` | `JSON NOT NULL` | Thuộc tính giới thiệu theo schema_version; không dùng chứa giá/khả dụng |
| `schema_version` | `INT UNSIGNED NOT NULL` |  |
| `status` | `VARCHAR(32) NOT NULL DEFAULT 'DRAFT'` | DRAFT / PENDING / APPROVED / REJECTED |
| `submitted_by` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `submitted_at` | `DATETIME(6) NULL` | UTC |
| `reviewed_by` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `reviewed_at` | `DATETIME(6) NULL` | UTC |
| `review_note` | `VARCHAR(2000) NULL` |  |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `household_profile_id, version`; `room_id, version`; `service_id, version`; `product_id, version`; `article_id, version`; `id, household_profile_id`; `id, room_id`; `id, service_id`; `id, product_id`; `id, article_id`.

- FK `(household_profile_id)` → `households(id)`.
- FK `(room_id)` → `rooms(id)`.
- FK `(service_id)` → `services(id)`.
- FK `(product_id)` → `local_products(id)`.
- FK `(article_id)` → `cultural_articles(id)`.
- FK `(submitted_by)` → `users(id)`.
- FK `(reviewed_by)` → `users(id)`.

**CHECK:**
- `version > 0`.
- `schema_version > 0`.
- `status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')`.
- `status NOT IN ('APPROVED','REJECTED') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)`.
- `status <> 'REJECTED' OR (review_note IS NOT NULL AND CHAR_LENGTH(TRIM(review_note)) > 0)`.
- `content_type IN ('HOUSEHOLD', 'ROOM', 'SERVICE', 'PRODUCT', 'ARTICLE')`.
- `((household_profile_id IS NOT NULL) + (room_id IS NOT NULL) + (service_id IS NOT NULL) + (product_id IS NOT NULL) + (article_id IS NOT NULL)) = 1`.
- `(content_type = 'HOUSEHOLD' AND household_profile_id IS NOT NULL) OR (content_type = 'ROOM' AND room_id IS NOT NULL) OR (content_type = 'SERVICE' AND service_id IS NOT NULL) OR (content_type = 'PRODUCT' AND product_id IS NOT NULL) OR (content_type = 'ARTICLE' AND article_id IS NOT NULL)`.

## media_assets

Metadata tệp; lưu ảnh ngoài MySQL, không buộc Cloudinary.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `uploaded_by` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `storage_provider` | `VARCHAR(32) NOT NULL` |  |
| `object_key` | `VARCHAR(500) NOT NULL` |  |
| `mime_type` | `VARCHAR(100) NOT NULL` |  |
| `size_bytes` | `BIGINT UNSIGNED NOT NULL` | Kích thước tệp |
| `archived_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `storage_provider, object_key`.

- FK `(household_id)` → `households(id)`.
- FK `(uploaded_by)` → `users(id)`.

## content_revision_media

Ảnh của revision bất kể loại nội dung; giữ nguyên ảnh bản công khai khi bản sửa chờ duyệt.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `revision_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `media_asset_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `sort_order` | `INT UNSIGNED NOT NULL` |  |
| `is_cover` | `TINYINT UNSIGNED NOT NULL DEFAULT 0` | 0 hoặc 1 |
| `caption` | `VARCHAR(500) NULL` |  |
| `cover_revision_id` | `BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN is_cover = 1 THEN revision_id ELSE NULL END) STORED` | Khóa duy nhất ảnh bìa mỗi revision |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `revision_id, media_asset_id`; `revision_id, sort_order`; `cover_revision_id`.

- FK `(revision_id)` → `content_revisions(id)`.
- FK `(media_asset_id)` → `media_assets(id)`.

**CHECK:**
- `is_cover IN (0,1)`.

## service_offers

Cách bán/giá; SHARED và EXCLUSIVE độc lập cách tính tiền.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `service_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `name` | `VARCHAR(150) NOT NULL` |  |
| `participation_mode` | `VARCHAR(32) NOT NULL` | SHARED / EXCLUSIVE |
| `pricing_type` | `VARCHAR(32) NOT NULL` | PER_PERSON / PER_GROUP / PER_TRIP / FIXED_PACKAGE / PER_HOUR / PER_UNIT |
| `unit_price_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `unit_label` | `VARCHAR(60) NOT NULL` |  |
| `min_participants` | `INT UNSIGNED NOT NULL` |  |
| `max_participants` | `INT UNSIGNED NOT NULL` |  |
| `max_units` | `INT UNSIGNED NULL` |  |
| `participants_per_unit` | `INT UNSIGNED NULL` | Giới hạn người trên một đơn vị tính tiền nếu có |
| `terms` | `JSON NOT NULL` | Điều kiện bán hiện hành; snapshot lúc giao dịch |
| `is_active` | `TINYINT UNSIGNED NOT NULL DEFAULT 1` | 0 hoặc 1 |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `id, household_id`; `id, service_id, household_id`.

- FK `(service_id, household_id)` → `services(id, household_id)`.

**CHECK:**
- `participation_mode IN ('SHARED', 'EXCLUSIVE')`.
- `pricing_type IN ('PER_PERSON', 'PER_GROUP', 'PER_TRIP', 'FIXED_PACKAGE', 'PER_HOUR', 'PER_UNIT')`.
- `unit_price_vnd >= 0`.
- `min_participants > 0 AND max_participants >= min_participants`.
- `max_units IS NULL OR max_units > 0`.
- `participants_per_unit IS NULL OR participants_per_unit > 0`.
- `is_active IN (0,1)`.

## service_addons

Phụ phí của offer, không chiếm tài nguyên hữu hạn.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `offer_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `name` | `VARCHAR(150) NOT NULL` |  |
| `unit_price_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `max_quantity` | `INT UNSIGNED NOT NULL` |  |
| `is_active` | `TINYINT UNSIGNED NOT NULL DEFAULT 1` | 0 hoặc 1 |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `id, offer_id, household_id`.

- FK `(offer_id, household_id)` → `service_offers(id, household_id)`.

**CHECK:**
- `unit_price_vnd >= 0`.
- `max_quantity > 0`.
- `is_active IN (0,1)`.

## resources

Tài nguyên đơn chiếc hoặc pool đồng loại.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `code` | `VARCHAR(40) NOT NULL` |  |
| `name` | `VARCHAR(150) NOT NULL` |  |
| `resource_type` | `VARCHAR(32) NOT NULL` | SINGLE / POOL |
| `total_quantity` | `INT UNSIGNED NOT NULL` |  |
| `max_people_per_unit` | `INT UNSIGNED NULL` |  |
| `archived_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `household_id, code`; `id, household_id`.

- FK `(household_id)` → `households(id)`.

**CHECK:**
- `resource_type IN ('SINGLE', 'POOL')`.
- `total_quantity > 0`.
- `resource_type <> 'SINGLE' OR total_quantity = 1`.
- `max_people_per_unit IS NULL OR max_people_per_unit > 0`.

## room_blocks

Khoảng chặn thủ công [starts_at, ends_at); kiểm tra cùng cam kết hiện có.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `room_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `starts_at` | `DATETIME(6) NOT NULL` | UTC |
| `ends_at` | `DATETIME(6) NOT NULL` | UTC |
| `reason` | `VARCHAR(1000) NOT NULL` |  |
| `created_by` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `released_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** Chỉ PK.

- FK `(room_id, household_id)` → `rooms(id, household_id)`.
- FK `(created_by)` → `users(id)`.

**CHECK:**
- `ends_at > starts_at`.

## resource_blocks

Khoảng chặn thủ công [starts_at, ends_at); kiểm tra cùng cam kết hiện có.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `resource_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `starts_at` | `DATETIME(6) NOT NULL` | UTC |
| `ends_at` | `DATETIME(6) NOT NULL` | UTC |
| `quantity` | `INT UNSIGNED NOT NULL` |  |
| `reason` | `VARCHAR(1000) NOT NULL` |  |
| `created_by` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `released_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** Chỉ PK.

- FK `(resource_id, household_id)` → `resources(id, household_id)`.
- FK `(created_by)` → `users(id)`.

**CHECK:**
- `ends_at > starts_at`.
- `quantity > 0`.

## service_slots

Lịch cụ thể; lịch PRIVATE vẫn chiếm tài nguyên khi có cam kết.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `service_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `starts_at` | `DATETIME(6) NOT NULL` | UTC |
| `ends_at` | `DATETIME(6) NOT NULL` | UTC |
| `person_capacity` | `INT UNSIGNED NOT NULL` |  |
| `visibility` | `VARCHAR(32) NOT NULL DEFAULT 'PUBLIC'` | PUBLIC / PRIVATE |
| `sales_status` | `VARCHAR(32) NOT NULL DEFAULT 'DRAFT'` | DRAFT / OPEN / CLOSED / CANCELLED |
| `created_by` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `archived_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `id, service_id, household_id`; `id, household_id`.

- FK `(service_id, household_id)` → `services(id, household_id)`.
- FK `(created_by)` → `users(id)`.

**CHECK:**
- `ends_at > starts_at`.
- `person_capacity > 0`.
- `visibility IN ('PUBLIC', 'PRIVATE')`.
- `sales_status IN ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED')`.
- `visibility <> 'PRIVATE' OR sales_status <> 'OPEN'`.

## slot_offers

Offer được phép bán tại slot; FK bảo đảm cùng service và hộ.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `service_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `slot_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `offer_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `is_enabled` | `TINYINT UNSIGNED NOT NULL DEFAULT 1` | 0 hoặc 1 |
| `price_override_vnd` | `DECIMAL(15,0) NULL` | Số tiền VND nguyên |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `slot_id, offer_id`; `id, slot_id, household_id`; `id, slot_id, offer_id, household_id`.

- FK `(slot_id, service_id, household_id)` → `service_slots(id, service_id, household_id)`.
- FK `(offer_id, service_id, household_id)` → `service_offers(id, service_id, household_id)`.

**CHECK:**
- `is_enabled IN (0,1)`.
- `price_override_vnd IS NULL OR price_override_vnd >= 0`.

## slot_resource_assignments

Cấp hộ → lịch: lượng dành cho lịch, không cộng lại lượng booking.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `slot_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `resource_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `quantity` | `INT UNSIGNED NOT NULL` |  |
| `allocation_mode` | `VARCHAR(32) NOT NULL` | SESSION_SHARED / PER_BOOKING_QUOTA |
| `note` | `VARCHAR(1000) NULL` |  |
| `released_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `slot_id, resource_id`; `id, slot_id, household_id`.

- FK `(slot_id, household_id)` → `service_slots(id, household_id)`.
- FK `(resource_id, household_id)` → `resources(id, household_id)`.

**CHECK:**
- `quantity > 0`.
- `allocation_mode IN ('SESSION_SHARED', 'PER_BOOKING_QUOTA')`.

## slot_offer_resource_rules

Quy tắc tường minh của từng offer tại slot; phải có assignment cùng slot.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `slot_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `slot_offer_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `assignment_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `usage_basis` | `VARCHAR(32) NOT NULL` | SHARED_ONCE / PER_PERSON / PER_GROUP / PER_UNIT / FIXED |
| `units_required` | `INT UNSIGNED NOT NULL` |  |
| `max_people_per_unit` | `INT UNSIGNED NULL` | Snapshot giới hạn phục vụ của tài nguyên tại cấu hình lịch |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `slot_offer_id, assignment_id`.

- FK `(slot_offer_id, slot_id, household_id)` → `slot_offers(id, slot_id, household_id)`.
- FK `(assignment_id, slot_id, household_id)` → `slot_resource_assignments(id, slot_id, household_id)`.

**CHECK:**
- `usage_basis IN ('SHARED_ONCE', 'PER_PERSON', 'PER_GROUP', 'PER_UNIT', 'FIXED')`.
- `units_required > 0`.
- `max_people_per_unit IS NULL OR max_people_per_unit > 0`.

## schedule_requests

Mong muốn của khách; chưa tạo booking hay chiếm khả dụng.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `customer_user_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `request_code` | `VARCHAR(40) NOT NULL` |  |
| `message` | `VARCHAR(4000) NOT NULL` |  |
| `preferences` | `JSON NOT NULL` | Khoảng thời gian/nhu cầu mong muốn, không phải phân công tài nguyên |
| `status` | `VARCHAR(32) NOT NULL DEFAULT 'OPEN'` | OPEN / PROPOSED / ACCEPTED / DECLINED / WITHDRAWN / EXPIRED / CLOSED |
| `first_hold_started_at` | `DATETIME(6) NULL` | UTC |
| `initial_hold_deadline` | `DATETIME(6) NULL` | UTC |
| `closed_reason` | `VARCHAR(2000) NULL` |  |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `request_code`; `id, household_id`; `id, customer_user_id, household_id`.

- FK `(household_id)` → `households(id)`.
- FK `(customer_user_id)` → `users(id)`.

**CHECK:**
- `status IN ('OPEN', 'PROPOSED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED', 'CLOSED')`.
- `(first_hold_started_at IS NULL AND initial_hold_deadline IS NULL) OR (first_hold_started_at IS NOT NULL AND initial_hold_deadline IS NOT NULL AND initial_hold_deadline > first_hold_started_at)`.

## booking_proposals

Phiên bản báo giá cụ thể, mỗi request tối đa một SENT và một ACCEPTED.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `request_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `version` | `INT UNSIGNED NOT NULL` |  |
| `created_by` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `status` | `VARCHAR(32) NOT NULL DEFAULT 'DRAFT'` | DRAFT / SENT / ACCEPTED / SUPERSEDED / REJECTED / WITHDRAWN / EXPIRED / INVALIDATED |
| `sent_at` | `DATETIME(6) NULL` | UTC |
| `expires_at` | `DATETIME(6) NULL` | UTC |
| `accepted_at` | `DATETIME(6) NULL` | UTC |
| `total_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `terms_snapshot` | `JSON NOT NULL` |  |
| `active_request_id` | `BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'SENT' THEN request_id ELSE NULL END) STORED` | Chỉ một phiên bản đang gửi; dọn trạng thái hết hạn trong transaction trước gửi |
| `accepted_request_id` | `BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'ACCEPTED' THEN request_id ELSE NULL END) STORED` | Chỉ một phiên bản được chấp nhận |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `request_id, version`; `active_request_id`; `accepted_request_id`; `id, request_id, household_id`; `id, household_id`.

- FK `(request_id, household_id)` → `schedule_requests(id, household_id)`.
- FK `(created_by)` → `users(id)`.

**CHECK:**
- `version > 0`.
- `total_vnd >= 0`.
- `status IN ('DRAFT', 'SENT', 'ACCEPTED', 'SUPERSEDED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'INVALIDATED')`.
- `status <> 'SENT' OR (sent_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at > sent_at)`.
- `status <> 'ACCEPTED' OR accepted_at IS NOT NULL`.

## bookings

Đơn của đúng một hộ, ba nguồn đặt, tách giá trị đơn khỏi tiền đã thu.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `booking_code` | `VARCHAR(40) NOT NULL` |  |
| `customer_user_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `created_by` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `source` | `VARCHAR(32) NOT NULL` | ONLINE / CUSTOM_PROPOSAL / OFFLINE |
| `offline_channel` | `VARCHAR(40) NULL` |  |
| `accepted_proposal_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `schedule_request_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `status` | `VARCHAR(32) NOT NULL` | PENDING / CONFIRMED / REJECTED / EXPIRED / CANCELLED / COMPLETED / NO_SHOW / INTERRUPTED |
| `contact_name` | `VARCHAR(150) NOT NULL` |  |
| `contact_phone` | `VARCHAR(32) NOT NULL` |  |
| `contact_email` | `VARCHAR(254) NULL` |  |
| `check_in_date` | `DATE NULL` | Ngày địa phương chung cho các phòng |
| `check_out_date` | `DATE NULL` | Ngày địa phương chung cho các phòng |
| `first_starts_at` | `DATETIME(6) NOT NULL` | UTC |
| `last_ends_at` | `DATETIME(6) NOT NULL` | UTC |
| `total_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `terms_snapshot` | `JSON NOT NULL` |  |
| `hold_expires_at` | `DATETIME(6) NULL` | UTC |
| `confirmed_at` | `DATETIME(6) NULL` | UTC |
| `closed_at` | `DATETIME(6) NULL` | UTC |
| `closed_reason` | `VARCHAR(2000) NULL` |  |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `booking_code`; `accepted_proposal_id`; `schedule_request_id`; `id, household_id`; `id, accepted_proposal_id, household_id`; `id, customer_user_id, household_id`.

- FK `(household_id)` → `households(id)`.
- FK `(customer_user_id)` → `users(id)`.
- FK `(created_by)` → `users(id)`.
- FK `(accepted_proposal_id, schedule_request_id, household_id)` → `booking_proposals(id, request_id, household_id)`.
- FK `(schedule_request_id, customer_user_id, household_id)` → `schedule_requests(id, customer_user_id, household_id)`.

**CHECK:**
- `source IN ('ONLINE', 'CUSTOM_PROPOSAL', 'OFFLINE')`.
- `status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'INTERRUPTED')`.
- `last_ends_at > first_starts_at`.
- `total_vnd >= 0`.
- `(source = 'OFFLINE' AND customer_user_id IS NULL AND offline_channel IS NOT NULL) OR (source <> 'OFFLINE' AND customer_user_id IS NOT NULL AND offline_channel IS NULL)`.
- `(source = 'CUSTOM_PROPOSAL' AND accepted_proposal_id IS NOT NULL AND schedule_request_id IS NOT NULL) OR (source <> 'CUSTOM_PROPOSAL' AND accepted_proposal_id IS NULL AND schedule_request_id IS NULL)`.
- `(check_in_date IS NULL AND check_out_date IS NULL) OR (check_in_date IS NOT NULL AND check_out_date IS NOT NULL AND check_out_date > check_in_date)`.
- `status <> 'PENDING' OR (source = 'ONLINE' AND hold_expires_at IS NOT NULL)`.
- `status NOT IN ('CONFIRMED','COMPLETED','NO_SHOW','INTERRUPTED') OR confirmed_at IS NOT NULL`.

## reservation_sets

Cam kết khả dụng; ProposalHold khi có proposal_id, giữ booking online khi có booking_id.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `booking_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `proposal_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `status` | `VARCHAR(32) NOT NULL` | HELD / COMMITTED / RELEASED |
| `hold_started_at` | `DATETIME(6) NULL` | UTC |
| `expires_at` | `DATETIME(6) NULL` | UTC |
| `released_at` | `DATETIME(6) NULL` | UTC |
| `release_reason` | `VARCHAR(1000) NULL` |  |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `booking_id`; `proposal_id`; `id, household_id`.

- FK `(household_id)` → `households(id)`.
- FK `(booking_id, household_id)` → `bookings(id, household_id)`.
- FK `(proposal_id, household_id)` → `booking_proposals(id, household_id)`.
- FK `(booking_id, proposal_id, household_id)` → `bookings(id, accepted_proposal_id, household_id)`.

**CHECK:**
- `status IN ('HELD', 'COMMITTED', 'RELEASED')`.
- `booking_id IS NOT NULL OR proposal_id IS NOT NULL`.
- `status <> 'HELD' OR (((booking_id IS NOT NULL) + (proposal_id IS NOT NULL)) = 1 AND hold_started_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at > hold_started_at)`.
- `status <> 'COMMITTED' OR booking_id IS NOT NULL`.
- `status <> 'RELEASED' OR released_at IS NOT NULL`.

## room_reservations

Khoảng phòng thực chiếm; dùng chung cho hold và booking, không chuyển bằng đặt lại.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `reservation_set_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `room_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `starts_at` | `DATETIME(6) NOT NULL` | UTC |
| `ends_at` | `DATETIME(6) NOT NULL` | UTC |
| `released_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `reservation_set_id, room_id`; `id, room_id, household_id`.

- FK `(reservation_set_id, household_id)` → `reservation_sets(id, household_id)`.
- FK `(room_id, household_id)` → `rooms(id, household_id)`.

**CHECK:**
- `ends_at > starts_at`.

## slot_reservations

Cấp lịch → hạng mục: số người và độc quyền; một dòng cho một hạng mục.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `reservation_set_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `slot_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `slot_offer_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `offer_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `participant_count` | `INT UNSIGNED NOT NULL` |  |
| `is_exclusive` | `TINYINT UNSIGNED NOT NULL DEFAULT 0` | 0 hoặc 1 |
| `released_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `id, slot_id, household_id`; `id, slot_id, offer_id, household_id`.

- FK `(reservation_set_id, household_id)` → `reservation_sets(id, household_id)`.
- FK `(slot_offer_id, slot_id, offer_id, household_id)` → `slot_offers(id, slot_id, offer_id, household_id)`.

**CHECK:**
- `participant_count > 0`.
- `is_exclusive IN (0,1)`.

## slot_resource_usages

Quota tài nguyên đang chiếm bên trong lịch; không đưa vào tổng phân công cấp hộ.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `slot_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `slot_reservation_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `assignment_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `quantity` | `INT UNSIGNED NOT NULL` |  |
| `rule_snapshot` | `JSON NOT NULL` | Cách suy ra lượng dùng; chỉ PER_BOOKING_QUOTA |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `slot_reservation_id, assignment_id`.

- FK `(slot_reservation_id, slot_id, household_id)` → `slot_reservations(id, slot_id, household_id)`.
- FK `(assignment_id, slot_id, household_id)` → `slot_resource_assignments(id, slot_id, household_id)`.

**CHECK:**
- `quantity > 0`.

## room_items

Hạng mục phòng dùng chung cho phương án/booking; accept gắn booking_id, không tạo dòng snapshot thứ hai.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `proposal_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `booking_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `room_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `reservation_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `guest_count` | `INT UNSIGNED NOT NULL` |  |
| `check_in_date` | `DATE NOT NULL` | Ngày VN |
| `check_out_date` | `DATE NOT NULL` | Ngày VN |
| `starts_at` | `DATETIME(6) NOT NULL` | UTC |
| `ends_at` | `DATETIME(6) NOT NULL` | UTC |
| `night_count` | `INT UNSIGNED NOT NULL` |  |
| `room_name_snapshot` | `VARCHAR(200) NOT NULL` |  |
| `unit_price_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `line_total_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `content_snapshot` | `JSON NOT NULL` | Tên, địa điểm, revision, điều kiện tại giao dịch |
| `outcome` | `VARCHAR(32) NOT NULL DEFAULT 'UNRESOLVED'` | UNRESOLVED / SERVED / PARTIALLY_SERVED / NOT_SERVED |
| `reason_code` | `VARCHAR(32) NULL` | Mã lý do; NULL khi SERVED |
| `reason_detail` | `VARCHAR(2000) NULL` |  |
| `served_detail` | `VARCHAR(2000) NULL` |  |
| `unserved_detail` | `VARCHAR(2000) NULL` |  |
| `actual_ended_at` | `DATETIME(6) NULL` | UTC |
| `outcome_recorded_by` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `outcome_recorded_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `booking_id, room_id`; `proposal_id, room_id`; `reservation_id`.

- FK `(booking_id, household_id)` → `bookings(id, household_id)`.
- FK `(proposal_id, household_id)` → `booking_proposals(id, household_id)`.
- FK `(booking_id, proposal_id, household_id)` → `bookings(id, accepted_proposal_id, household_id)`.
- FK `(outcome_recorded_by)` → `users(id)`.
- FK `(room_id, household_id)` → `rooms(id, household_id)`.
- FK `(reservation_id, room_id, household_id)` → `room_reservations(id, room_id, household_id)`.

**CHECK:**
- `guest_count > 0`.
- `check_out_date > check_in_date`.
- `ends_at > starts_at`.
- `night_count = DATEDIFF(check_out_date, check_in_date)`.
- `unit_price_vnd >= 0`.
- `line_total_vnd = unit_price_vnd * night_count`.
- `booking_id IS NOT NULL OR proposal_id IS NOT NULL`.
- `booking_id IS NULL OR reservation_id IS NOT NULL`.
- `outcome IN ('UNRESOLVED', 'SERVED', 'PARTIALLY_SERVED', 'NOT_SERVED')`.
- `outcome = 'UNRESOLVED' OR (booking_id IS NOT NULL AND outcome_recorded_by IS NOT NULL AND outcome_recorded_at IS NOT NULL)`.
- `outcome <> 'UNRESOLVED' OR (reason_code IS NULL AND reason_detail IS NULL AND served_detail IS NULL AND unserved_detail IS NULL AND actual_ended_at IS NULL AND outcome_recorded_by IS NULL AND outcome_recorded_at IS NULL)`.
- `outcome IN ('UNRESOLVED','SERVED') OR (reason_code IS NOT NULL AND reason_detail IS NOT NULL AND CHAR_LENGTH(TRIM(reason_detail)) > 0 AND served_detail IS NOT NULL AND unserved_detail IS NOT NULL)`.
- `outcome <> 'PARTIALLY_SERVED' OR (CHAR_LENGTH(TRIM(served_detail)) > 0 AND CHAR_LENGTH(TRIM(unserved_detail)) > 0)`.
- `reason_code IS NULL OR reason_code IN ('CUSTOMER_ABSENT', 'WEATHER', 'PROVIDER_FAILURE', 'CUSTOMER_LEFT', 'OTHER')`.
- `reason_code IS NULL OR reason_code <> 'CUSTOMER_ABSENT' OR outcome = 'NOT_SERVED'`.

## service_items

Hạng mục dịch vụ dùng chung cho phương án/booking; accept gắn booking_id, không tạo dòng snapshot thứ hai.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `proposal_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `booking_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `service_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `slot_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `offer_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `reservation_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `participant_count` | `INT UNSIGNED NOT NULL` |  |
| `quantity` | `DECIMAL(12,4) NOT NULL` | Đơn vị tính tiền; giờ có thể lẻ |
| `pricing_type_snapshot` | `VARCHAR(32) NOT NULL` | PER_PERSON / PER_GROUP / PER_TRIP / FIXED_PACKAGE / PER_HOUR / PER_UNIT |
| `duration_minutes` | `INT UNSIGNED NOT NULL` |  |
| `is_exclusive` | `TINYINT UNSIGNED NOT NULL DEFAULT 0` | 0 hoặc 1 |
| `starts_at` | `DATETIME(6) NOT NULL` | UTC |
| `ends_at` | `DATETIME(6) NOT NULL` | UTC |
| `service_name_snapshot` | `VARCHAR(200) NOT NULL` |  |
| `unit_price_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `line_total_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `offer_snapshot` | `JSON NOT NULL` | Giới hạn, đơn vị, gói, điều kiện, revision |
| `resource_usage_snapshot` | `JSON NOT NULL` | Cả tài nguyên chung và quota; giữ lịch sử sau giải phóng |
| `outcome` | `VARCHAR(32) NOT NULL DEFAULT 'UNRESOLVED'` | UNRESOLVED / SERVED / PARTIALLY_SERVED / NOT_SERVED |
| `reason_code` | `VARCHAR(32) NULL` | Mã lý do; NULL khi SERVED |
| `reason_detail` | `VARCHAR(2000) NULL` |  |
| `served_detail` | `VARCHAR(2000) NULL` |  |
| `unserved_detail` | `VARCHAR(2000) NULL` |  |
| `actual_ended_at` | `DATETIME(6) NULL` | UTC |
| `outcome_recorded_by` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `outcome_recorded_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `reservation_id`; `id, offer_id, household_id`.

- FK `(booking_id, household_id)` → `bookings(id, household_id)`.
- FK `(proposal_id, household_id)` → `booking_proposals(id, household_id)`.
- FK `(booking_id, proposal_id, household_id)` → `bookings(id, accepted_proposal_id, household_id)`.
- FK `(outcome_recorded_by)` → `users(id)`.
- FK `(service_id, household_id)` → `services(id, household_id)`.
- FK `(slot_id, service_id, household_id)` → `service_slots(id, service_id, household_id)`.
- FK `(offer_id, service_id, household_id)` → `service_offers(id, service_id, household_id)`.
- FK `(reservation_id, slot_id, offer_id, household_id)` → `slot_reservations(id, slot_id, offer_id, household_id)`.

**CHECK:**
- `participant_count > 0`.
- `quantity > 0`.
- `duration_minutes > 0`.
- `ends_at > starts_at`.
- `unit_price_vnd >= 0`.
- `line_total_vnd >= 0`.
- `is_exclusive IN (0,1)`.
- `pricing_type_snapshot IN ('PER_PERSON', 'PER_GROUP', 'PER_TRIP', 'FIXED_PACKAGE', 'PER_HOUR', 'PER_UNIT')`.
- `pricing_type_snapshot <> 'PER_PERSON' OR quantity = participant_count`.
- `pricing_type_snapshot NOT IN ('PER_GROUP','PER_TRIP','FIXED_PACKAGE') OR quantity = 1`.
- `pricing_type_snapshot <> 'PER_UNIT' OR quantity = FLOOR(quantity)`.
- `duration_minutes = TIMESTAMPDIFF(MINUTE, starts_at, ends_at)`.
- `(pricing_type_snapshot = 'PER_HOUR' AND quantity = ROUND(duration_minutes / 60.0, 4) AND line_total_vnd = ROUND(unit_price_vnd * duration_minutes / 60.0, 0)) OR (pricing_type_snapshot <> 'PER_HOUR' AND line_total_vnd = ROUND(unit_price_vnd * quantity, 0))`.
- `booking_id IS NOT NULL OR proposal_id IS NOT NULL`.
- `booking_id IS NULL OR reservation_id IS NOT NULL`.
- `booking_id IS NULL OR slot_id IS NOT NULL`.
- `outcome IN ('UNRESOLVED', 'SERVED', 'PARTIALLY_SERVED', 'NOT_SERVED')`.
- `outcome = 'UNRESOLVED' OR (booking_id IS NOT NULL AND outcome_recorded_by IS NOT NULL AND outcome_recorded_at IS NOT NULL)`.
- `outcome <> 'UNRESOLVED' OR (reason_code IS NULL AND reason_detail IS NULL AND served_detail IS NULL AND unserved_detail IS NULL AND actual_ended_at IS NULL AND outcome_recorded_by IS NULL AND outcome_recorded_at IS NULL)`.
- `outcome IN ('UNRESOLVED','SERVED') OR (reason_code IS NOT NULL AND reason_detail IS NOT NULL AND CHAR_LENGTH(TRIM(reason_detail)) > 0 AND served_detail IS NOT NULL AND unserved_detail IS NOT NULL)`.
- `outcome <> 'PARTIALLY_SERVED' OR (CHAR_LENGTH(TRIM(served_detail)) > 0 AND CHAR_LENGTH(TRIM(unserved_detail)) > 0)`.
- `reason_code IS NULL OR reason_code IN ('CUSTOMER_ABSENT', 'WEATHER', 'PROVIDER_FAILURE', 'CUSTOMER_LEFT', 'OTHER')`.
- `reason_code IS NULL OR reason_code <> 'CUSTOMER_ABSENT' OR outcome = 'NOT_SERVED'`.

## service_item_addons

Phụ phí snapshot dùng chung, theo service_item; chỉ sửa trước khi phương án gửi/booking được tạo.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `service_item_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `offer_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `addon_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `quantity` | `INT UNSIGNED NOT NULL` |  |
| `addon_name_snapshot` | `VARCHAR(150) NOT NULL` |  |
| `unit_price_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `line_total_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `service_item_id, addon_id`.

- FK `(service_item_id, offer_id, household_id)` → `service_items(id, offer_id, household_id)`.
- FK `(addon_id, offer_id, household_id)` → `service_addons(id, offer_id, household_id)`.

**CHECK:**
- `quantity > 0`.
- `unit_price_vnd >= 0`.
- `line_total_vnd = quantity * unit_price_vnd`.

## booking_status_history

Lịch sử chuyển trạng thái, SYSTEM tham chiếu quyết định thu hồi.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `booking_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `from_status` | `VARCHAR(32) NULL` |  |
| `to_status` | `VARCHAR(32) NOT NULL` |  |
| `actor_type` | `VARCHAR(32) NOT NULL` | CUSTOMER / HOUSEHOLD / SYSTEM |
| `actor_user_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `approval_history_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `reason` | `VARCHAR(2000) NULL` |  |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** Chỉ PK.

- FK `(booking_id, household_id)` → `bookings(id, household_id)`.
- FK `(actor_user_id)` → `users(id)`.
- FK `(approval_history_id, household_id)` → `household_approval_history(id, household_id)`.

**CHECK:**
- `actor_type IN ('CUSTOMER', 'HOUSEHOLD', 'SYSTEM')`.
- `to_status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'INTERRUPTED')`.
- `actor_type = 'SYSTEM' OR actor_user_id IS NOT NULL`.

## refund_agreements

Khoản hoàn thống nhất, độc lập trạng thái booking và thực hoàn.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `booking_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `amount_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `reason` | `VARCHAR(2000) NOT NULL` |  |
| `agreed_at` | `DATETIME(6) NOT NULL` | UTC |
| `recorded_by` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `id, household_id`; `id, booking_id, household_id`.

- FK `(booking_id, household_id)` → `bookings(id, household_id)`.
- FK `(recorded_by)` → `users(id)`.

**CHECK:**
- `amount_vnd > 0`.

## refund_agreement_adjustments

Điều chỉnh nghĩa vụ hoàn bằng phần tăng/giảm; không ghi đè số cũ.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `agreement_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `amount_delta_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `reason` | `VARCHAR(2000) NOT NULL` |  |
| `recorded_by` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** Chỉ PK.

- FK `(agreement_id, household_id)` → `refund_agreements(id, household_id)`.
- FK `(recorded_by)` → `users(id)`.

**CHECK:**
- `amount_delta_vnd <> 0`.

## financial_entries

Sổ tiền bất biến; dòng đảo tham chiếu dòng gốc thay xóa/sửa.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `booking_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `refund_agreement_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `entry_type` | `VARCHAR(32) NOT NULL` | RECEIPT / REFUND / OTHER_INCOME / EXPENSE |
| `receipt_purpose` | `VARCHAR(16) NULL` |  |
| `amount_vnd` | `DECIMAL(15,0) NOT NULL` | Số tiền VND nguyên |
| `payment_method` | `VARCHAR(32) NOT NULL` | CASH / BANK_TRANSFER / OTHER |
| `occurred_at` | `DATETIME(6) NOT NULL` | UTC |
| `recorded_by` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `reverses_entry_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `note` | `VARCHAR(2000) NOT NULL` |  |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `reverses_entry_id`; `id, household_id`.

- FK `(household_id)` → `households(id)`.
- FK `(booking_id, household_id)` → `bookings(id, household_id)`.
- FK `(refund_agreement_id, booking_id, household_id)` → `refund_agreements(id, booking_id, household_id)`.
- FK `(recorded_by)` → `users(id)`.
- FK `(reverses_entry_id, household_id)` → `financial_entries(id, household_id)`.

**CHECK:**
- `entry_type IN ('RECEIPT', 'REFUND', 'OTHER_INCOME', 'EXPENSE')`.
- `payment_method IN ('CASH', 'BANK_TRANSFER', 'OTHER')`.
- `amount_vnd > 0`.
- `(entry_type IN ('RECEIPT','REFUND') AND booking_id IS NOT NULL) OR (entry_type IN ('OTHER_INCOME','EXPENSE') AND booking_id IS NULL)`.
- `(entry_type = 'REFUND' AND refund_agreement_id IS NOT NULL) OR (entry_type <> 'REFUND' AND refund_agreement_id IS NULL)`.
- `(entry_type = 'RECEIPT' AND receipt_purpose IS NOT NULL AND receipt_purpose IN ('DEPOSIT','BALANCE')) OR (entry_type <> 'RECEIPT' AND receipt_purpose IS NULL)`.

## reviews

Một đánh giá tổng thể của khách booking hoàn thành; điều kiện trạng thái ở service.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `booking_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `customer_user_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `rating` | `INT UNSIGNED NOT NULL` |  |
| `comment` | `VARCHAR(4000) NOT NULL` |  |
| `hidden_by` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `hidden_at` | `DATETIME(6) NULL` | UTC |
| `hidden_reason` | `VARCHAR(2000) NULL` |  |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `booking_id`.

- FK `(booking_id, customer_user_id, household_id)` → `bookings(id, customer_user_id, household_id)`.
- FK `(hidden_by)` → `users(id)`.

**CHECK:**
- `rating BETWEEN 1 AND 5`.
- `hidden_at IS NULL OR (hidden_by IS NOT NULL AND hidden_reason IS NOT NULL)`.

## product_inquiries

Phiếu hỏi một lần, hộ trả lời; không phải giỏ hàng, giữ tồn hay chat.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `product_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `customer_user_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `message` | `VARCHAR(2000) NOT NULL` |  |
| `contact_snapshot` | `VARCHAR(500) NOT NULL` |  |
| `status` | `VARCHAR(32) NOT NULL DEFAULT 'OPEN'` | OPEN / ANSWERED / CLOSED |
| `reply` | `VARCHAR(2000) NULL` |  |
| `replied_by` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `replied_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** Chỉ PK.

- FK `(product_id, household_id)` → `local_products(id, household_id)`.
- FK `(customer_user_id)` → `users(id)`.
- FK `(replied_by)` → `users(id)`.

**CHECK:**
- `status IN ('OPEN', 'ANSWERED', 'CLOSED')`.

## complaints

Phản ánh tới Admin; không có quyền thay đổi booking/tiền.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `booking_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `reported_by` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `subject` | `VARCHAR(200) NOT NULL` |  |
| `description` | `VARCHAR(4000) NOT NULL` |  |
| `status` | `VARCHAR(32) NOT NULL DEFAULT 'OPEN'` | OPEN / IN_REVIEW / RESOLVED / REJECTED |
| `handled_by` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `resolution_note` | `VARCHAR(2000) NULL` |  |
| `resolved_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** Chỉ PK.

- FK `(household_id)` → `households(id)`.
- FK `(booking_id, household_id)` → `bookings(id, household_id)`.
- FK `(reported_by)` → `users(id)`.
- FK `(handled_by)` → `users(id)`.

**CHECK:**
- `status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED')`.
- `booking_id IS NULL OR household_id IS NOT NULL`.

## idempotency_keys

Chống gửi trùng theo actor/action/key; lưu kết quả trong cùng transaction.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `actor_user_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `action` | `VARCHAR(80) NOT NULL` |  |
| `idempotency_key` | `VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL` | Khóa do client tạo, phân biệt hoa thường |
| `request_hash` | `BINARY(32) NOT NULL` | SHA-256 payload canonical, không hash token |
| `response_status` | `INT UNSIGNED NOT NULL` |  |
| `response_body` | `JSON NOT NULL` | Chỉ kết quả cần trả lại; hạn chế PII |
| `completed_at` | `DATETIME(6) NOT NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `actor_user_id, action, idempotency_key`.

- FK `(actor_user_id)` → `users(id)`.

**CHECK:**
- `response_status BETWEEN 200 AND 599`.

## audit_events

Lịch sử thao tác/correction; tham chiếu đa hình chỉ dùng cho audit.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `household_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `actor_user_id` | `BIGINT UNSIGNED NULL` | Khóa ngoại |
| `actor_type` | `VARCHAR(16) NOT NULL` |  |
| `action` | `VARCHAR(100) NOT NULL` |  |
| `entity_type` | `VARCHAR(80) NOT NULL` |  |
| `entity_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `before_data` | `JSON NULL` |  |
| `after_data` | `JSON NULL` |  |
| `reason` | `VARCHAR(2000) NULL` |  |
| `correlation_id` | `VARCHAR(100) NOT NULL` |  |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** Chỉ PK.

- FK `(household_id)` → `households(id)`.
- FK `(actor_user_id)` → `users(id)`.

## notifications

Thông báo trong app ghi cùng transaction nghiệp vụ; một event_key/user duy nhất.

| Cột | Kiểu/ràng buộc cột | Ý nghĩa |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED NOT NULL AUTO_INCREMENT` | Khóa chính nội bộ |
| `user_id` | `BIGINT UNSIGNED NOT NULL` | Khóa ngoại |
| `event_key` | `VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin NOT NULL` | Mã sự kiện ổn định cho chống trùng |
| `event_type` | `VARCHAR(100) NOT NULL` |  |
| `title` | `VARCHAR(200) NOT NULL` |  |
| `body` | `VARCHAR(2000) NOT NULL` |  |
| `navigation` | `JSON NOT NULL` | Đích điều hướng; backend vẫn kiểm tra quyền khi mở |
| `read_at` | `DATETIME(6) NULL` | UTC |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` | Thời điểm tạo UTC |

**Khóa duy nhất:** `event_key, user_id`.

- FK `(user_id)` → `users(id)`.

