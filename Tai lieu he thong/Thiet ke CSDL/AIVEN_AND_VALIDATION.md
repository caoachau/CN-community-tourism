# MySQL 8.4.11 trên Aiven và MySQL Workbench

Thông tin chủ dự án xác nhận ngày 10/10/2026: service `community-tourism-db`, MySQL **8.4.11**, database `defaultdb`, port `26464`, dùng MySQL Workbench. Tài liệu không lưu password hoặc Service URI có credential. Chưa kết nối/chạy DDL lên dịch vụ trong bước thiết kế này.

## 1. Kết nối Workbench

1. Tạo connection **Standard (TCP/IP)**, đặt tên tùy ý, ví dụ Community Tourism — Aiven.
2. Điền Hostname từ Aiven Console, port 26464, user được cấp; tài khoản quản trị hiện tại là avnadmin. Mật khẩu nhập trong hộp riêng/vault của Workbench, không dán vào script.
3. Default Schema là defaultdb nếu dùng database hiện có. Trong SSL chọn **Require and Verify Identity**, chọn CA Certificate tải từ đúng dịch vụ Aiven. File `Tai lieu he thong/ca.pem` hiện có trên máy là cấu hình local; cần kiểm tra đúng CA còn hiệu lực.
4. Test Connection. Không cần cấu hình client certificate/private key cho kết nối username/password thông thường này.

