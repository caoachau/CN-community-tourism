# Quản lý lịch, sức chứa và khả dụng

Module `src/calendar/` cung cấp 17 thao tác HTTP, được mô tả trong Swagger `/api/docs` và `/api/openapi.json`. Dùng các bảng đã có trong schema `002` + `003`; không thêm migration và không chạy seed lên database ứng dụng.

## API dành cho hộ dân

Tất cả đường dẫn sau có tiền tố `/api/v1/households/me/calendar`, yêu cầu Bearer của chủ hộ (`HOUSEHOLD`). Admin và du khách không được quản lý thay hộ.

| Đường dẫn | Phương thức | Chức năng |
| --- | --- | --- |
| `/slots` | GET, POST | Danh sách hoặc tạo khung giờ dịch vụ |
| `/slots/:slotId` | GET, PUT, DELETE | Chi tiết, cập nhật, lưu trữ khung giờ |
| `/resources` | GET, POST | Danh sách hoặc tạo tài nguyên đơn lẻ/nhóm |
| `/resources/:resourceId` | GET, PUT, DELETE | Chi tiết, cập nhật sức chứa, lưu trữ tài nguyên |
| `/blocks` | GET, POST | Danh sách hoặc tạo lịch chặn phòng/tài nguyên |
| `/blocks/:blockId` | GET, PUT, DELETE | Chi tiết, sửa, gỡ lịch chặn |

Danh sách có `page`, `pageSize` (tối đa 100). Lịch và lịch chặn yêu cầu `from`, `to` với múi giờ rõ ràng, khoảng xem tối đa 93 ngày. Lịch lọc thêm `serviceId`, `includeArchived`; tài nguyên dùng `includeArchived`; lịch chặn có `roomId`, `resourceId`, `includeReleased`. Mặc định ẩn mục đã lưu trữ hoặc lịch chặn đã gỡ. Các bộ lọc tham chiếu phải thuộc chính hộ.

GET trả `token` của bản cấu hình hiện hành. PUT cần `expectedToken` và `reason`. DELETE nhận `{ "expectedToken": "...", "reason": "..." }`, thực hiện lưu trữ/gỡ mềm và giữ lịch sử. Token cũ trả `STALE_VERSION` (409), cần tải lại để đối chiếu. Mã tài nguyên không trùng trong cùng hộ; mã và loại tài nguyên không thay đổi sau khi tạo.

## Khung giờ và tài nguyên

Ví dụ tạo lịch mở bán:

```json
{
  "serviceId": "12",
  "placeId": "8",
  "startsAt": "2030-11-20T14:00:00+07:00",
  "endsAt": "2030-11-20T16:00:00+07:00",
  "personCapacity": 10,
  "visibility": "PUBLIC",
  "salesStatus": "OPEN",
  "readinessStatus": "CONFIRMED",
  "readinessNote": "Đã xác nhận người hướng dẫn và thiết bị",
  "offers": [{ "offerId": "21", "isEnabled": true, "priceOverrideVnd": null }],
  "assignments": [{
    "resourceId": "5", "quantity": 10,
    "allocationMode": "PER_BOOKING_QUOTA",
    "preparationMinutes": 15, "cleanupMinutes": 30,
    "rules": [{ "offerId": "21", "usageBasis": "PER_PERSON", "unitsRequired": 1 }]
  }]
}
```

Khung giờ mới phải nằm trong tương lai và dài tối đa bảy ngày. Có thể lưu DRAFT trước khi chọn phương thức bán và xác nhận sẵn sàng. Mở bán yêu cầu hộ/dịch vụ/điểm được duyệt, đang công khai và hoạt động; các phương thức được bật phải có trong phiên bản dịch vụ đang công khai, còn hoạt động và khớp cấu trúc đã duyệt. `PRIVATE` không được `OPEN`. `OPEN` cần `CONFIRMED`; `CANCELLED` không mở lại. Với cách tính theo giờ, mốc bắt đầu/kết thúc phải là phút nguyên. Chọn `placeId=null` dùng điểm mặc định của dịch vụ.

