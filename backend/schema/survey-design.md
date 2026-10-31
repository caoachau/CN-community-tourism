# Schema MySQL sau khảo sát

Thiết kế cho MySQL 8.4.11 / InnoDB, `mysql2/promise`, tiền VND nguyên và timestamp UTC. Hiển thị lịch theo `Asia/Ho_Chi_Minh`; phòng tính theo ngày nhận/trả và số đêm. **Đây là thiết kế/migration, chưa phải API nghiệp vụ hoàn chỉnh hoặc xác nhận đã triển khai Aiven.**

**Triển khai bổ sung 31/10/2026:** migration `004_household_operations.sql` và runtime hủy/giữ chỗ đã được lập trình theo [Thiết kế hộ dân](../../Tai%20lieu%20he%20thong/THIET_KE_HO_DAN.md). BOOKING_CANCEL có base set FK, thời điểm/người/lý do đóng và unique generated key chỉ cho một yêu cầu OPEN/booking. Trạng thái booking vẫn PENDING/CONFIRMED khi chờ hủy, DTO có displayStatus. Migration 004 bổ sung tại chỗ, không chạy lại backfill 003 và không gia hạn hold cũ. Checksum 001–003 giữ nguyên; runner yêu cầu maintenance cho nâng cấp. Chưa chạy 004 lên DB vận hành; các số liệu 20/10 bên dưới là lịch sử kiểm chứng 003.

## 1. Phạm vi và ánh xạ

Giữ **21 thực thể CDM**, triển khai bằng **34 bảng ứng dụng**, cộng `schema_migrations`. [survey-mapping.json](survey-mapping.json) là ánh xạ máy đọc được, có kiểm thử bao phủ mọi bảng. Giữ tên và ID của 30 bảng hiện tại; chỉ thêm:

| Bảng mới | Đại diện trong CDM | Lý do cần lưu riêng |
|---|---|---|
| `places` | Điểm phục vụ | Có định danh, chủ hộ và phiên bản nội dung riêng. |
| `deposit_credits` | Quyền bảo lưu cọc | Có nguồn tiền, người hưởng, điều kiện và vòng đời riêng. |
| `deposit_credit_movements` | Thuộc tính lặp của ÁP DỤNG CỌC BẢO LƯU | Các lần áp dụng/khôi phục cần FK nguồn, số tiền và chống ghi trùng. |
| `resource_handovers` | Thuộc tính lặp của SỬ DỤNG HẠN MỨC | Các lần giao/trả cần FK lần giao gốc, số lượng, người ghi và chống ghi trùng. |

Hai bảng cuối là cấu trúc con vật lý, không thêm thực thể nghiệp vụ vào CDM. Giữ các cặp bảng cũ để không di chuyển/xung đột ID:

- Yêu cầu: `schedule_requests` (lịch riêng/hỏi dịch vụ/đổi lịch) + `product_inquiries` (hỏi sản phẩm).
- Phương án/cam kết: `booking_proposals` + `reservation_sets`.
- Lịch nguồn lực: `slot_resource_assignments` + `availability_blocks`.
- Phản hồi: `reviews` + `complaints` với `feedback_kind=COMPLAINT/INCIDENT`.
- Tiền và nghĩa vụ: cùng `financial_entries`, phân loại chặt bằng `entry_type`, không gộp phép tổng tiền.

`cultural_articles.content_kind` mở rộng nội dung hướng dẫn/điểm đến/nguồn gốc; giữ tên bảng để tương thích. `ARTICLE` trong SQL tương ứng gốc nội dung của CDM. Nguồn nội dung, chứng nhận và điều kiện theo loại nằm trong `content_revisions.details`; chỉ công khai sau khi kiểm chứng. Không có HTX điều phối/đối soát, đơn bán, tồn kho, giao hàng, nhân viên hộ hoặc hành trình.

## 2. Ràng buộc database và trách nhiệm transaction

