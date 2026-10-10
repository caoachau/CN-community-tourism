# Transaction và khả dụng — bản rút gọn v2

Các thuật toán dưới đây là hợp đồng triển khai cho Express/mysql2. DDL một mình không thực hiện chúng; chưa coi đây là API đã viết hoặc kiểm thử cạnh tranh đã chạy.

## 1. Thứ tự khóa chung

Mọi command thay đổi khả dụng, giá dùng khi chốt đơn, phê duyệt hộ hoặc tiền của hộ:

1. Lấy một connection; đặt session UTC và isolation READ COMMITTED; bắt đầu transaction.
2. Khóa dòng `households` của **hộ cung cấp** bằng `SELECT ... FOR UPDATE`. Không dùng hộ của người đang đặt thay cho hộ cung cấp.
3. Đọc lại quyền actor và eligibility của hộ. Tra kết quả idempotency đã commit trước khi từ chối vì trạng thái/deadline mới; replay đúng payload trả lại kết quả trước.
4. Khóa lần lượt rooms → resources → service_slots → schedule_requests → booking_proposals → bookings → reservation_sets → reservations → refund_agreements/financial_entries. Trong mỗi loại, khóa theo ID tăng dần; mọi đường ghi dùng cùng thứ tự.
5. Sau khi lấy đủ khóa, lấy một `UTC_TIMESTAMP(6)` làm thời gian kiểm tra; đọc lại version, thời hạn và trạng thái.
6. Kiểm tra toàn bộ payload, gồm các hạng mục xung đột với nhau. Ghi snapshot, giữ chỗ/trạng thái/tiền, history, audit, notifications và kết quả idempotency trên **cùng connection**.
7. Commit rồi trả kết quả. Rollback toàn bộ nếu thiếu bất kỳ tài nguyên, sai version, mất quyền hoặc xung đột unique.

Đọc trước transaction chỉ phục vụ giao diện; không phải quyết định còn chỗ. Household lock là lựa chọn đơn giản hóa của demo: command cùng hộ được tuần tự hóa. Không bỏ khóa này ở luồng ngoài app, worker hết hạn, đóng lịch, chặn tài nguyên hoặc thu hồi duyệt. Bổ sung đường ghi mới cũng phải dùng quy ước đó.

Locking read phải chạy trong transaction, không giữ khóa bằng một query autocommit rồi viết trên connection khác. [MySQL: Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html).

Không gọi mạng, upload hoặc chờ người dùng trong transaction. Deadlock/lock timeout retry toàn command hữu hạn, rollback trước retry. Duplicate idempotency key: rollback command đang tranh chấp, đọc kết quả đã commit và so request_hash; payload khác trả lỗi. Key của thao tác tiền/accept không được dọn sớm làm mất bảo đảm replay.

## 2. Điều kiện cam kết còn hiệu lực

Với `reservation_sets rs`, thời điểm quyết định `:now`, set hiệu lực khi:

```sql
rs.status = 'COMMITTED'
OR (rs.status = 'HELD' AND rs.expires_at > :now)
```

Ngoài điều kiện trên, từng reservation phải có `released_at IS NULL`. RELEASED không hiệu lực. Khi hủy/từ chối/kết thúc cần trả phần giữ, command cập nhật cả trạng thái set/dòng và booking/proposal trong transaction, không để booking đã hủy mà set còn COMMITTED.

Ví dụ đọc lượng người/quyền độc quyền của một lịch **sau khi đã khóa hộ**:

```sql
SELECT COALESCE(SUM(r.participant_count), 0) AS used_people,
       COALESCE(MAX(r.is_exclusive), 0) AS has_exclusive,
       COUNT(*) AS commitment_count
FROM slot_reservations r
JOIN reservation_sets rs ON rs.id = r.reservation_set_id
WHERE r.slot_id = :slot_id
  AND r.released_at IS NULL
  AND (rs.status = 'COMMITTED'
       OR (rs.status = 'HELD' AND rs.expires_at > :now));
```

`:parameter` là ký hiệu tài liệu; mysql2 dùng placeholder `?` và mảng tham số. Không ghép input vào SQL. Nếu đang thay proposal, loại set cũ khỏi phép tính **chỉ trong transaction đang thay thế**, không loại mọi hold của cùng khách hoặc cả request khác.