PUT gửi toàn bộ cấu hình khung giờ cùng `expectedToken`, `reason`; không đổi `serviceId`. `offers` tối đa 32 mục; giá riêng mỗi khung giờ là VND nguyên, chấp nhận 0 hoặc null để dùng giá hiện hành. Tắt phương thức không xóa dòng đã được booking tham chiếu. Giá của booking đã có và snapshot không bị ghi lại.

`assignments` tối đa 32 tài nguyên, mỗi tài nguyên một dòng. `SESSION_SHARED` dành tài nguyên chung cho cả buổi, dùng quy tắc `SHARED_ONCE`. `PER_BOOKING_QUOTA` chia phần dùng giữa các đặt chỗ, hỗ trợ `PER_PERSON`, `PER_GROUP` (cần `maxPeoplePerUnit`), `PER_UNIT` (phương thức bán theo đơn vị), `FIXED`. `unitsRequired` là số đơn vị theo quy tắc. Nếu tài nguyên có giới hạn người mỗi đơn vị, quy tắc không được nới giới hạn đó; bỏ trống kế thừa giới hạn của tài nguyên. Khi mở bán, mọi phương thức đang bật phải có quy tắc cho từng phân bổ.

Tài nguyên được giữ cho cả khung giờ, gồm thời gian chuẩn bị trước và dọn dẹp sau, kể cả lúc khung giờ còn DRAFT hoặc đã CLOSED. Các lịch trùng giờ chỉ cùng tồn tại khi tổng tài nguyên đồng thời không vượt sức chứa. Lưu trữ/hủy khung giờ chưa có cam kết giải phóng phân bổ. Gỡ một phân bổ khỏi cấu hình giữ lại dòng lịch sử và không xóa vật lý. Không giảm tổng số lượng tài nguyên xuống dưới đỉnh đã phân bổ/chặn; không đổi giới hạn người mỗi đơn vị khi còn phân bổ/chặn tương lai. Tài nguyên đang được giữ/chặn không được lưu trữ.

Sức chứa người tính các booking item chưa giải phóng trong reservation set COMMITTED hoặc HELD còn hạn. HELD hết hạn được bỏ qua ngay, không chờ worker. Cam kết thuê riêng chặn mọi lần bán mới của khung giờ; phương thức thuê riêng cũng không nhận thêm khi đã có khách ghép. Phân bổ theo quota trừ `item_resource_usages` thực tế còn hiệu lực; khả dụng còn xét min/max người, đơn vị và giới hạn tài nguyên.

Khi có cam kết còn hiệu lực: không đổi thời gian/điểm/quy tắc phân bổ, không hủy/lưu trữ khung giờ hoặc giảm sức chứa xuống dưới số người đang giữ/đã đặt. Có thể tăng sức chứa, đóng mở bán mới, đổi giá cho các giao dịch tương lai. Các booking và nghĩa vụ phục vụ cũ vẫn giữ nguyên.

## Lịch chặn

Chọn đúng một trong `roomId` hoặc `resourceId`. Ví dụ chặn một phòng:

```json
{ "roomId": "4", "startsAt": "2030-11-20T12:00:00+07:00", "endsAt": null,
  "quantity": 1, "reason": "Bảo trì đến khi có thông báo mới" }
```

`endsAt=null` là chặn không xác định ngày kết thúc. Phòng luôn có `quantity=1`; chặn phòng không được trùng cam kết/giữ chỗ còn hiệu lực hoặc lịch chặn khác. Chặn tài nguyên được theo số lượng, nhưng tổng số chặn và phân bổ đồng thời không vượt `totalQuantity`. Các khoảng là **[bắt đầu, kết thúc)**, nên kết thúc đúng lúc khoảng sau bắt đầu được chấp nhận. Thuật toán quét mốc thời gian tính đỉnh đồng thời, không cộng nhầm các khoảng không trùng nhau. Không sửa mục đã gỡ hoặc đổi đối tượng của một lịch chặn; tạo mục mới nếu cần.

