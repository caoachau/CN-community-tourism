# ERD logic — bản rút gọn 41 bảng

Các sơ đồ dưới đây thể hiện quan hệ logic chính; [DDL](../../backend/migrations/001_initial_schema.sql) và [từ điển](DATA_DICTIONARY.md) là nguồn đầy đủ cho cột và FK ghép. Không vẽ thêm quan hệ N–N khái niệm đè lên bảng nối. Các bảng được lặp giữa sơ đồ để dễ đọc, không phải bảng mới.

## 1. Tài khoản và catalog

```mermaid
erDiagram
    users ||--o{ auth_sessions : has
    users ||--o| households : owns
    households ||--o{ household_approval_history : decisions
    households ||--o{ rooms : provides
    households ||--o{ services : provides
    households ||--o{ local_products : introduces
    households o|--o{ cultural_articles : contributes
    users ||--o{ cultural_articles : authors
    service_categories ||--o{ services : classifies
    services ||--o{ service_offers : sells
    service_offers ||--o{ service_addons : has
    users {
        bigint id PK
        varchar role
        varchar status
    }
    households {
        bigint id PK
        bigint owner_user_id FK,UK
        varchar approval_status
    }
    service_offers {
        bigint id PK
        bigint service_id FK
        varchar pricing_type
        varchar participation_mode
        decimal unit_price_vnd
    }
```

## 2. Kiểm duyệt và ảnh

```mermaid
erDiagram
    households o|--o{ content_revisions : profile_versions
    rooms o|--o{ content_revisions : room_versions
    services o|--o{ content_revisions : service_versions
    local_products o|--o{ content_revisions : product_versions
    cultural_articles o|--o{ content_revisions : article_versions
    content_revisions ||--o{ content_revision_media : images
    media_assets ||--o{ content_revision_media : linked
    content_revisions {
        bigint id PK
        varchar content_type
        bigint household_profile_id FK
        bigint room_id FK
        bigint service_id FK
        bigint product_id FK
        bigint article_id FK
        int version
        varchar status
    }
```

Năm FK chủ revision đều nullable riêng lẻ, nhưng CHECK yêu cầu **đúng một** trong năm có giá trị, khớp content_type. Không có revision vô chủ hoặc thuộc đồng thời một phòng và một dịch vụ. Ngoài các quan hệ trên, mỗi bảng gốc có `published_revision_id` tùy chọn, trỏ tới revision **của chính đối tượng đó** qua FK ghép. FK vòng được thêm sau khi tạo toàn bộ bảng; không cần tắt FOREIGN_KEY_CHECKS.

## 3. Hai cấp tài nguyên và offer của lịch

```mermaid
erDiagram
    households ||--o{ resources : owns
    resources ||--o{ resource_blocks : blocked
    rooms ||--o{ room_blocks : blocked
    services ||--o{ service_slots : schedules
    service_slots ||--o{ slot_offers : enables
    service_offers ||--o{ slot_offers : offered
    service_slots ||--o{ slot_resource_assignments : allocates
    resources ||--o{ slot_resource_assignments : assigned
    slot_offers ||--o{ slot_offer_resource_rules : requires
    slot_resource_assignments ||--o{ slot_offer_resource_rules : configured
    service_slots ||--o{ slot_reservations : seats
    slot_offers ||--o{ slot_reservations : selected
    slot_reservations ||--o{ slot_resource_usages : consumes
    slot_resource_assignments ||--o{ slot_resource_usages : quota
    resources {
        bigint id PK
        varchar resource_type
        int total_quantity
    }
    slot_resource_assignments {
        bigint id PK
        bigint slot_id FK
        bigint resource_id FK
        int quantity
        varchar allocation_mode
    }
    slot_reservations {
        bigint id PK
        bigint reservation_set_id FK
        int participant_count
        boolean is_exclusive
    }
    slot_resource_usages {
        bigint id PK
        bigint slot_reservation_id FK
        bigint assignment_id FK
        int quantity
    }
```

Khoảng chặn tài nguyên và assignment là cấp hộ; usages là cấp trong lịch. Hai tổng này không cộng vào nhau.

## 4. Ba luồng đặt và nguồn khả dụng chung

```mermaid
erDiagram
    users ||--o{ schedule_requests : requests
    households ||--o{ schedule_requests : receives
    schedule_requests ||--o{ booking_proposals : versions
    booking_proposals o|--o{ room_items : proposes
    booking_proposals o|--o{ service_items : proposes
    booking_proposals o|--o| bookings : accepted_into
    users o|--o{ bookings : books
    households ||--o{ bookings : fulfills
    bookings o|--o{ room_items : contains
    bookings o|--o{ service_items : contains
    service_items ||--o{ service_item_addons : adds
    bookings ||--o{ booking_status_history : transitions
    bookings o|--o| reservation_sets : commits
    booking_proposals o|--o| reservation_sets : holds
    reservation_sets ||--o{ room_reservations : reserves
    reservation_sets ||--o{ slot_reservations : reserves
    rooms ||--o{ room_reservations : occupied
    room_reservations o|--o| room_items : backs
    slot_reservations o|--o| service_items : backs
    room_items {
        bigint id PK
        bigint booking_id FK
        bigint proposal_id FK
        bigint room_id FK
        bigint reservation_id FK,UK
        decimal line_total_vnd
        varchar outcome
    }
    service_items {
        bigint id PK
        bigint booking_id FK
        bigint proposal_id FK
        bigint slot_id FK
        bigint reservation_id FK,UK
        int participant_count
        decimal quantity
        varchar outcome
    }
```

Hai đầu 0..1 của reservation set theo từng chủ không có nghĩa set được phép vô chủ: CHECK yêu cầu có booking hoặc proposal. Ở HELD chỉ có một chủ; accept giữ proposal nguồn và thêm booking. Diagram không biểu diễn được điều kiện trạng thái này.

Hạng mục cũng không được vô chủ. Proposal DRAFT có thể chưa giữ chỗ; item đã gắn booking bắt buộc có reservation. Accept giữ nguyên dòng item/snapshot, gắn booking_id đúng proposal nguồn và chuyển set sang COMMITTED. Outcome nằm trên item, mặc định UNRESOLVED; không còn hai bảng outcome riêng.

## 5. Kết quả, tiền và quyền đánh giá

```mermaid
erDiagram
    bookings ||--o{ refund_agreements : agrees
    refund_agreements ||--o{ refund_agreement_adjustments : adjusts
    refund_agreements o|--o{ financial_entries : refund_payments
    households ||--o{ financial_entries : records
    bookings o|--o{ financial_entries : relates
    financial_entries o|--o| financial_entries : reverses
    bookings ||--o| reviews : receives
    users ||--o{ reviews : writes
    users ||--o{ complaints : reports
    households o|--o{ complaints : concerns
    bookings o|--o{ complaints : concerns
    local_products ||--o{ product_inquiries : receives
    users ||--o{ product_inquiries : asks
```

## 6. Ghi nhận và thông báo

```mermaid
erDiagram
    users ||--o{ idempotency_keys : deduplicates
    users o|--o{ audit_events : acts
    households o|--o{ audit_events : scopes
    users ||--o{ notifications : receives
```

notifications được ghi cùng transaction với command, chống trùng bằng event_key/user_id. Chưa có gửi push/email nên không có bảng outbox riêng.

Để xem hình có thể kéo thả, nhập SQL vào model MySQL Workbench theo [hướng dẫn](AIVEN_AND_VALIDATION.md). Chưa tạo file `.mwb` bằng Workbench trong bước này; Mermaid và DDL là các artifact đã cung cấp.
