# Thiết kế CSDL MySQL — bản rút gọn v2

Ngày thiết kế: 10/10/2026. Đây là thiết kế và SQL khởi tạo để triển khai, **chưa phải database đã được tạo trên Aiven hoặc backend đã hoàn thành**.

Đầu vào: [Mô tả ERD.xlsx](../Mô%20tả%20ERD.xlsx), [MVP](../MVP.md), [Kiến trúc](../ARCHITECTURE.md), [Use case](../USE_CASES.md) và bản đặc tả thay thế trong trao đổi với chủ dự án. Hai file `docs/business-requirements.md`, `docs/acceptance-scenarios.md` được tài liệu cũ nhắc tới hiện không có trong checkout này; không coi chúng là nguồn đã kiểm tra.

## 1. Kết luận thiết kế

Giữ mô hình hộ cung cấp **phòng và dịch vụ độc lập**. Dịch vụ có offer, lịch, tài nguyên được phân và phần khả dụng mà từng booking chiếm. Yêu cầu lịch riêng, phiên bản phương án, giữ chỗ và booking là các thực thể riêng. Chủ hộ vẫn dùng tài khoản hiện tại để đặt hộ khác.

Thiết kế hiện tại có **41 bảng**, giảm **14 bảng** so với bản đầu 55 bảng theo yêu cầu rút gọn của chủ dự án. Giữ đầy đủ ba luồng đặt, hai cấp tài nguyên, kiểm duyệt bản sửa, kết quả từng hạng mục và thu/hoàn thủ công. Excel gốc có 45 tên bảng hợp lệ và 9 dòng ghi chú lẫn vào danh mục.

| Cách rút gọn | Trước → sau | Giảm |
| --- | ---: | ---: |
| Năm bảng revision → content_revisions với năm FK cụ thể, đúng một FK có giá trị | 5 → 1 | 4 |
| Năm bảng nối ảnh → content_revision_media | 5 → 1 | 4 |
| Hạng mục phòng/dịch vụ/phụ phí dùng chung cho proposal và booking | 6 → 3 | 3 |
| Kết quả phục vụ nằm ngay trên room_items/service_items, sửa có audit | 2 → 0 bảng riêng | 2 |
| Ghi thông báo trong app trực tiếp trong transaction, chưa cần outbox riêng | 1 → 0 | 1 |
| **Tổng** | **55 → 41** | **14** |

Bản 55 bảng chưa được triển khai, nên cập nhật trực tiếp file SQL khởi tạo `001_initial_schema.sql`. Đây là revision thiết kế v2, không phải migration nâng cấp database đã có dữ liệu. Xem [đánh đổi và kiểm chứng](VALIDATION.md).

| Tài liệu | Dùng để làm gì |
| --- | --- |
| [Phân tích Excel](EXCEL_REVIEW.md) | Những quan hệ giữ lại, sửa hoặc bổ sung; dẫn vị trí trong workbook |
| [ERD logic](ERD.md) | Sơ đồ chia theo nghiệp vụ, tránh một sơ đồ quá lớn |
| [Từ điển dữ liệu](DATA_DICTIONARY.md) | Toàn bộ cột, kiểu, khóa, CHECK của 41 bảng |
| [Transaction và khả dụng](TRANSACTIONS.md) | Phần không thể bảo đảm chỉ bằng PK/FK/CHECK |
| [SQL tạo schema](../../backend/migrations/001_initial_schema.sql) | DDL có thứ tự, tạo trên database phát triển trống |
| [Triển khai và kiểm tra Aiven](AIVEN_AND_VALIDATION.md) | Cấu hình, cách chạy và giới hạn kiểm chứng |

## 2. Các quyết định để dễ thay đổi về sau