Quota mỗi assignment dùng SUM(slot_resource_usages.quantity) qua các slot_reservations còn hiệu lực tương tự. Không dùng SUM(participant_count) làm số xe trừ khi rule thật sự PER_PERSON và hệ số tương ứng.

## 3. Mở lịch: kiểm tra tài nguyên cấp hộ

Một assignment đang giữ tài nguyên nếu chưa released và:

- Slot PUBLIC/OPEN; hoặc
- Slot có ít nhất một slot_reservation chưa released, thuộc set hiệu lực.

Điều kiện này phải tính từ thời gian hiện tại để private hold hết hạn nhả tài nguyên ngay dù worker chưa cập nhật. Chỉ nhìn `sales_status=CLOSED` để bỏ assignment là sai. Không cần cộng các booking usages ở cấp này.

Thuật toán cho mỗi resource:

1. Lấy assignment hiệu lực và resource_blocks chưa released giao khoảng xét; mỗi dòng là `(start, end, quantity)`.
2. Thêm **tất cả** phân công dự kiến của command. Khi sửa phân công hợp lệ không có cam kết, thay các dòng cũ tương ứng trong tập tính; không cộng đúp cũ+mới.
3. Tạo sự kiện `+quantity` ở start, `-quantity` ở end. Gom delta cùng thời điểm trước khi cộng dồn; cách tương đương là xử lý end trước start.
4. Tổng lớn nhất không vượt total_quantity. Chỉ chọn các dòng giao `[newStart,newEnd)` khi kiểm tra một lịch; nếu nhiều lịch mới, kiểm tra toàn vùng thời gian và toàn bộ tập dự kiến.
5. Kiểm tra xong tất cả resource rồi mới ghi slot/assignment/offer/rule và OPEN trong cùng transaction.

Ví dụ pool 10 xe:

| Khoảng đang phân | Lượng |
| --- | ---: |
| 08:00–09:00 | 6 |
| 09:00–10:00 | 6 |
| Lịch mới 08:00–10:00 | 4 |

Đỉnh sử dụng là 10, không phải 16. Nếu hai lịch cũ là 08:00–09:30 và 09:00–10:00, đoạn 09:00–09:30 đã dùng 12; lịch phân mới phải bị từ chối. Tài nguyên SINGLE có total_quantity=1 áp dụng cùng phép tính.

Room block cũng dùng [start,end), chống trùng với room_reservations hiệu lực. Phòng không nhân số phòng từ guest_count. Không cho chặn/cắt giảm tài nguyên đang có nghĩa vụ.

## 4. Đặt trong lịch: ghép, riêng, người và quota

Với từng hạng mục dự kiến:

- Kiểm tra offer đúng service, slot_offer đang cho phép nhận mới, slot/hộ/nội dung đủ điều kiện. Lịch đóng sau khi giữ không tự vô hiệu một cam kết cũ hợp lệ.
- Tính quantity và tiền ở backend. PER_HOUR lấy duration_minutes từ lịch có độ chính xác phút, không dùng giờ khách tự nhập. Không làm tròn tiền dựa trên quantity giờ đã làm tròn bốn chữ số.
- Kiểm tra min/max participants, giới hạn mỗi đơn vị bán và tài nguyên; số người phải khớp khả năng phục vụ thực tế.
- SHARED: không có exclusive hiệu lực; tổng người hiện tại + toàn bộ người mới ≤ capacity; mỗi quota hiện tại + toàn bộ usages mới ≤ assigned quantity.
- EXCLUSIVE: không có bất kỳ cam kết xung đột nào, kể cả item ghép trong chính command. Sau đặt độc quyền không nhận thêm người dù còn capacity.
- SHARED_ONCE không tạo dòng slot_resource_usages để trừ lại cả thuyền. Chụp cấu hình tài nguyên chung vào resource_usage_snapshot để lưu lịch sử.

Giới hạn người của tài nguyên SESSION_SHARED áp dụng cho **tổng người của chuyến**, không chỉ từng booking: một thuyền tối đa sáu người không được nhận hai booking bốn người dù person_capacity bị cấu hình là tám. Khi mở lịch phải kiểm tra capacity với giới hạn tài nguyên chung; khi nhận đặt kiểm tra tổng người dự kiến lần nữa. Với PER_BOOKING_QUOTA, kiểm tra người của item không vượt lượng tài nguyên item nhận × max_people_per_unit và tổng quota không vượt assignment. Nếu nhiều tài nguyên cùng giới hạn người, phải thỏa từng giới hạn, không cộng sức chứa thuyền với sức chứa hướng dẫn viên.

