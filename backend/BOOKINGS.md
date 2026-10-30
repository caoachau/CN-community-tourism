# Thiết kế và vận hành booking

## Phạm vi và quyết định thiết kế

Một booking thuộc **một hộ**, có từ 1 đến 20 hạng mục: nhiều phòng, nhiều khung giờ dịch vụ, hoặc cả hai. Mỗi phòng và mỗi khung giờ xuất hiện tối đa một lần trong giỏ. Khách có thể chọn các phòng với ngày nhận/trả khác nhau. Muốn đặt nhiều hộ, khách tạo booking riêng cho từng hộ để việc xác nhận, hủy và đối soát có một bên chịu trách nhiệm rõ ràng.

`AvailabilityService` là nơi quyết định giỏ có thể được nhận và tính giá. Client chỉ gửi ID, ngày, số người, số đơn vị và phụ phí đã chọn. Server đọc bản đã duyệt, giá hiện hành/giá ghi đè của lịch, điều kiện, lịch chặn, sức chứa, quyền bán và quota tài nguyên. Không nhận giá/tổng tiền do client tự tính.

`POST /bookings/quote` kiểm tra toàn giỏ và trả token của báo giá, chưa chiếm chỗ. `POST /bookings` kiểm tra lại trong transaction; chỉ tạo booking, reservation set, tất cả hạng mục và mức sử dụng tài nguyên khi toàn bộ giỏ hợp lệ. Giá/điều kiện đổi giữa hai bước trả `QUOTE_CHANGED`, khách phải chấp nhận báo giá mới. Báo giá có thể hết chỗ trước khi gửi giữ chỗ.

Tận dụng schema survey hiện có: `bookings`, `reservation_sets`, `booking_items`, `item_resource_usages`, `financial_entries`, `reviews`, `activity_events`. **Không cần migration mới**, không sửa hoặc làm mất dữ liệu cũ. Lịch sử trạng thái dùng sự kiện `BOOKING_STATUS`; không dùng các bảng của schema legacy.

## Khả dụng và tính đồng thời

- Kiểm tra tài khoản/phiên hiện tại, khóa các user liên quan theo ID tăng dần, sau đó khóa hộ, booking và các đối tượng con. Cùng thứ tự với quản lý nội dung/lịch và khóa tài khoản.
- Khóa hộ làm điểm tuần tự hóa việc nhận cam kết của hộ. Các truy vấn số chỗ, lịch chặn và quota dùng locking read `FOR UPDATE`, tránh đọc snapshot cũ của MySQL REPEATABLE READ. Hai khách tranh chỗ cuối chỉ có một người được giữ thành công.
- Khoảng thời gian là `[bắt đầu, kết thúc)`. Ngày phòng đổi thành giờ nhận/trả đã duyệt ở UTC+7, lưu UTC. Phòng là một đơn vị vật lý; sức chứa được kiểm tra theo số khách mỗi phòng.
- Dịch vụ kiểm tra tổng số người của slot, độc quyền, giới hạn phương thức, số đơn vị và quota từng phân công. Tài nguyên cấp hộ đã được phân bổ cho toàn slot, gồm thời gian chuẩn bị/dọn dẹp. `SHARED_ONCE` dùng chung một lần; các quy tắc `PER_PERSON`, `PER_GROUP`, `PER_UNIT`, `FIXED` chiếm quota theo hạng mục.
- Chỉ reservation set `COMMITTED` hoặc `HELD` chưa hết hạn, chưa giải phóng mới chiếm chỗ. Hết hạn không cần chờ worker để chỗ trở lại khả dụng.
- Giữ tối đa 15 phút, không vượt giờ bắt đầu hạng mục đầu tiên; tối đa 5 yêu cầu giữ còn hiệu lực/khách. Không tự gia hạn khi tải lại hoặc thử lại.
- Worker trong tiến trình API chạy khi khởi động và mỗi 30 giây, xử lý tối đa 100 hộ/lượt, không chạy chồng lượt. Nhiều instance vẫn an toàn nhờ transaction/khóa. Dừng và chờ worker trước khi đóng DB.
- Đọc chi tiết và thao tác trạng thái cũng xử lý hết hạn. Danh sách/lọc trả trạng thái hết hạn hiệu lực ngay cả khi worker chưa chạy. Sau khi server khởi động lại, worker tiếp tục quét từ DB.

## Trạng thái và quyền

| Thao tác | Trạng thái đầu | Trạng thái sau | Điều kiện |
| --- | --- | --- | --- |
| Khách giữ chỗ | Chưa có | PENDING + HELD | Tài khoản hợp lệ; hộ đã duyệt, đang công khai; toàn giỏ khả dụng |
| Hộ xác nhận | PENDING | CONFIRMED + COMMITTED | Chưa hết hạn, chưa bắt đầu; hộ còn được duyệt; giữ nguyên snapshot |
| Hộ từ chối | PENDING | REJECTED + RELEASED | Ghi lý do |
| Khách hoặc hộ hủy | PENDING / CONFIRMED | CANCELLED + RELEASED | Trước hạng mục đầu tiên, ghi lý do |
| Hệ thống hết hạn | PENDING | EXPIRED + RELEASED | Đã hết thời gian giữ |
| Hộ hoàn thành | CONFIRMED | COMPLETED + RELEASED | Tất cả hạng mục đã qua giờ kết thúc; hộ xác nhận phục vụ đầy đủ |

