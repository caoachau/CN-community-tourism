# Harness kiểm thử và MySQL test database

Suite `integration/content.test.js` kiểm chứng quản lý ảnh và xóa mềm/khôi phục bằng HTTP trên schema khảo sát: upload ảnh thật, thứ tự/ảnh bìa/gỡ ảnh, snapshot theo phiên bản, quyền chủ hộ/Admin/khách, giới hạn và upload đồng thời, rollback khi audit lỗi, thu hồi quyền và giữ nguyên dữ liệu đặt phòng. Unit test `content.test.js` kiểm tra giải mã, metadata, giới hạn tài nguyên và storage local. Xem [hướng dẫn chức năng](../CONTENT.md).

Harness dùng Node.js `node:test`, mysql2/promise và MySQL **8.4.11** trong Docker. Unit test chạy độc lập; integration test chạy migration thật và truy vấn trên InnoDB. MySQL local được publish ở loopback `127.0.0.1:3307`.

## Chạy từ thư mục gốc repository

Mở Docker Desktop ở chế độ Linux containers, sau đó:

```powershell
npm install
npm run test:db:up
npm test
npm run test:integration
```

`test:db:up` chờ MySQL healthy. `npm test` chỉ chạy các file `backend/test/*.test.js`, không cần database. `test:integration` không bỏ qua khi database thiếu: lệnh trả lỗi để tránh báo thành công giả. Sau khi database chạy, `npm run test:all` chạy cả hai nhóm.

Dừng và xóa container riêng của test bằng:

```powershell
npm run test:db:down
```

Container không có named volume lưu trữ; `test:db:down` xóa cả anonymous volume của project Compose test để không để lại dữ liệu/rác đĩa. Dữ liệu test mất khi chạy lệnh này. Đây không phải database phát triển hoặc database Aiven. Không đổi cấu hình này để trỏ container vào thư mục dữ liệu thật.

## Database để xem bằng MySQL Workbench

```powershell
npm run test:db:prepare
```

Lệnh tạo một schema mới dạng `ctp_test_<pid>_<random>`, chạy migration và ghi fixture cơ bản. Tên schema được in trong kết quả JSON. Schema được giữ lại để xem trong Workbench đến khi dừng/xóa container test; chạy lại lệnh tạo schema mới và không ghi đè schema cũ.

| Workbench | Giá trị chỉ dùng cho test local |
| --- | --- |
| Connection Method | Standard TCP/IP |
| Hostname | `127.0.0.1` |
| Port | `3307` |
| Username | `ctp_test` |
| Password | `ctp_local_test_only` |
| Default Schema | Tên schema từ `test:db:prepare` |
| SSL Mode | Disabled cho container local này |

Fixture gồm Admin, khách, hai chủ hộ/hộ, danh mục, phòng, dịch vụ, offer ghép/riêng, lịch, thuyền và pool xe. Email dùng miền `.invalid`, liên hệ là dữ liệu giả và password hash là `!TEST_ONLY_NO_LOGIN!`; không dùng fixture này để kiểm thử đăng nhập hoặc làm tài khoản thật. Fixture chạy trong integration test được rollback; fixture của `test:db:prepare` được commit trong schema riêng.

Mỗi schema có **41 bảng nghiệp vụ và một bảng `__test_harness`** lưu mã sở hữu/hash migration. Bảng này chỉ dành cho test, không thêm vào migration nghiệp vụ.

## Cấu hình và bảo vệ phạm vi

- Mặc định dùng URL local riêng có sẵn trong harness. Không đọc `backend/.env`, không dùng `DATABASE_URL` làm fallback.
- Nếu cần thay đổi, copy `backend/.env.test.example` thành `backend/.env.test`; file này được Git ignore và chỉ lệnh test đọc.
- Chỉ tên schema `ctp_test_...` được chấp nhận. `defaultdb`, tên thường, câu SQL trong tên và URL có tùy chọn không được phép đều bị chặn trước kết nối.
- Khi biết `DATABASE_URL` của ứng dụng, harness từ chối cùng hostname/port dù tên schema khác. Không dùng server ứng dụng làm server test.
- Mỗi lượt chạy tạo schema ngẫu nhiên bằng `CREATE DATABASE` không có `IF NOT EXISTS`. Không truncate hoặc reset schema do người dùng chỉ định. Cleanup chỉ xóa schema đã tạo thành công trong lượt đó và kiểm tra token sở hữu nếu marker đã được ghi.
- Không tắt FK/CHECK. Migration chạy từng câu DDL trên schema mới; nếu lỗi thì dừng và dọn schema thuộc lượt chạy. MySQL DDL auto-commit, nên không giả định rollback được migration.
- User `ctp_test` có quyền trên nhóm schema test, không được cấp quyền toàn server. Mật khẩu trong Compose là dữ liệu công khai cho container loopback, không phải secret Aiven.