Tính tổng dự kiến trước insert hoặc có accumulator trong transaction; không kiểm từng dòng cùng một số remaining ban đầu. Hai booking ghép tranh chỗ cuối và một booking riêng được tuần tự qua cùng hộ/slot; chỉ các kết quả cùng thỏa điều kiện mới commit.

## 5. Ba luồng và deadline

### A — Online

Tính earliestStart từ tất cả phòng/dịch vụ. `expires=min(now+24h, earliestStart-2h)`. Yêu cầu `expires-now >= 30 phút`. Tạo booking PENDING, reservation_set HELD, room/slot reservations, quota và snapshot nguyên tử. `hold_expires_at` booking bằng expires_at set.

Confirm kiểm tra PENDING, account active, hộ APPROVED, còn hạn, set đầy đủ; chuyển booking CONFIRMED và set COMMITTED. Giữ deadline cũ để audit nhưng không dùng nó hết hạn set COMMITTED. Reject/expiry/cancel hợp lệ trả đúng set của đơn.

### B — Request → ProposalHold → Booking

Request mới không giữ gì. DRAFT có thể mô tả service chưa có slot. Send materialize slot PRIVATE/CLOSED nếu lịch mới, phân resource, tạo set HELD, reservation từng item và deadline. Lưu first_hold_started_at/initial_hold_deadline một lần trên request. Kiểm tra đủ 30 phút.

Replace:

1. Khóa request, phiên bản cũ, cam kết cũ cùng các đối tượng cần thay theo quy ước.
2. Tính deadline mới `min(deadline_cũ, initial_hold_deadline, earliestStart_mới-2h)`; không gia hạn nếu lịch dời muộn. Cần còn tối thiểu 30 phút.
3. Tính trạng thái dự kiến bỏ **chỉ phần cũ của phương án này**, thêm toàn bộ phần mới. Assignment của private slot cũ chỉ được bỏ khi không còn bất cứ nghĩa vụ nào khác; slot PUBLIC/OPEN vẫn chiếm assignment.
4. Nếu khả dụng không đủ, rollback giữ nguyên version, snapshot và hold cũ. Nếu đủ, bản cũ SUPERSEDED/set RELEASED, tạo bản mới SENT/set HELD và ghi audit cùng transaction.

Accept nhận proposal_id + version + idempotency key. Khóa, đọc lại thời gian sát thao tác chuyển, kiểm tra customer sở hữu request, đúng bản SENT còn hạn, hộ vẫn APPROVED, holds đầy đủ và các snapshot đã chốt.

Tạo booking CONFIRMED/CUSTOM_PROPOSAL; gắn booking_id vào **tất cả room_items/service_items của đúng proposal** trong khi giữ proposal_id. Không INSERT/copy lại item, không sửa snapshot giá/lịch/điều kiện hoặc addon; giữ nguyên room/slot reservation IDs. Đặt reservation_sets.booking_id, status=COMMITTED, giữ proposal_id; proposal ACCEPTED, request ACCEPTED. Không giải phóng rồi đặt lại, không tạo set thứ hai. Booking và request có UNIQUE để ngăn accept hai lần, ngoài idempotency.

FK ghép của item buộc booking.accepted_proposal_id khớp proposal_id nếu cả hai có giá trị. Command vẫn phải kiểm tra đủ các item, đúng set, tổng tiền/min-max thời gian, không đính kèm thiếu hoặc thêm hạng mục từ nguồn khác. Sửa một phương án chưa được nhận tạo version mới và các dòng item mới, không tái sử dụng rồi ghi đè snapshot version cũ.

Accept tranh với sửa/hết hạn/thu hồi chỉ một transition hợp lệ thắng. Mọi sửa snapshot/version đã gửi ngoài quy trình replace bị cấm. Request hết hạn/đóng không tự khởi động vòng báo giá mới; khách tạo yêu cầu mới nếu muốn tiếp tục.

### C — Ngoài ứng dụng

Tạo CONFIRMED/OFFLINE với customer_user_id=NULL, source channel, người nhập và thông tin liên hệ. Cùng engine kiểm tra phòng/tài nguyên/độc quyền; set COMMITTED ngay. Không áp hạn chờ 30 phút hoặc kết thúc giữ trước 2 giờ vì không có bước chờ xác nhận. Không tạo user giả, không tự ghép qua phone và không có quyền review.