CUSTOMER và HOUSEHOLD đều có thể đặt ở hộ khác. `/bookings` là các đơn mình đặt; `/households/me/bookings` là các đơn hộ mình nhận. Không cho tự đặt vào hộ do mình sở hữu. Các lệnh dùng `expectedToken` để tránh ghi đè trạng thái/chứng từ đã thay đổi. Admin được tra cứu booking/sổ tiền và kiểm duyệt review; quyền xác nhận/ghi nhận tiền vẫn thuộc hộ phục vụ.

`NO_SHOW` và `INTERRUPTED` là trạng thái tương thích dữ liệu hiện có, chưa mở lệnh mới cho phục vụ thiếu/một phần. Lệnh hoàn thành chỉ phù hợp khi toàn bộ giỏ đã được phục vụ đầy đủ. Đổi lịch, báo giá riêng và booking offline thuộc luồng mở rộng riêng; không giả lập bằng sửa snapshot booking đã chốt.

## Thử lại và snapshot

Client tạo `idempotencyKey` ngẫu nhiên (16–100 ký tự chữ/số/`_`/`-`) và giữ nguyên toàn bộ body khi thử lại. Mã booking dẫn xuất từ user + key, được bảo vệ bằng unique key DB. Cùng key/cùng input trả đúng booking cũ; khác input trả `IDEMPOTENCY_CONFLICT`. Phiên bản/giá hiện hành không ghi đè giá và nội dung đã chốt.

Chứng từ dùng key + digest lưu trong `evidence`, kiểm tra dưới khóa hộ/booking. Lặp lại cùng yêu cầu trả chứng từ cũ. Không tạo thêm dòng khi client mất mạng rồi gửi lại. Flutter giữ yêu cầu chưa xác định kết quả trong phiên ứng dụng, kể cả khi thoát màn giỏ; khóa chỉnh sửa giỏ và cho thử lại cùng body. Đăng xuất/chuyển tài khoản xóa dữ liệu giỏ và không hiển thị dữ liệu của phiên trước.

Giỏ và yêu cầu chờ của Flutter nằm trong bộ nhớ phiên; nếu ứng dụng bị đóng hoàn toàn, khách kiểm tra danh sách chuyến đi trước khi đặt lại. JWT trên web cũng chỉ nằm trong bộ nhớ theo thiết kế xác thực hiện tại.

## Giá và sổ tiền

VND nguyên, giới hạn từng booking/chứng từ theo DECIMAL(15,0). Tính nhân và làm tròn giờ ở backend bằng BigInt, tránh tràn số trung gian hoặc sai số tiền lẻ. Phòng tính đêm; phương thức theo người/nhóm/chuyến/gói/giờ/đơn vị dùng đúng quy tắc đã định nghĩa. Phụ phí phải có trong phương thức đã duyệt và không vượt số lượng cho phép.

| Loại dòng | Ý nghĩa |
| --- | --- |
| RECEIPT | Tiền đã thu, mục đích DEPOSIT hoặc BALANCE; chỉ CONFIRMED/COMPLETED |
| REFUND_AGREEMENT | Nghĩa vụ hoàn đã thỏa thuận; không làm giảm tiền đang giữ |
| REFUND_ADJUSTMENT | Phần tăng/giảm nghĩa vụ hoàn của một thỏa thuận, không ghi đè dòng cũ |
| REFUND | Khoản đã thực hoàn, liên kết thỏa thuận gốc |
| Dòng có reversesEntryId | Đảo đầy đủ một khoản thu/thực hoàn ghi sai; giữ nguyên chứng từ gốc |

Không xóa/sửa chứng từ. Không đảo dòng đảo, không đảo một chứng từ hai lần. Tổng thu hiệu lực không vượt giá trị booking; tổng hoàn không vượt tiền đã thu hoặc nghĩa vụ hoàn; từng thỏa thuận cũng được kiểm tra riêng. Điều chỉnh nghĩa vụ không được thấp hơn số đã hoàn. Hủy booking giải phóng chỗ, không tự tạo chứng từ tiền hoặc tự suy diễn đã hoàn tiền. Các bên ghi nhận thỏa thuận và thực hoàn riêng. Booking đóng do hủy/từ chối/hết hạn không còn hiển thị khoản phải thu mới.