| Quy tắc | MySQL bảo vệ | Transaction/API còn phải bảo vệ |
|---|---|---|
| Một booking một hộ | FK hộ, các FK ghép có `household_id` | Quyền người gọi, tài khoản ACTIVE và hộ được duyệt khi nhận cam kết mới. |
| Phiên bản nội dung | XOR sáu gốc; UNIQUE gốc/version; FK pointer đúng gốc | Bản công khai phải APPROVED, kiểm quyền tác giả/người duyệt. |
| Yêu cầu đổi lịch | UNIQUE yêu cầu OPEN/PROPOSED trên booking; FK booking/khách/hộ | Trước khi sử dụng; booking CONFIRMED; chỉ đổi thời gian theo MVP. Yêu cầu hết hạn phải kết thúc dưới khóa trước khi mở yêu cầu mới. |
| Phiên bản cam kết | UNIQUE booking/version, tối đa một COMMITTED; base/current/proposal cùng booking/hộ | Base phải đúng current, không tự trỏ/chu kỳ; kiểm phiên bản và toàn bộ hạng mục khi chấp nhận. |
| Giữ chỗ | HELD có hạn hợp lệ, snapshot giá/điều kiện/lịch | Hiệu lực là `expires_at > now`; không phụ thuộc worker. Tính hạn từ mốc giữ đầu, không kéo dài khi sửa. |
| Khả năng phục vụ | Thời gian/số lượng hợp lệ, FK tài nguyên/slot/offer cùng hộ | Khóa và kiểm đỉnh phân công đồng thời, người/quota, quyền độc quyền; tính cả xung đột trong cùng đơn. |
| Quyền bảo lưu | Nguồn RECEIPT/DEPOSIT cùng hộ/booking; điều kiện hạn rõ; FK người hưởng có tài khoản | Nguồn chưa bị đảo; kiểm tiền nguồn chưa cấp/hoàn/dành nghĩa vụ; đúng người hưởng kể cả OFFLINE. |
| Áp dụng/khôi phục | Số tiền dương, operation key duy nhất; RESTORE trỏ APPLY cùng quyền/booking/hộ | Khóa số dư; tổng khôi phục không quá phần đã áp dụng; booking đủ điều kiện; không vừa hoàn vừa khôi phục. |
| Nghĩa vụ hoàn | Nguồn XOR booking/quyền bảo lưu; REFUND trỏ REFUND_AGREEMENT đúng nguồn | Tổng hoàn ròng không vượt nghĩa vụ; điều chỉnh không xuống dưới phần đã hoàn. |
| Đảo sai sót | Duy nhất dòng đảo; cùng hộ, loại, nguồn và số tiền | Không đảo dòng đảo, không chu kỳ; xử lý các quyền/hoàn đã phát sinh từ tiền gốc. |
| Giao/trả | RETURN trỏ ISSUE cùng usage/hộ; operation key duy nhất; số lượng dương | Khóa usage; tổng giao không vượt hạn mức, tổng trả không vượt lượng đã giao; xử lý hỏng/chậm trả. |
| Đánh giá/sự cố | REVIEW duy nhất theo booking, đúng khách qua FK; INCIDENT mới gắn item | REVIEW chỉ khi COMPLETED; incident đúng item của booking đã chốt; quyền riêng tư. |

MySQL không có CHECK xuyên nhiều hàng hoặc kiểm tra FK trì hoãn đến commit. Vì vậy không tuyên bố DDL tự chống hết overbooking/chi quá cọc. Các thao tác nhiều bước phải dùng một connection, transaction và thứ tự khóa chung; không làm kiểm tra và ghi ở hai request riêng.

## 3. Phương án, ba luồng đặt và đổi lịch

`reservation_sets.status` là hiệu lực cam kết (`DRAFT/HELD/COMMITTED/RELEASED`). Quyết định gửi/chấp thuận phương án riêng nằm ở `booking_proposals.status`; quyết định đơn online ban đầu nằm ở `bookings.status`. Không tạo thêm trạng thái quyết định song song trên set. Khi phục vụ API, chiếu hai thông tin này thành một đối tượng phương án như CDM.

- Lịch sẵn: booking PENDING + set INITIAL/HELD + items; hộ xác nhận trong transaction.
- Lịch riêng: request → proposal → set INITIAL/HELD chưa có booking → accept tạo booking và chuyển cùng set sang COMMITTED. Không chép lại items hoặc trả giữ chỗ rồi đặt lại.
- OFFLINE: booking + set INITIAL/COMMITTED; không tạo user giả; lưu kênh và bằng chứng đồng ý.
- Đổi lịch: request BOOKING_CHANGE gắn booking, proposal gắn request/booking, set RESCHEDULE có `version > 1` và `base_set_id` cùng booking. `source_item_id` đối chiếu mỗi hạng mục với bản gốc; API kiểm đúng base, phòng/dịch vụ, số khách, đơn vị thuê và thời lượng không đổi.

