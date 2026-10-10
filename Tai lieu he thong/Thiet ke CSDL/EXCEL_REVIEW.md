# Phân tích Mô tả ERD.xlsx

Đọc workbook gốc, giữ nguyên file để đối chiếu. Đây là mô tả quan hệ khái niệm/logic và một số thuộc tính bảng nối, **chưa phải từ điển cột hoặc DDL đầy đủ**.

## 1. Kiểm kê đã đọc

Workbook có 10 sheet: TAT CA QUAN HE, QUAN HE 1-1, QUAN HE N-N, QUAN HE 1-N, 1-N SAU PHAN RA, BANG TRUNG GIAN, DANH MUC BANG, LUU Y THIET KE, CHAT BACKLOG, TONG QUAN.

- TAT CA QUAN HE có 101 dòng quan hệ: 5 quan hệ 1–1, 13 N–N, 55 1–N độc lập, 28 1–N sau phân rã.
- 101 là tổng nhiều cách biểu diễn, không phải 101 FK độc lập bắt buộc. Chỉ vẽ quan hệ sau phân rã ở ERD logic.
- DANH MUC BANG có 54 dòng nhưng chỉ **45 tên bảng**. Chín dòng A15, A18, A19, A20, A21, A22, A23, A29, A39 là câu ghi chú bị đưa vào danh mục.
- CHAT BACKLOG nằm ngoài MVP, không chuyển CONVERSATIONS/MESSAGES/MESSAGE_ATTACHMENTS vào SQL.

## 2. Các thay đổi chính

| Vị trí Excel | Nhận xét | Quyết định bản rút gọn v2 |
| --- | --- | --- |
| TAT CA QUAN HE dòng 6, 24 | User sở hữu hộ và User đặt đơn là hai vai trò quan hệ khác nhau | UNIQUE owner_user_id; booking.customer_user_id nullable chỉ với nguồn OFFLINE; HOUSEHOLD có quyền CUSTOMER bằng policy |
| Dòng 8; LUU Y KT-03 | Proposal–booking 0..1 hai đầu là đúng | UNIQUE bookings.accepted_proposal_id; thêm UNIQUE schedule_request_id để cả request chỉ thành một booking |
| Dòng 11–12, 79–83 | Room/service item phù hợp, nhưng chưa có nguồn chung để tính giữ chỗ | room_items/service_items dùng chung cho phương án và booking; reservation_sets và reservation con riêng |
| Dòng 13, 84–85 | Assignment có quantity nhưng thiếu phân biệt chung/quota | Thêm allocation_mode, resource pool, rule theo slot offer và slot_resource_usages |
| Dòng 17, 93–94; BANG TRUNG GIAN dòng 11 | PROPOSAL_RESOURCE_HOLDS có thể tạo một đường giữ resource ngoài slot; chưa giữ phòng/chỗ ngồi/độc quyền thống nhất | Bỏ bảng này; dùng ProposalHold qua reservation_sets + room_reservations/slot_reservations và quota. Resource luôn phân qua slot, kể cả private |
| Dòng 18, 95–96; KT-12 | slot_offers ghi là tùy chọn | Chọn triển khai để whitelist offer theo slot và cấu hình tài nguyên. FK ghép bắt offer/slot cùng service/hộ |
| Dòng 14, 86–87 | Có booking addon nhưng chưa có proposal addon | service_item_addons dùng chung theo service_items; accept không tạo bản sao hoặc đổi giá addon |
| Dòng 63, 90–92; KT-13 | service_slot_id NULL phù hợp bản nháp | Cho NULL khi DRAFT; gửi SENT bắt buộc materialize private/public slot và giữ đầy đủ |
| Dòng 9–10; KT-16 | Outcome là quan hệ 0..1 trên một item | Gộp các cột kết quả/lý do/người/thời gian vào item; mặc định UNRESOLVED; correction có audit |
| Dòng 64–78; KT-17, KT-23 | Workbook chọn năm revision riêng để giữ FK | Theo yêu cầu rút gọn mới, dùng content_revisions với năm FK cụ thể và CHECK đúng một chủ; vẫn có FK published_revision_id cùng đối tượng |
| Dòng 19–23, 97–106 | Ảnh liên kết trực tiếp bảng gốc sẽ bỏ qua kiểm duyệt ảnh chỉnh sửa | content_revision_media trỏ revision chung; một asset dùng lại được giữa các phiên bản |
| DANH MUC BANG A31 | Nhãn Cloudinary chỉ là một nhà cung cấp, khác kiến trúc adapter đã chốt | media_assets lưu provider/object_key, không phụ thuộc nhà cung cấp ảnh |
| Dòng 58–61; KT-15 | Tách refund agreement khỏi thực hoàn là đúng; thiếu cách sửa có lịch sử | Giữ; thêm refund_agreement_adjustments và reversal tài chính. REFUND mới luôn có agreement |
| KT-10, KT-11 | Ghi “nếu làm proposal/resource”, còn DANH MUC ghi “mở rộng/đề xuất” | Theo MVP mới, ba luồng đặt, hai cấp resource, outcomes và revision đều là bắt buộc |
| KT-20 | DATE đúng để tính đêm, nhưng chưa đủ chống trùng theo giờ nhận/trả | Snapshot cả DATE và DATETIME UTC; kiểm tra giao thời gian thực tế |
| Toàn workbook | Thiếu phiên đăng nhập, chống gửi trùng, audit tổng quát | Thêm auth_sessions, idempotency_keys, audit_events; notifications ghi trực tiếp cùng transaction nên chưa cần outbox |

