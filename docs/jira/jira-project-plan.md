# Community Tourism Platform — Jira project plan

Ngày baseline: 28/09/2026. Project key: **CTP**. Jira Cloud **company-managed**, Scrum. Một sinh viên, **30–35 giờ/tuần**; tám sprint một tuần và hai tuần dự phòng.

Bộ tài liệu này là backlog để theo dõi việc triển khai. Việc tạo bộ Jira không đồng nghĩa đã viết code, cấu hình hạ tầng thật, import issue hoặc hoàn thành bất kỳ chức năng nào. Tất cả issue khởi đầu ở BACKLOG.

## 1. Chỉ mục và số liệu baseline

| Chỉ số | Giá trị |
| --- | --- |
| Epic | 18 |
| Story MVP | 64 |
| Story Post-MVP | 8 |
| Story tổng | 72 |
| Task chuẩn | 0 |
| Sub-task | 145 |
| Issue tổng | 235 |
| SP MVP | 186 |
| SP Post-MVP | 27 |
| SP toàn backlog | 213 |
| Giờ công việc MVP dự kiến | 219 |

- [Backlog đầy đủ](jira-backlog.md): mỗi Epic/Story/Sub-task có Description, AC, priority, estimate, dependency, sprint, labels, component và DoD.
- [Sprint plan](jira-sprints.md): mục tiêu, thứ tự làm trong sprint, capacity và cổng nghiệm thu.
- [Dependencies](jira-dependencies.md): cạnh phụ thuộc, đường găng, rủi ro và traceability.
- [Definition of Done](jira-definition-of-done.md): workflow, DoR, DoD theo loại công việc và cách tự review.
- [CSV import](jira-import.csv): 235 data rows, mỗi issue một record.

**Issue Key dự kiến không phải key Jira đã cấp.** CTP-1..CTP-235 là mã kế hoạch dùng để đối chiếu. Không map chúng vào trường native Issue Key khi tạo mới.

## 2. Phạm vi và cách chia công việc

Giữ đủ 18 Epic theo yêu cầu. Hierarchy dùng **Epic → Story → Sub-task**; không dùng Task chuẩn làm con của Story. Chỉ Story có Story Points (1, 2, 3, 5, 8). Epic/Sub-task để trống SP theo lựa chọn đã chốt; tổng và velocity chỉ cộng Story một lần. Giờ dự kiến cũng chỉ ghi ở Story, đã gồm triển khai, review, test và docs; không cộng thêm công sức children.