`booking_proposals.version` đánh số báo giá của một request; `reservation_sets.version` đánh số phương án của một booking. Hai bộ số độc lập. Yêu cầu lịch riêng trước khi có booking dùng ID/version proposal để chấp thuận. Không tự đồng nhất proposal version 3 với booking version 3.

`bookings.current_reservation_set_id` trỏ phiên bản được chấp nhận gần nhất. Trên đơn hoạt động nó phải COMMITTED; đơn đã hủy/kết thúc có thể giữ pointer tới phiên bản RELEASED để đọc lịch sử. `accepted_proposal_id` và `schedule_request_id` trên booking giữ nguồn tạo đơn ban đầu, không đổi thành request/proposal đổi lịch mới.

Set lưu `total_vnd`, `terms_snapshot`, `first_starts_at`, `last_ends_at`; items lưu giá/lịch/nội dung/địa điểm. Các trường tổng/ngày/điều kiện trên booking là bản tổng hợp của phiên bản hiện hành, cập nhật cùng transaction khi đổi. Không tính lại lịch sử từ giá catalog hiện tại.

Giữ chỗ bản thay thế chỉ thêm phần thiếu: cùng phòng lấy hợp các khoảng; cùng slot/quota lấy `max(cũ,mới)` theo từng chiều của đúng booking/base. Những booking khác cộng đầy đủ. Slot/phân công khác nhau kiểm độc lập; không mượn nguồn lực đang dành cho slot cũ để tạo slot mới trùng giờ. Quyền độc quyền của bản cũ vẫn hiệu lực trong lúc chờ.

Hạn giữ ban đầu: `min(first_hold + 24h, first_use - 2h)`. Với đổi lịch lấy thêm giới hạn bắt đầu cũ và mới. Còn ít nhất 30 phút phản hồi; sửa proposal không gia hạn. Hạn giữ khác chính sách hủy/hoàn và hạn cọc bảo lưu.

Khi accept: khóa hộ → booking → request → proposal/set theo ID → phòng/slot → nguồn lực/phân công theo ID; kiểm lại quyền, thời gian, version/base và khả dụng. Trong cùng transaction, chuyển set cũ sang RELEASED, chuyển set mới COMMITTED, đổi current pointer và bản tổng hợp booking, đánh dấu proposal/request đã nhận, ghi audit/idempotency. UNIQUE COMMITTED buộc nhả trạng thái cũ trước; không nhả bảo vệ khả dụng ra ngoài transaction. Rollback khôi phục toàn bộ nếu bất kỳ bước nào lỗi.

## 4. Nguồn lực, chuẩn bị và phục vụ

Khoảng dành nguồn lực là `[slot.starts_at - preparation_minutes, slot.ends_at + cleanup_minutes)`. Hai buffer mặc định 0; giới hạn kỹ thuật hiện tại 10.080 phút mỗi phía. Không sửa slot/buffer/phân công có cam kết hiệu lực bằng thao tác thông thường. Chặn không rõ giờ kết thúc dùng `ends_at=NULL`, được xem là vô hạn cho tới khi giải phóng/xác định lại, không bỏ qua nó trong truy vấn trùng.

Kiểm phân công nguồn lực bằng đỉnh số lượng đồng thời tại từng thời điểm, không cộng mọi lịch giao nhau một lần. SESSION_SHARED chỉ chiếm ở cấp slot; PER_BOOKING_QUOTA còn phải cộng usages của các set hiệu lực. Hủy một booking không trả nguồn lực chung của các booking khác.

Nguồn lực SINGLE dùng khi cần nhận diện từng ghe/xe; POOL dùng cho các vật đồng loại không cần theo dõi riêng. `resource_handovers` tham chiếu usage → assignment → resource, không chép một tên xe tự do thay FK. Trả trễ/hỏng cần xử lý cam kết kế tiếp và tạo block phù hợp; một bản ghi RETURN không tự giải phóng slot hoặc tự thu phí hỏng.

`booking_items.preparations` chứa danh sách có schema rõ, tối đa 100 phần, không phải sổ kho. Mỗi phần có key, lượng cần/đã chuẩn bị, đơn vị, trạng thái, người/thời điểm ghi; phụ trách chỉ là ghi chú, không cấp quyền staff. API kiểm key không trùng, actor tồn tại/đúng quyền; ghi thay đổi vào `activity_events` cùng transaction. READY khác SERVED.