1. Dùng một MySQL/InnoDB, chia repository theo sáu module đã chốt. Không tách database cho từng hộ; không tạo bảng riêng cho bắt cá, làm bánh, hái trái cây.
2. `BIGINT UNSIGNED` làm khóa nội bộ, mã booking/request là khóa public duy nhất riêng. API truyền ID lớn dưới dạng chuỗi; mã public không thay thế kiểm tra quyền.
3. Trạng thái và cách tính giá dùng `VARCHAR + CHECK`. Thêm trạng thái vẫn cần migration và cập nhật transition ở backend, nhưng không buộc đổi một enum trên nhiều bảng hoặc xây hệ thống cấu hình trạng thái tùy ý.
4. `DECIMAL(15,0)` cho VND; `DECIMAL(12,4)` cho quantity. Không dùng FLOAT/DOUBLE cho tiền. Giá giờ tính từ số phút thực tế, làm tròn tiền một lần trên từng dòng; quantity giờ chỉ là biểu diễn đã làm tròn bốn chữ số.
5. `DATETIME(6)` lưu UTC, session MySQL đặt `+00:00`. `DATE` lưu ngày lưu trú Việt Nam; `TIME` trên phòng là giờ địa phương. Backend chuyển đổi với `Asia/Ho_Chi_Minh`.
6. JSON chỉ dành cho nội dung bổ sung có phiên bản, điều kiện và snapshot. Không giấu FK, sức chứa, phân công, số tiền hoặc ngày cần truy vấn trong một cột JSON chung.
7. Các FK giao dịch dùng RESTRICT. Archive nội dung thay vì xóa lịch sử; bút toán/snapshot bất biến qua command và quyền database. FK không tự ngăn mọi UPDATE/DELETE hợp lệ về mặt tham chiếu.
8. Một file migration ban đầu; sau khi đã dùng thật, thêm `002_...sql`, `003_...sql`. Không sửa `001` để cố thay cấu trúc database đã tồn tại; không thêm `IF NOT EXISTS` nhằm che sai lệch schema.