## API công khai

- `GET /api/v1/public/services/:serviceId/slots?from=...&to=...&participants=2&units=1`: lịch công khai đang mở, đã xác nhận sẵn sàng, điểm đủ điều kiện, phương thức còn hợp lệ. Trả thời gian, sức chứa còn lại, đơn giá theo lịch và `available` theo nhóm khách yêu cầu. Khả dụng xét cả quota tài nguyên và thuê riêng; không trả ghi chú nội bộ, liên hệ nhà cung cấp, token hay thông tin người đặt.
- `GET /api/v1/public/rooms/:roomId/availability?checkInDate=2030-11-20&checkOutDate=2030-11-22&guests=2`: lấy giờ nhận/trả đã công khai của phòng theo `Asia/Ho_Chi_Minh` (UTC+7), đối chiếu cam kết và lịch chặn. Khoảng ở tối đa 365 đêm. Trả `available` và lý do chung `AVAILABLE`, `PAST`, `CAPACITY`, `BLOCKED`, `OCCUPIED`; không công khai lý do chặn của hộ.

Cả hai endpoint chỉ phục vụ đối tượng đủ điều kiện công khai theo các API catalog hiện có, dùng `Cache-Control: no-store`. Đây là kết quả đọc tại thời điểm kiểm tra, **không giữ chỗ hoặc tạo booking**. API đặt chỗ tương lai phải kiểm lại trong transaction trước khi cam kết.

## Transaction, kiểm thử và giao diện

Các lệnh ghi khóa lại user → phiên → hộ → đối tượng lịch/tài nguyên và đọc cam kết bằng `FOR UPDATE` hiện hành. Mọi ghi lịch, cấu hình offers/quy tắc và audit commit/rollback cùng nhau. Khóa hộ chung ngăn hai yêu cầu cùng chiếm phần tài nguyên cuối cùng; các module booking sau này phải dùng cùng thứ tự khóa. Đọc công khai cũng khóa hộ trước các đối tượng con để tránh đảo thứ tự khóa. Tham khảo [MySQL locking reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html).

`backend/test/calendar.test.js` kiểm tra thời gian, ranh giới, peak capacity, schemas và quy tắc quota. `backend/test/integration/calendar.test.js` dùng MySQL local riêng, kiểm chứng HTTP/Swagger, quyền sở hữu, tranh chấp, giữ chỗ hết hạn, thuê riêng, lịch chặn mở, rollback audit và current read sau snapshot cũ. Không ghi dữ liệu thử hoặc migration lên Aiven.

Flutter: **Quản lý hoạt động → Lịch và sức chứa**. Có danh sách theo khoảng ngày, tạo/sửa khung giờ, phương thức bán/giá riêng, phân bổ tài nguyên, sức chứa và lịch chặn/gỡ chặn. Trang chi tiết phòng/dịch vụ có **Lịch trống và sức chứa** cho khách không cần đăng nhập; kết quả chỉ tham khảo, chưa giữ chỗ. Các API đầy đủ hỗ trợ cấu hình quy tắc theo từng offer; giao diện phân bổ nhanh áp dụng cùng quy tắc cho các offer đang bật.

Kết quả local ngày 2026-10-30: 123 unit/HTTP backend; 82 integration test trong các suite calendar/rooms/services/households/content (gồm 15 ca lịch); 56 test shared Flutter, hai test app entry và 10 test client quản trị đều đạt. Bốn luồng Chrome/Playwright đạt; luồng Flutter chạy API thật đã tạo/sửa sức chứa khung giờ, thêm tài nguyên, tạo/gỡ lịch chặn và kiểm tra phòng trống không giữ chỗ. Flutter analyze, Flutter web build và React production build đạt. Các bài kiểm thử dùng MySQL local riêng; chưa triển khai hosting thật.