## 3. Đối chiếu đủ 45 tên bảng gốc

| Bảng/nhóm trong Excel | Trong SQL rút gọn v2 |
| --- | --- |
| USERS, HOUSEHOLDS, HOUSEHOLD_APPROVAL_HISTORY | users, households, household_approval_history |
| SERVICE_CATEGORIES, ROOMS, SERVICES, SERVICE_OFFERS, SERVICE_ADDONS | service_categories, rooms, services, service_offers, service_addons |
| LOCAL_PRODUCTS, CULTURAL_ARTICLES | local_products, cultural_articles |
| HOUSEHOLD_REVISIONS, ROOM_REVISIONS, SERVICE_REVISIONS, PRODUCT_REVISIONS, ARTICLE_REVISIONS | content_revisions, mỗi loại vẫn có FK thật; CHECK đúng một chủ |
| MEDIA_ASSETS, HOUSEHOLD_MEDIA, ROOM_MEDIA, SERVICE_MEDIA, PRODUCT_MEDIA, ARTICLE_MEDIA | media_assets + content_revision_media |
| SERVICE_SLOTS, SLOT_OFFERS, RESOURCES, SLOT_RESOURCE_ASSIGNMENTS, ROOM_BLOCKS, RESOURCE_BLOCKS | Giữ sáu bảng, thêm các ràng buộc và trường vận hành |
| SCHEDULE_REQUESTS, BOOKING_PROPOSALS, PROPOSAL_ROOM_ITEMS, PROPOSAL_SERVICE_ITEMS | Giữ request/proposal; hạng mục dùng room_items/service_items với proposal_id |
| PROPOSAL_RESOURCE_HOLDS | Thay bằng bốn bảng cam kết khả dụng dùng chung |
| BOOKINGS, BOOKING_ROOM_ITEMS, BOOKING_SERVICE_ITEMS, BOOKING_SERVICE_ADDONS, BOOKING_STATUS_HISTORY | bookings, booking_status_history và room_items/service_items/service_item_addons dùng chung |
| BOOKING_ROOM_OUTCOMES, BOOKING_SERVICE_OUTCOMES | Nhóm cột outcome trên room_items/service_items; lịch sử chỉnh sửa trong audit_events |
| FINANCIAL_ENTRIES, REFUND_AGREEMENTS | Giữ hai bảng; thêm correction |
| REVIEWS, PRODUCT_INQUIRIES, COMPLAINTS, NOTIFICATIONS | Giữ bốn bảng |

Thiết kế đầu mở rộng workbook thành 55 bảng. Bản hiện tại gộp bốn nhóm theo yêu cầu mới: **55 − 4 revision − 4 bảng nối ảnh − 3 bảng hạng mục/phụ phí − 2 bảng outcome − 1 outbox = 41 bảng**. Các yêu cầu về duyệt, giá snapshot, kết quả từng hạng mục và thông báo vẫn được giữ; số bảng vật lý không còn bằng số tên thực thể trong workbook.

Không sửa nguyên workbook vì cần giữ bản đầu vào. Khi cập nhật Excel, loại chín dòng ghi chú khỏi danh mục, áp dụng các phép gộp trên và thể hiện CHECK đúng một chủ revision cùng liên kết proposal/booking trên item. Không vẽ thêm các bảng đã gộp như thể chúng vẫn tồn tại trong SQL.
