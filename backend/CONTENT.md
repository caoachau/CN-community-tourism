# Quản lý thông tin và hình ảnh

Hồ sơ hộ dân, phòng và dịch vụ đã có tạo/xem/sửa, quản lý giá/mô tả/điều kiện, hình ảnh và xóa mềm/khôi phục. Không cần migration mới: dùng `archived_at` và bảng `revision_media` đã có trong schema `002` + `003`.

## Xóa và khôi phục

Gọi `DELETE` tại `/api/v1/households/me`, `/api/v1/households/me/rooms/:roomId` hoặc `/api/v1/households/me/services/:serviceId`. Body JSON: `{ "revisionId": "123", "version": 2, "reason": "Ngừng cung cấp" }`.

Xóa là lưu trữ bằng `archived_at`, không xóa cứng. Hộ bị lưu trữ làm toàn bộ nội dung con ẩn khỏi danh mục công khai. Bản công khai, phiên bản, hình ảnh, tài khoản và các cam kết đặt dịch vụ/phòng vẫn được giữ lại. Gọi `POST <cùng đường dẫn>/restore` với cùng cấu trúc body để khôi phục; nội dung trước đó đủ điều kiện sẽ được công khai lại. Khôi phục phòng/dịch vụ yêu cầu hộ chưa bị lưu trữ. Trạng thái ngừng hẳn (`RETIRED`) vẫn giữ nguyên sau khôi phục.

Chỉ chủ hộ được thao tác; Admin không được thao tác thay hộ. Lệnh đối chiếu revision mới nhất, khóa lại user/phiên/hộ/đối tượng, rồi ghi thay đổi và nhật ký trong cùng transaction. Yêu cầu lặp lại đúng trạng thái là no-op, không ghi trùng nhật ký.

## Ảnh theo phiên bản

Tại mỗi đường dẫn đối tượng ở trên:

- `GET /images`: ảnh của bản mới nhất. Có thể truyền query `revisionId` để xem ảnh của phiên bản cũ thuộc đối tượng đó. Response có `revisionId`, `version`, `status`, `images`, `mediaToken`.
- `POST /images?revisionId=...&version=...&expectedToken=...`: gửi **byte ảnh trực tiếp**, Content-Type `application/octet-stream`, `image/jpeg`, `image/png` hoặc `image/webp`. Tối đa 8 MiB/ảnh, 12 ảnh/phiên bản, 25 triệu pixel; chỉ ảnh tĩnh JPEG/PNG/WebP hợp lệ. Server giải mã, xoay theo EXIF, thu về tối đa 2000×2000 và mã hóa WebP, bỏ EXIF/GPS. Tối đa hai tác vụ giải mã đồng thời trên một tiến trình.
- `PUT /images/order`: body `{ "revisionId": "123", "version": 2, "expectedToken": "...", "imageIds": ["8","7"], "coverImageId": "8" }`. Danh sách phải chứa đủ các ID hiện có, không trùng. Phiên bản có ảnh luôn có đúng một ảnh bìa.
- `DELETE /images/:imageId`: body gồm `revisionId`, `version`, `expectedToken`. Gỡ ảnh khỏi bản nháp và tự chọn ảnh bìa mới nếu cần.

Chỉ sửa ảnh ở bản `DRAFT`, chưa lưu trữ. Với phòng/dịch vụ, hộ phải được duyệt và đối tượng chưa ngừng hẳn. Sau khi gửi duyệt hoặc đã có kết quả, người dùng lưu bản sửa để tạo nháp mới; ảnh cũ được sao chép bằng tham chiếu trong cùng transaction. Thứ tự và ảnh bìa của bản đang công khai được giữ nguyên. `mediaToken` chống ghi đè giữa các thiết bị; thay đổi cũ trả `STALE_VERSION` (409), cần tải lại để đối chiếu.