Test server từ xa phải là một server test riêng, có bootstrap schema `ctp_test_...` và user được quyền tạo/xóa các schema test. Cần `TEST_DATABASE_URL`, `TEST_ALLOW_REMOTE_DATABASE=1` và đúng một trong `TEST_DB_SSL_CA`/`TEST_DB_SSL_CA_PATH`. Nhánh từ xa dùng TLS xác minh CA/hostname như ứng dụng. Không tự cấu hình hoặc tạo tài nguyên cloud trong task này.

## Viết thêm test

Các tiện ích nằm ở `support/`:

| Tiện ích | Mục đích |
| --- | --- |
| `createTestDatabase()` | Tạo schema riêng, chạy các migration đánh số, giữ marker sở hữu và trả hàm kết nối/dọn |
| `database.rollback(callback)` | Transaction cho một test; rollback cả khi callback ném lỗi |
| `database.connect()` | Connection độc lập, session UTC, READ COMMITTED, lock timeout ba giây |
| `concurrentTransactions(database, callbacks)` | Bắt đầu từ hai đến tám transaction trên connection riêng qua barrier; trả mọi kết quả để kiểm tra winner/loser |
| `seedBase`, `seedBooking`, `seedServiceItem` | Dữ liệu kiểm thử với ID trả về từ MySQL, không giả định ID cố định |

Luôn `await database.dispose()` trong `after`. Với test khóa/cạnh tranh, dùng connection riêng và commit thật; transaction rollback bao ngoài một test không thể chứng minh xung đột giữa hai giao dịch. Helper cạnh tranh không tự retry hoặc che deadlock.

Migration preflight hiện hỗ trợ DDL khởi tạo trong repository, tên bảng không qualify database, không stored routine/DELIMITER hoặc dấu chấm phẩy trong literal. Nếu thêm loại migration khác, mở rộng và kiểm thử parser trước khi dùng; không bỏ guard hoặc bật multi-statements tùy ý.

## Phạm vi kiểm chứng

`rooms.test.js` kiểm tra API phòng và Swagger trên schema 003: ownership cho từng route, giá VND theo đêm, giờ nhận/trả địa phương, điểm thuộc hộ, nháp/gửi/duyệt/từ chối, bản công khai cũ, giá chụp khi gửi và snapshot booking thật không đổi sau khi cập nhật giá. Có kiểm tra cam kết COMMITTED/HELD còn hạn, hết hạn trước worker, hạng mục đã giải phóng/kết thúc, đọc cam kết mới sau một consistent read cũ, tranh chấp sửa/giá/duyệt, rollback audit/thông báo, lọc giá/sức chứa, điều kiện công khai, thu hồi phê duyệt và kiểm lại user/role/session dưới khóa. Chạy trên MySQL local riêng cùng auth/households/catalog/services; không ghi lên Aiven. API lịch/khả dụng được kiểm nghiệm trong calendar.test.js; API booking chưa được triển khai.

`services.test.js` kiểm tra API dịch vụ/offer và Swagger trên schema 003: category SERVICE và ownership điểm phục vụ, nháp/gửi/duyệt, snapshot offer, khóa cấu trúc đã gửi/đã gắn lịch, stale profile/offer/token, giá/phụ phí độc lập snapshot, giữ nguyên dữ liệu booking đã chốt, giới hạn 32 offer khi tranh chấp, rollback giá/audit/review/thông báo, public filters cùng một offer, wildcard, các điều kiện công khai và thu hồi quyền. Test chạy trên MySQL local riêng và hồi quy cùng auth/catalog/households; không seed hoặc tạo dữ liệu thử trên Aiven.

`catalog.test.js` kiểm tra HTTP và Swagger contract trên schema sau khảo sát cho danh mục toàn nền tảng, ownership điểm phục vụ, nháp/gửi/duyệt/từ chối, giữ snapshot công khai, tìm kiếm/phân trang, escape wildcard, các điều kiện ẩn theo hộ/tài khoản/điểm và chống lộ dữ liệu JSON lồng nhau. Có kiểm thử FK tham chiếu khi ngừng danh mục, tranh chấp sửa/gửi/duyệt, review trùng, rollback audit/thông báo và kiểm lại quyền sau authentication. Chạy cùng suite auth/households để kiểm hồi quy thứ tự khóa chung; không tạo dữ liệu thử trên Aiven.

