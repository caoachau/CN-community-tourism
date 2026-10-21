# Ứng dụng Flutter khách và hộ dân

Hai app dùng chung `tourism_ui`, mặc định kết nối API Express:

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

Backend chưa có API tài nguyên, lịch phục vụ và booking. Các màn chọn ngày và thanh toán cho phép xem bố cục sau khi xác nhận thông báo, không gửi yêu cầu đặt, giữ chỗ hoặc ghi nhận tiền.

## Đối chiếu 9 ảnh thiết kế

Giao diện chạy mặc định được dựng bằng widget Flutter theo 9 ảnh người dùng gửi. Khung máy, tai thỏ và đồng hồ trong ảnh không phải thành phần ứng dụng; Android dùng thanh trạng thái của hệ điều hành. Bản web giới hạn chiều rộng 430 px.

| Trang | Đã hoạt động | Phần được ghi chú và hiện thông báo khi bấm |
| --- | --- | --- |
| Chào mừng | Khám phá, đăng nhập, đăng ký CUSTOMER | — |
| Trang chủ | Nội dung đã duyệt, giá, nhóm dịch vụ, tìm kiếm | Yêu thích, đặt chỗ, tin nhắn, thông báo |
| Tìm kiếm | Từ khóa, loại nội dung, bộ lọc API, phân trang | Xếp hạng phổ biến; bản đồ chỉ xem bố cục |
| Chi tiết | Nội dung, tiện nghi/offer, giá, địa điểm, sao chép liên hệ/thông tin | Đánh giá, yêu thích, tin nhắn và đặt trực tuyến |
| Bản đồ | Thẻ nội dung công khai, chuyển sang chi tiết/tìm kiếm | Nền và ghim chỉ minh họa; không phải tọa độ thật, không định vị/chỉ đường |
| Chọn ngày | Chọn khoảng ngày, số khách, phương thức bán để xem thử | Chưa kiểm tra còn chỗ/tài nguyên, không tạo booking |
| Thanh toán | Tóm tắt lựa chọn và giá dự kiến; thông tin tài khoản | Gửi đặt/ghi thu chưa có API; ví, thẻ và voucher ngoài MVP |
| Cá nhân | Tài khoản thật, đăng nhập/đăng xuất, mở không gian hộ | Sửa hồ sơ cá nhân, yêu thích, lịch sử, đánh giá; số liệu thiếu hiển thị “—” |
| Tổng quan hộ | Hồ sơ hộ, quản lý điểm/phòng/dịch vụ/offer, xét duyệt | Đơn đặt, lượt khách, thu nhập, đánh giá, lịch và tin nhắn |

Ảnh cảnh quan tái sử dụng từ tài nguyên bộ thiết kế. Thẻ dịch vụ ghi “Ảnh minh họa” vì API hiện chưa cung cấp ảnh thực tế. Không dùng số lượt đặt, sao đánh giá, số dư, doanh thu hoặc lịch trống giả. Giá dự kiến chưa phải báo giá chấp nhận; theo giờ cần xác nhận thời lượng. `MissingFeature` trong `lib/src/live/reference_widgets.dart` tập trung nội dung cảnh báo.

Android lưu refresh token bằng secure storage và tắt backup app; access token chỉ giữ trong bộ nhớ. Flutter web và Admin giữ phiên trong bộ nhớ, tải lại trang cần đăng nhập lại. Không lưu token trong localStorage, URL hoặc log. Mở lại app/chuyển tab tải user hiện hành.

## Kiểm tra và build

Chạy `dart analyze` và `flutter test` trong `tourism_ui`, `flutter_khach`, `flutter_ho`. Nếu `flutter analyze` gặp lỗi LSP do đường dẫn Unicode trên Windows, dùng `dart analyze`.

Trong từng app: `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:5000/api/v1`. APK: `build/app/outputs/flutter-apk/app-debug.apk`; bản debug để thử backend local.

Kiểm thử trình duyệt với API/MySQL cục bộ: xem `backend/test/README.md`. Không chạy trên Aiven.

## Xem lại thiết kế demo

`flutter run --dart-define=DEMO_MODE=true` mở 10 màn Stitch cũ, dữ liệu minh họa trong bộ nhớ, không ghi MySQL. Nguồn thiết kế: `design-source.json`. Font Plus Jakarta Sans và Playfair Display kèm giấy phép OFL trong `tourism_ui/assets/fonts`. Không đưa API key Stitch vào mã nguồn.
