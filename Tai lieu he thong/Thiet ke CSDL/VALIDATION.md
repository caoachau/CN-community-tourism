# Kiểm tra thiết kế rút gọn v2

Ngày kiểm tra: 10/10/2026. Đích triển khai theo thông tin chủ dự án: Aiven MySQL 8.4.11. Đây là kiểm tra local cho artifact thiết kế; chưa kết nối hoặc thay đổi database cloud.

| Kiểm tra đã chạy | Kết quả |
| --- | --- |
| SQLGlot 30.22.0, dialect MySQL, lỗi parse ở mức RAISE | PASS: 144 statements = 41 CREATE + 101 ALTER FK + 2 SET; không có Command fallback |
| PK và ENGINE | PASS: 41 bảng có một PK id và InnoDB |
| FK/UNIQUE và kiểu cột | PASS: 101 FK trỏ bảng/cột có thật, đúng thứ tự tuple PK/UNIQUE, khớp kiểu dữ liệu hai đầu |
| CHECK | PASS kiểm tra cấu trúc 140 CHECK: không subquery, không tham chiếu cột ngoài bảng hoặc id AUTO_INCREMENT |
| Logic CHECK mới | PASS: 182 trường hợp bằng bộ đánh giá biểu thức local trên AST đọc từ DDL; không phải thực thi MySQL |
| Chủ revision | Kiểm tra 160 tổ hợp: năm content_type × 32 cách có/không năm FK chủ; chỉ đúng một chủ, khớp loại được chấp nhận |
| Vòng đời item/outcome | Kiểm tra 22 trường hợp cho room_items/service_items: không vô chủ, booking cần reservation, proposal chưa nhận không có kết quả, kết quả cuối cần người/thời gian/lý do theo quy tắc |
| Lineage proposal → booking | Kiểm tra cấu trúc FK ghép booking_id/proposal_id/household_id tới đúng accepted_proposal_id; reservation_id UNIQUE trên mỗi loại item |
| Thông báo | Kiểm tra cấu trúc UNIQUE(event_key,user_id); không còn FK event_id hoặc bảng outbox |
| Tên constraint | PASS: không trùng, không quá 64 ký tự |
| Từ điển và ERD | PASS: tên bảng ở hai tài liệu khớp đủ 41 bảng của DDL |
| Link local của bộ thiết kế | PASS: các liên kết tới artifact đã tạo và workbook nguồn tồn tại |
| gitignore | PASS: 32 trường hợp cho hai app Flutter, env, CA, SQL, tài liệu, source và lockfile |
| File cấu hình local | PASS: env.docx và ca.pem vẫn tồn tại trên máy, đã bỏ khỏi stage và được ignore |
| Credential trong SQL/tài liệu mới | Không phát hiện URI có mật khẩu hoặc token Aiven theo mẫu kiểm tra; không đọc/chép nội dung env.docx |
| npm run check / npm test | Đã PASS ở lượt cập nhật workspace trước; lượt rút gọn chỉ sửa SQL/tài liệu nên không chạy lại. Hai test cũ là health/404, không phải test CSDL |
| git diff --check | PASS ở các file tracked đã sửa |

SHA-256 của `backend/migrations/001_initial_schema.sql` tại lần kiểm tra:

```text
5d4368663146ead323c57273216a78dbb75c79b0d70fd9c2a2ed88a61c21c37b
```

SQLGlot và script rà soát dùng ở thư mục tmp local bị ignore, không thêm dependency vào backend. Chưa tạo file Workbench `.mwb`, chưa chạy Flutter build, chưa triển khai driver/kết nối API/database.

## Đánh đổi của việc rút 55 xuống 41 bảng

- Revision chung có năm cột FK nullable và CHECK đúng một chủ. Giảm bốn bảng/luồng kiểm duyệt trùng cấu trúc; thêm một loại nội dung mới vẫn cần migration FK/CHECK. Quyền sở hữu phải truy qua đúng đối tượng gốc.
- Ảnh dùng chung bảng nối revision; không thay đổi quy tắc bản công khai và bản chờ duyệt.
- Item chung giữ nguyên snapshot báo giá sau accept, gắn thêm booking_id. Backend phải khóa các cột snapshot từ lúc gửi và không đếm cùng item hai lần trong báo cáo proposal/booking. Future sửa booking sau xác nhận sẽ cần version/điều chỉnh riêng, hiện ngoài MVP.
- Kết quả nằm trong item nên có thêm nhóm cột kết quả trên các dòng đang chờ hoặc proposal nháp; các cột này phải trống/UNRESOLVED cho đến khi phục vụ booking. Mọi chỉnh kết quả cần audit.
- Bỏ outbox riêng: notification là thao tác ghi DB trong transaction nghiệp vụ. Lỗi ghi trước commit làm rollback/retry cả command; lỗi đọc sau commit không ảnh hưởng booking/tiền. Nếu cần gửi ngoài app hoặc retry tạo thông báo độc lập, thêm outbox sau.

Không cắt luồng lịch riêng, hai cấp tài nguyên, độc quyền, phê duyệt bản sửa, thu/hoàn hoặc audit để đạt con số 41. Chưa kết nối hoặc chạy migration trên Aiven.

SQL parser không thay thế MySQL server. Các bất biến cạnh tranh tài nguyên, accept/replace/revoke, tiền và phân quyền còn phải được triển khai và kiểm thử trên MySQL thật theo [danh sách nghiệm thu](AIVEN_AND_VALIDATION.md).