## 6. Hủy, kết quả, thu hồi và tiền

Hủy toàn đơn khi now < first_starts_at; chủ hộ phải ghi lý do. Hủy booking ghép chỉ release reservations/usage thuộc set đó. Assignment của slot còn OPEN hoặc phục vụ khách khác vẫn giữ. Khi slot CLOSED và hết nghĩa vụ hiệu lực, assignment có thể được giải phóng, history giữ nguyên.

Sau khi bắt đầu, ghi nhóm cột outcome trên room_items/service_items: mặc định UNRESOLVED; kết quả cuối phải có outcome_recorded_by/outcome_recorded_at, lý do và phần phục vụ theo điều kiện. Không ghi kết quả khi item chưa có booking. Ghi audit trước/sau cho mỗi correction; chỉ cập nhật cột kết quả, không cập nhật giá/lịch/điều kiện snapshot. Chỉ giải phóng phần chắc chắn không sử dụng: phòng có thể rút ends_at khả dụng khi khách đã rời và ghi audit; giờ snapshot trên item không đổi. Với slot còn người khác, không rút giờ hoặc giải phóng tài nguyên chung. Không thay slot bằng thao tác sửa thông thường để né cam kết.

Thu hồi duyệt khóa household trước. Cập nhật approval/history, kết thúc PENDING (CANCELLED với SYSTEM và lý do thu hồi), đóng request chưa ACCEPTED, proposal chưa accept INVALIDATED, release hold, đóng slot. Duy trì set COMMITTED/assignment của CONFIRMED và quyền xử lý đơn cũ. Confirm/accept trước khi revocation lấy khóa và commit được giữ; revocation thắng trước thì cam kết mới thất bại. Reapprove không hồi sinh request/hold.

Ghi tiền khóa cùng household/booking/agreement; chỉ owner tài khoản active. Kiểm tra loại, nguồn, amount, reversal, tổng nghĩa vụ và thực hoàn. Ghi một entry, audit, idempotency trong transaction. Cancel hoặc outcome không tự insert REFUND.

Tiền nhận = SUM(RECEIPT có dấu đảo), thực hoàn = SUM(REFUND có dấu đảo), còn hoàn = tổng agreement + adjustments − thực hoàn. Điều chỉnh giảm nghĩa vụ dưới thực hoàn bị từ chối. Đảo khoản thu có thể làm net thu nhỏ hơn thực hoàn nên phải kiểm tra lại đối chiếu tổng thể; correction liên quan cần thực hiện nguyên tử.

## 7. Kiểm tra nhất quán bắt buộc trước commit

- Booking/proposal gửi có item; parent household, service, offer, addon và reservation khớp. Proposal DRAFT không tham gia khả dụng.
- Mỗi item đã gửi có đúng reservation trong set của chính parent; reservation có đúng người, exclusivity, thời gian và quota tương ứng snapshot. FK ghép hiện có không thay toàn bộ kiểm tra này.
- Các room item có cùng kỳ lưu trú của booking/phương án; first/last và tổng tiền đúng.
- Không sửa giá/điều kiện đã gửi, snapshot đã nhận; không sửa slot có cam kết hiệu lực.
- HELD không được confirm/accept từ thời điểm expires_at; mọi tập đọc khả dụng bỏ hold hết hạn ngay.
- Review chỉ customer cùng booking COMPLETED, không OFFLINE. Nhóm cột outcome trên item và booking tổng nhất quán; audit giữ những lần sửa kết quả.
- Revision có đúng một FK chủ và đúng content_type; kiểm tra ownership qua đối tượng gốc trước sửa/duyệt. Ảnh mới thuộc revision mới, con trỏ published_revision_id chỉ đổi khi Admin duyệt.
- Notification có event_key ổn định, UNIQUE(event_key,user_id); chỉ ghi trong transaction, không gọi mạng. Nếu insert lỗi trước commit thì rollback/retry toàn command; đọc thông báo sau commit không đảo nghiệp vụ đã commit. Chưa có worker retry việc tạo thông báo riêng.
- Audit không lưu password, access/refresh token hoặc connection URI; thông báo không chứa bí mật.

DDL không cung cấp trigger hay procedure thay thế service layer. Khi backend được viết, chạy kiểm thử đồng thời thật trên MySQL, gồm rollback sau khi đã giữ một số hạng mục; không dùng kết quả test SQLite để tuyên bố đúng concurrency MySQL.