Admin xem `GET /api/v1/admin/revisions/:revisionId/images` cho phiên bản đã gửi duyệt. Khách xem `GET /api/v1/public/{households|rooms|services}/:resourceId/images` cho phiên bản đang công khai và đủ điều kiện. URL ảnh tương đối với `/api/v1`, ví dụ `/media/<uuid>.webp`. `GET /api/v1/media/:key` phục vụ ảnh công khai; ảnh nháp hoặc lịch sử cần Bearer của chủ hộ hoặc Admin. Ảnh của nội dung ẩn/ngừng/lưu trữ và tài khoản bị khóa không được đọc công khai kể cả khi đã biết URL. Response ảnh dùng `private, no-store`, `nosniff`. Không nhúng JWT vào URL.

## Lưu trữ cục bộ và production

Development mặc định lưu tại `backend/storage/media/` (Git-ignore); `MEDIA_STORAGE_DIR` có thể đổi sang thư mục riêng. Thư mục phải được giữ lại khi restart và sao lưu cùng dữ liệu ứng dụng. Không phục vụ thư mục này bằng static middleware: API kiểm quyền trước mỗi lần đọc.

Production mặc định dùng `MEDIA_STORAGE_DRIVER=s3`. Cấu hình **bucket riêng tư**, `MEDIA_S3_BUCKET`, `MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`; dùng `MEDIA_S3_ENDPOINT` nếu nhà cung cấp tương thích S3 yêu cầu, và `MEDIA_S3_FORCE_PATH_STYLE=true` nếu cần. Tài khoản ứng dụng cần GetObject/PutObject/DeleteObject trên bucket. API proxy byte ảnh sau kiểm quyền; không cần bucket public, CORS bucket hay URL công khai. Không lưu secret trong Git. Các thao tác tệp có timeout và retry giới hạn.

Nếu dùng đĩa persistent trên máy chủ, có thể đặt `MEDIA_STORAGE_DRIVER=local` và `MEDIA_STORAGE_DIR` trỏ đúng mount. **Render Free dùng filesystem tạm thời: cần cấu hình S3 để giữ ảnh qua các lần deploy/restart.** Thiếu cấu hình production trả `MEDIA_STORAGE_UNAVAILABLE` khi đọc/ghi ảnh, không âm thầm lưu vào đĩa tạm. Việc tạo bucket và triển khai tài khoản thật không được thực hiện bởi các bài kiểm thử.

Gỡ ảnh không xóa tệp đang được lịch sử/phiên bản khác tham chiếu. Upload thất bại sẽ rollback metadata và cố gắng xóa object vừa tạo. Không đặt lifecycle xóa toàn bộ bucket theo tuổi, vì các bản công khai và lịch sử vẫn cần ảnh cũ. Khi chuyển storage driver, phải di chuyển tệp và metadata tương ứng trước; các object của driver khác không được đọc nhầm.

## Kiểm chứng

`npm test` kiểm tra dữ liệu ảnh thật, giới hạn, mã hóa và storage local. `npm run test:integration` chạy thêm `content.test.js` trên MySQL local riêng: HTTP/Swagger, ownership, ảnh nháp/công khai/lịch sử, copy phiên bản, thứ tự/bìa/gỡ ảnh, archive/restore, tranh chấp và rollback. Không chạy migration/seed hay ghi dữ liệu lên Aiven.

Flutter: mở Hồ sơ hộ dân hoặc chi tiết phòng/dịch vụ → **Hình ảnh hồ sơ**, **Xóa / lưu trữ**, **Khôi phục hồ sơ**. Giá và các điều kiện phục vụ vẫn chỉnh bằng form hiện có. Khách xem ảnh đã duyệt trong danh sách/chi tiết; Admin xem ảnh ở hai cột đối chiếu phiên bản.

Kết quả local ngày 2026-10-30: 119 unit/HTTP backend, 108 integration test trong các suite auth/households/catalog/rooms/services/content, 10 test API client quản trị, 51 test shared Flutter và hai test app entry đều đạt. Bốn luồng Playwright chạy thành công với Chrome headless và MySQL riêng, gồm chọn tệp/tải hai ảnh bằng Flutter web, đổi thứ tự/chọn bìa/gỡ ảnh, archive/restore phòng và xem ảnh nháp bằng Admin trước khi công khai. React production build, Flutter web build và Flutter analyze đạt. Storage local đã được kiểm chứng; chưa kết nối bucket S3 hoặc triển khai hosting thật.