| Epic | Tên | Story MVP | Story Post-MVP | SP MVP từ Story |
| --- | --- | --- | --- | --- |
| [CTP-1](jira-backlog.md#ctp-1) | PROJECT SETUP & INFRASTRUCTURE | 4 | 0 | 11 |
| [CTP-2](jira-backlog.md#ctp-2) | AUTHENTICATION & AUTHORIZATION | 3 | 0 | 7 |
| [CTP-3](jira-backlog.md#ctp-3) | HOUSEHOLD MANAGEMENT | 2 | 0 | 5 |
| [CTP-4](jira-backlog.md#ctp-4) | ROOM MANAGEMENT | 3 | 0 | 8 |
| [CTP-5](jira-backlog.md#ctp-5) | SERVICE MANAGEMENT | 1 | 0 | 3 |
| [CTP-6](jira-backlog.md#ctp-6) | SERVICE SLOTS | 2 | 1 | 5 |
| [CTP-7](jira-backlog.md#ctp-7) | AVAILABILITY ENGINE | 3 | 0 | 13 |
| [CTP-8](jira-backlog.md#ctp-8) | BOOKING MANAGEMENT | 5 | 0 | 17 |
| [CTP-9](jira-backlog.md#ctp-9) | PAYMENT LEDGER | 2 | 0 | 8 |
| [CTP-10](jira-backlog.md#ctp-10) | EXPENSE & BASIC FINANCE | 1 | 1 | 3 |
| [CTP-11](jira-backlog.md#ctp-11) | REVIEWS | 1 | 1 | 2 |
| [CTP-12](jira-backlog.md#ctp-12) | CUSTOMER FLUTTER APP | 9 | 2 | 27 |
| [CTP-13](jira-backlog.md#ctp-13) | HOUSEHOLD FLUTTER APP | 8 | 1 | 22 |
| [CTP-14](jira-backlog.md#ctp-14) | REACT ADMIN | 4 | 1 | 10 |
| [CTP-15](jira-backlog.md#ctp-15) | CULTURAL CONTENT | 1 | 1 | 2 |
| [CTP-16](jira-backlog.md#ctp-16) | TESTING & QUALITY | 5 | 0 | 21 |
| [CTP-17](jira-backlog.md#ctp-17) | DEPLOYMENT | 4 | 0 | 9 |
| [CTP-18](jira-backlog.md#ctp-18) | DOCUMENTATION & DEFENSE | 6 | 0 | 13 |

MVP giữ nguyên chất lượng lõi: đa phòng/đa dịch vụ, DATE/UTC, buffer/hạn giữ, state machine, ownership, user block tức thời, policy hộ mất duyệt, OPEN/CLOSED, unique slot, code collision, ledger/idempotency, review tổng thể và thống kê đúng trạng thái.

Giao diện MVP dùng form/list/cards tái sử dụng, lịch dạng danh sách theo ngày và một biểu đồ Admin đơn giản. Mở video URL bằng liên kết; chỉ đường mở Google Maps. Ghi CASH/BANK_TRANSFER/QR chỉ là hộ xác nhận tiền ngoài hệ thống, không xác minh ngân hàng.

Phần bổ sung Low/Post-MVP: banner/carousel, biểu đồ sâu, sửa/ẩn expense có audit, video nhúng, moderation review nâng cao, lịch slot mẫu và tìm theo khoảng cách. CRUD expense của MVP giới hạn thêm/xem; số liệu cơ bản và review công khai vẫn đầy đủ. Không dùng Post-MVP để trì hoãn kiểm thử booking, TLS, quyền hoặc ledger.

## 3. Nguồn lực, ước lượng và vận hành

- 219 giờ công việc đã lên lịch so với 240–280 giờ khả dụng trong tám tuần: còn 21–61 giờ cho planning, phát sinh, lỗi môi trường và điều chỉnh.
- Đây là ước lượng ban đầu cho UI tối giản, tái sử dụng thành phần và đặc tả đã chốt; không phải cam kết hoàn thành. Re-estimate phần chưa bắt đầu sau Sprint 1–2 theo thời gian/velocity thực tế.
- Story Points là độ lớn tương đối trong dự án này, không quy đổi cố định thành giờ và không so với team khác. Không ép sửa SP để làm đẹp biểu đồ.
- Story tối đa 8 SP; Sub-task thường là một phần triển khai hoặc một phần kiểm chứng, mục tiêu hoàn thành trong một ngày làm việc hoặc ít hơn. Tách tiếp nếu thấy quá lớn.
- WIP: một Story chính đang triển khai; một Sub-task đang làm. Có thể đọc tài liệu/chuẩn bị phần độc lập khi gặp blocker nhưng không tuyên bố dependent đã sẵn sàng.
- CODE REVIEW là self-review có checklist và bằng chứng diff đối với đồ án một người; không đặt điều kiện phải có reviewer thứ hai.
- Tám sprint dùng tên/tuần tương đối, chưa gán ngày lịch vì chưa có ngày bắt đầu. Tuần 9–10 là dự phòng, không tự tạo thêm scope hoặc Sprint 9–10 trong CSV.
- Chưa có assignee thật; sau import gán các Story/Sub-task cho tài khoản sinh viên thực hiện.
- Epic có cả MVP/Post-MVP có thể còn mở sau release; nghiệm thu **MVP-1.0** dựa trên Stories Scope=MVP, không ép đóng Epic còn children.

### Ưu tiên

- Highest: tính nhất quán DB, booking, quyền, tiền, concurrency và cổng release.
- High: luồng vận hành/khách chính, hạ tầng và tài liệu cần để bảo vệ.
- Medium: nội dung hỗ trợ MVP như review/văn hóa và tài liệu trung gian; vẫn phải hoàn thành khi nằm Scope=MVP.
- Low: các Story Post-MVP trong baseline.

### Components

- BACKEND
- DATABASE
- FLUTTER_CUSTOMER
- FLUTTER_HOUSEHOLD
- ADMIN_WEB
- INFRASTRUCTURE
- TESTING
- DOCUMENTATION
### Labels được phép

`backend, frontend, flutter, react, database, prisma, aiven, booking, availability, payment, security, testing, deployment, documentation`

Không dùng label ngoài danh sách để thể hiện scope; dùng trường Scope và Planned Sprint.

## 4. Cấu hình Jira và import CSV

### 4.1 Chuẩn bị project

1. Tạo project Scrum company-managed: Community Tourism Platform, key CTP; bật Epic, Story, Sub-task (Bug dùng khi phát hiện lỗi thật).
2. Tạo tám component ở trên và bốn priority Highest/High/Medium/Low.
3. Cấu hình workflow/board theo [DoD](jira-definition-of-done.md), BACKLOG là trạng thái mặc định.
4. Tạo Fix Version `MVP-1.0` và ba custom fields: **Planned Issue Key** (text một dòng), **Planned Sprint** (single select), **Scope** (single select: MVP, Post-MVP, Mixed).
5. Planned Sprint có tám tên sprint đúng trong [sprint plan](jira-sprints.md) và giá trị Post-MVP; Epic để trống.
6. Có thể tạo thêm Acceptance Criteria, Dependencies, Definition of Done dạng paragraph và Planned Hours dạng number. Nếu không tạo, bỏ mapping các cột này: toàn bộ nội dung vẫn có trong Description.
7. Không tạo một custom field mới trùng tên Story Points; map vào trường Story Points chuẩn của board.

### 4.2 Chọn đúng công cụ import

Dùng công cụ **CSV External System Import** có hỗ trợ hierarchy và Issue ID/Parent, với quyền quản trị phù hợp. Công cụ bulk-create CSV thông thường có giới hạn hierarchy. Jira Cloud hiện dùng **Parent**, thay cho Epic Link trong quan hệ cha-con. [Hướng dẫn hierarchy](https://support.atlassian.com/jira/kb/map-issueid-parentid-fields-jira-csv-import/), [giới hạn bulk importer](https://support.atlassian.com/jira-software-cloud/docs/create-issues-using-the-csv-importer/).

Tùy giao diện Jira gọi Issue/Project là Work item/Space. Đối chiếu trường tương ứng; không suy luận các ID kế hoạch là internal ID Jira.

### 4.3 Mapping cột

| Cột CSV | Mapping / cách dùng |
| --- | --- |
| Project Name, Project Key | Chọn project đích CTP; map tên/key nếu wizard cung cấp trường project/space tương ứng. |
| Issue ID | Map Work item ID / Issue ID: số tham chiếu import, không phải key hoặc ID DB Jira. |
| Planned Issue Key | Map custom field cùng tên. Không map sang native Issue Key. |
| Issue Type | Map Work type / Issue type; giá trị Epic, Story, Sub-task. |
| Summary, Description | Map các trường chuẩn; Description chứa cả AC, DoD, dependency và metadata kế hoạch. |
| Parent | Map Parent; số là Issue ID của Epic đối với Story, của Story đối với Sub-task. |
| Epic Name, Epic Link | Giữ để đối chiếu theo yêu cầu; bỏ mapping trong profile Cloud này. Hierarchy lấy từ Parent. |
| Priority, Story Points | Map trường chuẩn; Story Points trống ở Epic/Sub-task. |
| Sprint | Để trống và bỏ mapping ở lần import đầu: chưa có Sprint ID thật. |
| Planned Sprint | Map custom single-select; sau import dùng để chuyển Stories vào sprint thật. |
| Scope, Planned Hours | Map custom fields nếu có. Giờ chỉ có ở Story MVP. |
| Labels, Labels 2, Labels 3, Labels 4 | Map tất cả vào Labels; mỗi ô một label, không tách bằng dấu chấm phẩy. |
| Component | Map Components, dùng đúng tám giá trị đã tạo. |
| Acceptance Criteria, Dependencies, Definition of Done | Map custom paragraph nếu đã tạo; nếu không, bỏ mapping, nội dung đã nằm trong Description. |
| Status, Fix Version | Map BACKLOG và MVP-1.0; Post-MVP và Epic không được gán release MVP một cách giả tạo. |
| Blocks, Blocks 2, … | Map từng cột sang link hướng ra blocks; ô chứa Issue ID của issue phụ thuộc trong cùng CSV. |

Ví dụ: hàng của A có `Blocks=B` nghĩa là **A blocks B**, còn Dependencies của B liệt kê key kế hoạch A. Parent là hierarchy, không phải blocker; Story không chặn chính Sub-task của nó.

Cloud hỗ trợ mapping link type và yêu cầu Work item ID để liên kết. Kiểm tra hướng bằng pilot trước khi import cả file. Nếu wizard đang dùng không cung cấp mapping link, bỏ các cột Blocks rồi tạo link theo bảng dependencies sau khi đối chiếu key thật; không coi việc import cột Dependencies dạng text là đã tạo native link. [Atlassian field mapping](https://support.atlassian.com/jira-software-cloud/docs/mapping-csv-data-to-jira-fields).

### 4.4 Sprint và key thật

CSV cố ý không bịa Sprint ID. Công cụ import có thể yêu cầu ID số thay vì tên. [Atlassian: Sprint ID must be a number](https://confluence.atlassian.com/jirakb/warning-during-csv-import-sprint-id-must-be-a-number-1387596965.html).

Sau import:
1. Tạo tám sprint trên board với đúng tên Planned Sprint.
2. Lọc Story theo Planned Sprint rồi chuyển vào sprint tương ứng; Sub-task đi theo Story cha. Không chuyển Epic hoặc Post-MVP vào sprint.
3. Có thể dùng JQL, vì Planned Sprint là single select:
   `project = CTP AND issuetype = Story AND "Planned Sprint" = "CTP Sprint 1 - Foundation"`
4. Export key thật và Planned Issue Key để giữ bảng đối chiếu. Chỉ dùng key thật khi cập nhật hoặc tạo link với issue đã tồn tại.
5. Không import lại toàn bộ create-file để cập nhật; việc đó có thể tạo bản sao. Bản cập nhật phải dùng key thật đã export.

### 4.5 Preflight và kiểm tra sau import

- File UTF-8 BOM, delimiter comma; mọi cell được quote đúng, mỗi issue một data record. Parent đứng trước children: Epics → Stories → Sub-tasks.
- Chạy Validate của wizard trước khi Import nếu được cung cấp.
- Pilot trong project thử: dùng Epic CTP-1, Story CTP-19/CTP-20 và các Sub-task CTP-91..CTP-94. Khi trích pilot, bỏ Blocks trỏ ra ngoài tập mẫu; không đổi Issue ID/Parent nội bộ.
- Kiểm tra pilot: Epic→Story→Sub-task, CTP-19 blocks CTP-20, labels đa giá trị, Unicode, priority, SP và Description.
- Sau import đầy đủ đối chiếu 18 Epic, 72 Story, 145 Sub-task; 64 Story MVP/186 SP và 8 Story Post-MVP/27 SP.
- Tất cả ban đầu BACKLOG; Sprint native được gán sau, không có task nào tự DONE.
- Các kiểm tra đã thực hiện trong workspace chỉ xác minh dữ liệu/file; import thật và cấu hình tenant Jira phải được xác minh ở tenant đích.

## 5. Quy tắc demo và giới hạn phạm vi

Quy tắc giữ chỗ yêu cầu buffer hai giờ và ít nhất 30 phút xử lý; không thể tạo một đơn sát giờ rồi bỏ qua thời gian để hoàn thành trong demo vài phút.

Dùng hai nhánh dữ liệu:
- Đơn A với lịch tương lai: tạo, xác nhận, ghi thu; có thể hủy và ghi hoàn.
- Đơn B seed ở CONFIRMED, mọi hạng mục đã kết thúc: hoàn thành đúng một lần và review.
- Dữ liệu khác phục vụ expiry, room block, slot CLOSED, household mất duyệt và user bị khóa.

Không có API đổi đồng hồ, rút ngắn business rule hoặc sửa tay DB khi đang bảo vệ. Test tự động có thể kiểm soát fixture/thời điểm nội bộ trong môi trường test tách biệt.

## 6. Nguồn tham khảo Jira

- [CSV format và nhiều labels](https://support.atlassian.com/jira-cloud-administration/docs/import-data-from-a-csv-file/).
- [Parent thay Epic Link và thứ tự hierarchy](https://support.atlassian.com/jira/kb/map-issueid-parentid-fields-jira-csv-import/).
- [Mapping fields, custom fields và issue links](https://support.atlassian.com/jira-software-cloud/docs/mapping-csv-data-to-jira-fields).
- [Sprint report chỉ tính estimate cấp cha, không cộng Sub-task](https://support.atlassian.com/jira-software-cloud/docs/view-and-understand-the-sprint-report).
