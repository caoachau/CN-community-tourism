# Giao diện Flutter theo thiết kế Stitch

- `flutter_khach`: mở màn chào M1, đi vào giao diện khách M2–M9.
- `flutter_ho`: mở giao diện quản lý chủ hộ M10.
- `tourism_ui`: mã giao diện, ảnh và font dùng chung; nguồn của 10 màn ghi trong `design-source.json`.

Chạy trong thư mục app tương ứng:

```powershell
& 'F:\dev\flutter\bin\flutter.bat' pub get
& 'F:\dev\flutter\bin\flutter.bat' run
```

Vào Cài đặt ở màn Cá nhân hoặc Chủ hộ → Xem 10 màn hình Stitch để kiểm tra từng màn. Hai app chạy độc lập; có thể chuyển giao diện khách/chủ hộ trong cùng phiên demo.

Dữ liệu lưu trong bộ nhớ, đặt lại khi khởi động lại; chưa kết nối API/Aiven, đăng nhập, bản đồ thật, chat realtime hoặc thanh toán gateway. Màn thanh toán dùng giao dịch trực tiếp với hộ, chưa thu phí nền tảng. Mã giảm giá và đánh giá mẫu chỉ minh họa giao diện.

Kiểm tra: `dart analyze` và `flutter test` trong cả `tourism_ui`, `flutter_khach`, `flutter_ho`. Build Android: `flutter build apk --debug`; build web xem thử: `flutter build web --no-web-resources-cdn --no-wasm-dry-run`.

API key Stitch không được đưa vào mã nguồn hay cấu hình ứng dụng. Ảnh lấy từ thiết kế người dùng cung cấp; font Plus Jakarta Sans và Playfair Display kèm giấy phép OFL trong `tourism_ui/assets/fonts`.