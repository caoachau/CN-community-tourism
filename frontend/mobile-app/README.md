# Ứng dụng Flutter khách và hộ dân

Quản lý lịch đã có tại **Quản lý hoạt động → Lịch và sức chứa**: khung giờ, giá theo lịch, tài nguyên, sức chứa, lịch chặn và gỡ chặn. Khách có thể kiểm tra lịch trống trên trang chi tiết phòng/dịch vụ. Kết quả chưa giữ chỗ; API và quy tắc được mô tả tại [CALENDAR.md](../../backend/CALENDAR.md).

Hai app dùng chung `tourism_ui`, mặc định kết nối API Express:

Hồ sơ hộ dân và chi tiết phòng/dịch vụ có quản lý ảnh (JPEG/PNG/WebP, tối đa 8 MiB, 12 ảnh), đổi thứ tự/chọn bìa/gỡ ảnh ở bản nháp, cùng xóa mềm và khôi phục. Khách xem ảnh của phiên bản đã duyệt. Xem [cấu hình storage và API](../../backend/CONTENT.md).

- `flutter_khach`: mở trang chào mừng, sau đó khám phá công khai.
- `flutter_ho`: mở không gian hộ dân; vẫn sử dụng chức năng khách bằng cùng tài khoản.
- `tourism_ui`: HTTP, quản lý phiên, màn hình và tài nguyên thiết kế dùng chung.

## Chạy với backend

Từ repo: `npm run dev:backend`. Cấu hình backend theo `backend/.env.example`; Flutter chỉ nhận URL API, không nhận thông tin MySQL.

Trong thư mục app tương ứng:

```powershell
& 'F:\dev\flutter\bin\flutter.bat' pub get
& 'F:\dev\flutter\bin\flutter.bat' run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api/v1
```

`10.0.2.2` dùng cho Android Emulator. Điện thoại thật dùng IP LAN máy chạy backend, cùng mạng. HTTP chỉ dùng bản debug; bản phát hành cấu hình URL HTTPS của backend đã triển khai. Đổi URL cần chạy/build lại.

Xem web:

```powershell
& 'F:\dev\flutter\bin\flutter.bat' run -d chrome --web-hostname=localhost --web-port=5174 --dart-define=API_BASE_URL=http://localhost:5000/api/v1
```

Thêm `http://localhost:5174` vào `CORS_ORIGIN` của backend rồi khởi động lại (nhiều origin phân cách bằng dấu phẩy). Không truyền `API_BASE_URL`: web mặc định localhost:5000, Android mặc định 10.0.2.2:5000.

## Chức năng đã nối API

- Khách vãng lai: tìm kiếm, lọc, phân trang điểm phục vụ/phòng/dịch vụ; xem chi tiết, giá, phương thức bán và sao chép số liên hệ.
- Tài khoản: đăng ký CUSTOMER, đăng nhập, user hiện hành, tự làm mới phiên, đăng xuất. Mở hộ ở bước riêng, không tự cấp HOUSEHOLD/ADMIN.
- Hồ sơ hộ dân: mở hồ sơ, sửa nháp, gửi xét duyệt, xem lý do và lịch sử; tải lại quyền sau khi Admin duyệt.
- Quản lý điểm phục vụ, phòng theo đêm, dịch vụ: tạo/sửa nháp, gửi duyệt đúng revision/version, xem bản đang công khai và lịch sử, đổi giá, ẩn/tạm ngừng cung cấp.
- ServiceOffer: sáu cách tính giá, ghép/riêng, giới hạn người, đơn vị, điều kiện và phụ phí không cần tài nguyên riêng. Không đồng nhất số người với số đơn vị tính tiền.
- Chọn danh mục từ API và điểm thuộc hộ. Token giá/cấu hình giúp phát hiện xung đột; cần tải lại khi dữ liệu thay đổi.

Admin web tại `frontend/admin-web`: duyệt hộ/điểm/phòng/dịch vụ, quản lý danh mục, khóa/mở tài khoản. Dùng tài khoản ADMIN được cấp nội bộ. Backend kiểm tra role, ownership và khóa tài khoản.