`households.test.js` dùng schema sau khảo sát (`002` + `003`) và HTTP/API thật trên database test riêng. Kiểm chứng mở hộ DRAFT, gửi duyệt, từ chối/sửa/gửi lại, công khai phiên bản, cấp HOUSEHOLD bằng transaction và giữ quyền CUSTOMER trên JWT cũ; quyền sở hữu và giới hạn ADMIN; snapshot công khai trong khi bản sửa chờ duyệt; stale version; tranh chấp tạo/sửa/gửi/duyệt; thông báo/audit không ghi trùng; rollback sau khi nâng quyền; kiểm lại role/khóa tài khoản/phiên sau authentication. Test contract đối chiếu cả response mới với Swagger/Ajv. Các test này không tạo hộ hoặc tài khoản thử trên Aiven.

Các test schema/transaction và fixture hiện được ghim vào migration `001` để kiểm thử hồi quy thiết kế cũ: 41 bảng/101 FK/140 CHECK; fixture/rollback; FK khác hộ, slot/tài nguyên; chủ và phiên bản nội dung; công thức giá; kết quả từng hạng mục; một proposal SENT; giữ lịch sử tiền/snapshot; dọn schema; khóa hộ bằng hai connection và tranh unique idempotency. `test:db:prepare` vẫn tạo fixture cũ, không đại diện schema 30 bảng đang triển khai trên Aiven.

Suite có 9 ca cho runner `001`: plan không ghi dữ liệu, cờ tạo database, tạo 41 bảng + `schema_migrations`, replay giữ nguyên dữ liệu, advisory lock, checksum lệch, schema chưa có history, DDL dở dang và phát hiện thiếu FK. Thêm 4 ca trong `schema-replacement.test.js` kiểm chuyển sang 30 bảng qua migration `002`: chuyển/replay, chặn nguồn có dữ liệu, phát hiện ghi phát sinh trước khóa, và khôi phục khi lỗi xác minh sau chuyển đổi. Tổng cộng **27 integration test**. Runner được kiểm tra với ANSI/strict; chỉ chạy trên loopback local, không seed trong bước migration. Không dùng `test:db:prepare` để triển khai Aiven.

Thiết kế hiện tại có thêm 20 nhóm kiểm tra DDL và prototype transaction: chạy `node backend/test/design/validate.mjs` từ thư mục gốc sau khi MySQL test đã chạy. Script chỉ dùng MySQL cục bộ, đọc `Tai lieu he thong/Thiet ke CSDL/schema.sql`; kết quả và metadata được xuất vào `tmp/schema-validation/` đã Git-ignore. Những prototype này chưa thay thế kiểm thử các API nghiệp vụ thực tế.

API lịch/khả dụng có suite `calendar.test.js` riêng, kiểm tra sức chứa, lịch trùng, quota tài nguyên, giữ chỗ hết hạn, ownership và Swagger trên schema khảo sát. Các endpoint tạo/giữ chỗ booking, xác nhận phương án và báo cáo vẫn cần implementation và kiểm thử nghiệp vụ riêng. Việc suite đạt không có nghĩa 12 kịch bản nghiệm thu nghiệp vụ đã hoàn thành.

Workflow [backend-tests.yml](../../.github/workflows/backend-tests.yml) chạy cùng các lệnh trên GitHub Actions với database Docker riêng và không cần secret Aiven. Workflow mới được thêm vào repository; chỉ có kết quả local cho đến khi được push và chạy trên GitHub.

## Kiểm thử giao diện với API thật

Từ repo: `npm run test:db:up`, sau đó `npm run test:e2e --workspace frontend/admin-web`. Cần Chrome đã cài. Playwright tự chạy Vite cổng 5177 và `test/support/ui-server.js` cổng 5005, không đọc `backend/.env`.

Server chỉ hoạt động với `NODE_ENV=test`, dùng MySQL test riêng và schema ngẫu nhiên do harness sở hữu. Dữ liệu và mật khẩu trong test là fixture công khai; không dùng cho tài khoản thật. Teardown xóa đúng schema của lượt chạy. Không chạy migration/seed hoặc thay dữ liệu Aiven.

Kiểm thử Flutter web cần build trước trong `frontend/mobile-app/flutter_khach`:

```powershell
& 'F:\dev\flutter\bin\flutter.bat' build web --no-pub --no-web-resources-cdn --no-wasm-dry-run --base-href=/mobile/ --dart-define=API_BASE_URL=http://127.0.0.1:5005/api/v1
New-Item -ItemType Directory -Force ../../../.cache/ui-e2e/mobile | Out-Null
Copy-Item build/web/* ../../../.cache/ui-e2e/mobile -Recurse -Force
```

Trên Windows build ra `build/web` rồi copy; shader compiler có thể lỗi với `--output` chứa `../`. Chạy riêng Admin khi chưa build Flutter: `npm run test:e2e --workspace frontend/admin-web -- workflows.spec.js`.