`receivedVnd`, `refundedVnd`, `netReceivedVnd`, `refundAgreedVnd`, `refundDueVnd`, `balanceDueVnd` là số đối soát của booking sau khi tính dòng đảo. Số còn thu dựa trên giá trị chốt trừ thu hiệu lực; tiền hoàn không tự phát sinh khoản phải thu mới. Lưu `occurredAt`, phương thức thực tế, nội dung và mã tham chiếu/chứng từ. API này ghi nhận tiền thu/hoàn thực tế giữa khách và hộ, không chuyển tiền qua ngân hàng/ví.

## Review

Chỉ khách đứng tên booking COMPLETED được gửi một đánh giá tổng thể (1–5 sao, tối đa 4000 ký tự). Gửi lại nội dung giống nhau an toàn; nội dung khác trả `REVIEW_ALREADY_EXISTS`. Hộ không tự đánh giá đơn khách. Admin ẩn/khôi phục bằng token và lý do, lưu audit; không xóa đánh giá. API công khai chỉ trả review còn hiển thị của hộ đủ điều kiện, số lượng và điểm trung bình; không trả booking ID, tài khoản khách, điện thoại, email hoặc lý do kiểm duyệt.

## API và giao diện

Mọi đường dẫn bên dưới có tiền tố `/api/v1`. Hợp đồng đầy đủ ở `/api/docs` và `/api/openapi.json`.

- `POST /bookings/quote`, `POST /bookings`, `GET /bookings`, `GET /bookings/:id`.
- `GET /households/me/bookings`, `GET /households/me/bookings/:id`.
- `POST /households/me/bookings/:id/{confirm|reject|complete}`, `POST /bookings/:id/cancel`.
- `POST /households/me/bookings/:id/financial-entries`; `POST .../financial-entries/:entryId/reverse`.
- `GET /households/me/financial-entries`.
- `POST /bookings/:id/review`; `GET /public/households/:householdId/reviews`.
- `GET /admin/bookings`, `GET /admin/bookings/:id`, `GET /admin/financial-entries`, `GET /admin/reviews`, `PATCH /admin/reviews/:reviewId`.

Flutter dùng chung package `tourism_ui` cho app khách và hộ. Trang chi tiết → chọn phòng/ngày hoặc slot/phương thức/phụ phí → thêm nhiều hạng mục cùng hộ → Giỏ đặt chỗ → lấy/chấp nhận báo giá → giữ chỗ → chi tiết/theo dõi/hủy. Mục Đặt chỗ hiển thị lịch sử; đơn hoàn thành cho phép viết review. Hộ vào Không gian hộ dân → Lịch đặt/Đơn đặt và sổ tiền để xác nhận, từ chối, hoàn thành, ghi thu/hoàn/điều chỉnh/đảo chứng từ. Tab Đánh giá trên trang chi tiết dùng review thật.

React Admin → Đặt chỗ và sổ tiền: ba tab Booking, Sổ tiền, Đánh giá khách; lọc hộ/trạng thái, phân trang, xem snapshot và lịch sử; ẩn/khôi phục review có lý do. Admin dùng cùng API/DTO với Flutter. Chuyển trang giữ animation `useGSAP` theo scope và tôn trọng reduced motion theo AGENTS.md.

## Kiểm thử

```powershell
npm test
npm run test:db:up
$env:NODE_ENV='test'
node --test backend/test/integration/bookings.test.js backend/test/integration/calendar.test.js
npm run test --workspace frontend/admin-web
npm run check
```

Flutter: `flutter analyze --no-pub`, `flutter test --no-pub` trong `tourism_ui`; build web của app khách trước khi chạy `npm run test:e2e --workspace frontend/admin-web` theo `test/README.md`. Kiểm thử DB chỉ chạy trên schema tạm của harness MySQL cục bộ, không dùng backend/.env/Aiven.

Các ca trọng yếu: tranh phòng/chỗ cuối; giỏ hỗn hợp và rollback; chống trùng khi gửi lại; hết hạn trước worker; giữ nguyên giá cũ; riêng tư/khóa tài khoản; lịch chặn/biên thời gian; quota dùng chung/theo lượt; xác nhận đua hủy; giới hạn giữ; thu/hoàn/điều chỉnh/đảo và audit rollback; review sau hoàn thành và kiểm duyệt; Flutter thử lại sau mất mạng/chuyển màn, đổi phiên, ghi nghĩa vụ không giả thu tiền.

Kết quả local ngày 2026-10-30: 127 unit/HTTP backend; 101 ca tích hợp MySQL trong các suite booking/calendar/content/households/rooms/services, gồm 19 ca booking; 62 shared Flutter + 2 app entry; 10 test client Admin; 5 luồng Chrome/Playwright, tất cả đạt. Luồng trình duyệt mới đặt 2 phòng + 1 dịch vụ trên Flutter, hộ xác nhận, ghi thu, thỏa thuận hoàn và thực hoàn; React Admin đọc đúng cùng booking và sổ tiền. Analyzer Flutter sạch; Flutter web build, kiểm tra cú pháp 75 file backend và React production build đạt. Không thay đổi dữ liệu Aiven, không triển khai hosting trong lượt thực hiện này.