Giữ độc lập `participant_count`, `quantity`, `actual_participant_count`, `actual_served_quantity/unit` và usages. Ví dụ cam kết 9 suất, chuẩn bị 9, thực ăn 8 không tự đổi giá thành 8. `outcome` và lý do vẫn ở từng item; tổng hợp COMPLETED/NO_SHOW/INTERRUPTED theo quy tắc đã chốt, không dùng kết quả đó tự quyết định hoàn tiền.

## 5. Tiền và cọc bảo lưu

Không thêm bảng nghĩa vụ hoàn: `financial_entries` đã có gốc REFUND_AGREEMENT và các REFUND_ADJUSTMENT. Giữ nguyên ID, các lần thực hoàn và dòng đảo cũ. Queries báo cáo bắt buộc phân loại:

- Tiền thực: RECEIPT, REFUND, OTHER_INCOME, EXPENSE. Cọc = RECEIPT/DEPOSIT, tính một lần. Dòng có `reverses_entry_id` đảo dấu dòng gốc; không cộng dương cả hai.
- Nghĩa vụ: gốc REFUND_AGREEMENT + tổng REFUND_ADJUSTMENT − tổng REFUND ròng. Không tính các dòng nghĩa vụ vào thực thu/chi.
- Bảo lưu: `amount_vnd − tổng APPLY + tổng RESTORE − thực hoàn ròng nguồn quyền`.
- Có thể áp dụng: số dư quyền − nghĩa vụ hoàn nguồn quyền chưa trả; đồng thời trạng thái và hạn còn hợp lệ.

Mỗi quyền có nguồn khoản cọc thật, cùng hộ/người hưởng, điều kiện và bằng chứng đồng ý. Không suy từ số điện thoại để gắn tài khoản. Với OFFLINE, API kiểm hồ sơ người hưởng và nguồn booking OFFLINE; một FK có thành phần NULL không chứng minh được điều này. `expires_at=NULL` chỉ hợp lệ khi `no_expiry_agreed=1`. Hết hạn không tự xóa tiền hay biến thành doanh thu; gia hạn có lý do, đồng ý và audit.

Khóa hộ → các booking liên quan theo ID → khoản thu nguồn theo ID → quyền cọc theo ID → gốc nghĩa vụ/movement theo ID. Kiểm tổng cả khoản thu và booking trước khi cấp quyền; cấm một đồng vừa cấp bảo lưu vừa để hoàn/giữ theo thỏa thuận khác. Khóa gốc APPLY khi khôi phục; thao tác gửi lại dùng cùng operation key và hash yêu cầu, không tự coi mọi duplicate là thành công.

Tiền hoàn từ bảo lưu gắn `deposit_credit_id` thay `booking_id`; FK của agreement kiểm cùng quyền/hộ. Không tạo thêm một nghĩa vụ nguồn booking cho cùng khoản. Khi hộ bị thu hồi duyệt, chỉ xử lý nghĩa vụ cũ và áp dụng vào đơn đã xác nhận hợp lệ; không dùng cọc để nhận booking/đổi lịch mới.

Không có trường balance cho phép sửa tùy ý. Những aggregate nhiều hàng, tính bất biến/append-only và quyền actor vẫn là trách nhiệm service cùng transaction/audit; không mở API UPDATE/DELETE ledger hoặc movements tùy ý.

## 6. Nâng cấp và dữ liệu cũ

Migration `003_survey_schema.sql` bổ sung tại chỗ, không xóa bảng/cột/dòng, không đổi tên hoặc ID cũ. Checksum 001/002 giữ nguyên. Chỉ thay CHECK/index/FK cần thiết bằng cấu trúc tương ứng; mở rộng nullable cho khách đổi lịch OFFLINE và block chưa rõ kết thúc.

Backfill chỉ ghi **các cột mới**:

1. Snapshot từng set lấy từ proposal nếu có, nếu không lấy booking; ngày lấy booking hoặc min/max items với phương án riêng chưa có booking. Giữ nguyên dữ liệu nguồn.
2. Set cũ là phiên bản cam kết đầu tiên (`version=1`), độc lập số version báo giá cũ.
3. Current pointer của booking từng xác nhận lấy set cũ của chính đơn. Không tạo booking, set, quyền cọc, movement, địa điểm hay tiền giả.