Đích triển khai đã được chủ dự án xác nhận là **MySQL 8.4.11 trên Aiven**, database `defaultdb`, sử dụng MySQL Workbench. SQL dùng tập tính năng phổ biến từ MySQL 8.0.16 trở lên nhưng nghiệm thu thực thi phải trên MySQL 8.4.11. Aiven cho phép quản lý phiên bản trong Console. [Aiven: quản lý phiên bản MySQL](https://aiven.io/docs/products/mysql/howto/manage-mysql-version).

## 3. Danh mục 41 bảng theo trách nhiệm

| Nhóm | Các bảng | Số bảng |
| --- | --- | ---: |
| Tài khoản/hộ | users, auth_sessions, households, household_approval_history | 4 |
| Catalog vận hành | service_categories, rooms, services, local_products, cultural_articles, service_offers, service_addons | 7 |
| Phiên bản nội dung | content_revisions | 1 |
| Ảnh theo phiên bản | media_assets, content_revision_media | 2 |
| Lịch/tài nguyên/cấu hình | resources, room_blocks, resource_blocks, service_slots, slot_offers, slot_resource_assignments, slot_offer_resource_rules | 7 |
| Yêu cầu/phương án | schedule_requests, booking_proposals | 2 |
| Hạng mục và kết quả dùng chung | room_items, service_items, service_item_addons | 3 |
| Cam kết khả dụng | reservation_sets, room_reservations, slot_reservations, slot_resource_usages | 4 |
| Booking/lịch sử trạng thái | bookings, booking_status_history | 2 |
| Tiền | financial_entries, refund_agreements, refund_agreement_adjustments | 3 |
| Sau giao dịch/nội dung hỗ trợ | reviews, product_inquiries, complaints | 3 |
| Hạ tầng nghiệp vụ | idempotency_keys, audit_events, notifications | 3 |
| **Tổng** | | **41** |

Mỗi nhóm có thể triển khai theo mốc kỹ thuật. Bảng giữ chỗ, history, snapshot và thông báo được command tạo; không cần màn hình CRUD riêng cho từng bảng. Không gộp Room với Service, request với booking, assignment với usage hoặc nghĩa vụ hoàn với thực hoàn vì chúng có quy tắc khác nhau.

## 4. Tài khoản, sở hữu và biên hộ

`households.owner_user_id` có UNIQUE: một tài khoản sở hữu tối đa một hộ trong demo; mỗi hộ có đúng một chủ. `users.role=HOUSEHOLD` được policy cho phép toàn bộ chức năng CUSTOMER. `approval_status` của hộ và `status` của tài khoản độc lập. Thu hồi duyệt không đổi tài khoản thành khách khác và không mất quyền đặt hộ khác.

Mặc định kỹ thuật là đăng nhập email/mật khẩu, email chuẩn hóa và duy nhất, phone tài khoản tùy chọn; booking luôn có contact_phone snapshot. Đây là lựa chọn cho demo, có thể đổi sang đăng nhập số điện thoại bằng migration/auth policy nếu cần. Việc codebase hiện có hai project Flutter `flutter_ho` và `flutter_khach` không làm tách users: cả hai phải dùng chung backend/tài khoản và quyền CUSTOMER của HOUSEHOLD.

Khóa ngoại ghép bảo vệ dữ liệu của cùng hộ. Ví dụ `room_items(booking_id, household_id)` trỏ đến booking, `(proposal_id, household_id)` trỏ đến phương án và `(room_id, household_id)` trỏ đến phòng. Nếu dòng có cả booking_id và proposal_id, FK ghép còn buộc proposal_id đúng accepted_proposal_id của booking đó. Chỉ FK riêng lẻ sẽ không đủ để chặn ghép nhầm hộ hoặc nguồn báo giá.

Offer–slot còn có `service_id` chung; addon–item có `offer_id` chung; usage–assignment có `slot_id` chung. FK ghép không thay kiểm tra người thao tác: backend vẫn phải lấy household từ dữ liệu đang quản lý, kiểm tra owner và trạng thái tài khoản. Admin không có command xác nhận/hủy đơn hoặc ghi tiền thay hộ.

## 5. Hai cấp tài nguyên

### Hộ → lịch

`resources` mô tả một thuyền hoặc pool 10 xe. `slot_resource_assignments` phân số lượng từ tài nguyên đó vào một slot. Khoảng chiếm lấy từ `service_slots.starts_at/ends_at`, dùng `[start, end)`.

Slot PUBLIC/OPEN dành tài nguyên ngay khi mở dù chưa có booking. Slot CLOSED hoặc PRIVATE vẫn dành tài nguyên khi có reservation còn hiệu lực. Một slot PRIVATE không mở bán công khai; khi gửi phương án, tạo giữ chỗ và các assignment trong cùng transaction.

`resource_blocks` dành một phần pool cho bảo trì/ngừng sử dụng. Chặn cũng tham gia phép tính mức dùng đồng thời. Không giảm `total_quantity` xuống dưới nghĩa vụ đã phân.

### Lịch → hạng mục

`slot_reservations` giữ số người và quyền độc quyền cho từng hạng mục. `slot_resource_usages` giữ phần quota dùng của từng assignment.

| allocation_mode | Cách dùng |
| --- | --- |
| SESSION_SHARED | Thuyền/hướng dẫn viên của cả chuyến; dành ở assignment một lần; không ghi lại như quota cho mỗi khách |
| PER_BOOKING_QUOTA | Xe/thiết bị chia cho từng booking; tổng usages hiệu lực không vượt assignment.quantity |

`slot_offer_resource_rules` quy định cách suy ra tài nguyên cho offer tại một slot: SHARED_ONCE, PER_PERSON, PER_GROUP, PER_UNIT hoặc FIXED. `units_required` là hệ số nguyên. Một hoạt động có nhiều dòng rule; ba xe và ba mũ là hai resource usages riêng.

Quy tắc SHARED_ONCE phải đi với SESSION_SHARED; các rule còn lại đi với PER_BOOKING_QUOTA. PER_GROUP chỉ dùng với offer bán một nhóm/hạng mục; PER_UNIT cần quantity nguyên. Giá giờ chỉ có phạm vi tài nguyên cố định hoặc theo số người, không dùng quantity giờ để suy ra số xe. Các tương thích này phải kiểm tra khi cấu hình và khi chốt giao dịch.

Các giới hạn người được kiểm tra đồng thời: giới hạn của offer, số người/đơn vị tính tiền nếu có, số người/đơn vị tài nguyên, tổng sức chứa slot. Thuê riêng không được hiểu đơn thuần là mua hết số chỗ còn lại.

## 6. Giữ chỗ và vòng đời phương án

`reservation_sets` là thực thể cam kết khả dụng chung. Đối với phương án, dòng có `proposal_id` chính là **ProposalHold**. Đối với booking online đang chờ, dòng có `booking_id` là giữ chỗ của booking. Đây là một bảng có FK tường minh tới hai chủ cam kết, không phải cặp `owner_type/owner_id` thiếu FK.

| Tình huống | booking_id | proposal_id | status |
| --- | --- | --- | --- |
| Online chờ hộ | Có | NULL | HELD |
| Phương án đã gửi | NULL | Có | HELD |
| Phương án được khách chấp nhận | Có | Giữ lại ID nguồn | COMMITTED |
| Online được hộ xác nhận / đơn ngoài app | Có | NULL | COMMITTED |
| Hủy/từ chối/hết hạn | Giữ nguyên liên kết lịch sử | Giữ nguyên nếu có | RELEASED |

Các cột UNIQUE giới hạn mỗi booking/phương án có một set. Giữ nguồn proposal sau chuyển giúp truy xuất lịch sử. FK ghép set → booking bảo đảm proposal nguồn khớp `accepted_proposal_id` của booking.

`room_reservations` và `slot_reservations` là nguồn tính khả dụng duy nhất. Hạng mục dùng chung chỉ có một dòng, khi accept được gắn thêm booking_id và giữ nguyên reservation_id. Không tính khả dụng bằng cách cộng hạng mục theo cả proposal và booking.

Giữ chỗ HELD chỉ có hiệu lực khi `expires_at > now` và chưa RELEASED. COMMITTED không phụ thuộc deadline cũ; việc kết thúc/hủy phải giải phóng đúng dòng trong transaction. Không cần worker chạy kịp để giải phóng giữ chỗ đã hết hạn.

Yêu cầu ban đầu chỉ ở `schedule_requests`. Trong bản nháp, proposal service item được phép chưa có slot/reservation; khi SENT, mọi hạng mục phải có lịch và reservation cụ thể. Không giữ resource trực tiếp ngoài slot như `PROPOSAL_RESOURCE_HOLDS` trong Excel.

Mỗi request có UNIQUE theo version. Hai generated keys giới hạn tối đa một bản SENT và một bản ACCEPTED; bản SENT đã quá giờ vẫn cần chuyển EXPIRED trong transaction trước khi xử lý trạng thái kế tiếp. Quyền chấp nhận luôn kiểm tra deadline, không chỉ trạng thái SENT.

Sửa bằng một proposal version mới **và bộ hạng mục mới**; giữ nguyên version và snapshot cũ để đối chiếu. `first_hold_started_at/initial_hold_deadline` trên request giữ mốc gốc; deadline mới không được muộn hơn deadline bản đang thay thế. Chấp nhận thêm booking, gắn booking_id vào các item của đúng phương án và đổi set sang COMMITTED trong một transaction, không trả rồi đặt lại.

## 7. Hạng mục, snapshot và kết quả

Booking phải có ít nhất một dòng phòng hoặc dịch vụ. Vì đây là điều kiện giữa nhiều bảng, command phải kiểm tra trước commit; không tuyên bố FK tự bảo đảm đơn không rỗng.

`bookings.check_in_date/check_out_date` là kỳ lưu trú chung; các dòng phòng phải bằng ngày trên đơn. Mỗi room item còn có giờ nhận/trả UTC đã chốt để chống trùng thực tế. Ví dụ trả lúc 16:00 và khách sau nhận 14:00 cùng ngày vẫn xung đột dù tính đêm không giao nhau.

`first_starts_at/last_ends_at` là min/max của tất cả item, gồm dịch vụ ngoài kỳ lưu trú. Đây là giá trị tổng hợp được cập nhật cùng transaction, không cho client tùy ý nhập.

Snapshot có tên, giá, quantity, người tham gia, thời gian, điều kiện, thông tin offer, tài nguyên và nguồn revision tại giao dịch. `line_total_vnd` dịch vụ chưa gồm addon; `bookings.total_vnd`/`booking_proposals.total_vnd` bằng tổng dòng phòng + dòng dịch vụ + addon. Chuyển phương án sang booking giữ nguyên snapshot trên chính các item đã gửi; chỉ gắn booking_id, không copy thành dòng thứ hai và không tính lại theo catalog hiện tại.

`room_items` và `service_items` có outcome mặc định UNRESOLVED. Chỉ hạng mục đã gắn booking mới được ghi kết quả cuối cùng; phải có outcome_recorded_by/outcome_recorded_at. Kết quả chưa đầy đủ bắt buộc lý do và mô tả phần đã/chưa phục vụ. Command ghi kết quả chỉ cập nhật nhóm cột outcome và ghi audit trước/sau, không cho sửa snapshot giá/lịch/điều kiện đã gửi. Chỉnh kết quả phải kiểm tra lại trạng thái tổng và giữ lịch sử.

| Ngữ cảnh hạng mục | booking_id | proposal_id | reservation_id |
| --- | --- | --- | --- |
| Phương án nháp | NULL | Có | Có thể NULL |
| Phương án đã gửi | NULL | Có | Bắt buộc khi SENT, kiểm tra trong transaction |
| Phương án được chấp nhận | Có | Giữ ID nguồn | Giữ nguyên |
| Booking online/ngoài app | Có | NULL | Bắt buộc bằng CHECK |

Mỗi item phải có ít nhất một chủ. Hai chủ cùng có giá trị chỉ hợp lệ khi booking nhận đúng proposal nguồn; không đổi liên kết sau accept. Màn hình phương án đọc các cột snapshot, màn hình phục vụ đọc thêm outcome. Báo cáo booking lọc booking_id; không UNION rồi cộng lại cùng dòng theo hai chủ.

- Tất cả SERVED và đã qua kết thúc muộn nhất → COMPLETED.
- Tất cả NOT_SERVED vì CUSTOMER_ABSENT và đã qua kết thúc muộn nhất → NO_SHOW.
- Mọi item đã kết luận, còn lại không đầy đủ → INTERRUPTED; chốt sớm chỉ khi đã bắt đầu và không còn nghĩa vụ tiếp tục.
- CANCELLED trước bắt đầu giữ nguyên; không bị job chuyển thành NO_SHOW/INTERRUPTED.

## 8. Nội dung đã duyệt và ảnh

`content_revisions` dùng chung version, title/body/details, người gửi, người duyệt, trạng thái và lý do. Bảng có năm FK nullable: household_profile_id, room_id, service_id, product_id, article_id. CHECK yêu cầu **đúng một FK có giá trị**, khớp content_type; mỗi FK trỏ bảng chủ thật. Không dùng một entity_id thiếu FK để chứa mọi loại nội dung.

Version duy nhất theo từng đối tượng. Các bảng gốc vẫn có `published_revision_id`; FK ghép xác nhận revision thuộc đúng đối tượng đó. Trạng thái APPROVED và quyền Admin phải kiểm tra trong transaction xuất bản. household_profile_id chỉ là chủ của revision hồ sơ hộ; revision phòng/dịch vụ/sản phẩm/bài viết truy về hộ qua chính FK chủ tương ứng. API phải kiểm tra quyền theo đối tượng đó, không tin content_type hoặc owner ID khách gửi.

`content_revision_media` liên kết **revision** với media_assets. Nếu ảnh chỉ gắn vào room/service gốc, sửa ảnh sẽ làm thay đổi bản công khai dù revision mới chưa duyệt. Mỗi revision có tối đa một ảnh bìa; có thể dùng lại cùng một media asset giữa nhiều phiên bản. Bản APPROVED/đã gửi duyệt và liên kết ảnh tương ứng không được sửa nội dung trực tiếp; tạo revision mới khi chỉnh sửa.

Các trường giới thiệu có thể ảnh hưởng bản công khai không được cập nhật vòng qua revision. `services.category_id` là phân loại hiện đang công khai: nếu hộ đề nghị đổi danh mục cùng bản sửa, giữ categoryId đề nghị trong details của revision, validate danh mục tồn tại/được dùng khi gửi và duyệt, rồi cập nhật category_id cùng lúc xuất bản. Các đoạn điều kiện mô tả của offer cũng lấy từ bản nội dung được duyệt; trường terms vận hành không được trở thành đường sửa nội dung công khai chưa qua duyệt.

Media chỉ lưu provider/key/MIME/kích thước. MVP dùng adapter object storage đã chốt, không buộc Cloudinary chỉ vì workbook có nhãn Cloudinary. Backend kiểm tra quyền sở hữu media, không để hộ gắn ảnh riêng của hộ khác hoặc trả URL nháp công khai.

Schema tối thiểu của `details` (được API kiểm tra theo schema_version=1):

| Revision | Trường nội dung gợi ý |
| --- | --- |
| Hộ | address, locality, contactPhone, zaloContact, introduction, facilities |
| Phòng | amenities, description, houseRules, locationDescription |
| Dịch vụ | locationDescription, itinerary, requirements, inclusions, exclusions |
| Sản phẩm | origin, seasonDescription, unitDescription, contactNote |
| Bài văn hóa | summary, tags, locality |

`title/body` là cột riêng. Khi thực sự cần lọc theo locality/amenity thường xuyên, chuẩn hóa cột hoặc bảng bằng migration và index; không xây EAV hoặc nhiều bảng địa chỉ ngay cho demo. Thay đổi nội dung location/contact đang duyệt vẫn thuộc revision; snapshot giao dịch lưu thông tin đã chốt.

## 9. Tiền, đánh giá và nội dung hỗ trợ

`financial_entries` ghi tiền thực tế, không đóng vai trò payment gateway. Cọc có entry_type RECEIPT và receipt_purpose DEPOSIT nên được tính đúng một lần. REFUND bắt buộc gắn một refund_agreement cùng booking/hộ; có thể ghi nhiều lần.

`refund_agreements` là nghĩa vụ hoàn ban đầu; `refund_agreement_adjustments` ghi phần tăng/giảm có lý do. Tổng nghĩa vụ = khoản đầu + các delta; service không cho giảm xuống dưới khoản đã hoàn hợp lệ. Nếu nhập sai bút toán, ghi dòng đảo có `reverses_entry_id`, rồi dòng đúng; dòng đảo giữ cùng loại/số tiền/booking/phương thức với dòng gốc và trừ khỏi báo cáo. Không cho đảo một dòng đảo.

Ví dụ đơn 1.000.000đ, thu cọc 300.000đ rồi hủy, thỏa thuận hoàn 200.000đ, đã hoàn hai lần 50.000đ: giá trị snapshot vẫn 1.000.000đ; thực thu 300.000đ; thực hoàn 100.000đ; còn phải hoàn 100.000đ. Không tự kết luận khách còn nợ 700.000đ sau hủy.

Chênh lệch giá trị đơn đang thực hiện và thu/hoàn chỉ là số liệu đối chiếu; nghĩa vụ thu mới sau gián đoạn phải được thống nhất, chưa có công thức phí hủy hoặc sổ công nợ tổng quát. Tách giá trị đơn, tiền thực thu, thực hoàn, nghĩa vụ hoàn, thu khác và chi phí. Chi phí có thể ghi chú mã booking nhưng không gộp thành khoản thu booking.

`reviews` FK tới đúng khách của booking và UNIQUE booking_id; điều kiện COMPLETED/source hợp lệ do command kiểm tra. `complaints` không có quyền thay đổi tiền/đơn. `product_inquiries` là phiếu hỏi và trả lời đơn giản, không là chat realtime hay đơn mua hàng.

Thông báo trong ứng dụng được INSERT vào `notifications` trong cùng transaction nghiệp vụ, UNIQUE(event_key, user_id) chống trùng. Không có bước gửi qua mạng nên MVP chưa cần outbox hoặc worker giao thông báo riêng. Lỗi ghi trước commit làm toàn command rollback/retry; lỗi đọc thông báo sau commit không đảo booking/tiền. Khi bổ sung push/email sau MVP, có thể thêm outbox bằng migration để retry gửi ngoài hệ thống độc lập.

## 10. DB bảo đảm gì, backend còn phải làm gì?

| SQL bảo đảm trực tiếp | Command trong transaction phải bảo đảm |
| --- | --- |
| PK, FK, một owner/hộ, một review/booking | Quyền actor, không đặt hộ mình, chỉ Admin kiểm duyệt |
| Cùng hộ/service/slot/offer ở các liên kết chính | Đơn không rỗng; snapshot/reservation thuộc đúng set của đơn; tổng giá và ngày chung |
| Quantity, giá, khoảng thời gian hợp lệ ở một dòng | Quy tắc offer, sức chứa tổng, quota tổng và exclusive; pool đồng thời |
| Một SENT và một ACCEPTED/request; booking từ proposal duy nhất | Chấp nhận đúng version còn hạn, thay hold nguyên tử, deadline không gia hạn |
| Các trạng thái thuộc tập cho phép | Transition hợp lệ, thu hồi duyệt và xác nhận cùng khóa |
| Liên kết hoàn tiền cùng booking/hộ, một reversal/dòng | Tổng hoàn không vượt nghĩa vụ/tiền thu, correction hợp lệ, không sửa lịch sử |
| Các metadata cần lưu kết quả | Tính COMPLETED/NO_SHOW/INTERRUPTED và giải phóng đúng phần |

CHECK của MySQL không dùng truy vấn con hoặc kiểm tra tổng các dòng/bảng khác; không thể dùng một CHECK để chống trùng thời gian hay overbooking. Các FK ở đây tham chiếu PK hoặc UNIQUE rõ ràng. [MySQL CHECK](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html), [MySQL FOREIGN KEY](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html).

## 11. Thay đổi sau bản demo

- Thêm loại trải nghiệm: thêm category và dữ liệu, không cần thêm bảng.
- Thêm thuộc tính giới thiệu ít truy vấn: tăng schema_version của details, vẫn đọc được revision cũ. Snapshot cũ không rewrite. Thêm loại thực thể nội dung thứ sáu cần migration bổ sung FK và CHECK cho content_revisions; không chỉ thêm một chuỗi content_type.
- Thêm phương thức tính giá: migration CHECK và code tính giá, có kiểm thử; không chỉ thêm nhãn trên UI.
- Nhiều người quản lý hộ: thêm household_memberships và policy; giữ owner hiện tại. Nhiều hộ/tài khoản sẽ cần bỏ UNIQUE owner có kiểm soát.
- Chọn thêm lịch riêng hoặc offer phức tạp: mở rộng cấu hình có version; không chỉnh slot có nghĩa vụ đang hiệu lực.
- Chat, thương mại điện tử, thanh toán online nếu được duyệt sau: module mới tham chiếu users/households/bookings; không dùng financial_entries như đơn hàng hoặc tái sử dụng product_inquiries làm payment.

Những trường hợp này là đường mở rộng, không phải tính năng đã đưa vào MVP. Thiết kế API và các transaction nghiệp vụ là bước triển khai tiếp theo trên schema này.