Aiven hướng dẫn dùng thông số trong Console và CA trên tab SSL của Workbench. [Aiven: kết nối Workbench](https://aiven.io/docs/products/mysql/howto/connect-from-mysql-workbench).

URI có `ssl-mode=REQUIRED` yêu cầu mã hóa nhưng không thay việc xác minh danh tính server. Lựa chọn Verify Identity kiểm tra CA và hostname; nếu xác minh thất bại, kiểm tra CA/hostname thay vì tắt xác minh. [MySQL Workbench: SSL](https://dev.mysql.com/doc/workbench/en/wb-mysql-connections-methods-standard.html), [Aiven: CA/TLS](https://aiven.io/docs/platform/concepts/tls-ssl-certificates).

## 2. Xem mô hình trước khi tạo bảng

Trong model Workbench, chọn **File → Import → Reverse Engineer MySQL Create Script**, mở `backend/migrations/001_initial_schema.sql`. Script không có CREATE DATABASE/USE nên chọn hoặc đặt tên schema trong model nếu trình nhập yêu cầu. Có thể chia EER Diagram theo các nhóm trong [ERD](ERD.md), rồi lưu `.mwb` trong thư mục tài liệu.

Import vào model là thao tác thiết kế offline, không phải đã chạy schema trên Aiven. [Workbench: reverse engineer từ SQL](https://dev.mysql.com/doc/workbench/en/wb-reverse-engineer-create-script.html).

Giữ file SQL làm nguồn migration. Sau khi sửa EER bằng kéo thả, xem lại SQL diff và quy tắc transaction trước khi đổi database; hình EER không biểu diễn hết CHECK, deadline, tổng quota hoặc quyền actor.

## 3. Khi triển khai schema vào database phát triển

DDL này dành cho **schema trống**, chạy đúng một lần. Nó không có DROP/TRUNCATE, không tự tạo/xóa database, không chứa seed tài khoản hoặc mật khẩu. Không chạy lên database có bảng trùng tên hoặc dữ liệu cần giữ mà chưa lập migration.

Trước khi chạy trong SQL editor của Workbench:

```sql
SELECT VERSION() AS mysql_version, DATABASE() AS selected_schema;
SELECT @@session.sql_mode, @@session.time_zone, @@sql_require_primary_key;
SHOW SESSION STATUS LIKE 'Ssl_cipher';
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
ORDER BY table_name;
```

Nếu defaultdb trống và chính là database phát triển định dùng, chọn **Set as Default Schema**, mở và thực thi `001_initial_schema.sql`. Nếu đã có dữ liệu, dùng database demo riêng tạo trong Aiven Console hoặc lập migration theo schema đang có. File không tự chọn defaultdb nhằm tránh chọn nhầm đích.

Các bảng đều có PK và ENGINE=InnoDB. Không tắt `sql_require_primary_key` hoặc `FOREIGN_KEY_CHECKS` để import. Aiven mặc định yêu cầu PK cho các dịch vụ tạo từ 03/06/2020. [Aiven: primary key](https://aiven.io/docs/products/mysql/howto/create-tables-without-primary-keys).

DDL MySQL tự commit theo statement, không được xem cả file như một transaction có thể rollback toàn bộ. Nếu import dừng, ghi nhận statement lỗi và trạng thái thực tế; không chạy tiếp với chế độ bỏ qua lỗi để coi schema đã đầy đủ. Không tự drop database để sửa lỗi. [MySQL: implicit commit](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html).

Sau import kiểm tra:

```sql
SELECT table_type, COUNT(*) AS total
FROM information_schema.tables
WHERE table_schema = DATABASE()
GROUP BY table_type;

SELECT constraint_type, COUNT(*) AS total
FROM information_schema.table_constraints
WHERE constraint_schema = DATABASE()
GROUP BY constraint_type;

SHOW CREATE TABLE reservation_sets;
SHOW CREATE TABLE slot_resource_usages;
SHOW CREATE TABLE financial_entries;
```

Mục tiêu bản rút gọn v2: **41 base tables, 101 foreign keys, 140 CHECK constraints**, cùng các PK/UNIQUE. Không có trigger, procedure, event scheduler hoặc view yêu cầu quyền SUPER/DEFINER. Migration runner/version tracker sẽ được bổ sung khi triển khai tầng dữ liệu; chưa tự chạy migration khi API boot. Bản 55 bảng chưa được tạo trên Aiven nên file 001 được sửa trực tiếp; file này không phải script chuyển đổi từ 55 bảng có dữ liệu sang 41 bảng.

## 4. Kết nối backend khi triển khai

Driver theo kiến trúc là mysql2/promise; chỉ Express kết nối database, không nhúng host/user/password vào Flutter hoặc React. Secret để trong `.env` local hoặc secret store. Template cấu hình gợi ý (chưa phải database module đã viết):

```dotenv
DB_HOST=<copy-host-from-aiven-console>
DB_PORT=26464
DB_NAME=defaultdb
DB_USER=<runtime-database-user>
DB_PASSWORD=<local-secret>
DB_SSL_CA_PATH=<absolute-path-to-ca.pem>
DB_POOL_SIZE=5
```

Chọn pool nhỏ ban đầu và kiểm tra giới hạn connection thực tế của gói Aiven trước khi tăng. Dùng CA và xác minh hostname; không đặt rejectUnauthorized=false. Session UTC, READ COMMITTED trong Unit of Work; BIGINT/DECIMAL được đọc không mất độ chính xác, ID truyền dạng chuỗi, tiền xử lý số nguyên/decimal.

Tách user chạy migration có CREATE/ALTER/INDEX/REFERENCES với user runtime chỉ có quyền thao tác cần thiết. Không cấp DROP/ALTER/DELETE lịch sử cho runtime; các command lưu trữ dùng archive/reversal. Dọn session hết hạn nếu cần dùng tác vụ/quyền bảo trì riêng. Không cần đổi cấu hình server toàn cục để chạy schema này.

## 5. Trạng thái kiểm chứng và nghiệm thu tiếp theo

Đã kiểm tra ở bước thiết kế:

- Đọc đủ 10 sheet của workbook, kiểm kê 45 tên bảng hợp lệ và chín ghi chú lẫn vào danh mục.
- Phân tích cú pháp DDL bằng SQLGlot dialect MySQL: 41 CREATE, 101 ALTER FK, hai SET; không có câu lệnh bị fallback thành SQL chưa phân tích.
- Kiểm tra cấu trúc FK/PK/UNIQUE, kiểu dữ liệu tham chiếu và tài liệu bằng công cụ local; kết quả cụ thể lưu ở [VALIDATION.md](VALIDATION.md).

**Chưa chạy DDL hoặc kiểm thử hai connection trên MySQL/Aiven**. Máy hiện có Docker CLI nhưng engine không chạy; không dùng SQLite để thay thế rồi khẳng định SQL đã được MySQL chấp nhận. Parser chỉ xác nhận cú pháp mà parser hiểu, không chứng minh mọi giới hạn của server, quyền cloud hay tính đúng cạnh tranh.

Sau khi tạo database thử và viết service command, cần chạy tối thiểu:

| Ca | Kết quả cần đạt |
| --- | --- |
| Hộ A đặt hộ B và thử sửa dữ liệu B | Đặt được; endpoint quản lý B từ chối |
| Chèn room/service item khác hộ; slot/offer khác service; addon khác offer | FK ghép từ chối |
| Revision không có chủ, có hai chủ, sai content_type hoặc publish revision của đối tượng khác | CHECK/FK từ chối; một owner hợp lệ được phép |
| Item không thuộc booking/proposal; item gắn booking từ proposal khác | CHECK/FK từ chối |
| Ghi outcome cho proposal chưa có booking; kết quả cuối thiếu người/thời gian/lý do | CHECK từ chối các trường hợp không hợp lệ |
| Hai lịch T01 giao nhau dù chưa booking | Mở lịch thứ hai bị từ chối trong transaction |
| Pool 10 xe: 6 xe 08–09 và 6 xe 09–10; thêm 4 xe 08–10 | Được; biến thể giao đồng thời vượt 10 bị từ chối |
| Slot có 10 xe, hai request giữ tổng 11 | Không quá 10 sau cả hai transaction |
| Hai booking ghép cùng thuyền | Assignment thuyền chỉ được tính một lần |
| Hai ghép và một thuê riêng chạy đồng thời | Không xuất hiện shared cùng exclusive; không quá capacity/quota |
| Đơn gồm phòng và hai dịch vụ, hạng mục cuối không còn chỗ | Rollback toàn đơn và toàn bộ holds |
| Accept proposal đồng thời replace/expire/revoke | Một kết quả hợp lệ; một booking/request; không trừ hai lần |
| Accept phương án có phòng/dịch vụ/phụ phí | Số dòng item/addon và snapshot giữ nguyên; chỉ gắn booking_id, không tạo bản sao |
| Worker tắt, hold đã quá expires_at | Không còn chiếm phòng/người/quota/private assignment |
| Hủy một booking ghép | Khách khác và tài nguyên chung còn được giữ |
| Ngày phòng nối nhau nhưng checkout16/checkin14 | Từ chối khoảng giờ giao nhau |
| Tất cả SERVED; một PARTIALLY_SERVED; mưa; tất cả khách vắng | Đúng COMPLETED/INTERRUPTED/NO_SHOW, đúng mốc thời gian |
| Cọc 300k, hủy, nghĩa vụ hoàn 200k, hoàn 50k hai lần | Thu300k, hoàn100k, còn hoàn100k; không tự tạo nợ700k |
| Gửi lại command thu/accept cùng key, rồi cùng key khác payload | Replay đúng một kết quả; khác payload bị từ chối |
| Duyệt revision mới và đổi ảnh/giá | Bản công khai đổi sau duyệt; snapshot/giá giao dịch cũ giữ nguyên |
| Thu hồi hộ có PENDING và CONFIRMED | Dừng mới, trả pending; confirmed vẫn phục vụ và ghi tiền |
| Duyệt lại hộ | Không tự mở lại các đơn/yêu cầu đã kết thúc |
| Dòng review của booking ngoài app/không COMPLETED | Bị từ chối; một review hợp lệ tối đa mỗi booking |
| Transaction bị rollback sau ghi notification; retry cùng event_key/user_id | Không để thông báo cho nghiệp vụ thất bại; thành công chỉ một thông báo/người |

Các ca transaction phải dùng MySQL thật và ít nhất hai connection độc lập với điểm đồng bộ tranh chấp; không chỉ gọi tuần tự rồi kết luận đã kiểm thử race condition.