Lịch, tài nguyên và lịch chặn đã có API. Luồng đặt thật hỗ trợ giỏ nhiều phòng/dịch vụ cùng hộ, báo giá từ server, giữ chỗ/hết hạn, xác nhận/từ chối/hủy/hoàn thành, sổ thu/hoàn/điều chỉnh/đảo và review sau hoàn thành. Xem [BOOKINGS.md](../../backend/BOOKINGS.md). Các widget ReferenceBooking/ReferenceCheckout còn lại dành cho kiểm tra bản thiết kế cũ, không được gọi từ nút Đặt ngay của ứng dụng kết nối API.

## Đối chiếu 9 ảnh thiết kế

Giao diện chạy mặc định được dựng bằng widget Flutter theo 9 ảnh người dùng gửi. Khung máy, tai thỏ và đồng hồ trong ảnh không phải thành phần ứng dụng; Android dùng thanh trạng thái của hệ điều hành. Bản web giới hạn chiều rộng 430 px.

| Trang | Đã hoạt động | Phần được ghi chú và hiện thông báo khi bấm |
| --- | --- | --- |
| Chào mừng | Khám phá, đăng nhập, đăng ký CUSTOMER | — |
| Trang chủ | Nội dung đã duyệt, giá, nhóm dịch vụ, tìm kiếm, mục Đặt chỗ | Yêu thích, tin nhắn, thông báo |
| Tìm kiếm | Từ khóa, loại nội dung, bộ lọc API, phân trang | Xếp hạng phổ biến; bản đồ chỉ xem bố cục |
| Chi tiết | Nội dung/ảnh, tiện nghi/offer, lịch trống, chọn đặt thật, review công khai và liên hệ | Yêu thích và tin nhắn |
| Bản đồ | Thẻ nội dung công khai, chuyển sang chi tiết/tìm kiếm | Nền và ghim chỉ minh họa; không phải tọa độ thật, không định vị/chỉ đường |
| Chọn ngày | Phòng theo ngày, slot/offer theo lịch thật, số người/đơn vị/phụ phí | — |
| Giỏ / đặt chỗ | Nhiều hạng mục, báo giá và điều kiện từ server, giữ chỗ, thử lại an toàn | Chuyển tiền qua ví/thẻ và voucher ngoài MVP |
| Cá nhân | Tài khoản, chuyến đi, hủy đơn, review đơn hoàn thành, không gian hộ | Sửa hồ sơ cá nhân, yêu thích; số liệu tổng hợp thiếu hiển thị “—” |
| Tổng quan hộ | Hồ sơ/nội dung, lịch/sức chứa, đơn đặt, sổ tiền và review công khai | Biểu đồ thống kê tổng hợp và tin nhắn |

Ảnh tải lên theo phiên bản được dùng ở các gallery; ảnh thiết kế còn dùng làm ảnh minh họa. Không dùng số lượt đặt, sao đánh giá, doanh thu hoặc lịch trống giả. Giá trị booking được server chốt, bao gồm cách tính theo giờ từ thời lượng slot. `MissingFeature` trong `lib/src/live/reference_widgets.dart` dành cho các phần ngoài phạm vi và màn xem thử cũ.

Android lưu refresh token bằng secure storage và tắt backup app; access token chỉ giữ trong bộ nhớ. Flutter web và Admin giữ phiên trong bộ nhớ, tải lại trang cần đăng nhập lại. Không lưu token trong localStorage, URL hoặc log. Mở lại app/chuyển tab tải user hiện hành.

## Kiểm tra và build

Chạy `dart analyze` và `flutter test` trong `tourism_ui`, `flutter_khach`, `flutter_ho`. Nếu `flutter analyze` gặp lỗi LSP do đường dẫn Unicode trên Windows, dùng `dart analyze`.

Trong từng app: `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:5000/api/v1`. APK: `build/app/outputs/flutter-apk/app-debug.apk`; bản debug để thử backend local.

Kiểm thử trình duyệt với API/MySQL cục bộ: xem `backend/test/README.md`. Không chạy trên Aiven.

## Xem lại thiết kế demo

`flutter run --dart-define=DEMO_MODE=true` mở 10 màn Stitch cũ, dữ liệu minh họa trong bộ nhớ, không ghi MySQL. Nguồn thiết kế: `design-source.json`. Font Plus Jakarta Sans và Playfair Display kèm giấy phép OFL trong `tourism_ui/assets/fonts`. Không đưa API key Stitch vào mã nguồn.