Không biết địa điểm/chính sách phòng cũ thì để NULL; không bịa vị trí hoặc điều kiện. Lịch cũ có `readiness_status=AWAITING_CONFIRMATION`, không giả người/ngày xác nhận. Cam kết cũ giữ nguyên; API nhận đặt mới phải yêu cầu CONFIRMED, kiểm địa điểm/điều kiện rõ ràng. Người vận hành rà dữ liệu thiếu trước khi mở bán lại.

Preflight từ chối trước DDL 003 nếu đơn đang hoạt động thiếu/sai set, set HELD/COMMITTED thiếu items/slot, điều kiện nguồn không phải object hoặc dòng đảo cũ sai nguồn/số tiền/đảo của đảo. Báo mã lỗi an toàn, không xuất dữ liệu khách. Không tự chữa bằng xóa dữ liệu hay chấp nhận giả.

Trình tự triển khai thực:

1. Kiểm tra backup và khả năng phục hồi; dừng API/worker ghi nghiệp vụ trong cửa sổ bảo trì. `--maintenance-confirmed` là xác nhận của người vận hành, không tự dừng ứng dụng.
2. Chạy `npm run db:migrate:plan` với cấu hình TLS hiện có; kiểm đúng host/database, history và plan checksum. Không chỉnh checksum lịch sử.
3. Sau khi đồng ý triển khai, chạy runner với `--apply --confirm-host <host> --confirm-database <database> --confirm-plan <checksum> --maintenance-confirmed`. Không chạy file 003 thủ công trong Workbench; không dùng `--create-database` cho database đang có.
4. Runner lấy khóa migration, kiểm cấu trúc cũ và preflight, ghi tiến độ từng statement, backfill, kiểm bảng/cột/PK/FK/index/CHECK và ghi APPLIED. Chạy lại khi APPLIED là no-op.
5. Chạy `db:migrate:verify`, đối chiếu số dòng/giá/lịch/tiền với backup, triển khai backend tương thích rồi mở lại dịch vụ. Không seed production.

Theo [MySQL 8.4 — atomic DDL](https://dev.mysql.com/doc/refman/8.4/en/atomic-ddl.html), DDL commit theo statement; không thể bọc toàn migration bằng một ROLLBACK. Nếu lỗi, history FAILED/RUNNING giữ số statement hoàn tất và runner chặn chạy lại tự động. Giữ bảo trì, so DDL thực tế với checkpoint; thử phương án sửa tiếp/phục hồi trên bản sao trước. Không tự DROP phần đã tạo, không reset history để chạy lại và không phục hồi đè dữ liệu phát sinh sau backup.

## 7. Kiểm chứng và giới hạn

Kết quả local ngày 20/10/2026 trên MySQL 8.4.11: 94/94 unit tests; 60 ca integration ngoài nhóm nâng cấp đạt; nhóm nâng cấp đã chạy lại đạt 5/5 sau khi sửa việc tái sử dụng prepared statement giữa các schema test. Bản SQL xuất ra được nhập vào một schema trống độc lập và đối chiếu thành công: 34 bảng ứng dụng, 461 cột, 112 FK, 174 CHECK (cộng bảng history là 35 bảng và 175 CHECK). Chưa kết nối hoặc chạy migration/seed lên Aiven trong task này.

- Unit tests bảo vệ checksum cũ, SQL parser và manifest.
- `survey-migration.test.js`: schema trống, schema có dữ liệu, bất biến mọi cột cũ, replay, preflight và lỗi DDL giữa chừng.
- `survey-schema.test.js`: ánh xạ 21→34, FK cùng hộ, revision XOR, unique phương án hiện hành, các gốc tiền/giao trả và số lượng độc lập.
- Auth integration chạy trên schema mới, giữ đăng ký CUSTOMER, kế thừa CUSTOMER của HOUSEHOLD, ownership và khóa tài khoản.

Những test trên không thay bộ nghiệm thu API KS-01–14: vẫn phải triển khai và kiểm thử tranh chấp khả dụng, expiry/accept/revoke, giới hạn hoàn/khôi phục và tổng kết phục vụ khi xây các service tương ứng.

`npm run db:schema:export` tạo lại bản SQL tham khảo trong `Tai lieu he thong/Thiet ke CSDL/schema.sql` từ MySQL test cục bộ; bản này chỉ dành cho schema trống mới và không chứa migration history. Nguồn nâng cấp có thẩm quyền vẫn là các migration đã đánh số.
