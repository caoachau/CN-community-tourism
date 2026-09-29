# Jira backlog — Community Tourism Platform

Baseline: 235 issue = 18 Epic + 72 Story + 145 Sub-task. Trong đó 64 Story MVP = 186 SP và 8 Story Post-MVP = 27 SP. Không có Task chuẩn nằm dưới Story; công việc chi tiết dùng Sub-task.

Mã CTP-* dưới đây là **key dự kiến**, không phải key Jira đã cấp. Chỉ Story có SP; Epic/Sub-task để trống theo quyết định đã chốt. Tất cả trạng thái ban đầu BACKLOG. Sprint ở tài liệu là sprint kế hoạch; CSV native Sprint để trống đến khi có ID thật.

Mỗi issue có AC/DoD riêng. Profile DoD và cách xử lý N/A ở [jira-definition-of-done.md](jira-definition-of-done.md). Estimate giờ chỉ ở Story MVP, đã gồm children, review, test và tài liệu.

## Chỉ mục Epic

| Key | Epic | MVP Stories | Post-MVP Stories | SP MVP |
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

## CTP-1 — PROJECT SETUP & INFRASTRUCTURE

<a id="ctp-1"></a>
### CTP-1 — PROJECT SETUP & INFRASTRUCTURE

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 1 |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | backend, database, deployment |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Nền tảng chạy được, kết nối Aiven bằng TLS và có migration, seed, Swagger, logging. Phạm vi được phân rã thành 4 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Nền tảng chạy được, kết nối Aiven bằng TLS và có migration, seed, Swagger, logging.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-19"></a>
### CTP-19 — Dựng monorepo, Express và môi trường phát triển

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-1 (Epic) |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | backend, database, deployment |
| Dependencies | Không có |
| Blocks | CTP-20, CTP-21, CTP-23, CTP-24, CTP-34, CTP-93, CTP-95, CTP-99, CTP-101, CTP-121 |
| DoD profile | INFRA |

**Description**

Là người phát triển, tôi cần dựng monorepo, Express và môi trường phát triển để đạt mục tiêu: Nền tảng chạy được, kết nối Aiven bằng TLS và có migration, seed, Swagger, logging. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Monorepo có backend, admin-web, mobile-app và docs; Express có health endpoint chạy bằng lệnh README.
2. Env mẫu, gitignore, scripts và cấu hình build không chứa credential thật.
3. Xác minh Node/Git và Flutter/Android SDK; chạy được APK debug tối thiểu hoặc ghi blocker môi trường cụ thể trước khi bắt đầu chức năng mobile.
4. Skeleton React được tạo và build được; quy tắc UTF-8, log và tên biến môi trường được thống nhất.

**Definition of Done**

- Cấu hình/artefact hạ tầng hoàn thành và tái lập được; env mẫu không chứa secret thật.
- Kết nối/build/health/migration hoặc smoke test tương ứng pass, có bằng chứng và kiểm tra thủ công.
- Target môi trường được xác minh; không làm mất dữ liệu ngoài phạm vi; có hướng dẫn chẩn đoán/khôi phục phù hợp.
- Swagger/migration/README cập nhật khi liên quan; authorization/validation không áp dụng phải ghi lý do.

<a id="ctp-91"></a>
### CTP-91 — Dựng repository, Express và React skeleton

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-19 (Story) |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | backend, database, deployment |
| Dependencies | Không có |
| Blocks | CTP-92 |
| DoD profile | INFRA |

**Description**

Đóng góp cho CTP-19 — Dựng monorepo, Express và môi trường phát triển. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Monorepo có backend, admin-web, mobile-app và docs; Express có health endpoint chạy bằng lệnh README.
2. Env mẫu, gitignore, scripts và cấu hình build không chứa credential thật.
3. Skeleton React được tạo và build được; quy tắc UTF-8, log và tên biến môi trường được thống nhất.

**Definition of Done**

- Cấu hình/artefact hạ tầng hoàn thành và tái lập được; env mẫu không chứa secret thật.
- Kết nối/build/health/migration hoặc smoke test tương ứng pass, có bằng chứng và kiểm tra thủ công.
- Target môi trường được xác minh; không làm mất dữ liệu ngoài phạm vi; có hướng dẫn chẩn đoán/khôi phục phù hợp.
- Swagger/migration/README cập nhật khi liên quan; authorization/validation không áp dụng phải ghi lý do.

<a id="ctp-92"></a>
### CTP-92 — Kiểm chứng toolchain Flutter/Android và hướng dẫn chạy

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-19 (Story) |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | backend, database, deployment |
| Dependencies | CTP-91 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-19 — Dựng monorepo, Express và môi trường phát triển. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh Node/Git và Flutter/Android SDK; chạy được APK debug tối thiểu hoặc ghi blocker môi trường cụ thể trước khi bắt đầu chức năng mobile.
2. Làm theo hướng dẫn tại máy và ghi rõ SDK/JDK/Android toolchain đã kiểm chứng; không ghi pass nếu còn blocker.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-20"></a>
### CTP-20 — Kiểm chứng Prisma–Aiven TLS và kết nối từ Render

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-1 (Epic) |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 5 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | DATABASE |
| Labels | prisma, aiven, database, deployment |
| Dependencies | CTP-19 |
| Blocks | CTP-22, CTP-24, CTP-40, CTP-76, CTP-97, CTP-101, CTP-133, CTP-206 |
| DoD profile | DEV |

**Description**

Là người phát triển, tôi cần kiểm chứng Prisma–Aiven TLS và kết nối từ Render để đạt mục tiêu: Nền tảng chạy được, kết nối Aiven bằng TLS và có migration, seed, Swagger, logging. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Chọn và khóa bộ phiên bản Prisma/client/driver sau khi kết nối Aiven bằng TLS xác minh CA/hostname thành công.
2. CA sai bị từ chối; log không lộ credential; không dùng cấu hình bỏ xác minh chứng chỉ.
3. Migration tối thiểu, đọc/ghi và rollback chạy trên DB phát triển riêng.
4. Backend tối thiểu trên Render kết nối được Aiven; lưu bằng chứng và cấu hình mẫu.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-93"></a>
### CTP-93 — Cấu hình Prisma, CA và kết nối Aiven

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-20 (Story) |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | DATABASE |
| Labels | prisma, aiven, database, deployment |
| Dependencies | CTP-19 |
| Blocks | CTP-94 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-20 — Kiểm chứng Prisma–Aiven TLS và kết nối từ Render. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Chọn và khóa bộ phiên bản Prisma/client/driver sau khi kết nối Aiven bằng TLS xác minh CA/hostname thành công.
2. CA sai bị từ chối; log không lộ credential; không dùng cấu hình bỏ xác minh chứng chỉ.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-94"></a>
### CTP-94 — Chạy probe migration, rollback và kết nối Render

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-20 (Story) |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | DATABASE |
| Labels | prisma, aiven, database, deployment |
| Dependencies | CTP-93 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-20 — Kiểm chứng Prisma–Aiven TLS và kết nối từ Render. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Migration tối thiểu, đọc/ghi và rollback chạy trên DB phát triển riêng.
2. Backend tối thiểu trên Render kết nối được Aiven; lưu bằng chứng và cấu hình mẫu.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-22"></a>
### CTP-22 — Tạo schema, migration và seed nền tảng MVP

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-1 (Epic) |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | DATABASE |
| Labels | database, prisma, aiven |
| Dependencies | CTP-20, CTP-21 |
| Blocks | CTP-25, CTP-29, CTP-30, CTP-36, CTP-39, CTP-43, CTP-44, CTP-51, CTP-77, CTP-103, CTP-111, CTP-113, CTP-125, CTP-131, CTP-139, CTP-141, CTP-155, CTP-208 |
| DoD profile | DEV |

**Description**

Là người phát triển, tôi cần tạo schema, migration và seed nền tảng MVP để đạt mục tiêu: Nền tảng chạy được, kết nối Aiven bằng TLS và có migration, seed, Swagger, logging. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Schema có users, households, rooms, services, slots, booking và hai bảng items, blocks, payments, expenses, reviews, cultural posts, ảnh và lịch sử.
2. Room/block dùng DATE; instant dùng UTC DATETIME(3); tiền dùng DECIMAL(15,0); không có rooms.quantity hoặc booked_quantity.
3. Unique gồm booking_code, booking-room, booking-slot, service-start-end, review-booking và khóa idempotency.
4. Migrate DB rỗng và seed demo chạy lại an toàn; demo gồm 1 admin, 2 hộ, 5 khách, không dùng mật khẩu thật.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-97"></a>
### CTP-97 — Tạo schema và migration có ràng buộc dữ liệu

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-22 (Story) |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | DATABASE |
| Labels | database, prisma, aiven |
| Dependencies | CTP-20, CTP-21 |
| Blocks | CTP-98 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-22 — Tạo schema, migration và seed nền tảng MVP. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Schema có users, households, rooms, services, slots, booking và hai bảng items, blocks, payments, expenses, reviews, cultural posts, ảnh và lịch sử.
2. Room/block dùng DATE; instant dùng UTC DATETIME(3); tiền dùng DECIMAL(15,0); không có rooms.quantity hoặc booked_quantity.
3. Unique gồm booking_code, booking-room, booking-slot, service-start-end, review-booking và khóa idempotency.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-98"></a>
### CTP-98 — Seed dữ liệu và kiểm tra tái tạo database

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-22 (Story) |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | DATABASE |
| Labels | database, prisma, aiven |
| Dependencies | CTP-97 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-22 — Tạo schema, migration và seed nền tảng MVP. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Migrate DB rỗng và seed demo chạy lại an toàn; demo gồm 1 admin, 2 hộ, 5 khách, không dùng mật khẩu thật.
2. Đối chiếu schema/migration với ERD và kiểm tra seed không chứa mật khẩu thật.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-23"></a>
### CTP-23 — Chuẩn hóa validation, lỗi, log và Swagger nền

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-1 (Epic) |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | High |
| Story Points | 2 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security, documentation |
| Dependencies | CTP-19 |
| Blocks | CTP-25, CTP-32, CTP-103, CTP-117 |
| DoD profile | DEV |

**Description**

Là người phát triển, tôi cần chuẩn hóa validation, lỗi, log và Swagger nền để đạt mục tiêu: Nền tảng chạy được, kết nối Aiven bằng TLS và có migration, seed, Swagger, logging. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Response success/error và pagination thống nhất; lỗi validation, auth, not-found, conflict được ánh xạ đúng HTTP.
2. Log có request ID và che dữ liệu nhạy cảm; không trả stack nội bộ ở môi trường triển khai.
3. Swagger /api-docs có security scheme và các endpoint nền hiện hữu.
4. Health/readiness phân biệt tiến trình chạy với kết nối DB; CORS/helmet/rate-limit được cấu hình qua env.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-99"></a>
### CTP-99 — Tạo middleware validation, lỗi và logging

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-23 (Story) |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security, documentation |
| Dependencies | CTP-19 |
| Blocks | CTP-100 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-23 — Chuẩn hóa validation, lỗi, log và Swagger nền. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Response success/error và pagination thống nhất; lỗi validation, auth, not-found, conflict được ánh xạ đúng HTTP.
2. Log có request ID và che dữ liệu nhạy cảm; không trả stack nội bộ ở môi trường triển khai.
3. Health/readiness phân biệt tiến trình chạy với kết nối DB; CORS/helmet/rate-limit được cấu hình qua env.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-100"></a>
### CTP-100 — Hoàn thiện Swagger base và kiểm tra HTTP contract

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-23 (Story) |
| Epic | CTP-1 — PROJECT SETUP & INFRASTRUCTURE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security, documentation |
| Dependencies | CTP-99 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-23 — Chuẩn hóa validation, lỗi, log và Swagger nền. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Swagger /api-docs có security scheme và các endpoint nền hiện hữu.
2. Gọi thử các response success, validation, auth, not-found, conflict và đối chiếu OpenAPI.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-2 — AUTHENTICATION & AUTHORIZATION

<a id="ctp-2"></a>
### CTP-2 — AUTHENTICATION & AUTHORIZATION

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-2 — AUTHENTICATION & AUTHORIZATION |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 1, Sprint 2 |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Xác thực ba vai trò, kiểm tra user hiện hành, ownership và chặn JWT của user bị khóa. Phạm vi được phân rã thành 3 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Xác thực ba vai trò, kiểm tra user hiện hành, ownership và chặn JWT của user bị khóa.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-25"></a>
### CTP-25 — Đăng ký, đăng nhập và JWT cho ba vai trò

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-2 (Epic) |
| Epic | CTP-2 — AUTHENTICATION & AUTHORIZATION |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-22, CTP-23, CTP-24 |
| Blocks | CTP-26, CTP-34, CTP-105, CTP-121 |
| DoD profile | DEV |

**Description**

Là người dùng hệ thống, tôi cần đăng ký, đăng nhập và JWT cho ba vai trò để đạt mục tiêu: Xác thực ba vai trò, kiểm tra user hiện hành, ownership và chặn JWT của user bị khóa. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. CUSTOMER đăng ký bình thường; HOUSEHOLD tạo user ACTIVE và household PENDING trong cùng transaction; không cho tự đăng ký ADMIN.
2. Password được bcrypt hash và không xuất hiện trong response/log; login sai trả lỗi phù hợp.
3. JWT có thời hạn, issuer/audience theo cấu hình; ADMIN demo được seed.
4. Test email trùng, input sai, mật khẩu sai, token thiếu/hết hạn và đăng ký hộ rollback khi thất bại.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-103"></a>
### CTP-103 — Triển khai register/login và hash mật khẩu

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-25 (Story) |
| Epic | CTP-2 — AUTHENTICATION & AUTHORIZATION |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-22, CTP-23, CTP-24 |
| Blocks | CTP-104 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-25 — Đăng ký, đăng nhập và JWT cho ba vai trò. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. CUSTOMER đăng ký bình thường; HOUSEHOLD tạo user ACTIVE và household PENDING trong cùng transaction; không cho tự đăng ký ADMIN.
2. Password được bcrypt hash và không xuất hiện trong response/log; login sai trả lỗi phù hợp.
3. JWT có thời hạn, issuer/audience theo cấu hình; ADMIN demo được seed.
4. Test email trùng, input sai, mật khẩu sai, token thiếu/hết hạn và đăng ký hộ rollback khi thất bại.
5. Phần triển khai của "Triển khai register/login và hash mật khẩu" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-104"></a>
### CTP-104 — Kiểm thử JWT, validation và dữ liệu nhạy cảm

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-25 (Story) |
| Epic | CTP-2 — AUTHENTICATION & AUTHORIZATION |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-103 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-25 — Đăng ký, đăng nhập và JWT cho ba vai trò. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: CUSTOMER đăng ký bình thường; HOUSEHOLD tạo user ACTIVE và household PENDING trong cùng transaction; không cho tự đăng ký ADMIN.
2. Xác minh và lưu bằng chứng: Password được bcrypt hash và không xuất hiện trong response/log; login sai trả lỗi phù hợp.
3. Xác minh và lưu bằng chứng: JWT có thời hạn, issuer/audience theo cấu hình; ADMIN demo được seed.
4. Xác minh và lưu bằng chứng: Test email trùng, input sai, mật khẩu sai, token thiếu/hết hạn và đăng ký hộ rollback khi thất bại.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-26"></a>
### CTP-26 — Kiểm tra user hiện hành, role, ownership và khóa tài khoản

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-2 (Epic) |
| Epic | CTP-2 — AUTHENTICATION & AUTHORIZATION |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-25 |
| Blocks | CTP-27, CTP-28, CTP-32, CTP-35, CTP-45, CTP-56, CTP-58, CTP-107, CTP-109, CTP-117, CTP-123, CTP-143, CTP-165, CTP-169 |
| DoD profile | DEV |

**Description**

Là người dùng hệ thống, tôi cần kiểm tra user hiện hành, role, ownership và khóa tài khoản để đạt mục tiêu: Xác thực ba vai trò, kiểm tra user hiện hành, ownership và chặn JWT của user bị khóa. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Mỗi request được bảo vệ đọc user hiện tại; không chỉ tin role/status trong JWT và không cache status giữa request.
2. User BLOCKED bị từ chối ở request tiếp theo dù token còn hạn; token không hợp lệ trả 401, thiếu quyền trả 403.
3. Ownership dùng chung không cho user/household khác thao tác tài nguyên của nhau.
4. Admin có API liệt kê/block/unblock user; thay đổi quan trọng kiểm tra lại trạng thái trong transaction.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-105"></a>
### CTP-105 — Xây middleware auth, role, ownership và API quản lý user

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-26 (Story) |
| Epic | CTP-2 — AUTHENTICATION & AUTHORIZATION |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-25 |
| Blocks | CTP-106 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-26 — Kiểm tra user hiện hành, role, ownership và khóa tài khoản. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Mỗi request được bảo vệ đọc user hiện tại; không chỉ tin role/status trong JWT và không cache status giữa request.
2. User BLOCKED bị từ chối ở request tiếp theo dù token còn hạn; token không hợp lệ trả 401, thiếu quyền trả 403.
3. Ownership dùng chung không cho user/household khác thao tác tài nguyên của nhau.
4. Admin có API liệt kê/block/unblock user; thay đổi quan trọng kiểm tra lại trạng thái trong transaction.
5. Phần triển khai của "Xây middleware auth, role, ownership và API quản lý user" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-106"></a>
### CTP-106 — Kiểm thử tài khoản bị khóa và truy cập khác chủ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-26 (Story) |
| Epic | CTP-2 — AUTHENTICATION & AUTHORIZATION |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-105 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-26 — Kiểm tra user hiện hành, role, ownership và khóa tài khoản. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Mỗi request được bảo vệ đọc user hiện tại; không chỉ tin role/status trong JWT và không cache status giữa request.
2. Xác minh và lưu bằng chứng: User BLOCKED bị từ chối ở request tiếp theo dù token còn hạn; token không hợp lệ trả 401, thiếu quyền trả 403.
3. Xác minh và lưu bằng chứng: Ownership dùng chung không cho user/household khác thao tác tài nguyên của nhau.
4. Xác minh và lưu bằng chứng: Admin có API liệt kê/block/unblock user; thay đổi quan trọng kiểm tra lại trạng thái trong transaction.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-35"></a>
### CTP-35 — API current user, hồ sơ và đổi mật khẩu

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-2 (Epic) |
| Epic | CTP-2 — AUTHENTICATION & AUTHORIZATION |
| Status | BACKLOG |
| Priority | High |
| Story Points | 1 |
| Giờ dự kiến | 1 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-26 |
| Blocks | CTP-58, CTP-64, CTP-169, CTP-181 |
| DoD profile | DEV |

**Description**

Là người dùng hệ thống, tôi cần aPI current user, hồ sơ và đổi mật khẩu để đạt mục tiêu: Xác thực ba vai trò, kiểm tra user hiện hành, ownership và chặn JWT của user bị khóa. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. /auth/me trả dữ liệu hiện tại, không password; cập nhật hồ sơ validate input.
2. Đổi mật khẩu yêu cầu mật khẩu hiện tại đúng, hash mật khẩu mới và xử lý lỗi rõ ràng.
3. User bị khóa không dùng các API được bảo vệ; client xóa token khi đăng xuất.
4. Swagger và smoke test cho các endpoint được cập nhật.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-123"></a>
### CTP-123 — Hoàn thiện current user/profile/change-password

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-35 (Story) |
| Epic | CTP-2 — AUTHENTICATION & AUTHORIZATION |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-26 |
| Blocks | CTP-124 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-35 — API current user, hồ sơ và đổi mật khẩu. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. /auth/me trả dữ liệu hiện tại, không password; cập nhật hồ sơ validate input.
2. Đổi mật khẩu yêu cầu mật khẩu hiện tại đúng, hash mật khẩu mới và xử lý lỗi rõ ràng.
3. User bị khóa không dùng các API được bảo vệ; client xóa token khi đăng xuất.
4. Swagger và smoke test cho các endpoint được cập nhật.
5. Phần triển khai của "Hoàn thiện current user/profile/change-password" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-124"></a>
### CTP-124 — Kiểm thử quyền và validation hồ sơ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-35 (Story) |
| Epic | CTP-2 — AUTHENTICATION & AUTHORIZATION |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-123 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-35 — API current user, hồ sơ và đổi mật khẩu. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: /auth/me trả dữ liệu hiện tại, không password; cập nhật hồ sơ validate input.
2. Xác minh và lưu bằng chứng: Đổi mật khẩu yêu cầu mật khẩu hiện tại đúng, hash mật khẩu mới và xử lý lỗi rõ ràng.
3. Xác minh và lưu bằng chứng: User bị khóa không dùng các API được bảo vệ; client xóa token khi đăng xuất.
4. Xác minh và lưu bằng chứng: Swagger và smoke test cho các endpoint được cập nhật.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-3 — HOUSEHOLD MANAGEMENT

<a id="ctp-3"></a>
### CTP-3 — HOUSEHOLD MANAGEMENT

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-3 — HOUSEHOLD MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 2 |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Hồ sơ, duyệt và thu hồi duyệt hộ; phân biệt mở bán mới với xử lý đơn cũ. Phạm vi được phân rã thành 2 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Hồ sơ, duyệt và thu hồi duyệt hộ; phân biệt mở bán mới với xử lý đơn cũ.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-27"></a>
### CTP-27 — Quản lý hồ sơ, duyệt và thu hồi duyệt hộ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-3 (Epic) |
| Epic | CTP-3 — HOUSEHOLD MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-26 |
| Blocks | CTP-28, CTP-29, CTP-30, CTP-31, CTP-33, CTP-42, CTP-45, CTP-46, CTP-57, CTP-66, CTP-109, CTP-111, CTP-113, CTP-115, CTP-119, CTP-137, CTP-143, CTP-145, CTP-167, CTP-185 |
| DoD profile | DEV |

**Description**

Là hộ dân và quản trị viên, tôi cần quản lý hồ sơ, duyệt và thu hồi duyệt hộ để đạt mục tiêu: Hồ sơ, duyệt và thu hồi duyệt hộ; phân biệt mở bán mới với xử lý đơn cũ. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Hộ xem/sửa hồ sơ, địa chỉ, điện thoại và latitude/longitude; Admin approve/reject/thu hồi duyệt có lý do và lịch sử.
2. PENDING/REJECTED không mở bán hoặc nhận đơn mới nhưng vẫn xem dữ liệu của mình.
3. Policy backend cho đơn cũ: không confirm PENDING; được reject còn hạn, complete CONFIRMED và thu/hoàn đúng trạng thái khi user ACTIVE.
4. Không đặt middleware APPROVED lên mọi route household; unit test policy bằng fixture, tích hợp thật xác minh ở story trạng thái booking.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-107"></a>
### CTP-107 — Xây hồ sơ và API duyệt/thu hồi duyệt

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-27 (Story) |
| Epic | CTP-3 — HOUSEHOLD MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-26 |
| Blocks | CTP-108 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-27 — Quản lý hồ sơ, duyệt và thu hồi duyệt hộ. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Hộ xem/sửa hồ sơ, địa chỉ, điện thoại và latitude/longitude; Admin approve/reject/thu hồi duyệt có lý do và lịch sử.
2. PENDING/REJECTED không mở bán hoặc nhận đơn mới nhưng vẫn xem dữ liệu của mình.
3. Policy backend cho đơn cũ: không confirm PENDING; được reject còn hạn, complete CONFIRMED và thu/hoàn đúng trạng thái khi user ACTIVE.
4. Không đặt middleware APPROVED lên mọi route household; unit test policy bằng fixture, tích hợp thật xác minh ở story trạng thái booking.
5. Phần triển khai của "Xây hồ sơ và API duyệt/thu hồi duyệt" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-108"></a>
### CTP-108 — Kiểm thử policy bán mới và xử lý đơn cũ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-27 (Story) |
| Epic | CTP-3 — HOUSEHOLD MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-107 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-27 — Quản lý hồ sơ, duyệt và thu hồi duyệt hộ. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Hộ xem/sửa hồ sơ, địa chỉ, điện thoại và latitude/longitude; Admin approve/reject/thu hồi duyệt có lý do và lịch sử.
2. Xác minh và lưu bằng chứng: PENDING/REJECTED không mở bán hoặc nhận đơn mới nhưng vẫn xem dữ liệu của mình.
3. Xác minh và lưu bằng chứng: Policy backend cho đơn cũ: không confirm PENDING; được reject còn hạn, complete CONFIRMED và thu/hoàn đúng trạng thái khi user ACTIVE.
4. Xác minh và lưu bằng chứng: Không đặt middleware APPROVED lên mọi route household; unit test policy bằng fixture, tích hợp thật xác minh ở story trạng thái booking.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-31"></a>
### CTP-31 — API khám phá hộ, phòng và dịch vụ công khai

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-3 (Epic) |
| Epic | CTP-3 — HOUSEHOLD MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | 2 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, frontend |
| Dependencies | CTP-27, CTP-29, CTP-30, CTP-28 |
| Blocks | CTP-54, CTP-59, CTP-90, CTP-161, CTP-171, CTP-234 |
| DoD profile | DEV |

**Description**

Là hộ dân và quản trị viên, tôi cần aPI khám phá hộ, phòng và dịch vụ công khai để đạt mục tiêu: Hồ sơ, duyệt và thu hồi duyệt hộ; phân biệt mở bán mới với xử lý đơn cũ. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Chỉ công khai hộ APPROVED có chủ ACTIVE và tài nguyên đang kinh doanh.
2. Search keyword, lọc danh mục/giá và pagination hoạt động; chưa triển khai tìm kiếm theo bán kính.
3. Chi tiết trả đủ ảnh, địa chỉ và tọa độ cho Flutter; không lộ trường riêng tư.
4. Google Maps direction URL dùng tọa độ, fallback địa chỉ encode; không yêu cầu map nhúng.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-115"></a>
### CTP-115 — Xây list/detail/filter công khai

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-31 (Story) |
| Epic | CTP-3 — HOUSEHOLD MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, frontend |
| Dependencies | CTP-27, CTP-29, CTP-30, CTP-28 |
| Blocks | CTP-116 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-31 — API khám phá hộ, phòng và dịch vụ công khai. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Chỉ công khai hộ APPROVED có chủ ACTIVE và tài nguyên đang kinh doanh.
2. Search keyword, lọc danh mục/giá và pagination hoạt động; chưa triển khai tìm kiếm theo bán kính.
3. Chi tiết trả đủ ảnh, địa chỉ và tọa độ cho Flutter; không lộ trường riêng tư.
4. Google Maps direction URL dùng tọa độ, fallback địa chỉ encode; không yêu cầu map nhúng.
5. Phần triển khai của "Xây list/detail/filter công khai" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-116"></a>
### CTP-116 — Kiểm thử điều kiện hiển thị và direction URL

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-31 (Story) |
| Epic | CTP-3 — HOUSEHOLD MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, frontend |
| Dependencies | CTP-115 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-31 — API khám phá hộ, phòng và dịch vụ công khai. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Chỉ công khai hộ APPROVED có chủ ACTIVE và tài nguyên đang kinh doanh.
2. Xác minh và lưu bằng chứng: Search keyword, lọc danh mục/giá và pagination hoạt động; chưa triển khai tìm kiếm theo bán kính.
3. Xác minh và lưu bằng chứng: Chi tiết trả đủ ảnh, địa chỉ và tọa độ cho Flutter; không lộ trường riêng tư.
4. Xác minh và lưu bằng chứng: Google Maps direction URL dùng tọa độ, fallback địa chỉ encode; không yêu cầu map nhúng.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-4 — ROOM MANAGEMENT

<a id="ctp-4"></a>
### CTP-4 — ROOM MANAGEMENT

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-4 — ROOM MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 2, Sprint 3 |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Quản lý từng phòng vật lý, capacity, ảnh và lịch chặn bên ngoài. Phạm vi được phân rã thành 3 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Quản lý từng phòng vật lý, capacity, ảnh và lịch chặn bên ngoài.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-28"></a>
### CTP-28 — Upload và quản lý ảnh an toàn qua Express

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-4 (Epic) |
| Epic | CTP-4 — ROOM MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-26, CTP-27 |
| Blocks | CTP-31, CTP-42, CTP-56, CTP-57, CTP-115, CTP-137, CTP-165, CTP-167 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần upload và quản lý ảnh an toàn qua Express để đạt mục tiêu: Quản lý từng phòng vật lý, capacity, ảnh và lịch chặn bên ngoài. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Flutter/React gửi file đến Express; backend upload Cloudinary và lưu secure_url/public_id cùng quan hệ sở hữu.
2. Cloudinary API secret chỉ ở backend, không có trong bundle hoặc cấu hình mobile/web.
3. Kiểm tra loại/kích thước file và ownership trước upload/xóa; xử lý lỗi upload và tài nguyên mồ côi.
4. Ảnh hồ sơ, phòng, dịch vụ và thumbnail nội dung dùng cùng cơ chế phù hợp quyền.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-109"></a>
### CTP-109 — Tạo dịch vụ upload/xóa ảnh Cloudinary

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-28 (Story) |
| Epic | CTP-4 — ROOM MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-26, CTP-27 |
| Blocks | CTP-110 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-28 — Upload và quản lý ảnh an toàn qua Express. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Flutter/React gửi file đến Express; backend upload Cloudinary và lưu secure_url/public_id cùng quan hệ sở hữu.
2. Cloudinary API secret chỉ ở backend, không có trong bundle hoặc cấu hình mobile/web.
3. Kiểm tra loại/kích thước file và ownership trước upload/xóa; xử lý lỗi upload và tài nguyên mồ côi.
4. Ảnh hồ sơ, phòng, dịch vụ và thumbnail nội dung dùng cùng cơ chế phù hợp quyền.
5. Phần triển khai của "Tạo dịch vụ upload/xóa ảnh Cloudinary" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-110"></a>
### CTP-110 — Kiểm thử file lỗi, ownership và bảo vệ secret

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-28 (Story) |
| Epic | CTP-4 — ROOM MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-109 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-28 — Upload và quản lý ảnh an toàn qua Express. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Flutter/React gửi file đến Express; backend upload Cloudinary và lưu secure_url/public_id cùng quan hệ sở hữu.
2. Xác minh và lưu bằng chứng: Cloudinary API secret chỉ ở backend, không có trong bundle hoặc cấu hình mobile/web.
3. Xác minh và lưu bằng chứng: Kiểm tra loại/kích thước file và ownership trước upload/xóa; xử lý lỗi upload và tài nguyên mồ côi.
4. Xác minh và lưu bằng chứng: Ảnh hồ sơ, phòng, dịch vụ và thumbnail nội dung dùng cùng cơ chế phù hợp quyền.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-29"></a>
### CTP-29 — CRUD từng phòng vật lý và sức chứa

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-4 (Epic) |
| Epic | CTP-4 — ROOM MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability |
| Dependencies | CTP-27, CTP-22 |
| Blocks | CTP-31, CTP-38, CTP-42, CTP-44, CTP-115, CTP-129, CTP-137, CTP-141 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần cRUD từng phòng vật lý và sức chứa để đạt mục tiêu: Quản lý từng phòng vật lý, capacity, ảnh và lịch chặn bên ngoài. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Mỗi record là một phòng; dùng ACTIVE/INACTIVE, capacity dương và giá theo đêm không âm.
2. Chỉ hộ được duyệt và user ACTIVE quản lý kinh doanh của mình; không sửa dữ liệu hộ khác.
3. Phòng có lịch sử được ngừng kinh doanh thay vì hard delete; không có quantity.
4. API CRUD, validation và Swagger đồng bộ; ảnh liên kết qua API upload đã thống nhất.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-111"></a>
### CTP-111 — Triển khai CRUD phòng, giá và capacity

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-29 (Story) |
| Epic | CTP-4 — ROOM MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability |
| Dependencies | CTP-27, CTP-22 |
| Blocks | CTP-112 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-29 — CRUD từng phòng vật lý và sức chứa. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Mỗi record là một phòng; dùng ACTIVE/INACTIVE, capacity dương và giá theo đêm không âm.
2. Chỉ hộ được duyệt và user ACTIVE quản lý kinh doanh của mình; không sửa dữ liệu hộ khác.
3. Phòng có lịch sử được ngừng kinh doanh thay vì hard delete; không có quantity.
4. API CRUD, validation và Swagger đồng bộ; ảnh liên kết qua API upload đã thống nhất.
5. Phần triển khai của "Triển khai CRUD phòng, giá và capacity" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-112"></a>
### CTP-112 — Kiểm thử ownership, trạng thái và bảo toàn lịch sử

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-29 (Story) |
| Epic | CTP-4 — ROOM MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability |
| Dependencies | CTP-111 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-29 — CRUD từng phòng vật lý và sức chứa. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Mỗi record là một phòng; dùng ACTIVE/INACTIVE, capacity dương và giá theo đêm không âm.
2. Xác minh và lưu bằng chứng: Chỉ hộ được duyệt và user ACTIVE quản lý kinh doanh của mình; không sửa dữ liệu hộ khác.
3. Xác minh và lưu bằng chứng: Phòng có lịch sử được ngừng kinh doanh thay vì hard delete; không có quantity.
4. Xác minh và lưu bằng chứng: API CRUD, validation và Swagger đồng bộ; ảnh liên kết qua API upload đã thống nhất.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-38"></a>
### CTP-38 — Quản lý room blocks cho đặt ngoài ứng dụng

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-4 (Epic) |
| Epic | CTP-4 — ROOM MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | 2 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability |
| Dependencies | CTP-29, CTP-36 |
| Blocks | CTP-39, CTP-67, CTP-131, CTP-187 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần quản lý room blocks cho đặt ngoài ứng dụng để đạt mục tiêu: Quản lý từng phòng vật lý, capacity, ảnh và lịch chặn bên ngoài. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Block có room_id, start_date/end_date DATE và reason; start nhỏ hơn end.
2. Ownership được kiểm tra; lịch nối tiếp ngày trả/nhận không giao nhau.
3. Quy tắc overlap dùng chung với booking; kiểm tra booking thật được tích hợp ở AvailabilityService và concurrency story.
4. API thêm/xóa block giữ audit cần thiết và không sửa booking của khách.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-129"></a>
### CTP-129 — Tạo API room blocks và overlap rule

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-38 (Story) |
| Epic | CTP-4 — ROOM MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability |
| Dependencies | CTP-29, CTP-36 |
| Blocks | CTP-130 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-38 — Quản lý room blocks cho đặt ngoài ứng dụng. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Block có room_id, start_date/end_date DATE và reason; start nhỏ hơn end.
2. Ownership được kiểm tra; lịch nối tiếp ngày trả/nhận không giao nhau.
3. Quy tắc overlap dùng chung với booking; kiểm tra booking thật được tích hợp ở AvailabilityService và concurrency story.
4. API thêm/xóa block giữ audit cần thiết và không sửa booking của khách.
5. Phần triển khai của "Tạo API room blocks và overlap rule" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-130"></a>
### CTP-130 — Kiểm thử lịch nối tiếp, giao nhau và khác chủ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-38 (Story) |
| Epic | CTP-4 — ROOM MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability |
| Dependencies | CTP-129 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-38 — Quản lý room blocks cho đặt ngoài ứng dụng. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Block có room_id, start_date/end_date DATE và reason; start nhỏ hơn end.
2. Xác minh và lưu bằng chứng: Ownership được kiểm tra; lịch nối tiếp ngày trả/nhận không giao nhau.
3. Xác minh và lưu bằng chứng: Quy tắc overlap dùng chung với booking; kiểm tra booking thật được tích hợp ở AvailabilityService và concurrency story.
4. Xác minh và lưu bằng chứng: API thêm/xóa block giữ audit cần thiết và không sửa booking của khách.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-5 — SERVICE MANAGEMENT

<a id="ctp-5"></a>
### CTP-5 — SERVICE MANAGEMENT

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-5 — SERVICE MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 2 |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Danh mục và dịch vụ ăn uống, trải nghiệm, hướng dẫn viên; ảnh và thông tin công khai. Phạm vi được phân rã thành 1 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Danh mục và dịch vụ ăn uống, trải nghiệm, hướng dẫn viên; ảnh và thông tin công khai.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-30"></a>
### CTP-30 — Danh mục và CRUD dịch vụ có đơn vị bán

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-5 (Epic) |
| Epic | CTP-5 — SERVICE MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend |
| Dependencies | CTP-27, CTP-22 |
| Blocks | CTP-31, CTP-37, CTP-44, CTP-57, CTP-115, CTP-127, CTP-141, CTP-167 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần danh mục và CRUD dịch vụ có đơn vị bán để đạt mục tiêu: Danh mục và dịch vụ ăn uống, trải nghiệm, hướng dẫn viên; ảnh và thông tin công khai. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Seed danh mục ăn uống, trải nghiệm, hướng dẫn viên và dịch vụ khác; API liệt kê danh mục.
2. Dịch vụ có ACTIVE/INACTIVE, tên, mô tả, giá và đơn vị suất/người/nhóm rõ ràng.
3. Ownership và điều kiện hộ được duyệt được enforce; dịch vụ có lịch sử không bị xóa mất.
4. API hỗ trợ ảnh và giữ thông tin đủ để chụp snapshot khi đặt.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-113"></a>
### CTP-113 — Tạo danh mục và CRUD dịch vụ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-30 (Story) |
| Epic | CTP-5 — SERVICE MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend |
| Dependencies | CTP-27, CTP-22 |
| Blocks | CTP-114 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-30 — Danh mục và CRUD dịch vụ có đơn vị bán. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Seed danh mục ăn uống, trải nghiệm, hướng dẫn viên và dịch vụ khác; API liệt kê danh mục.
2. Dịch vụ có ACTIVE/INACTIVE, tên, mô tả, giá và đơn vị suất/người/nhóm rõ ràng.
3. Ownership và điều kiện hộ được duyệt được enforce; dịch vụ có lịch sử không bị xóa mất.
4. API hỗ trợ ảnh và giữ thông tin đủ để chụp snapshot khi đặt.
5. Phần triển khai của "Tạo danh mục và CRUD dịch vụ" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-114"></a>
### CTP-114 — Kiểm thử đơn vị bán, giá và quyền quản lý

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-30 (Story) |
| Epic | CTP-5 — SERVICE MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend |
| Dependencies | CTP-113 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-30 — Danh mục và CRUD dịch vụ có đơn vị bán. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Seed danh mục ăn uống, trải nghiệm, hướng dẫn viên và dịch vụ khác; API liệt kê danh mục.
2. Xác minh và lưu bằng chứng: Dịch vụ có ACTIVE/INACTIVE, tên, mô tả, giá và đơn vị suất/người/nhóm rõ ràng.
3. Xác minh và lưu bằng chứng: Ownership và điều kiện hộ được duyệt được enforce; dịch vụ có lịch sử không bị xóa mất.
4. Xác minh và lưu bằng chứng: API hỗ trợ ảnh và giữ thông tin đủ để chụp snapshot khi đặt.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-6 — SERVICE SLOTS

<a id="ctp-6"></a>
### CTP-6 — SERVICE SLOTS

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-6 — SERVICE SLOTS |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 3; có Post-MVP |
| Scope | Mixed |
| Component | BACKEND |
| Labels | backend, availability, database |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Slot có OPEN/CLOSED, lịch UTC, capacity và unique thời gian; không lưu booked_quantity. Phạm vi được phân rã thành 3 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Slot có OPEN/CLOSED, lịch UTC, capacity và unique thời gian; không lưu booked_quantity.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-37"></a>
### CTP-37 — Tạo và quản lý lịch service slot

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-6 (Epic) |
| Epic | CTP-6 — SERVICE SLOTS |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability, database |
| Dependencies | CTP-30, CTP-36 |
| Blocks | CTP-39, CTP-41, CTP-131, CTP-135 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần tạo và quản lý lịch service slot để đạt mục tiêu: Slot có OPEN/CLOSED, lịch UTC, capacity và unique thời gian; không lưu booked_quantity. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Slot có start_at/end_at UTC, capacity nguyên dương và OPEN/CLOSED; end lớn hơn start.
2. Mặc định CLOSED; unique(service_id,start_at,end_at) chặn trùng, kể cả request đồng thời.
3. Không đổi giờ slot đã có booking; không lưu booked_quantity.
4. CRUD đọc/ghi enforce ownership và API validate ngày, capacity, trạng thái.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-127"></a>
### CTP-127 — Tạo slot API và unique constraint

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-37 (Story) |
| Epic | CTP-6 — SERVICE SLOTS |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability, database |
| Dependencies | CTP-30, CTP-36 |
| Blocks | CTP-128 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-37 — Tạo và quản lý lịch service slot. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Slot có start_at/end_at UTC, capacity nguyên dương và OPEN/CLOSED; end lớn hơn start.
2. Mặc định CLOSED; unique(service_id,start_at,end_at) chặn trùng, kể cả request đồng thời.
3. Không đổi giờ slot đã có booking; không lưu booked_quantity.
4. CRUD đọc/ghi enforce ownership và API validate ngày, capacity, trạng thái.
5. Phần triển khai của "Tạo slot API và unique constraint" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-128"></a>
### CTP-128 — Kiểm thử thời gian, slot trùng và ownership

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-37 (Story) |
| Epic | CTP-6 — SERVICE SLOTS |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability, database |
| Dependencies | CTP-127 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-37 — Tạo và quản lý lịch service slot. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Slot có start_at/end_at UTC, capacity nguyên dương và OPEN/CLOSED; end lớn hơn start.
2. Xác minh và lưu bằng chứng: Mặc định CLOSED; unique(service_id,start_at,end_at) chặn trùng, kể cả request đồng thời.
3. Xác minh và lưu bằng chứng: Không đổi giờ slot đã có booking; không lưu booked_quantity.
4. Xác minh và lưu bằng chứng: CRUD đọc/ghi enforce ownership và API validate ngày, capacity, trạng thái.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-41"></a>
### CTP-41 — Đóng/mở slot và thay đổi capacity an toàn

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-6 (Epic) |
| Epic | CTP-6 — SERVICE SLOTS |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 2 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability, database |
| Dependencies | CTP-37, CTP-39, CTP-40 |
| Blocks | CTP-43, CTP-45, CTP-49, CTP-61, CTP-68, CTP-89, CTP-139, CTP-143, CTP-151, CTP-175, CTP-189, CTP-232 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần đóng/mở slot và thay đổi capacity an toàn để đạt mục tiêu: Slot có OPEN/CLOSED, lịch UTC, capacity và unique thời gian; không lưu booked_quantity. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Hộ APPROVED/user ACTIVE mới mở slot; hộ mất duyệt vẫn được đóng slot của mình.
2. CLOSED chặn booking mới, không xóa booking cũ, không giải phóng hold hay tự hoàn tiền.
3. Capacity không được giảm dưới lượng đang chiếm chỗ; thay đổi chạy trong transaction cùng khóa.
4. Quy tắc xác nhận PENDING cũ của slot CLOSED được cung cấp cho BookingService; getRemainingCapacity vẫn trả sức chứa thực.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-135"></a>
### CTP-135 — Tạo API đổi trạng thái và capacity của slot

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-41 (Story) |
| Epic | CTP-6 — SERVICE SLOTS |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability, database |
| Dependencies | CTP-37, CTP-39, CTP-40 |
| Blocks | CTP-136 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-41 — Đóng/mở slot và thay đổi capacity an toàn. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Hộ APPROVED/user ACTIVE mới mở slot; hộ mất duyệt vẫn được đóng slot của mình.
2. CLOSED chặn booking mới, không xóa booking cũ, không giải phóng hold hay tự hoàn tiền.
3. Capacity không được giảm dưới lượng đang chiếm chỗ; thay đổi chạy trong transaction cùng khóa.
4. Quy tắc xác nhận PENDING cũ của slot CLOSED được cung cấp cho BookingService; getRemainingCapacity vẫn trả sức chứa thực.
5. Phần triển khai của "Tạo API đổi trạng thái và capacity của slot" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-136"></a>
### CTP-136 — Kiểm thử CLOSED, reopen và capacity dưới mức đang giữ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-41 (Story) |
| Epic | CTP-6 — SERVICE SLOTS |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, availability, database |
| Dependencies | CTP-135 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-41 — Đóng/mở slot và thay đổi capacity an toàn. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Hộ APPROVED/user ACTIVE mới mở slot; hộ mất duyệt vẫn được đóng slot của mình.
2. Xác minh và lưu bằng chứng: CLOSED chặn booking mới, không xóa booking cũ, không giải phóng hold hay tự hoàn tiền.
3. Xác minh và lưu bằng chứng: Capacity không được giảm dưới lượng đang chiếm chỗ; thay đổi chạy trong transaction cùng khóa.
4. Xác minh và lưu bằng chứng: Quy tắc xác nhận PENDING cũ của slot CLOSED được cung cấp cho BookingService; getRemainingCapacity vẫn trả sức chứa thực.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-89"></a>
### CTP-89 — Tạo nhiều service slot từ lịch mẫu

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-6 (Epic) |
| Epic | CTP-6 — SERVICE SLOTS |
| Status | BACKLOG |
| Priority | Low |
| Story Points | 5 |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | BACKEND |
| Labels | backend, availability, database |
| Dependencies | CTP-41, CTP-68 |
| Blocks | Không có |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần tạo nhiều service slot từ lịch mẫu để đạt mục tiêu: Slot có OPEN/CLOSED, lịch UTC, capacity và unique thời gian; không lưu booked_quantity. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Sinh slot theo khoảng ngày/khung giờ, kiểm tra timezone và unique đã có.
2. Preview rõ số slot tạo mới/trùng; không sửa slot đã có booking.
3. Giữ nguyên capacity theo slot và không thêm booked_quantity.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-232"></a>
### CTP-232 — Tạo preview và bulk-create slot theo mẫu

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-89 (Story) |
| Epic | CTP-6 — SERVICE SLOTS |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | BACKEND |
| Labels | backend, availability, database |
| Dependencies | CTP-41, CTP-68 |
| Blocks | CTP-233 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-89 — Tạo nhiều service slot từ lịch mẫu. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Sinh slot theo khoảng ngày/khung giờ, kiểm tra timezone và unique đã có.
2. Preview rõ số slot tạo mới/trùng; không sửa slot đã có booking.
3. Giữ nguyên capacity theo slot và không thêm booked_quantity.
4. Phần triển khai của "Tạo preview và bulk-create slot theo mẫu" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-233"></a>
### CTP-233 — Kiểm thử trùng, timezone và dữ liệu đã có booking

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-89 (Story) |
| Epic | CTP-6 — SERVICE SLOTS |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | BACKEND |
| Labels | backend, availability, database |
| Dependencies | CTP-232 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-89 — Tạo nhiều service slot từ lịch mẫu. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Sinh slot theo khoảng ngày/khung giờ, kiểm tra timezone và unique đã có.
2. Xác minh và lưu bằng chứng: Preview rõ số slot tạo mới/trùng; không sửa slot đã có booking.
3. Xác minh và lưu bằng chứng: Giữ nguyên capacity theo slot và không thêm booked_quantity.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-7 — AVAILABILITY ENGINE

<a id="ctp-7"></a>
### CTP-7 — AVAILABILITY ENGINE

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-7 — AVAILABILITY ENGINE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 3 |
| Scope | MVP |
| Component | DATABASE |
| Labels | availability, database, prisma, testing |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Một nguồn quy tắc khả dụng, khóa tài nguyên và chống bán vượt trên MySQL thật. Phạm vi được phân rã thành 3 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Một nguồn quy tắc khả dụng, khóa tài nguyên và chống bán vượt trên MySQL thật.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-36"></a>
### CTP-36 — Chuẩn hóa DATE, UTC và phạm vi ngày dịch vụ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-7 (Epic) |
| Epic | CTP-7 — AVAILABILITY ENGINE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | BACKEND |
| Labels | availability, backend, testing |
| Dependencies | CTP-22, CTP-24 |
| Blocks | CTP-37, CTP-38, CTP-43, CTP-44, CTP-68, CTP-127, CTP-129, CTP-139, CTP-141, CTP-189 |
| DoD profile | DEV |

**Description**

Là người phát triển backend, tôi cần chuẩn hóa DATE, UTC và phạm vi ngày dịch vụ để đạt mục tiêu: Một nguồn quy tắc khả dụng, khóa tài nguyên và chống bán vượt trên MySQL thật. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Ngày phòng/block là DATE không trôi ngày; instant UTC được chuyển Asia/Ho_Chi_Minh khi xét local date.
2. Nhận phòng 14h, trả phòng 12h; helper xét cả serviceStartAt và serviceEndAt.
3. Dịch vụ trong đơn có phòng phải bắt đầu và kết thúc trong các ngày check-in..check-out; slot qua đêm nội kỳ hợp lệ, vượt ngày trả phòng bị cấm.
4. Có test ranh giới UTC/local, đúng 00h ngày sau và service-only không phụ thuộc room stay.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-125"></a>
### CTP-125 — Tạo helper ngày/thời điểm và validateServiceWithinStayDates

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-36 (Story) |
| Epic | CTP-7 — AVAILABILITY ENGINE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | BACKEND |
| Labels | availability, backend, testing |
| Dependencies | CTP-22, CTP-24 |
| Blocks | CTP-126 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-36 — Chuẩn hóa DATE, UTC và phạm vi ngày dịch vụ. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Ngày phòng/block là DATE không trôi ngày; instant UTC được chuyển Asia/Ho_Chi_Minh khi xét local date.
2. Nhận phòng 14h, trả phòng 12h; helper xét cả serviceStartAt và serviceEndAt.
3. Dịch vụ trong đơn có phòng phải bắt đầu và kết thúc trong các ngày check-in..check-out; slot qua đêm nội kỳ hợp lệ, vượt ngày trả phòng bị cấm.
4. Có test ranh giới UTC/local, đúng 00h ngày sau và service-only không phụ thuộc room stay.
5. Phần triển khai của "Tạo helper ngày/thời điểm và validateServiceWithinStayDates" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-126"></a>
### CTP-126 — Kiểm thử ranh giới local date và slot qua đêm

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-36 (Story) |
| Epic | CTP-7 — AVAILABILITY ENGINE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | BACKEND |
| Labels | availability, backend, testing |
| Dependencies | CTP-125 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-36 — Chuẩn hóa DATE, UTC và phạm vi ngày dịch vụ. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Ngày phòng/block là DATE không trôi ngày; instant UTC được chuyển Asia/Ho_Chi_Minh khi xét local date.
2. Xác minh và lưu bằng chứng: Nhận phòng 14h, trả phòng 12h; helper xét cả serviceStartAt và serviceEndAt.
3. Xác minh và lưu bằng chứng: Dịch vụ trong đơn có phòng phải bắt đầu và kết thúc trong các ngày check-in..check-out; slot qua đêm nội kỳ hợp lệ, vượt ngày trả phòng bị cấm.
4. Xác minh và lưu bằng chứng: Có test ranh giới UTC/local, đúng 00h ngày sau và service-only không phụ thuộc room stay.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-39"></a>
### CTP-39 — AvailabilityService tính phòng trống và suất còn lại

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-7 (Epic) |
| Epic | CTP-7 — AVAILABILITY ENGINE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 5 |
| Giờ dự kiến | 5 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | DATABASE |
| Labels | availability, database, prisma, testing |
| Dependencies | CTP-37, CTP-38, CTP-22 |
| Blocks | CTP-40, CTP-41, CTP-61, CTP-133, CTP-135, CTP-175 |
| DoD profile | DEV |

**Description**

Là người phát triển backend, tôi cần availabilityService tính phòng trống và suất còn lại để đạt mục tiêu: Một nguồn quy tắc khả dụng, khóa tài nguyên và chống bán vượt trên MySQL thật. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Có checkRoomAvailability, checkServiceSlotAvailability, getOccupiedRooms, getRemainingCapacity dùng chung.
2. Chiếm chỗ khi CONFIRMED hoặc PENDING có expires_at > UTC_TIMESTAMP(3); cron không ảnh hưởng kết quả khả dụng.
3. Remaining = capacity - SUM(quantity đang chiếm chỗ), COALESCE về 0; không có bộ đếm booked_quantity.
4. Room check tính cả booking items và blocks; hàm hỗ trợ tx/asOf nội bộ, không nhận thời gian do client quyết định.
5. Đóng slot chỉ chặn bán mới; lượng đã giữ vẫn được tính từ booking.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-131"></a>
### CTP-131 — Triển khai các truy vấn khả dụng dùng chung

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-39 (Story) |
| Epic | CTP-7 — AVAILABILITY ENGINE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | DATABASE |
| Labels | availability, database, prisma, testing |
| Dependencies | CTP-37, CTP-38, CTP-22 |
| Blocks | CTP-132 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-39 — AvailabilityService tính phòng trống và suất còn lại. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Có checkRoomAvailability, checkServiceSlotAvailability, getOccupiedRooms, getRemainingCapacity dùng chung.
2. Chiếm chỗ khi CONFIRMED hoặc PENDING có expires_at > UTC_TIMESTAMP(3); cron không ảnh hưởng kết quả khả dụng.
3. Remaining = capacity - SUM(quantity đang chiếm chỗ), COALESCE về 0; không có bộ đếm booked_quantity.
4. Room check tính cả booking items và blocks; hàm hỗ trợ tx/asOf nội bộ, không nhận thời gian do client quyết định.
5. Đóng slot chỉ chặn bán mới; lượng đã giữ vẫn được tính từ booking.
6. Phần triển khai của "Triển khai các truy vấn khả dụng dùng chung" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-132"></a>
### CTP-132 — Kiểm thử predicate giữ chỗ và aggregation bằng fixture MySQL

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-39 (Story) |
| Epic | CTP-7 — AVAILABILITY ENGINE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | DATABASE |
| Labels | availability, database, prisma, testing |
| Dependencies | CTP-131 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-39 — AvailabilityService tính phòng trống và suất còn lại. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Có checkRoomAvailability, checkServiceSlotAvailability, getOccupiedRooms, getRemainingCapacity dùng chung.
2. Xác minh và lưu bằng chứng: Chiếm chỗ khi CONFIRMED hoặc PENDING có expires_at > UTC_TIMESTAMP(3); cron không ảnh hưởng kết quả khả dụng.
3. Xác minh và lưu bằng chứng: Remaining = capacity - SUM(quantity đang chiếm chỗ), COALESCE về 0; không có bộ đếm booked_quantity.
4. Xác minh và lưu bằng chứng: Room check tính cả booking items và blocks; hàm hỗ trợ tx/asOf nội bộ, không nhận thời gian do client quyết định.
5. Xác minh và lưu bằng chứng: Đóng slot chỉ chặn bán mới; lượng đã giữ vẫn được tính từ booking.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-40"></a>
### CTP-40 — Khóa tài nguyên và retry trong Prisma transaction

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-7 (Epic) |
| Epic | CTP-7 — AVAILABILITY ENGINE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 5 |
| Giờ dự kiến | 5 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | DATABASE |
| Labels | availability, database, prisma, testing |
| Dependencies | CTP-39, CTP-20 |
| Blocks | CTP-41, CTP-45, CTP-49, CTP-67, CTP-135, CTP-143, CTP-151, CTP-187 |
| DoD profile | DEV |

**Description**

Là người phát triển backend, tôi cần khóa tài nguyên và retry trong Prisma transaction để đạt mục tiêu: Một nguồn quy tắc khả dụng, khóa tài nguyên và chống bán vượt trên MySQL thật. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Interactive transaction READ COMMITTED dùng raw SQL tham số hóa khi cần SELECT FOR UPDATE.
2. Khóa phòng theo ID, rồi slot theo ID và booking hiện hữu; kiểm tra lại sau khi lấy khóa.
3. Không gọi Prisma client ngoài transaction cho thao tác cần nguyên tử; lỗi làm rollback toàn bộ.
4. Retry deadlock tối đa ba lần; hai kết nối MySQL thật chứng minh thứ tự khóa và rollback.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-133"></a>
### CTP-133 — Tạo transaction/locking dùng chung

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-40 (Story) |
| Epic | CTP-7 — AVAILABILITY ENGINE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | DATABASE |
| Labels | availability, database, prisma, testing |
| Dependencies | CTP-39, CTP-20 |
| Blocks | CTP-134 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-40 — Khóa tài nguyên và retry trong Prisma transaction. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Interactive transaction READ COMMITTED dùng raw SQL tham số hóa khi cần SELECT FOR UPDATE.
2. Khóa phòng theo ID, rồi slot theo ID và booking hiện hữu; kiểm tra lại sau khi lấy khóa.
3. Không gọi Prisma client ngoài transaction cho thao tác cần nguyên tử; lỗi làm rollback toàn bộ.
4. Retry deadlock tối đa ba lần; hai kết nối MySQL thật chứng minh thứ tự khóa và rollback.
5. Phần triển khai của "Tạo transaction/locking dùng chung" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-134"></a>
### CTP-134 — Kiểm chứng hai kết nối MySQL và retry deadlock

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-40 (Story) |
| Epic | CTP-7 — AVAILABILITY ENGINE |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | DATABASE |
| Labels | availability, database, prisma, testing |
| Dependencies | CTP-133 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-40 — Khóa tài nguyên và retry trong Prisma transaction. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Interactive transaction READ COMMITTED dùng raw SQL tham số hóa khi cần SELECT FOR UPDATE.
2. Xác minh và lưu bằng chứng: Khóa phòng theo ID, rồi slot theo ID và booking hiện hữu; kiểm tra lại sau khi lấy khóa.
3. Xác minh và lưu bằng chứng: Không gọi Prisma client ngoài transaction cho thao tác cần nguyên tử; lỗi làm rollback toàn bộ.
4. Xác minh và lưu bằng chứng: Retry deadlock tối đa ba lần; hai kết nối MySQL thật chứng minh thứ tự khóa và rollback.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-8 — BOOKING MANAGEMENT

<a id="ctp-8"></a>
### CTP-8 — BOOKING MANAGEMENT

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 4 |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Booking nhiều phòng/dịch vụ, giữ chỗ, định giá, mã đơn và chuyển trạng thái có kiểm soát. Phạm vi được phân rã thành 5 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Booking nhiều phòng/dịch vụ, giữ chỗ, định giá, mã đơn và chuyển trạng thái có kiểm soát.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-44"></a>
### CTP-44 — Mã booking, price snapshot và tính tổng

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-8 (Epic) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-22, CTP-36, CTP-29, CTP-30 |
| Blocks | CTP-45, CTP-143 |
| DoD profile | DEV |

**Description**

Là khách và hộ dân, tôi cần mã booking, price snapshot và tính tổng để đạt mục tiêu: Booking nhiều phòng/dịch vụ, giữ chỗ, định giá, mã đơn và chuyển trạng thái có kiểm soát. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Backend sinh CT-YYYYMMDD-XXXXXX theo ngày tạo tại Việt Nam; unique index; collision retry tối đa năm lần.
2. Snapshot tên, giá, đơn vị, lịch sử dụng; frontend không quyết định total hoặc booking_code.
3. Tổng tiền phòng và dịch vụ tính riêng rồi cộng; không bị nhân dòng JOIN.
4. Test giá đổi sau khi đặt, số đêm, tiền DECIMAL và mô phỏng va chạm mã.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-141"></a>
### CTP-141 — Tạo booking code và tính giá/snapshot

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-44 (Story) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-22, CTP-36, CTP-29, CTP-30 |
| Blocks | CTP-142 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-44 — Mã booking, price snapshot và tính tổng. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Backend sinh CT-YYYYMMDD-XXXXXX theo ngày tạo tại Việt Nam; unique index; collision retry tối đa năm lần.
2. Snapshot tên, giá, đơn vị, lịch sử dụng; frontend không quyết định total hoặc booking_code.
3. Tổng tiền phòng và dịch vụ tính riêng rồi cộng; không bị nhân dòng JOIN.
4. Test giá đổi sau khi đặt, số đêm, tiền DECIMAL và mô phỏng va chạm mã.
5. Phần triển khai của "Tạo booking code và tính giá/snapshot" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-142"></a>
### CTP-142 — Kiểm thử collision, số đêm và tổng tiền

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-44 (Story) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-141 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-44 — Mã booking, price snapshot và tính tổng. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Backend sinh CT-YYYYMMDD-XXXXXX theo ngày tạo tại Việt Nam; unique index; collision retry tối đa năm lần.
2. Xác minh và lưu bằng chứng: Snapshot tên, giá, đơn vị, lịch sử dụng; frontend không quyết định total hoặc booking_code.
3. Xác minh và lưu bằng chứng: Tổng tiền phòng và dịch vụ tính riêng rồi cộng; không bị nhân dòng JOIN.
4. Xác minh và lưu bằng chứng: Test giá đổi sau khi đặt, số đêm, tiền DECIMAL và mô phỏng va chạm mã.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-45"></a>
### CTP-45 — Tạo booking nhiều phòng và nhiều dịch vụ nguyên tử

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-8 (Epic) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 5 |
| Giờ dự kiến | 6 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-44, CTP-40, CTP-41, CTP-26, CTP-27 |
| Blocks | CTP-46, CTP-47, CTP-62, CTP-145, CTP-147, CTP-177 |
| DoD profile | DEV |

**Description**

Là khách và hộ dân, tôi cần tạo booking nhiều phòng và nhiều dịch vụ nguyên tử để đạt mục tiêu: Booking nhiều phòng/dịch vụ, giữ chỗ, định giá, mã đơn và chuyển trạng thái có kiểm soát. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. 0..n rooms, 0..n services nhưng ít nhất một mục; cùng hộ, không trùng phòng/slot và phòng cùng ngày.
2. Tổng khách phòng bằng guestCount; quantity mỗi dịch vụ độc lập, ví dụ 8 khách/4 suất làm bánh hợp lệ.
3. Validate cả start/end local date của dịch vụ trong kỳ lưu trú; service-only bỏ ngày phòng.
4. expiresAt=min(createdAt+24h,earliestItemStart-2h); còn ít nhất 30 phút; dùng thời gian DB sau khóa.
5. Một mục không khả dụng làm rollback toàn bộ; tạo mới yêu cầu hộ APPROVED/user ACTIVE và slot OPEN.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-143"></a>
### CTP-143 — Tạo BookingService và endpoint đặt riêng/kết hợp

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-45 (Story) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-44, CTP-40, CTP-41, CTP-26, CTP-27 |
| Blocks | CTP-144 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-45 — Tạo booking nhiều phòng và nhiều dịch vụ nguyên tử. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. 0..n rooms, 0..n services nhưng ít nhất một mục; cùng hộ, không trùng phòng/slot và phòng cùng ngày.
2. Tổng khách phòng bằng guestCount; quantity mỗi dịch vụ độc lập, ví dụ 8 khách/4 suất làm bánh hợp lệ.
3. Validate cả start/end local date của dịch vụ trong kỳ lưu trú; service-only bỏ ngày phòng.
4. expiresAt=min(createdAt+24h,earliestItemStart-2h); còn ít nhất 30 phút; dùng thời gian DB sau khóa.
5. Một mục không khả dụng làm rollback toàn bộ; tạo mới yêu cầu hộ APPROVED/user ACTIVE và slot OPEN.
6. Phần triển khai của "Tạo BookingService và endpoint đặt riêng/kết hợp" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-144"></a>
### CTP-144 — Kiểm thử validation nhiều mục, thời gian và rollback

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-45 (Story) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-143 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-45 — Tạo booking nhiều phòng và nhiều dịch vụ nguyên tử. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: 0..n rooms, 0..n services nhưng ít nhất một mục; cùng hộ, không trùng phòng/slot và phòng cùng ngày.
2. Xác minh và lưu bằng chứng: Tổng khách phòng bằng guestCount; quantity mỗi dịch vụ độc lập, ví dụ 8 khách/4 suất làm bánh hợp lệ.
3. Xác minh và lưu bằng chứng: Validate cả start/end local date của dịch vụ trong kỳ lưu trú; service-only bỏ ngày phòng.
4. Xác minh và lưu bằng chứng: expiresAt=min(createdAt+24h,earliestItemStart-2h); còn ít nhất 30 phút; dùng thời gian DB sau khóa.
5. Xác minh và lưu bằng chứng: Một mục không khả dụng làm rollback toàn bộ; tạo mới yêu cầu hộ APPROVED/user ACTIVE và slot OPEN.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-46"></a>
### CTP-46 — Chuyển trạng thái đúng actor và hoàn thành đúng một lần

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-8 (Epic) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 5 |
| Giờ dự kiến | 5 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-45, CTP-27 |
| Blocks | CTP-47, CTP-48, CTP-51, CTP-54, CTP-63, CTP-69, CTP-147, CTP-149, CTP-155, CTP-161, CTP-179, CTP-191 |
| DoD profile | DEV |

**Description**

Là khách và hộ dân, tôi cần chuyển trạng thái đúng actor và hoàn thành đúng một lần để đạt mục tiêu: Booking nhiều phòng/dịch vụ, giữ chỗ, định giá, mã đơn và chuyển trạng thái có kiểm soát. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Chỉ các transition đã chốt được phép; Admin không trực tiếp đổi booking status.
2. Khách chỉ hủy toàn đơn trước hạng mục đầu tiên; hộ chỉ complete sau hạng mục cuối cùng.
3. completed_at chỉ set khi CONFIRMED và còn NULL; lặp/race không sửa thời điểm hay nhân lịch sử.
4. Hộ mất duyệt không confirm PENDING nhưng được reject còn hạn, complete đơn cũ khi user ACTIVE; BLOCKED không được ngoại lệ.
5. Slot CLOSED không ngăn confirm đơn PENDING cũ còn hạn nếu hộ APPROVED; kiểm tra không trừ suất hai lần.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-145"></a>
### CTP-145 — Tạo command confirm/reject/cancel/complete có khóa

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-46 (Story) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-45, CTP-27 |
| Blocks | CTP-146 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-46 — Chuyển trạng thái đúng actor và hoàn thành đúng một lần. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Chỉ các transition đã chốt được phép; Admin không trực tiếp đổi booking status.
2. Khách chỉ hủy toàn đơn trước hạng mục đầu tiên; hộ chỉ complete sau hạng mục cuối cùng.
3. completed_at chỉ set khi CONFIRMED và còn NULL; lặp/race không sửa thời điểm hay nhân lịch sử.
4. Hộ mất duyệt không confirm PENDING nhưng được reject còn hạn, complete đơn cũ khi user ACTIVE; BLOCKED không được ngoại lệ.
5. Slot CLOSED không ngăn confirm đơn PENDING cũ còn hạn nếu hộ APPROVED; kiểm tra không trừ suất hai lần.
6. Phần triển khai của "Tạo command confirm/reject/cancel/complete có khóa" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-146"></a>
### CTP-146 — Kiểm thử bảng chuyển trạng thái và policy đơn cũ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-46 (Story) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-145 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-46 — Chuyển trạng thái đúng actor và hoàn thành đúng một lần. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Chỉ các transition đã chốt được phép; Admin không trực tiếp đổi booking status.
2. Xác minh và lưu bằng chứng: Khách chỉ hủy toàn đơn trước hạng mục đầu tiên; hộ chỉ complete sau hạng mục cuối cùng.
3. Xác minh và lưu bằng chứng: completed_at chỉ set khi CONFIRMED và còn NULL; lặp/race không sửa thời điểm hay nhân lịch sử.
4. Xác minh và lưu bằng chứng: Hộ mất duyệt không confirm PENDING nhưng được reject còn hạn, complete đơn cũ khi user ACTIVE; BLOCKED không được ngoại lệ.
5. Xác minh và lưu bằng chứng: Slot CLOSED không ngăn confirm đơn PENDING cũ còn hạn nếu hộ APPROVED; kiểm tra không trừ suất hai lần.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-47"></a>
### CTP-47 — Hết hạn booking không phụ thuộc cron

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-8 (Epic) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 2 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-45, CTP-46 |
| Blocks | CTP-48, CTP-63, CTP-69, CTP-149, CTP-179, CTP-191 |
| DoD profile | DEV |

**Description**

Là khách và hộ dân, tôi cần hết hạn booking không phụ thuộc cron để đạt mục tiêu: Booking nhiều phòng/dịch vụ, giữ chỗ, định giá, mã đơn và chuyển trạng thái có kiểm soát. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Đơn PENDING với expires_at <= UTC_TIMESTAMP(3) không chiếm chỗ và API hiển thị EXPIRED hiệu lực.
2. Tác vụ SYSTEM cập nhật trạng thái/lịch sử an toàn, chạy lặp không sinh bản ghi trùng.
3. Không cho confirm đơn đã hết hạn dù cron chưa chạy.
4. Test đúng mốc expiry, 30 phút, buffer 2 giờ và race confirm/expire.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-147"></a>
### CTP-147 — Tạo xử lý expiry hiệu lực và tác vụ cập nhật

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-47 (Story) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-45, CTP-46 |
| Blocks | CTP-148 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-47 — Hết hạn booking không phụ thuộc cron. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Đơn PENDING với expires_at <= UTC_TIMESTAMP(3) không chiếm chỗ và API hiển thị EXPIRED hiệu lực.
2. Tác vụ SYSTEM cập nhật trạng thái/lịch sử an toàn, chạy lặp không sinh bản ghi trùng.
3. Không cho confirm đơn đã hết hạn dù cron chưa chạy.
4. Test đúng mốc expiry, 30 phút, buffer 2 giờ và race confirm/expire.
5. Phần triển khai của "Tạo xử lý expiry hiệu lực và tác vụ cập nhật" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-148"></a>
### CTP-148 — Kiểm thử ranh giới và confirm/expire đồng thời

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-47 (Story) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-147 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-47 — Hết hạn booking không phụ thuộc cron. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Đơn PENDING với expires_at <= UTC_TIMESTAMP(3) không chiếm chỗ và API hiển thị EXPIRED hiệu lực.
2. Xác minh và lưu bằng chứng: Tác vụ SYSTEM cập nhật trạng thái/lịch sử an toàn, chạy lặp không sinh bản ghi trùng.
3. Xác minh và lưu bằng chứng: Không cho confirm đơn đã hết hạn dù cron chưa chạy.
4. Xác minh và lưu bằng chứng: Test đúng mốc expiry, 30 phút, buffer 2 giờ và race confirm/expire.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-48"></a>
### CTP-48 — Lịch sử và chi tiết booking theo vai trò

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-8 (Epic) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | 2 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-46, CTP-47 |
| Blocks | CTP-49, CTP-53, CTP-55, CTP-62, CTP-69, CTP-151, CTP-159, CTP-163, CTP-177, CTP-191 |
| DoD profile | DEV |

**Description**

Là khách và hộ dân, tôi cần lịch sử và chi tiết booking theo vai trò để đạt mục tiêu: Booking nhiều phòng/dịch vụ, giữ chỗ, định giá, mã đơn và chuyển trạng thái có kiểm soát. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Khách xem đơn của mình; hộ xem đơn của hộ; Admin xem tổng quan theo quyền.
2. Chi tiết có hai loại item, snapshot, tiền, expiresAt, completedAt và lịch sử trạng thái.
3. List có filter trạng thái/pagination; trạng thái EXPIRED hiệu lực nhất quán.
4. Không có API chỉnh tự do booking_status hoặc sửa items sau tạo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-149"></a>
### CTP-149 — Xây API lịch sử/list/detail booking

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-48 (Story) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-46, CTP-47 |
| Blocks | CTP-150 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-48 — Lịch sử và chi tiết booking theo vai trò. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Khách xem đơn của mình; hộ xem đơn của hộ; Admin xem tổng quan theo quyền.
2. Chi tiết có hai loại item, snapshot, tiền, expiresAt, completedAt và lịch sử trạng thái.
3. List có filter trạng thái/pagination; trạng thái EXPIRED hiệu lực nhất quán.
4. Không có API chỉnh tự do booking_status hoặc sửa items sau tạo.
5. Phần triển khai của "Xây API lịch sử/list/detail booking" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-150"></a>
### CTP-150 — Kiểm thử ownership, filter và trạng thái hiệu lực

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-48 (Story) |
| Epic | CTP-8 — BOOKING MANAGEMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | BACKEND |
| Labels | booking, backend, availability |
| Dependencies | CTP-149 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-48 — Lịch sử và chi tiết booking theo vai trò. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Khách xem đơn của mình; hộ xem đơn của hộ; Admin xem tổng quan theo quyền.
2. Xác minh và lưu bằng chứng: Chi tiết có hai loại item, snapshot, tiền, expiresAt, completedAt và lịch sử trạng thái.
3. Xác minh và lưu bằng chứng: List có filter trạng thái/pagination; trạng thái EXPIRED hiệu lực nhất quán.
4. Xác minh và lưu bằng chứng: Không có API chỉnh tự do booking_status hoặc sửa items sau tạo.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-9 — PAYMENT LEDGER

<a id="ctp-9"></a>
### CTP-9 — PAYMENT LEDGER

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-9 — PAYMENT LEDGER |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 5 |
| Scope | MVP |
| Component | BACKEND |
| Labels | payment, backend, database |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Sổ thu/hoàn thủ công, idempotency, chống thu vượt và bảo toàn lịch sử tiền. Phạm vi được phân rã thành 2 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Sổ thu/hoàn thủ công, idempotency, chống thu vượt và bảo toàn lịch sử tiền.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-51"></a>
### CTP-51 — Ghi sổ thu/hoàn tiền thủ công và trạng thái thanh toán

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-9 (Epic) |
| Epic | CTP-9 — PAYMENT LEDGER |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | payment, backend, database |
| Dependencies | CTP-46, CTP-22 |
| Blocks | CTP-52, CTP-157 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần ghi sổ thu/hoàn tiền thủ công và trạng thái thanh toán để đạt mục tiêu: Sổ thu/hoàn thủ công, idempotency, chống thu vượt và bảo toàn lịch sử tiền. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Ledger chỉ ghi RECEIPT/REFUND, amount dương, confirmed_by từ token; không sửa/xóa entry đã xác nhận.
2. Ghi nhận CASH, BANK_TRANSFER hoặc QR như phương thức ngoài hệ thống; QR không tự xác minh ngân hàng, không có gateway/webhook thật.
3. Thu cho CONFIRMED/COMPLETED không vượt số còn phải trả; hoàn cho CANCELLED không vượt số đã nhận.
4. SUM chỉ tính giao dịch CONFIRMED; UNPAID/PARTIALLY_PAID/PAID/REFUND_PENDING/REFUNDED được cập nhật cùng transaction.
5. Ví dụ nhận 500000 + 300000, hoàn 200000 cho netReceived 600000; hộ mất duyệt vẫn xử lý đơn cũ đúng quyền.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-155"></a>
### CTP-155 — Tạo ledger receipt/refund và đọc lịch sử tiền

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-51 (Story) |
| Epic | CTP-9 — PAYMENT LEDGER |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | payment, backend, database |
| Dependencies | CTP-46, CTP-22 |
| Blocks | CTP-156 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-51 — Ghi sổ thu/hoàn tiền thủ công và trạng thái thanh toán. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Ledger chỉ ghi RECEIPT/REFUND, amount dương, confirmed_by từ token; không sửa/xóa entry đã xác nhận.
2. Ghi nhận CASH, BANK_TRANSFER hoặc QR như phương thức ngoài hệ thống; QR không tự xác minh ngân hàng, không có gateway/webhook thật.
3. Thu cho CONFIRMED/COMPLETED không vượt số còn phải trả; hoàn cho CANCELLED không vượt số đã nhận.
4. SUM chỉ tính giao dịch CONFIRMED; UNPAID/PARTIALLY_PAID/PAID/REFUND_PENDING/REFUNDED được cập nhật cùng transaction.
5. Ví dụ nhận 500000 + 300000, hoàn 200000 cho netReceived 600000; hộ mất duyệt vẫn xử lý đơn cũ đúng quyền.
6. Phần triển khai của "Tạo ledger receipt/refund và đọc lịch sử tiền" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-156"></a>
### CTP-156 — Kiểm thử giới hạn thu/hoàn và payment_status

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-51 (Story) |
| Epic | CTP-9 — PAYMENT LEDGER |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | payment, backend, database |
| Dependencies | CTP-155 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-51 — Ghi sổ thu/hoàn tiền thủ công và trạng thái thanh toán. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Ledger chỉ ghi RECEIPT/REFUND, amount dương, confirmed_by từ token; không sửa/xóa entry đã xác nhận.
2. Xác minh và lưu bằng chứng: Ghi nhận CASH, BANK_TRANSFER hoặc QR như phương thức ngoài hệ thống; QR không tự xác minh ngân hàng, không có gateway/webhook thật.
3. Xác minh và lưu bằng chứng: Thu cho CONFIRMED/COMPLETED không vượt số còn phải trả; hoàn cho CANCELLED không vượt số đã nhận.
4. Xác minh và lưu bằng chứng: SUM chỉ tính giao dịch CONFIRMED; UNPAID/PARTIALLY_PAID/PAID/REFUND_PENDING/REFUNDED được cập nhật cùng transaction.
5. Xác minh và lưu bằng chứng: Ví dụ nhận 500000 + 300000, hoàn 200000 cho netReceived 600000; hộ mất duyệt vẫn xử lý đơn cũ đúng quyền.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-52"></a>
### CTP-52 — Chống ghi tiền trùng và thu vượt khi đồng thời

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-9 (Epic) |
| Epic | CTP-9 — PAYMENT LEDGER |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 5 |
| Giờ dự kiến | 5 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | payment, backend, database |
| Dependencies | CTP-51 |
| Blocks | CTP-53, CTP-65, CTP-70, CTP-159, CTP-183, CTP-193 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần chống ghi tiền trùng và thu vượt khi đồng thời để đạt mục tiêu: Sổ thu/hoàn thủ công, idempotency, chống thu vượt và bảo toàn lịch sử tiền. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. POST payments bắt buộc Idempotency-Key; unique(confirmed_by,idempotency_key) và hash payload chuẩn hóa gồm booking/type/amount/method/note.
2. Cùng key/cùng payload trả entry cũ, kiểm tra replay trước business validation; khác payload trả 409.
3. Hai key khác nhau vẫn khóa booking để không overpayment/over-refund.
4. Ledger và payment_status nguyên tử; lỗi rollback không để entry hoặc cache lệch.
5. Test retry do mạng, cùng key đồng thời, khác booking cùng key và hai khoản tranh số dư trên MySQL thật.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-157"></a>
### CTP-157 — Tích hợp idempotency và khóa giao dịch tiền

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-52 (Story) |
| Epic | CTP-9 — PAYMENT LEDGER |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | payment, backend, database |
| Dependencies | CTP-51 |
| Blocks | CTP-158 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-52 — Chống ghi tiền trùng và thu vượt khi đồng thời. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. POST payments bắt buộc Idempotency-Key; unique(confirmed_by,idempotency_key) và hash payload chuẩn hóa gồm booking/type/amount/method/note.
2. Cùng key/cùng payload trả entry cũ, kiểm tra replay trước business validation; khác payload trả 409.
3. Hai key khác nhau vẫn khóa booking để không overpayment/over-refund.
4. Ledger và payment_status nguyên tử; lỗi rollback không để entry hoặc cache lệch.
5. Test retry do mạng, cùng key đồng thời, khác booking cùng key và hai khoản tranh số dư trên MySQL thật.
6. Phần triển khai của "Tích hợp idempotency và khóa giao dịch tiền" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-158"></a>
### CTP-158 — Chạy kiểm thử retry, replay và overpayment đồng thời

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-52 (Story) |
| Epic | CTP-9 — PAYMENT LEDGER |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | payment, backend, database |
| Dependencies | CTP-157 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-52 — Chống ghi tiền trùng và thu vượt khi đồng thời. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: POST payments bắt buộc Idempotency-Key; unique(confirmed_by,idempotency_key) và hash payload chuẩn hóa gồm booking/type/amount/method/note.
2. Xác minh và lưu bằng chứng: Cùng key/cùng payload trả entry cũ, kiểm tra replay trước business validation; khác payload trả 409.
3. Xác minh và lưu bằng chứng: Hai key khác nhau vẫn khóa booking để không overpayment/over-refund.
4. Xác minh và lưu bằng chứng: Ledger và payment_status nguyên tử; lỗi rollback không để entry hoặc cache lệch.
5. Xác minh và lưu bằng chứng: Test retry do mạng, cùng key đồng thời, khác booking cùng key và hai khoản tranh số dư trên MySQL thật.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-10 — EXPENSE & BASIC FINANCE

<a id="ctp-10"></a>
### CTP-10 — EXPENSE & BASIC FINANCE

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-10 — EXPENSE & BASIC FINANCE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 5; có Post-MVP |
| Scope | Mixed |
| Component | BACKEND |
| Labels | payment, backend |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Chi phí và các chỉ số tài chính không cộng trùng booking với sổ tiền. Phạm vi được phân rã thành 2 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Chi phí và các chỉ số tài chính không cộng trùng booking với sổ tiền.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-53"></a>
### CTP-53 — Ghi chi phí và API tài chính/thống kê cơ bản

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-10 (Epic) |
| Epic | CTP-10 — EXPENSE & BASIC FINANCE |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | payment, backend |
| Dependencies | CTP-52, CTP-48 |
| Blocks | CTP-55, CTP-66, CTP-71, CTP-84, CTP-86, CTP-163, CTP-185, CTP-195, CTP-222, CTP-226 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần ghi chi phí và API tài chính/thống kê cơ bản để đạt mục tiêu: Chi phí và các chỉ số tài chính không cộng trùng booking với sổ tiền. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Hộ thêm/xem chi phí của mình theo ngày/tháng; chưa sửa/xóa chi phí trong MVP.
2. Phân biệt giá trị đơn COMPLETED với tiền thực thu, hoàn tiền, netReceived và chi phí; không ghi thêm income trùng ledger.
3. Khách thực tế chỉ COMPLETED theo completed_at; khách dự kiến CONFIRMED theo earliest item start; mỗi đơn cộng guestCount một lần.
4. Ranh giới kỳ theo Asia/Ho_Chi_Minh; tiền theo ngày giao dịch; dữ liệu đổi trạng thái không làm mất lịch sử.
5. Test JOIN nhiều phòng/dịch vụ không nhân tổng tiền/số khách.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-159"></a>
### CTP-159 — Tạo expense API và aggregation tài chính/khách

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-53 (Story) |
| Epic | CTP-10 — EXPENSE & BASIC FINANCE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | payment, backend |
| Dependencies | CTP-52, CTP-48 |
| Blocks | CTP-160 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-53 — Ghi chi phí và API tài chính/thống kê cơ bản. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Hộ thêm/xem chi phí của mình theo ngày/tháng; chưa sửa/xóa chi phí trong MVP.
2. Phân biệt giá trị đơn COMPLETED với tiền thực thu, hoàn tiền, netReceived và chi phí; không ghi thêm income trùng ledger.
3. Khách thực tế chỉ COMPLETED theo completed_at; khách dự kiến CONFIRMED theo earliest item start; mỗi đơn cộng guestCount một lần.
4. Ranh giới kỳ theo Asia/Ho_Chi_Minh; tiền theo ngày giao dịch; dữ liệu đổi trạng thái không làm mất lịch sử.
5. Test JOIN nhiều phòng/dịch vụ không nhân tổng tiền/số khách.
6. Phần triển khai của "Tạo expense API và aggregation tài chính/khách" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-160"></a>
### CTP-160 — Kiểm thử kỳ báo cáo và tránh cộng trùng

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-53 (Story) |
| Epic | CTP-10 — EXPENSE & BASIC FINANCE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | payment, backend |
| Dependencies | CTP-159 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-53 — Ghi chi phí và API tài chính/thống kê cơ bản. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Hộ thêm/xem chi phí của mình theo ngày/tháng; chưa sửa/xóa chi phí trong MVP.
2. Xác minh và lưu bằng chứng: Phân biệt giá trị đơn COMPLETED với tiền thực thu, hoàn tiền, netReceived và chi phí; không ghi thêm income trùng ledger.
3. Xác minh và lưu bằng chứng: Khách thực tế chỉ COMPLETED theo completed_at; khách dự kiến CONFIRMED theo earliest item start; mỗi đơn cộng guestCount một lần.
4. Xác minh và lưu bằng chứng: Ranh giới kỳ theo Asia/Ho_Chi_Minh; tiền theo ngày giao dịch; dữ liệu đổi trạng thái không làm mất lịch sử.
5. Xác minh và lưu bằng chứng: Test JOIN nhiều phòng/dịch vụ không nhân tổng tiền/số khách.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-86"></a>
### CTP-86 — Sửa/ẩn chi phí có lưu vết

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-10 (Epic) |
| Epic | CTP-10 — EXPENSE & BASIC FINANCE |
| Status | BACKLOG |
| Priority | Low |
| Story Points | 3 |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | BACKEND |
| Labels | payment, backend |
| Dependencies | CTP-53 |
| Blocks | Không có |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần sửa/ẩn chi phí có lưu vết để đạt mục tiêu: Chi phí và các chỉ số tài chính không cộng trùng booking với sổ tiền. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Chỉ chủ hộ được sửa/ẩn expense, lưu giá trị trước/sau, actor và lý do.
2. Không sửa/xóa ledger receipt/refund hoặc biến expense thành khoản thu.
3. Thống kê loại expense đã ẩn; lịch sử audit vẫn truy xuất được.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-226"></a>
### CTP-226 — Thiết kế và triển khai chỉnh/ẩn expense có audit

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-86 (Story) |
| Epic | CTP-10 — EXPENSE & BASIC FINANCE |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | BACKEND |
| Labels | payment, backend |
| Dependencies | CTP-53 |
| Blocks | CTP-227 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-86 — Sửa/ẩn chi phí có lưu vết. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Chỉ chủ hộ được sửa/ẩn expense, lưu giá trị trước/sau, actor và lý do.
2. Không sửa/xóa ledger receipt/refund hoặc biến expense thành khoản thu.
3. Thống kê loại expense đã ẩn; lịch sử audit vẫn truy xuất được.
4. Phần triển khai của "Thiết kế và triển khai chỉnh/ẩn expense có audit" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-227"></a>
### CTP-227 — Kiểm thử quyền, audit và tổng chi phí

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-86 (Story) |
| Epic | CTP-10 — EXPENSE & BASIC FINANCE |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | BACKEND |
| Labels | payment, backend |
| Dependencies | CTP-226 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-86 — Sửa/ẩn chi phí có lưu vết. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Chỉ chủ hộ được sửa/ẩn expense, lưu giá trị trước/sau, actor và lý do.
2. Xác minh và lưu bằng chứng: Không sửa/xóa ledger receipt/refund hoặc biến expense thành khoản thu.
3. Xác minh và lưu bằng chứng: Thống kê loại expense đã ẩn; lịch sử audit vẫn truy xuất được.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-11 — REVIEWS

<a id="ctp-11"></a>
### CTP-11 — REVIEWS

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-11 — REVIEWS |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 5; có Post-MVP |
| Scope | Mixed |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Một review tổng thể hộ dân cho mỗi booking đã hoàn thành. Phạm vi được phân rã thành 2 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Một review tổng thể hộ dân cho mỗi booking đã hoàn thành.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-54"></a>
### CTP-54 — Review tổng thể hộ dân sau booking hoàn thành

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-11 (Epic) |
| Epic | CTP-11 — REVIEWS |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | 2 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-46, CTP-31 |
| Blocks | CTP-55, CTP-60, CTP-64, CTP-88, CTP-163, CTP-173, CTP-181, CTP-230 |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần review tổng thể hộ dân sau booking hoàn thành để đạt mục tiêu: Một review tổng thể hộ dân cho mỗi booking đã hoàn thành. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Chỉ chủ booking COMPLETED được review, rating nguyên 1–5; customer/household lấy từ booking.
2. UNIQUE booking_id ngăn review lặp kể cả đồng thời; comment validate và hiển thị an toàn.
3. API household reviews trả danh sách, average rating và total reviews.
4. Không review riêng từng room/service; test booking chưa complete, khác chủ và rating sai.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-161"></a>
### CTP-161 — Tạo API review và rating tổng hợp

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-54 (Story) |
| Epic | CTP-11 — REVIEWS |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-46, CTP-31 |
| Blocks | CTP-162 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-54 — Review tổng thể hộ dân sau booking hoàn thành. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Chỉ chủ booking COMPLETED được review, rating nguyên 1–5; customer/household lấy từ booking.
2. UNIQUE booking_id ngăn review lặp kể cả đồng thời; comment validate và hiển thị an toàn.
3. API household reviews trả danh sách, average rating và total reviews.
4. Không review riêng từng room/service; test booking chưa complete, khác chủ và rating sai.
5. Phần triển khai của "Tạo API review và rating tổng hợp" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-162"></a>
### CTP-162 — Kiểm thử một review mỗi booking và quyền đánh giá

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-54 (Story) |
| Epic | CTP-11 — REVIEWS |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-161 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-54 — Review tổng thể hộ dân sau booking hoàn thành. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Chỉ chủ booking COMPLETED được review, rating nguyên 1–5; customer/household lấy từ booking.
2. Xác minh và lưu bằng chứng: UNIQUE booking_id ngăn review lặp kể cả đồng thời; comment validate và hiển thị an toàn.
3. Xác minh và lưu bằng chứng: API household reviews trả danh sách, average rating và total reviews.
4. Xác minh và lưu bằng chứng: Không review riêng từng room/service; test booking chưa complete, khác chủ và rating sai.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-88"></a>
### CTP-88 — Ẩn/hiện review có lý do và lịch sử quản trị

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-11 (Epic) |
| Epic | CTP-11 — REVIEWS |
| Status | BACKLOG |
| Priority | Low |
| Story Points | 3 |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-54, CTP-55 |
| Blocks | Không có |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần ẩn/hiện review có lý do và lịch sử quản trị để đạt mục tiêu: Một review tổng thể hộ dân cho mỗi booking đã hoàn thành. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Admin ẩn/hiện review có reason/audit; không sửa nội dung người dùng.
2. Rating công khai tính theo review đang hiển thị, không làm mất bản ghi gốc.
3. Một review mỗi booking vẫn giữ nguyên khi ẩn.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-230"></a>
### CTP-230 — Tạo moderation API và màn hình Admin

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-88 (Story) |
| Epic | CTP-11 — REVIEWS |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-54, CTP-55 |
| Blocks | CTP-231 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-88 — Ẩn/hiện review có lý do và lịch sử quản trị. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Admin ẩn/hiện review có reason/audit; không sửa nội dung người dùng.
2. Rating công khai tính theo review đang hiển thị, không làm mất bản ghi gốc.
3. Một review mỗi booking vẫn giữ nguyên khi ẩn.
4. Phần triển khai của "Tạo moderation API và màn hình Admin" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-231"></a>
### CTP-231 — Kiểm thử audit, rating và uniqueness

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-88 (Story) |
| Epic | CTP-11 — REVIEWS |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | BACKEND |
| Labels | backend, security |
| Dependencies | CTP-230 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-88 — Ẩn/hiện review có lý do và lịch sử quản trị. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Admin ẩn/hiện review có reason/audit; không sửa nội dung người dùng.
2. Xác minh và lưu bằng chứng: Rating công khai tính theo review đang hiển thị, không làm mất bản ghi gốc.
3. Xác minh và lưu bằng chứng: Một review mỗi booking vẫn giữ nguyên khi ẩn.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-12 — CUSTOMER FLUTTER APP

<a id="ctp-12"></a>
### CTP-12 — CUSTOMER FLUTTER APP

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 2, Sprint 6, Sprint 7; có Post-MVP |
| Scope | Mixed |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản. Phạm vi được phân rã thành 11 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-34"></a>
### CTP-34 — Dựng Flutter shell dùng chung cho khách và hộ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-12 (Epic) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, security |
| Dependencies | CTP-19, CTP-25 |
| Blocks | CTP-42, CTP-57, CTP-58, CTP-137, CTP-167, CTP-169 |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần dựng Flutter shell dùng chung cho khách và hộ để đạt mục tiêu: Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. App có API client, secure token storage, cấu hình API URL theo môi trường và điều hướng theo role.
2. Có splash, khung navigation khách/hộ và xử lý mất phiên/403 nhất quán.
3. Loading/error/empty, form input và upload adapter được tổ chức để dùng lại.
4. Chạy được trên thiết bị/emulator Android; không coi localhost máy tính là URL thiết bị.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-121"></a>
### CTP-121 — Xây API client, phiên đăng nhập và routing theo role

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-34 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, security |
| Dependencies | CTP-19, CTP-25 |
| Blocks | CTP-122 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-34 — Dựng Flutter shell dùng chung cho khách và hộ. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. App có API client, secure token storage, cấu hình API URL theo môi trường và điều hướng theo role.
2. Có splash, khung navigation khách/hộ và xử lý mất phiên/403 nhất quán.
3. Loading/error/empty, form input và upload adapter được tổ chức để dùng lại.
4. Chạy được trên thiết bị/emulator Android; không coi localhost máy tính là URL thiết bị.
5. Phần triển khai của "Xây API client, phiên đăng nhập và routing theo role" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-122"></a>
### CTP-122 — Tạo UI dùng chung và kiểm thử kết nối Android

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-34 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, security |
| Dependencies | CTP-121 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-34 — Dựng Flutter shell dùng chung cho khách và hộ. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: App có API client, secure token storage, cấu hình API URL theo môi trường và điều hướng theo role.
2. Xác minh và lưu bằng chứng: Có splash, khung navigation khách/hộ và xử lý mất phiên/403 nhất quán.
3. Xác minh và lưu bằng chứng: Loading/error/empty, form input và upload adapter được tổ chức để dùng lại.
4. Xác minh và lưu bằng chứng: Chạy được trên thiết bị/emulator Android; không coi localhost máy tính là URL thiết bị.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-58"></a>
### CTP-58 — Flutter khách: đăng nhập, đăng ký và phiên người dùng

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-12 (Epic) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-34, CTP-35, CTP-26 |
| Blocks | CTP-59, CTP-66, CTP-171, CTP-185 |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần flutter khách: đăng nhập, đăng ký và phiên người dùng để đạt mục tiêu: Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Login/register CUSTOMER và đăng ký HOUSEHOLD dùng API thật, hiển thị lỗi rõ.
2. Splash xác định phiên/role và đưa đúng giao diện; hộ chờ duyệt vẫn đăng nhập được.
3. Token lưu an toàn, logout xóa token; user bị block mất quyền khi API trả 403.
4. Không tự cấp quyền ADMIN từ UI hoặc body đăng ký.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-169"></a>
### CTP-169 — Hoàn thiện màn hình auth và thông tin đăng ký

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-58 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-34, CTP-35, CTP-26 |
| Blocks | CTP-170 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-58 — Flutter khách: đăng nhập, đăng ký và phiên người dùng. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Login/register CUSTOMER và đăng ký HOUSEHOLD dùng API thật, hiển thị lỗi rõ.
2. Splash xác định phiên/role và đưa đúng giao diện; hộ chờ duyệt vẫn đăng nhập được.
3. Token lưu an toàn, logout xóa token; user bị block mất quyền khi API trả 403.
4. Không tự cấp quyền ADMIN từ UI hoặc body đăng ký.
5. Phần triển khai của "Hoàn thiện màn hình auth và thông tin đăng ký" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-170"></a>
### CTP-170 — Kiểm thử điều hướng theo role và mất phiên

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-58 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-169 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-58 — Flutter khách: đăng nhập, đăng ký và phiên người dùng. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Login/register CUSTOMER và đăng ký HOUSEHOLD dùng API thật, hiển thị lỗi rõ.
2. Xác minh và lưu bằng chứng: Splash xác định phiên/role và đưa đúng giao diện; hộ chờ duyệt vẫn đăng nhập được.
3. Xác minh và lưu bằng chứng: Token lưu an toàn, logout xóa token; user bị block mất quyền khi API trả 403.
4. Xác minh và lưu bằng chứng: Không tự cấp quyền ADMIN từ UI hoặc body đăng ký.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-59"></a>
### CTP-59 — Flutter khách: trang chủ, khám phá và tìm kiếm

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-12 (Epic) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-58, CTP-31 |
| Blocks | CTP-60, CTP-73, CTP-90, CTP-173, CTP-199, CTP-234 |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần flutter khách: trang chủ, khám phá và tìm kiếm để đạt mục tiêu: Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Home/discovery hiển thị danh sách hộ/phòng/dịch vụ từ API, search và filter cơ bản.
2. Pagination, loading, empty và error có thể phục hồi; dữ liệu nháp/không được duyệt không hiển thị.
3. MVP dùng layout danh sách/cards đơn giản; banner/carousel nâng cao nằm Post-MVP.
4. UI tiếng Việt, chữ dễ đọc và hoạt động trên kích thước Android demo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-171"></a>
### CTP-171 — Tạo Home/Discovery và bộ lọc cơ bản

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-59 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-58, CTP-31 |
| Blocks | CTP-172 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-59 — Flutter khách: trang chủ, khám phá và tìm kiếm. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Home/discovery hiển thị danh sách hộ/phòng/dịch vụ từ API, search và filter cơ bản.
2. Pagination, loading, empty và error có thể phục hồi; dữ liệu nháp/không được duyệt không hiển thị.
3. MVP dùng layout danh sách/cards đơn giản; banner/carousel nâng cao nằm Post-MVP.
4. UI tiếng Việt, chữ dễ đọc và hoạt động trên kích thước Android demo.
5. Phần triển khai của "Tạo Home/Discovery và bộ lọc cơ bản" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-172"></a>
### CTP-172 — Tích hợp pagination và kiểm thử trạng thái giao diện

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-59 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-171 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-59 — Flutter khách: trang chủ, khám phá và tìm kiếm. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Home/discovery hiển thị danh sách hộ/phòng/dịch vụ từ API, search và filter cơ bản.
2. Xác minh và lưu bằng chứng: Pagination, loading, empty và error có thể phục hồi; dữ liệu nháp/không được duyệt không hiển thị.
3. Xác minh và lưu bằng chứng: MVP dùng layout danh sách/cards đơn giản; banner/carousel nâng cao nằm Post-MVP.
4. Xác minh và lưu bằng chứng: UI tiếng Việt, chữ dễ đọc và hoạt động trên kích thước Android demo.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-60"></a>
### CTP-60 — Flutter khách: chi tiết hộ, phòng, dịch vụ và chỉ đường

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-12 (Epic) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-59, CTP-54 |
| Blocks | CTP-61, CTP-175 |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần flutter khách: chi tiết hộ, phòng, dịch vụ và chỉ đường để đạt mục tiêu: Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Chi tiết hiển thị ảnh, mô tả, giá/đơn vị, room capacity, rating và thông tin hộ.
2. Xem các phòng/dịch vụ thuộc hộ và điều hướng đến lựa chọn đặt.
3. Nút chỉ đường mở Maps URL theo tọa độ hoặc địa chỉ; không nhúng map hoặc cần API secret.
4. Không crash khi thiếu ảnh, tọa độ hoặc chưa có review.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-173"></a>
### CTP-173 — Tạo các màn hình chi tiết và gallery cơ bản

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-60 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-59, CTP-54 |
| Blocks | CTP-174 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-60 — Flutter khách: chi tiết hộ, phòng, dịch vụ và chỉ đường. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Chi tiết hiển thị ảnh, mô tả, giá/đơn vị, room capacity, rating và thông tin hộ.
2. Xem các phòng/dịch vụ thuộc hộ và điều hướng đến lựa chọn đặt.
3. Nút chỉ đường mở Maps URL theo tọa độ hoặc địa chỉ; không nhúng map hoặc cần API secret.
4. Không crash khi thiếu ảnh, tọa độ hoặc chưa có review.
5. Phần triển khai của "Tạo các màn hình chi tiết và gallery cơ bản" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-174"></a>
### CTP-174 — Tích hợp rating và kiểm thử mở Google Maps

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-60 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-173 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-60 — Flutter khách: chi tiết hộ, phòng, dịch vụ và chỉ đường. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Chi tiết hiển thị ảnh, mô tả, giá/đơn vị, room capacity, rating và thông tin hộ.
2. Xác minh và lưu bằng chứng: Xem các phòng/dịch vụ thuộc hộ và điều hướng đến lựa chọn đặt.
3. Xác minh và lưu bằng chứng: Nút chỉ đường mở Maps URL theo tọa độ hoặc địa chỉ; không nhúng map hoặc cần API secret.
4. Xác minh và lưu bằng chứng: Không crash khi thiếu ảnh, tọa độ hoặc chưa có review.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-61"></a>
### CTP-61 — Flutter khách: chọn nhiều phòng và nhiều dịch vụ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-12 (Epic) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 5 |
| Giờ dự kiến | 5 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-60, CTP-39, CTP-41 |
| Blocks | CTP-62, CTP-177 |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần flutter khách: chọn nhiều phòng và nhiều dịch vụ để đạt mục tiêu: Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Chọn một kỳ lưu trú chung, nhiều phòng vật lý và phân số khách vào từng phòng.
2. Chọn slot/số lượng từng dịch vụ độc lập guestCount; hỗ trợ room-only, service-only và combined.
3. Hiển thị remaining capacity và tình trạng OPEN/CLOSED; số hiển thị không thay thế kiểm tra backend.
4. Validate ngày bắt đầu/kết thúc dịch vụ theo local date và hiển thị lỗi dễ hiểu.
5. Không có partial cancellation hoặc chọn ngày khác nhau cho từng phòng.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-175"></a>
### CTP-175 — Tạo giỏ đặt phòng/dịch vụ và phân bổ số khách

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-61 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-60, CTP-39, CTP-41 |
| Blocks | CTP-176 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-61 — Flutter khách: chọn nhiều phòng và nhiều dịch vụ. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Chọn một kỳ lưu trú chung, nhiều phòng vật lý và phân số khách vào từng phòng.
2. Chọn slot/số lượng từng dịch vụ độc lập guestCount; hỗ trợ room-only, service-only và combined.
3. Hiển thị remaining capacity và tình trạng OPEN/CLOSED; số hiển thị không thay thế kiểm tra backend.
4. Validate ngày bắt đầu/kết thúc dịch vụ theo local date và hiển thị lỗi dễ hiểu.
5. Không có partial cancellation hoặc chọn ngày khác nhau cho từng phòng.
6. Phần triển khai của "Tạo giỏ đặt phòng/dịch vụ và phân bổ số khách" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-176"></a>
### CTP-176 — Tích hợp khả dụng và kiểm thử ba loại booking

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-61 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-175 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-61 — Flutter khách: chọn nhiều phòng và nhiều dịch vụ. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Chọn một kỳ lưu trú chung, nhiều phòng vật lý và phân số khách vào từng phòng.
2. Xác minh và lưu bằng chứng: Chọn slot/số lượng từng dịch vụ độc lập guestCount; hỗ trợ room-only, service-only và combined.
3. Xác minh và lưu bằng chứng: Hiển thị remaining capacity và tình trạng OPEN/CLOSED; số hiển thị không thay thế kiểm tra backend.
4. Xác minh và lưu bằng chứng: Validate ngày bắt đầu/kết thúc dịch vụ theo local date và hiển thị lỗi dễ hiểu.
5. Xác minh và lưu bằng chứng: Không có partial cancellation hoặc chọn ngày khác nhau cho từng phòng.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-62"></a>
### CTP-62 — Flutter khách: tạo đơn và xử lý xung đột đặt chỗ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-12 (Epic) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-61, CTP-45, CTP-48 |
| Blocks | CTP-63, CTP-179 |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần flutter khách: tạo đơn và xử lý xung đột đặt chỗ để đạt mục tiêu: Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Màn hình xác nhận gửi IDs/quantity/ngày, không tự quyết total hoặc booking_code.
2. Thành công hiển thị mã đơn, snapshot, tổng tiền backend và expiresAt.
3. 409 hết chỗ/thiếu thời gian xử lý và 400 sai ngày được xử lý, cho khách cập nhật lựa chọn.
4. Chặn gửi lặp khi request đang chạy; không hiển thị tạo thành công nếu server thất bại.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-177"></a>
### CTP-177 — Tích hợp màn hình xác nhận và POST booking

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-62 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-61, CTP-45, CTP-48 |
| Blocks | CTP-178 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-62 — Flutter khách: tạo đơn và xử lý xung đột đặt chỗ. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Màn hình xác nhận gửi IDs/quantity/ngày, không tự quyết total hoặc booking_code.
2. Thành công hiển thị mã đơn, snapshot, tổng tiền backend và expiresAt.
3. 409 hết chỗ/thiếu thời gian xử lý và 400 sai ngày được xử lý, cho khách cập nhật lựa chọn.
4. Chặn gửi lặp khi request đang chạy; không hiển thị tạo thành công nếu server thất bại.
5. Phần triển khai của "Tích hợp màn hình xác nhận và POST booking" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-178"></a>
### CTP-178 — Kiểm thử conflict, timeout và kết quả từ backend

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-62 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-177 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-62 — Flutter khách: tạo đơn và xử lý xung đột đặt chỗ. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Màn hình xác nhận gửi IDs/quantity/ngày, không tự quyết total hoặc booking_code.
2. Xác minh và lưu bằng chứng: Thành công hiển thị mã đơn, snapshot, tổng tiền backend và expiresAt.
3. Xác minh và lưu bằng chứng: 409 hết chỗ/thiếu thời gian xử lý và 400 sai ngày được xử lý, cho khách cập nhật lựa chọn.
4. Xác minh và lưu bằng chứng: Chặn gửi lặp khi request đang chạy; không hiển thị tạo thành công nếu server thất bại.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-63"></a>
### CTP-63 — Flutter khách: lịch sử, chi tiết và hủy toàn booking

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-12 (Epic) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-62, CTP-46, CTP-47 |
| Blocks | CTP-64, CTP-181 |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần flutter khách: lịch sử, chi tiết và hủy toàn booking để đạt mục tiêu: Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. List/detail phản ánh tất cả trạng thái, các item, deadline và lịch sử.
2. Chỉ hiện hành động hủy khi phù hợp; backend vẫn quyết định quyền/trạng thái.
3. Hủy toàn đơn trước hạng mục đầu tiên; không hiện hủy từng item.
4. Hiển thị trạng thái thanh toán/hoàn tiền khi API có dữ liệu; refresh thấy EXPIRED khi cron chưa chạy.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-179"></a>
### CTP-179 — Tạo màn hình lịch sử và chi tiết đơn

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-63 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-62, CTP-46, CTP-47 |
| Blocks | CTP-180 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-63 — Flutter khách: lịch sử, chi tiết và hủy toàn booking. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. List/detail phản ánh tất cả trạng thái, các item, deadline và lịch sử.
2. Chỉ hiện hành động hủy khi phù hợp; backend vẫn quyết định quyền/trạng thái.
3. Hủy toàn đơn trước hạng mục đầu tiên; không hiện hủy từng item.
4. Hiển thị trạng thái thanh toán/hoàn tiền khi API có dữ liệu; refresh thấy EXPIRED khi cron chưa chạy.
5. Phần triển khai của "Tạo màn hình lịch sử và chi tiết đơn" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-180"></a>
### CTP-180 — Tích hợp cancel/refresh và kiểm thử các trạng thái

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-63 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-179 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-63 — Flutter khách: lịch sử, chi tiết và hủy toàn booking. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: List/detail phản ánh tất cả trạng thái, các item, deadline và lịch sử.
2. Xác minh và lưu bằng chứng: Chỉ hiện hành động hủy khi phù hợp; backend vẫn quyết định quyền/trạng thái.
3. Xác minh và lưu bằng chứng: Hủy toàn đơn trước hạng mục đầu tiên; không hiện hủy từng item.
4. Xác minh và lưu bằng chứng: Hiển thị trạng thái thanh toán/hoàn tiền khi API có dữ liệu; refresh thấy EXPIRED khi cron chưa chạy.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-64"></a>
### CTP-64 — Flutter khách: review, hồ sơ và đổi mật khẩu

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-12 (Epic) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | 2 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-63, CTP-54, CTP-35 |
| Blocks | CTP-65, CTP-78, CTP-183, CTP-210 |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần flutter khách: review, hồ sơ và đổi mật khẩu để đạt mục tiêu: Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Đơn COMPLETED chưa review cho gửi một đánh giá tổng thể 1–5 sao và comment.
2. Hồ sơ và đổi mật khẩu gọi API, hiển thị validation và trạng thái phiên đúng.
3. Không hiển thị review từng phòng/dịch vụ; lỗi review lặp/khác chủ được xử lý.
4. Chỉ ghi nhận thành công sau response backend.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-181"></a>
### CTP-181 — Tạo form review và cập nhật hồ sơ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-64 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-63, CTP-54, CTP-35 |
| Blocks | CTP-182 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-64 — Flutter khách: review, hồ sơ và đổi mật khẩu. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Đơn COMPLETED chưa review cho gửi một đánh giá tổng thể 1–5 sao và comment.
2. Hồ sơ và đổi mật khẩu gọi API, hiển thị validation và trạng thái phiên đúng.
3. Không hiển thị review từng phòng/dịch vụ; lỗi review lặp/khác chủ được xử lý.
4. Chỉ ghi nhận thành công sau response backend.
5. Phần triển khai của "Tạo form review và cập nhật hồ sơ" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-182"></a>
### CTP-182 — Kiểm thử quyền review và đổi mật khẩu

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-64 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-181 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-64 — Flutter khách: review, hồ sơ và đổi mật khẩu. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Đơn COMPLETED chưa review cho gửi một đánh giá tổng thể 1–5 sao và comment.
2. Xác minh và lưu bằng chứng: Hồ sơ và đổi mật khẩu gọi API, hiển thị validation và trạng thái phiên đúng.
3. Xác minh và lưu bằng chứng: Không hiển thị review từng phòng/dịch vụ; lỗi review lặp/khác chủ được xử lý.
4. Xác minh và lưu bằng chứng: Chỉ ghi nhận thành công sau response backend.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-73"></a>
### CTP-73 — Flutter khách đọc nội dung văn hóa đã xuất bản

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-12 (Epic) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | 2 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-59, CTP-56 |
| Blocks | CTP-74, CTP-83, CTP-87, CTP-201, CTP-220, CTP-228 |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần flutter khách đọc nội dung văn hóa đã xuất bản để đạt mục tiêu: Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Home có lối vào danh sách bài PUBLISHED và màn hình chi tiết.
2. Hiển thị title/content/thumbnail; mở video URL bằng liên kết.
3. Không hiển thị draft; xử lý bài bị gỡ hoặc ảnh lỗi.
4. Không thêm tính năng xã hội/comment ngoài MVP.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-199"></a>
### CTP-199 — Tạo danh sách và chi tiết cultural posts

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-73 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-59, CTP-56 |
| Blocks | CTP-200 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-73 — Flutter khách đọc nội dung văn hóa đã xuất bản. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Home có lối vào danh sách bài PUBLISHED và màn hình chi tiết.
2. Hiển thị title/content/thumbnail; mở video URL bằng liên kết.
3. Không hiển thị draft; xử lý bài bị gỡ hoặc ảnh lỗi.
4. Không thêm tính năng xã hội/comment ngoài MVP.
5. Phần triển khai của "Tạo danh sách và chi tiết cultural posts" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-200"></a>
### CTP-200 — Kiểm thử xuất bản và mở liên kết video

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-73 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-199 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-73 — Flutter khách đọc nội dung văn hóa đã xuất bản. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Home có lối vào danh sách bài PUBLISHED và màn hình chi tiết.
2. Xác minh và lưu bằng chứng: Hiển thị title/content/thumbnail; mở video URL bằng liên kết.
3. Xác minh và lưu bằng chứng: Không hiển thị draft; xử lý bài bị gỡ hoặc ảnh lỗi.
4. Xác minh và lưu bằng chứng: Không thêm tính năng xã hội/comment ngoài MVP.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-83"></a>
### CTP-83 — Nâng cấp banner, carousel và giao diện trang chủ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-12 (Epic) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Low |
| Story Points | 3 |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-73 |
| Blocks | Không có |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần nâng cấp banner, carousel và giao diện trang chủ để đạt mục tiêu: Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Cải thiện hiển thị mà không đổi API/luồng booking.
2. Không làm tăng độ khó sử dụng cho khách; responsive và loading giữ ổn định.
3. Chỉ bắt đầu sau khi release MVP đạt cổng chất lượng.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-220"></a>
### CTP-220 — Thiết kế và triển khai thành phần trang chủ nâng cao

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-83 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-73 |
| Blocks | CTP-221 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-83 — Nâng cấp banner, carousel và giao diện trang chủ. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Cải thiện hiển thị mà không đổi API/luồng booking.
2. Không làm tăng độ khó sử dụng cho khách; responsive và loading giữ ổn định.
3. Chỉ bắt đầu sau khi release MVP đạt cổng chất lượng.
4. Phần triển khai của "Thiết kế và triển khai thành phần trang chủ nâng cao" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-221"></a>
### CTP-221 — Kiểm tra UI, accessibility và hồi quy

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-83 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-220 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-83 — Nâng cấp banner, carousel và giao diện trang chủ. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Cải thiện hiển thị mà không đổi API/luồng booking.
2. Xác minh và lưu bằng chứng: Không làm tăng độ khó sử dụng cho khách; responsive và loading giữ ổn định.
3. Xác minh và lưu bằng chứng: Chỉ bắt đầu sau khi release MVP đạt cổng chất lượng.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-90"></a>
### CTP-90 — Tìm kiếm nâng cao theo khoảng cách và nhiều tiêu chí

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-12 (Epic) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Low |
| Story Points | 5 |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-59, CTP-31 |
| Blocks | Không có |
| DoD profile | DEV |

**Description**

Là khách du lịch, tôi cần tìm kiếm nâng cao theo khoảng cách và nhiều tiêu chí để đạt mục tiêu: Khách khám phá, đặt riêng/kết hợp, xem lịch sử, hủy, review và quản lý tài khoản. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Tìm theo tọa độ/khoảng cách dùng dữ liệu hộ, có xử lý hộ thiếu tọa độ.
2. Không hiển thị hộ chưa duyệt hoặc tài nguyên không được mở bán.
3. Không đưa bản đồ nhúng hoặc chi phí API bản đồ vào phạm vi story.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-234"></a>
### CTP-234 — Mở rộng API/filter tìm kiếm

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-90 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-59, CTP-31 |
| Blocks | CTP-235 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-90 — Tìm kiếm nâng cao theo khoảng cách và nhiều tiêu chí. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Tìm theo tọa độ/khoảng cách dùng dữ liệu hộ, có xử lý hộ thiếu tọa độ.
2. Không hiển thị hộ chưa duyệt hoặc tài nguyên không được mở bán.
3. Không đưa bản đồ nhúng hoặc chi phí API bản đồ vào phạm vi story.
4. Phần triển khai của "Mở rộng API/filter tìm kiếm" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-235"></a>
### CTP-235 — Kiểm thử điều kiện công khai và kết quả khoảng cách

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-90 (Story) |
| Epic | CTP-12 — CUSTOMER FLUTTER APP |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | FLUTTER_CUSTOMER |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-234 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-90 — Tìm kiếm nâng cao theo khoảng cách và nhiều tiêu chí. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Tìm theo tọa độ/khoảng cách dùng dữ liệu hộ, có xử lý hộ thiếu tọa độ.
2. Xác minh và lưu bằng chứng: Không hiển thị hộ chưa duyệt hoặc tài nguyên không được mở bán.
3. Xác minh và lưu bằng chứng: Không đưa bản đồ nhúng hoặc chi phí API bản đồ vào phạm vi story.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-13 — HOUSEHOLD FLUTTER APP

<a id="ctp-13"></a>
### CTP-13 — HOUSEHOLD FLUTTER APP

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 3, Sprint 5, Sprint 7; có Post-MVP |
| Scope | Mixed |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Hộ quản lý phòng, dịch vụ, lịch, đơn, tiền và chi phí theo quyền hiện tại. Phạm vi được phân rã thành 9 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Hộ quản lý phòng, dịch vụ, lịch, đơn, tiền và chi phí theo quyền hiện tại.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-42"></a>
### CTP-42 — Flutter hộ: danh sách, form phòng và ảnh

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-13 (Epic) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-34, CTP-29, CTP-28, CTP-27 |
| Blocks | CTP-66, CTP-67, CTP-185, CTP-187 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần flutter hộ: danh sách, form phòng và ảnh để đạt mục tiêu: Hộ quản lý phòng, dịch vụ, lịch, đơn, tiền và chi phí theo quyền hiện tại. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Hộ xem/thêm/sửa/ngừng kinh doanh phòng, capacity và giá; upload ảnh qua backend.
2. Hiển thị trạng thái duyệt và lý do không có quyền mở bán.
3. Không có trường số lượng phòng; mỗi form tạo một phòng vật lý.
4. Thử thao tác thật với API, loading/error/validation và tài nguyên hộ khác.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-137"></a>
### CTP-137 — Tạo Flutter room list/form và trạng thái kinh doanh

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-42 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-34, CTP-29, CTP-28, CTP-27 |
| Blocks | CTP-138 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-42 — Flutter hộ: danh sách, form phòng và ảnh. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Hộ xem/thêm/sửa/ngừng kinh doanh phòng, capacity và giá; upload ảnh qua backend.
2. Hiển thị trạng thái duyệt và lý do không có quyền mở bán.
3. Không có trường số lượng phòng; mỗi form tạo một phòng vật lý.
4. Thử thao tác thật với API, loading/error/validation và tài nguyên hộ khác.
5. Phần triển khai của "Tạo Flutter room list/form và trạng thái kinh doanh" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-138"></a>
### CTP-138 — Tích hợp ảnh, validation và kiểm thử API

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-42 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-137 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-42 — Flutter hộ: danh sách, form phòng và ảnh. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Hộ xem/thêm/sửa/ngừng kinh doanh phòng, capacity và giá; upload ảnh qua backend.
2. Xác minh và lưu bằng chứng: Hiển thị trạng thái duyệt và lý do không có quyền mở bán.
3. Xác minh và lưu bằng chứng: Không có trường số lượng phòng; mỗi form tạo một phòng vật lý.
4. Xác minh và lưu bằng chứng: Thử thao tác thật với API, loading/error/validation và tài nguyên hộ khác.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-57"></a>
### CTP-57 — Flutter hộ: form dịch vụ và ảnh

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-13 (Epic) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-34, CTP-30, CTP-28, CTP-27 |
| Blocks | CTP-66, CTP-68, CTP-185, CTP-189 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần flutter hộ: form dịch vụ và ảnh để đạt mục tiêu: Hộ quản lý phòng, dịch vụ, lịch, đơn, tiền và chi phí theo quyền hiện tại. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Hộ xem/thêm/sửa/ngừng kinh doanh dịch vụ, giá và đơn vị suất/người/nhóm.
2. Chọn danh mục từ API; không nhập capacity slot tại form dịch vụ.
3. Upload ảnh qua backend, xử lý lỗi và hiển thị quyền theo trạng thái duyệt.
4. Không đưa Cloudinary secret vào app; thử thao tác thật trên Android.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-167"></a>
### CTP-167 — Tạo service list/form Flutter và chọn danh mục

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-57 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-34, CTP-30, CTP-28, CTP-27 |
| Blocks | CTP-168 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-57 — Flutter hộ: form dịch vụ và ảnh. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Hộ xem/thêm/sửa/ngừng kinh doanh dịch vụ, giá và đơn vị suất/người/nhóm.
2. Chọn danh mục từ API; không nhập capacity slot tại form dịch vụ.
3. Upload ảnh qua backend, xử lý lỗi và hiển thị quyền theo trạng thái duyệt.
4. Không đưa Cloudinary secret vào app; thử thao tác thật trên Android.
5. Phần triển khai của "Tạo service list/form Flutter và chọn danh mục" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-168"></a>
### CTP-168 — Tích hợp ảnh và kiểm thử quyền/validation

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-57 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-167 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-57 — Flutter hộ: form dịch vụ và ảnh. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Hộ xem/thêm/sửa/ngừng kinh doanh dịch vụ, giá và đơn vị suất/người/nhóm.
2. Xác minh và lưu bằng chứng: Chọn danh mục từ API; không nhập capacity slot tại form dịch vụ.
3. Xác minh và lưu bằng chứng: Upload ảnh qua backend, xử lý lỗi và hiển thị quyền theo trạng thái duyệt.
4. Xác minh và lưu bằng chứng: Không đưa Cloudinary secret vào app; thử thao tác thật trên Android.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-66"></a>
### CTP-66 — Flutter hộ: dashboard, hồ sơ và trạng thái duyệt

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-13 (Epic) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-58, CTP-27, CTP-53, CTP-42, CTP-57 |
| Blocks | CTP-69, CTP-71, CTP-191, CTP-195 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần flutter hộ: dashboard, hồ sơ và trạng thái duyệt để đạt mục tiêu: Hộ quản lý phòng, dịch vụ, lịch, đơn, tiền và chi phí theo quyền hiện tại. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Dashboard có booking pending, tiền thu/chi cơ bản, khách thực tế và khách dự kiến tách riêng.
2. Hồ sơ có địa chỉ/tọa độ và trạng thái duyệt/lý do; hiển thị quyền mở bán theo backend.
3. Hộ mất duyệt vẫn xem và xử lý đơn cũ theo policy; user BLOCKED không được ngoại lệ.
4. Số liệu nhất quán với API/React Admin trong cùng kỳ.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-185"></a>
### CTP-185 — Tạo dashboard và profile/status hộ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-66 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-58, CTP-27, CTP-53, CTP-42, CTP-57 |
| Blocks | CTP-186 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-66 — Flutter hộ: dashboard, hồ sơ và trạng thái duyệt. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Dashboard có booking pending, tiền thu/chi cơ bản, khách thực tế và khách dự kiến tách riêng.
2. Hồ sơ có địa chỉ/tọa độ và trạng thái duyệt/lý do; hiển thị quyền mở bán theo backend.
3. Hộ mất duyệt vẫn xem và xử lý đơn cũ theo policy; user BLOCKED không được ngoại lệ.
4. Số liệu nhất quán với API/React Admin trong cùng kỳ.
5. Phần triển khai của "Tạo dashboard và profile/status hộ" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-186"></a>
### CTP-186 — Kiểm thử hộ chưa duyệt, mất duyệt và bị khóa

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-66 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-185 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-66 — Flutter hộ: dashboard, hồ sơ và trạng thái duyệt. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Dashboard có booking pending, tiền thu/chi cơ bản, khách thực tế và khách dự kiến tách riêng.
2. Xác minh và lưu bằng chứng: Hồ sơ có địa chỉ/tọa độ và trạng thái duyệt/lý do; hiển thị quyền mở bán theo backend.
3. Xác minh và lưu bằng chứng: Hộ mất duyệt vẫn xem và xử lý đơn cũ theo policy; user BLOCKED không được ngoại lệ.
4. Xác minh và lưu bằng chứng: Số liệu nhất quán với API/React Admin trong cùng kỳ.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-67"></a>
### CTP-67 — Flutter hộ: chặn lịch phòng nhận khách ngoài app

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-13 (Epic) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | 2 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-42, CTP-38, CTP-40 |
| Blocks | CTP-74, CTP-201 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần flutter hộ: chặn lịch phòng nhận khách ngoài app để đạt mục tiêu: Hộ quản lý phòng, dịch vụ, lịch, đơn, tiền và chi phí theo quyền hiện tại. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Hộ chọn phòng, ngày bắt đầu/kết thúc và lý do để tạo/xóa block.
2. Hiển thị lịch/block dạng danh sách theo ngày đủ dùng; không bắt buộc calendar kéo thả.
3. 409 xung đột booking/block được hiển thị; ngày nối tiếp trả/nhận được chấp nhận.
4. Không có thao tác sửa booking của khách từ màn hình block.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-187"></a>
### CTP-187 — Tạo UI room blocks theo phòng/ngày

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-67 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-42, CTP-38, CTP-40 |
| Blocks | CTP-188 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-67 — Flutter hộ: chặn lịch phòng nhận khách ngoài app. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Hộ chọn phòng, ngày bắt đầu/kết thúc và lý do để tạo/xóa block.
2. Hiển thị lịch/block dạng danh sách theo ngày đủ dùng; không bắt buộc calendar kéo thả.
3. 409 xung đột booking/block được hiển thị; ngày nối tiếp trả/nhận được chấp nhận.
4. Không có thao tác sửa booking của khách từ màn hình block.
5. Phần triển khai của "Tạo UI room blocks theo phòng/ngày" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-188"></a>
### CTP-188 — Kiểm thử overlap và lịch nối tiếp

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-67 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-187 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-67 — Flutter hộ: chặn lịch phòng nhận khách ngoài app. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Hộ chọn phòng, ngày bắt đầu/kết thúc và lý do để tạo/xóa block.
2. Xác minh và lưu bằng chứng: Hiển thị lịch/block dạng danh sách theo ngày đủ dùng; không bắt buộc calendar kéo thả.
3. Xác minh và lưu bằng chứng: 409 xung đột booking/block được hiển thị; ngày nối tiếp trả/nhận được chấp nhận.
4. Xác minh và lưu bằng chứng: Không có thao tác sửa booking của khách từ màn hình block.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-68"></a>
### CTP-68 — Flutter hộ: quản lý slot, capacity và OPEN/CLOSED

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-13 (Epic) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-57, CTP-41, CTP-36 |
| Blocks | CTP-74, CTP-89, CTP-201, CTP-232 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần flutter hộ: quản lý slot, capacity và OPEN/CLOSED để đạt mục tiêu: Hộ quản lý phòng, dịch vụ, lịch, đơn, tiền và chi phí theo quyền hiện tại. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Hộ tạo slot với ngày/giờ địa phương, backend nhận instant UTC đúng; mặc định CLOSED.
2. Đóng/mở và sửa capacity dùng API; slot trùng/giờ sai/capacity dưới mức giữ được báo lỗi.
3. Hiển thị suất còn lại từ API, không tự duy trì booked_quantity trên client.
4. Giải thích đóng slot dừng nhận mới, không hủy đơn cũ; hộ mất duyệt không mở slot.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-189"></a>
### CTP-189 — Tạo slot form/list và OPEN/CLOSED

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-68 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-57, CTP-41, CTP-36 |
| Blocks | CTP-190 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-68 — Flutter hộ: quản lý slot, capacity và OPEN/CLOSED. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Hộ tạo slot với ngày/giờ địa phương, backend nhận instant UTC đúng; mặc định CLOSED.
2. Đóng/mở và sửa capacity dùng API; slot trùng/giờ sai/capacity dưới mức giữ được báo lỗi.
3. Hiển thị suất còn lại từ API, không tự duy trì booked_quantity trên client.
4. Giải thích đóng slot dừng nhận mới, không hủy đơn cũ; hộ mất duyệt không mở slot.
5. Phần triển khai của "Tạo slot form/list và OPEN/CLOSED" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-190"></a>
### CTP-190 — Kiểm thử timezone, capacity và slot trùng

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-68 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-189 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-68 — Flutter hộ: quản lý slot, capacity và OPEN/CLOSED. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Hộ tạo slot với ngày/giờ địa phương, backend nhận instant UTC đúng; mặc định CLOSED.
2. Xác minh và lưu bằng chứng: Đóng/mở và sửa capacity dùng API; slot trùng/giờ sai/capacity dưới mức giữ được báo lỗi.
3. Xác minh và lưu bằng chứng: Hiển thị suất còn lại từ API, không tự duy trì booked_quantity trên client.
4. Xác minh và lưu bằng chứng: Giải thích đóng slot dừng nhận mới, không hủy đơn cũ; hộ mất duyệt không mở slot.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-69"></a>
### CTP-69 — Flutter hộ: xử lý booking đúng quyền và trạng thái

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-13 (Epic) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-66, CTP-48, CTP-46, CTP-47 |
| Blocks | CTP-70, CTP-193 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần flutter hộ: xử lý booking đúng quyền và trạng thái để đạt mục tiêu: Hộ quản lý phòng, dịch vụ, lịch, đơn, tiền và chi phí theo quyền hiện tại. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. List/detail có các phòng/dịch vụ, snapshot, deadline, tiền và lịch sử.
2. Confirm/reject/complete chỉ hiện khi phù hợp; backend enforce lại toàn bộ.
3. completed_at hiển thị và không thay đổi khi request lặp; không complete trước hạng mục cuối.
4. Hộ mất duyệt không confirm nhưng được reject/complete đơn cũ đúng policy; slot CLOSED không tự hủy đơn.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-191"></a>
### CTP-191 — Tạo màn hình booking và các action của hộ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-69 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-66, CTP-48, CTP-46, CTP-47 |
| Blocks | CTP-192 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-69 — Flutter hộ: xử lý booking đúng quyền và trạng thái. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. List/detail có các phòng/dịch vụ, snapshot, deadline, tiền và lịch sử.
2. Confirm/reject/complete chỉ hiện khi phù hợp; backend enforce lại toàn bộ.
3. completed_at hiển thị và không thay đổi khi request lặp; không complete trước hạng mục cuối.
4. Hộ mất duyệt không confirm nhưng được reject/complete đơn cũ đúng policy; slot CLOSED không tự hủy đơn.
5. Phần triển khai của "Tạo màn hình booking và các action của hộ" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-192"></a>
### CTP-192 — Kiểm thử ma trận trạng thái và policy đơn cũ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-69 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-191 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-69 — Flutter hộ: xử lý booking đúng quyền và trạng thái. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: List/detail có các phòng/dịch vụ, snapshot, deadline, tiền và lịch sử.
2. Xác minh và lưu bằng chứng: Confirm/reject/complete chỉ hiện khi phù hợp; backend enforce lại toàn bộ.
3. Xác minh và lưu bằng chứng: completed_at hiển thị và không thay đổi khi request lặp; không complete trước hạng mục cuối.
4. Xác minh và lưu bằng chứng: Hộ mất duyệt không confirm nhưng được reject/complete đơn cũ đúng policy; slot CLOSED không tự hủy đơn.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-70"></a>
### CTP-70 — Flutter hộ: ghi nhận thu/hoàn với idempotency

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-13 (Epic) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-69, CTP-52 |
| Blocks | CTP-74, CTP-78, CTP-201, CTP-210 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần flutter hộ: ghi nhận thu/hoàn với idempotency để đạt mục tiêu: Hộ quản lý phòng, dịch vụ, lịch, đơn, tiền và chi phí theo quyền hiện tại. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Form ghi CASH/BANK_TRANSFER/QR, amount và note; không kết nối hoặc xác nhận giao dịch ngân hàng.
2. Mỗi thao tác sinh một Idempotency-Key; retry mạng giữ nguyên key.
3. Hiển thị receipt/refund ledger và payment_status; chặn vượt số tiền nhưng backend vẫn quyết định.
4. Không sửa/xóa entry; hộ mất duyệt còn ACTIVE vẫn xử lý đơn cũ đúng quyền.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-193"></a>
### CTP-193 — Tạo form thu/hoàn và lịch sử tiền

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-70 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-69, CTP-52 |
| Blocks | CTP-194 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-70 — Flutter hộ: ghi nhận thu/hoàn với idempotency. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Form ghi CASH/BANK_TRANSFER/QR, amount và note; không kết nối hoặc xác nhận giao dịch ngân hàng.
2. Mỗi thao tác sinh một Idempotency-Key; retry mạng giữ nguyên key.
3. Hiển thị receipt/refund ledger và payment_status; chặn vượt số tiền nhưng backend vẫn quyết định.
4. Không sửa/xóa entry; hộ mất duyệt còn ACTIVE vẫn xử lý đơn cũ đúng quyền.
5. Phần triển khai của "Tạo form thu/hoàn và lịch sử tiền" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-194"></a>
### CTP-194 — Kiểm thử double-tap, retry và giới hạn số tiền

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-70 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-193 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-70 — Flutter hộ: ghi nhận thu/hoàn với idempotency. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Form ghi CASH/BANK_TRANSFER/QR, amount và note; không kết nối hoặc xác nhận giao dịch ngân hàng.
2. Xác minh và lưu bằng chứng: Mỗi thao tác sinh một Idempotency-Key; retry mạng giữ nguyên key.
3. Xác minh và lưu bằng chứng: Hiển thị receipt/refund ledger và payment_status; chặn vượt số tiền nhưng backend vẫn quyết định.
4. Xác minh và lưu bằng chứng: Không sửa/xóa entry; hộ mất duyệt còn ACTIVE vẫn xử lý đơn cũ đúng quyền.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-71"></a>
### CTP-71 — Flutter hộ: chi phí và báo cáo tài chính cơ bản

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-13 (Epic) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | 2 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-66, CTP-53 |
| Blocks | CTP-74, CTP-85, CTP-201, CTP-224 |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần flutter hộ: chi phí và báo cáo tài chính cơ bản để đạt mục tiêu: Hộ quản lý phòng, dịch vụ, lịch, đơn, tiền và chi phí theo quyền hiện tại. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Hộ thêm/xem expense theo tháng; không có sửa/xóa trong MVP.
2. Phân biệt giá trị đơn hoàn thành, tiền thu, hoàn, netReceived, chi phí và chênh lệch.
3. Không gắn nhãn mọi booking là doanh thu thực tế; khách thực tế/dự kiến không gộp.
4. Số liệu từ API, không tính lại bằng cách cộng tất cả booking tại client.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-195"></a>
### CTP-195 — Tạo form/list chi phí và các chỉ số tài chính

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-71 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-66, CTP-53 |
| Blocks | CTP-196 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-71 — Flutter hộ: chi phí và báo cáo tài chính cơ bản. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Hộ thêm/xem expense theo tháng; không có sửa/xóa trong MVP.
2. Phân biệt giá trị đơn hoàn thành, tiền thu, hoàn, netReceived, chi phí và chênh lệch.
3. Không gắn nhãn mọi booking là doanh thu thực tế; khách thực tế/dự kiến không gộp.
4. Số liệu từ API, không tính lại bằng cách cộng tất cả booking tại client.
5. Phần triển khai của "Tạo form/list chi phí và các chỉ số tài chính" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-196"></a>
### CTP-196 — Kiểm thử kỳ báo cáo và nhãn số liệu

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-71 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-195 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-71 — Flutter hộ: chi phí và báo cáo tài chính cơ bản. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Hộ thêm/xem expense theo tháng; không có sửa/xóa trong MVP.
2. Xác minh và lưu bằng chứng: Phân biệt giá trị đơn hoàn thành, tiền thu, hoàn, netReceived, chi phí và chênh lệch.
3. Xác minh và lưu bằng chứng: Không gắn nhãn mọi booking là doanh thu thực tế; khách thực tế/dự kiến không gộp.
4. Xác minh và lưu bằng chứng: Số liệu từ API, không tính lại bằng cách cộng tất cả booking tại client.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-85"></a>
### CTP-85 — Biểu đồ và bộ lọc báo cáo hộ nâng cao

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-13 (Epic) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | Low |
| Story Points | 3 |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-71 |
| Blocks | Không có |
| DoD profile | DEV |

**Description**

Là hộ dân, tôi cần biểu đồ và bộ lọc báo cáo hộ nâng cao để đạt mục tiêu: Hộ quản lý phòng, dịch vụ, lịch, đơn, tiền và chi phí theo quyền hiện tại. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Biểu đồ chi tiết theo kỳ dựa API tài chính và permission sẵn có.
2. Khách thực tế và dự kiến, dòng tiền và giá trị đơn vẫn tách biệt.
3. Không chặn thao tác nghiệp vụ khi chưa có báo cáo nâng cao.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-224"></a>
### CTP-224 — Tạo biểu đồ và filter tài chính hộ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-85 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-71 |
| Blocks | CTP-225 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-85 — Biểu đồ và bộ lọc báo cáo hộ nâng cao. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Biểu đồ chi tiết theo kỳ dựa API tài chính và permission sẵn có.
2. Khách thực tế và dự kiến, dòng tiền và giá trị đơn vẫn tách biệt.
3. Không chặn thao tác nghiệp vụ khi chưa có báo cáo nâng cao.
4. Phần triển khai của "Tạo biểu đồ và filter tài chính hộ" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-225"></a>
### CTP-225 — Kiểm thử số liệu theo kỳ và quyền

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-85 (Story) |
| Epic | CTP-13 — HOUSEHOLD FLUTTER APP |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | FLUTTER_HOUSEHOLD |
| Labels | flutter, frontend, booking |
| Dependencies | CTP-224 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-85 — Biểu đồ và bộ lọc báo cáo hộ nâng cao. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Biểu đồ chi tiết theo kỳ dựa API tài chính và permission sẵn có.
2. Xác minh và lưu bằng chứng: Khách thực tế và dự kiến, dòng tiền và giá trị đơn vẫn tách biệt.
3. Xác minh và lưu bằng chứng: Không chặn thao tác nghiệp vụ khi chưa có báo cáo nâng cao.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-14 — REACT ADMIN

<a id="ctp-14"></a>
### CTP-14 — REACT ADMIN

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 2, Sprint 5, Sprint 7; có Post-MVP |
| Scope | Mixed |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Admin quản lý tài khoản, duyệt hộ, xem booking, nội dung và thống kê; không sửa trạng thái booking. Phạm vi được phân rã thành 5 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Admin quản lý tài khoản, duyệt hộ, xem booking, nội dung và thống kê; không sửa trạng thái booking.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-32"></a>
### CTP-32 — React Admin đăng nhập và quản lý user

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-14 (Epic) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-26, CTP-23 |
| Blocks | CTP-33, CTP-119 |
| DoD profile | DEV |

**Description**

Là quản trị viên, tôi cần react Admin đăng nhập và quản lý user để đạt mục tiêu: Admin quản lý tài khoản, duyệt hộ, xem booking, nội dung và thống kê; không sửa trạng thái booking. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. React/Vite có layout responsive cơ bản, routing và phiên Admin; CUSTOMER/HOUSEHOLD không vào chức năng Admin.
2. Danh sách user có block/unblock; thao tác phản ánh ngay trên request dùng JWT cũ.
3. Xử lý loading, empty, validation và API error; build và probe Vercel tối thiểu chạy được.
4. Không hiển thị hay lưu Cloudinary secret hoặc DB credential.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-117"></a>
### CTP-117 — Tạo Admin shell, login và route protection

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-32 (Story) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-26, CTP-23 |
| Blocks | CTP-118 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-32 — React Admin đăng nhập và quản lý user. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. React/Vite có layout responsive cơ bản, routing và phiên Admin; CUSTOMER/HOUSEHOLD không vào chức năng Admin.
2. Danh sách user có block/unblock; thao tác phản ánh ngay trên request dùng JWT cũ.
3. Xử lý loading, empty, validation và API error; build và probe Vercel tối thiểu chạy được.
4. Không hiển thị hay lưu Cloudinary secret hoặc DB credential.
5. Phần triển khai của "Tạo Admin shell, login và route protection" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-118"></a>
### CTP-118 — Tích hợp user list/block/unblock và kiểm thử quyền

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-32 (Story) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-117 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-32 — React Admin đăng nhập và quản lý user. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: React/Vite có layout responsive cơ bản, routing và phiên Admin; CUSTOMER/HOUSEHOLD không vào chức năng Admin.
2. Xác minh và lưu bằng chứng: Danh sách user có block/unblock; thao tác phản ánh ngay trên request dùng JWT cũ.
3. Xác minh và lưu bằng chứng: Xử lý loading, empty, validation và API error; build và probe Vercel tối thiểu chạy được.
4. Xác minh và lưu bằng chứng: Không hiển thị hay lưu Cloudinary secret hoặc DB credential.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-33"></a>
### CTP-33 — React Admin duyệt hộ và xem hồ sơ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-14 (Epic) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | High |
| Story Points | 2 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-32, CTP-27 |
| Blocks | CTP-55, CTP-163 |
| DoD profile | DEV |

**Description**

Là quản trị viên, tôi cần react Admin duyệt hộ và xem hồ sơ để đạt mục tiêu: Admin quản lý tài khoản, duyệt hộ, xem booking, nội dung và thống kê; không sửa trạng thái booking. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Admin xem danh sách theo APPROVED/PENDING/REJECTED và chi tiết hộ.
2. Approve/reject/thu hồi duyệt gọi API thật, yêu cầu lý do ở thao tác từ chối/thu hồi.
3. Giao diện cho biết thu hồi duyệt dừng bán mới nhưng giữ xử lý đơn đã xác nhận.
4. Không có chức năng đổi trạng thái booking tùy ý.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-119"></a>
### CTP-119 — Tạo danh sách và chi tiết hộ chờ duyệt

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-33 (Story) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-32, CTP-27 |
| Blocks | CTP-120 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-33 — React Admin duyệt hộ và xem hồ sơ. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Admin xem danh sách theo APPROVED/PENDING/REJECTED và chi tiết hộ.
2. Approve/reject/thu hồi duyệt gọi API thật, yêu cầu lý do ở thao tác từ chối/thu hồi.
3. Giao diện cho biết thu hồi duyệt dừng bán mới nhưng giữ xử lý đơn đã xác nhận.
4. Không có chức năng đổi trạng thái booking tùy ý.
5. Phần triển khai của "Tạo danh sách và chi tiết hộ chờ duyệt" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-120"></a>
### CTP-120 — Tích hợp quyết định duyệt và các trạng thái lỗi

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-33 (Story) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 2 - Household, Room & Service |
| Scope | MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-119 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-33 — React Admin duyệt hộ và xem hồ sơ. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Admin xem danh sách theo APPROVED/PENDING/REJECTED và chi tiết hộ.
2. Xác minh và lưu bằng chứng: Approve/reject/thu hồi duyệt gọi API thật, yêu cầu lý do ở thao tác từ chối/thu hồi.
3. Xác minh và lưu bằng chứng: Giao diện cho biết thu hồi duyệt dừng bán mới nhưng giữ xử lý đơn đã xác nhận.
4. Xác minh và lưu bằng chứng: Không có chức năng đổi trạng thái booking tùy ý.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-55"></a>
### CTP-55 — Admin xem booking, dịch vụ, review và dashboard

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-14 (Epic) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-33, CTP-48, CTP-53, CTP-54 |
| Blocks | CTP-72, CTP-84, CTP-88, CTP-197, CTP-222, CTP-230 |
| DoD profile | DEV |

**Description**

Là quản trị viên, tôi cần admin xem booking, dịch vụ, review và dashboard để đạt mục tiêu: Admin quản lý tài khoản, duyệt hộ, xem booking, nội dung và thống kê; không sửa trạng thái booking. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Admin có danh sách/detail booking, dịch vụ và review, filter/pagination cơ bản.
2. Dashboard có tổng user/hộ, hộ chờ duyệt, booking và giá trị đơn/thu tiền có nhãn rõ.
3. Khách thực tế và khách dự kiến tách riêng; có một biểu đồ tổng hợp đơn giản.
4. Không có UI/API cho Admin đổi booking status; test quyền Admin và thống kê không nhân JOIN.
5. Moderation review nâng cao và biểu đồ phân tích sâu được đánh dấu Post-MVP.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-163"></a>
### CTP-163 — Tích hợp booking/services/reviews overview

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-55 (Story) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-33, CTP-48, CTP-53, CTP-54 |
| Blocks | CTP-164 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-55 — Admin xem booking, dịch vụ, review và dashboard. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Admin có danh sách/detail booking, dịch vụ và review, filter/pagination cơ bản.
2. Dashboard có tổng user/hộ, hộ chờ duyệt, booking và giá trị đơn/thu tiền có nhãn rõ.
3. Khách thực tế và khách dự kiến tách riêng; có một biểu đồ tổng hợp đơn giản.
4. Không có UI/API cho Admin đổi booking status; test quyền Admin và thống kê không nhân JOIN.
5. Moderation review nâng cao và biểu đồ phân tích sâu được đánh dấu Post-MVP.
6. Phần triển khai của "Tích hợp booking/services/reviews overview" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-164"></a>
### CTP-164 — Tạo dashboard cơ bản và kiểm thử quyền/số liệu

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-55 (Story) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-163 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-55 — Admin xem booking, dịch vụ, review và dashboard. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Admin có danh sách/detail booking, dịch vụ và review, filter/pagination cơ bản.
2. Xác minh và lưu bằng chứng: Dashboard có tổng user/hộ, hộ chờ duyệt, booking và giá trị đơn/thu tiền có nhãn rõ.
3. Xác minh và lưu bằng chứng: Khách thực tế và khách dự kiến tách riêng; có một biểu đồ tổng hợp đơn giản.
4. Xác minh và lưu bằng chứng: Không có UI/API cho Admin đổi booking status; test quyền Admin và thống kê không nhân JOIN.
5. Xác minh và lưu bằng chứng: Moderation review nâng cao và biểu đồ phân tích sâu được đánh dấu Post-MVP.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-72"></a>
### CTP-72 — React Admin quản lý bài viết văn hóa

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-14 (Epic) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | 2 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-55, CTP-56 |
| Blocks | CTP-74, CTP-76, CTP-87, CTP-201, CTP-206, CTP-228 |
| DoD profile | DEV |

**Description**

Là quản trị viên, tôi cần react Admin quản lý bài viết văn hóa để đạt mục tiêu: Admin quản lý tài khoản, duyệt hộ, xem booking, nội dung và thống kê; không sửa trạng thái booking. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Admin tạo/sửa/xóa và chuyển DRAFT/PUBLISHED; nhập thumbnail và video URL.
2. Ảnh qua backend, content/URL validate; draft không xuất hiện ở public API.
3. Loading/error/form state và kiểm tra quyền hoạt động.
4. Chưa triển khai editor phức tạp hoặc nhúng video nâng cao.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-197"></a>
### CTP-197 — Tạo màn hình CRUD và xuất bản cultural posts

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-72 (Story) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-55, CTP-56 |
| Blocks | CTP-198 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-72 — React Admin quản lý bài viết văn hóa. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Admin tạo/sửa/xóa và chuyển DRAFT/PUBLISHED; nhập thumbnail và video URL.
2. Ảnh qua backend, content/URL validate; draft không xuất hiện ở public API.
3. Loading/error/form state và kiểm tra quyền hoạt động.
4. Chưa triển khai editor phức tạp hoặc nhúng video nâng cao.
5. Phần triển khai của "Tạo màn hình CRUD và xuất bản cultural posts" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-198"></a>
### CTP-198 — Kiểm thử ảnh, URL và trạng thái công khai

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-72 (Story) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-197 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-72 — React Admin quản lý bài viết văn hóa. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Admin tạo/sửa/xóa và chuyển DRAFT/PUBLISHED; nhập thumbnail và video URL.
2. Xác minh và lưu bằng chứng: Ảnh qua backend, content/URL validate; draft không xuất hiện ở public API.
3. Xác minh và lưu bằng chứng: Loading/error/form state và kiểm tra quyền hoạt động.
4. Xác minh và lưu bằng chứng: Chưa triển khai editor phức tạp hoặc nhúng video nâng cao.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-84"></a>
### CTP-84 — Dashboard Admin phân tích và biểu đồ nâng cao

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-14 (Epic) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | Low |
| Story Points | 3 |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-55, CTP-53 |
| Blocks | Không có |
| DoD profile | DEV |

**Description**

Là quản trị viên, tôi cần dashboard Admin phân tích và biểu đồ nâng cao để đạt mục tiêu: Admin quản lý tài khoản, duyệt hộ, xem booking, nội dung và thống kê; không sửa trạng thái booking. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Thêm biểu đồ theo kỳ/danh mục với định nghĩa chỉ số rõ ràng.
2. Không thay các công thức tiền và khách đã chốt; không nhân JOIN.
3. Dashboard cơ bản MVP vẫn đủ dùng khi story này chưa thực hiện.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-222"></a>
### CTP-222 — Bổ sung truy vấn và biểu đồ phân tích

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-84 (Story) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-55, CTP-53 |
| Blocks | CTP-223 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-84 — Dashboard Admin phân tích và biểu đồ nâng cao. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Thêm biểu đồ theo kỳ/danh mục với định nghĩa chỉ số rõ ràng.
2. Không thay các công thức tiền và khách đã chốt; không nhân JOIN.
3. Dashboard cơ bản MVP vẫn đủ dùng khi story này chưa thực hiện.
4. Phần triển khai của "Bổ sung truy vấn và biểu đồ phân tích" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-223"></a>
### CTP-223 — Kiểm thử số liệu và bộ lọc

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-84 (Story) |
| Epic | CTP-14 — REACT ADMIN |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | ADMIN_WEB |
| Labels | react, frontend, security |
| Dependencies | CTP-222 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-84 — Dashboard Admin phân tích và biểu đồ nâng cao. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Thêm biểu đồ theo kỳ/danh mục với định nghĩa chỉ số rõ ràng.
2. Xác minh và lưu bằng chứng: Không thay các công thức tiền và khách đã chốt; không nhân JOIN.
3. Xác minh và lưu bằng chứng: Dashboard cơ bản MVP vẫn đủ dùng khi story này chưa thực hiện.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-15 — CULTURAL CONTENT

<a id="ctp-15"></a>
### CTP-15 — CULTURAL CONTENT

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-15 — CULTURAL CONTENT |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 5; có Post-MVP |
| Scope | Mixed |
| Component | BACKEND |
| Labels | backend, frontend |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Nội dung văn hóa có nháp/xuất bản, ảnh, video URL và hiển thị cho khách. Phạm vi được phân rã thành 2 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Nội dung văn hóa có nháp/xuất bản, ảnh, video URL và hiển thị cho khách.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-56"></a>
### CTP-56 — API bài viết văn hóa và trạng thái xuất bản

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-15 (Epic) |
| Epic | CTP-15 — CULTURAL CONTENT |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | 2 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, frontend |
| Dependencies | CTP-26, CTP-28 |
| Blocks | CTP-72, CTP-73, CTP-197, CTP-199 |
| DoD profile | DEV |

**Description**

Là người quản lý nội dung, tôi cần aPI bài viết văn hóa và trạng thái xuất bản để đạt mục tiêu: Nội dung văn hóa có nháp/xuất bản, ảnh, video URL và hiển thị cho khách. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Admin CRUD title/content/thumbnail/video URL và trạng thái DRAFT/PUBLISHED.
2. Khách chỉ đọc bài PUBLISHED; hộ/khách không gọi được API quản trị nội dung.
3. Validate/sanitize nội dung và URL; ảnh qua Express/Cloudinary.
4. Public list/detail có pagination; video URL được lưu và mở liên kết, chưa nhúng player nâng cao.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-165"></a>
### CTP-165 — Tạo CRUD Admin và API công khai cultural posts

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-56 (Story) |
| Epic | CTP-15 — CULTURAL CONTENT |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, frontend |
| Dependencies | CTP-26, CTP-28 |
| Blocks | CTP-166 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-56 — API bài viết văn hóa và trạng thái xuất bản. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Admin CRUD title/content/thumbnail/video URL và trạng thái DRAFT/PUBLISHED.
2. Khách chỉ đọc bài PUBLISHED; hộ/khách không gọi được API quản trị nội dung.
3. Validate/sanitize nội dung và URL; ảnh qua Express/Cloudinary.
4. Public list/detail có pagination; video URL được lưu và mở liên kết, chưa nhúng player nâng cao.
5. Phần triển khai của "Tạo CRUD Admin và API công khai cultural posts" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-166"></a>
### CTP-166 — Kiểm thử xuất bản, URL, nội dung và quyền

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-56 (Story) |
| Epic | CTP-15 — CULTURAL CONTENT |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 5 - Finance, Review & Admin |
| Scope | MVP |
| Component | BACKEND |
| Labels | backend, frontend |
| Dependencies | CTP-165 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-56 — API bài viết văn hóa và trạng thái xuất bản. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Admin CRUD title/content/thumbnail/video URL và trạng thái DRAFT/PUBLISHED.
2. Xác minh và lưu bằng chứng: Khách chỉ đọc bài PUBLISHED; hộ/khách không gọi được API quản trị nội dung.
3. Xác minh và lưu bằng chứng: Validate/sanitize nội dung và URL; ảnh qua Express/Cloudinary.
4. Xác minh và lưu bằng chứng: Public list/detail có pagination; video URL được lưu và mở liên kết, chưa nhúng player nâng cao.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-87"></a>
### CTP-87 — Nhúng video và trình bày bài văn hóa nâng cao

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-15 (Epic) |
| Epic | CTP-15 — CULTURAL CONTENT |
| Status | BACKLOG |
| Priority | Low |
| Story Points | 2 |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | BACKEND |
| Labels | backend, frontend |
| Dependencies | CTP-72, CTP-73 |
| Blocks | Không có |
| DoD profile | DEV |

**Description**

Là người quản lý nội dung, tôi cần nhúng video và trình bày bài văn hóa nâng cao để đạt mục tiêu: Nội dung văn hóa có nháp/xuất bản, ảnh, video URL và hiển thị cho khách. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Chỉ nhúng nguồn được cho phép; không thực thi HTML/script tùy ý.
2. Fallback mở URL khi player không hoạt động.
3. Không thay đổi quy tắc DRAFT/PUBLISHED.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-228"></a>
### CTP-228 — Tạo thành phần hiển thị video an toàn

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-87 (Story) |
| Epic | CTP-15 — CULTURAL CONTENT |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | BACKEND |
| Labels | backend, frontend |
| Dependencies | CTP-72, CTP-73 |
| Blocks | CTP-229 |
| DoD profile | DEV |

**Description**

Đóng góp cho CTP-87 — Nhúng video và trình bày bài văn hóa nâng cao. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Chỉ nhúng nguồn được cho phép; không thực thi HTML/script tùy ý.
2. Fallback mở URL khi player không hoạt động.
3. Không thay đổi quy tắc DRAFT/PUBLISHED.
4. Phần triển khai của "Tạo thành phần hiển thị video an toàn" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Phạm vi triển khai hoàn thành; build/static checks liên quan không lỗi.
- Test phù hợp và kiểm tra thủ công có bằng chứng; validation, authorization/ownership được kiểm tra nếu áp dụng.
- Không hardcode secret; Swagger cập nhật nếu đổi API; migration cập nhật nếu đổi DB; README/docs cập nhật nếu cần.
- Self-review diff/checklist đã làm; acceptance criteria đạt; không còn lỗi Highest/High liên quan chưa xử lý.

<a id="ctp-229"></a>
### CTP-229 — Kiểm thử URL lỗi và quyền xuất bản

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-87 (Story) |
| Epic | CTP-15 — CULTURAL CONTENT |
| Status | BACKLOG |
| Priority | Low |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Post-MVP |
| Scope | Post-MVP |
| Component | BACKEND |
| Labels | backend, frontend |
| Dependencies | CTP-228 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-87 — Nhúng video và trình bày bài văn hóa nâng cao. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Chỉ nhúng nguồn được cho phép; không thực thi HTML/script tùy ý.
2. Xác minh và lưu bằng chứng: Fallback mở URL khi player không hoạt động.
3. Xác minh và lưu bằng chứng: Không thay đổi quy tắc DRAFT/PUBLISHED.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-16 — TESTING & QUALITY

<a id="ctp-16"></a>
### CTP-16 — TESTING & QUALITY

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 1, Sprint 4, Sprint 6, Sprint 7, Sprint 8 |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Bằng chứng kiểm thử cho bảo mật, booking, concurrency, thời gian, tiền và luồng liên ứng dụng. Phạm vi được phân rã thành 5 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Bằng chứng kiểm thử cho bảo mật, booking, concurrency, thời gian, tiền và luồng liên ứng dụng.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-24"></a>
### CTP-24 — Dựng harness kiểm thử và MySQL test database

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-16 (Epic) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 2 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-19, CTP-20 |
| Blocks | CTP-25, CTP-36, CTP-103, CTP-125 |
| DoD profile | QA |

**Description**

Là người kiểm thử, tôi cần dựng harness kiểm thử và MySQL test database để đạt mục tiêu: Bằng chứng kiểm thử cho bảo mật, booking, concurrency, thời gian, tiền và luồng liên ứng dụng. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Test runner có lệnh chạy rõ ràng; DB test tách khỏi development/demo.
2. Fixtures và cleanup chỉ tác động DB test đã được xác minh; không chạy reset nhầm Aiven dùng demo.
3. Kiểm tra build/static và test smoke chạy được trong CI hoặc lệnh tương đương tại máy.
4. Hướng dẫn thu thập kết quả test được ghi trong README.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-101"></a>
### CTP-101 — Cấu hình test runner, MySQL test DB và fixtures

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-24 (Story) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-19, CTP-20 |
| Blocks | CTP-102 |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-24 — Dựng harness kiểm thử và MySQL test database. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Test runner có lệnh chạy rõ ràng; DB test tách khỏi development/demo.
2. Fixtures và cleanup chỉ tác động DB test đã được xác minh; không chạy reset nhầm Aiven dùng demo.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-102"></a>
### CTP-102 — Chạy smoke và cấu hình kiểm tra tự động

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-24 (Story) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-101 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-24 — Dựng harness kiểm thử và MySQL test database. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Kiểm tra build/static và test smoke chạy được trong CI hoặc lệnh tương đương tại máy.
2. Hướng dẫn thu thập kết quả test được ghi trong README.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-49"></a>
### CTP-49 — Chứng minh chống đặt trùng trên MySQL thật

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-16 (Epic) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 5 |
| Giờ dự kiến | 6 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-48, CTP-40, CTP-41 |
| Blocks | CTP-50, CTP-75, CTP-153, CTP-203 |
| DoD profile | QA |

**Description**

Là người kiểm thử, tôi cần chứng minh chống đặt trùng trên MySQL thật để đạt mục tiêu: Bằng chứng kiểm thử cho bảo mật, booking, concurrency, thời gian, tiền và luồng liên ứng dụng. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Hai request tranh cùng phòng chỉ một request đặt thành công; slot không vượt capacity.
2. Tạo block đồng thời với booking không cùng chiếm một phòng; ngày nối tiếp được phép.
3. Đơn nhiều mục thất bại không để lại một phần hold; PENDING hết hạn không chiếm chỗ khi cron dừng.
4. Confirm/reject/expire/complete đồng thời giữ state hợp lệ; completed_at chỉ ghi một lần.
5. Lưu command, fixtures và báo cáo kết quả; không thay MySQL bằng SQLite/in-memory để chứng minh locking.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-151"></a>
### CTP-151 — Tạo bộ scenario nhiều kết nối và dữ liệu tranh chấp

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-49 (Story) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-48, CTP-40, CTP-41 |
| Blocks | CTP-152 |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-49 — Chứng minh chống đặt trùng trên MySQL thật. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Hai request tranh cùng phòng chỉ một request đặt thành công; slot không vượt capacity.
2. Tạo block đồng thời với booking không cùng chiếm một phòng; ngày nối tiếp được phép.
3. Đơn nhiều mục thất bại không để lại một phần hold; PENDING hết hạn không chiếm chỗ khi cron dừng.
4. Confirm/reject/expire/complete đồng thời giữ state hợp lệ; completed_at chỉ ghi một lần.
5. Lưu command, fixtures và báo cáo kết quả; không thay MySQL bằng SQLite/in-memory để chứng minh locking.
6. Phần triển khai của "Tạo bộ scenario nhiều kết nối và dữ liệu tranh chấp" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-152"></a>
### CTP-152 — Chạy concurrency suite và lưu bằng chứng

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-49 (Story) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-151 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-49 — Chứng minh chống đặt trùng trên MySQL thật. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Hai request tranh cùng phòng chỉ một request đặt thành công; slot không vượt capacity.
2. Xác minh và lưu bằng chứng: Tạo block đồng thời với booking không cùng chiếm một phòng; ngày nối tiếp được phép.
3. Xác minh và lưu bằng chứng: Đơn nhiều mục thất bại không để lại một phần hold; PENDING hết hạn không chiếm chỗ khi cron dừng.
4. Xác minh và lưu bằng chứng: Confirm/reject/expire/complete đồng thời giữ state hợp lệ; completed_at chỉ ghi một lần.
5. Xác minh và lưu bằng chứng: Lưu command, fixtures và báo cáo kết quả; không thay MySQL bằng SQLite/in-memory để chứng minh locking.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-65"></a>
### CTP-65 — Kiểm thử luồng khách trên Android với API thật

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-16 (Epic) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-64, CTP-52 |
| Blocks | CTP-74, CTP-201 |
| DoD profile | QA |

**Description**

Là người kiểm thử, tôi cần kiểm thử luồng khách trên Android với API thật để đạt mục tiêu: Bằng chứng kiểm thử cho bảo mật, booking, concurrency, thời gian, tiền và luồng liên ứng dụng. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Demo được đăng ký→khám phá→đặt ba kiểu đơn→xem/hủy và review fixture COMPLETED.
2. Kiểm tra 8 khách/2 phòng/4 suất làm bánh, slot CLOSED và xung đột capacity.
3. Kiểm tra tài khoản bị khóa, mất mạng, token hết hạn và không lộ secret.
4. Lưu checklist/bằng chứng và mở Bug cho lỗi thực tế; không dùng dữ liệu mock để kết luận tích hợp đạt.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-183"></a>
### CTP-183 — Chạy kịch bản khách trên APK debug/API thật

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-65 (Story) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-64, CTP-52 |
| Blocks | CTP-184 |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-65 — Kiểm thử luồng khách trên Android với API thật. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Demo được đăng ký→khám phá→đặt ba kiểu đơn→xem/hủy và review fixture COMPLETED.
2. Kiểm tra 8 khách/2 phòng/4 suất làm bánh, slot CLOSED và xung đột capacity.
3. Kiểm tra tài khoản bị khóa, mất mạng, token hết hạn và không lộ secret.
4. Lưu checklist/bằng chứng và mở Bug cho lỗi thực tế; không dùng dữ liệu mock để kết luận tích hợp đạt.
5. Phần triển khai của "Chạy kịch bản khách trên APK debug/API thật" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-184"></a>
### CTP-184 — Ghi lỗi, xác minh bản sửa và lưu bằng chứng

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-65 (Story) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 6 - Flutter Customer |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-183 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-65 — Kiểm thử luồng khách trên Android với API thật. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Demo được đăng ký→khám phá→đặt ba kiểu đơn→xem/hủy và review fixture COMPLETED.
2. Xác minh và lưu bằng chứng: Kiểm tra 8 khách/2 phòng/4 suất làm bánh, slot CLOSED và xung đột capacity.
3. Xác minh và lưu bằng chứng: Kiểm tra tài khoản bị khóa, mất mạng, token hết hạn và không lộ secret.
4. Xác minh và lưu bằng chứng: Lưu checklist/bằng chứng và mở Bug cho lỗi thực tế; không dùng dữ liệu mock để kết luận tích hợp đạt.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-74"></a>
### CTP-74 — Kiểm thử liên thông khách–hộ–Admin

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-16 (Epic) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-70, CTP-71, CTP-68, CTP-67, CTP-72, CTP-73, CTP-65 |
| Blocks | CTP-75, CTP-203 |
| DoD profile | QA |

**Description**

Là người kiểm thử, tôi cần kiểm thử liên thông khách–hộ–Admin để đạt mục tiêu: Bằng chứng kiểm thử cho bảo mật, booking, concurrency, thời gian, tiền và luồng liên ứng dụng. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Chạy Admin duyệt hộ→hộ mở lịch→khách đặt→hộ xác nhận/thu; hoàn thành/review dùng fixture CONFIRMED có tất cả hạng mục đã kết thúc. Không bỏ quy tắc thời gian để nối demo.
2. Chạy nhánh cancel/refund, expiry không cron, slot CLOSED và thu hồi duyệt khi có đơn cũ.
3. User bị block mất quyền với token cũ trên cả hai app/web; Admin không đổi booking status.
4. Số tiền, khách thực tế/dự kiến, snapshot và lịch sử nhất quán giữa ba giao diện.
5. Lưu kết quả và triage lỗi trước release freeze.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-201"></a>
### CTP-201 — Chạy kịch bản liên vai trò và nhánh lỗi

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-74 (Story) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-70, CTP-71, CTP-68, CTP-67, CTP-72, CTP-73, CTP-65 |
| Blocks | CTP-202 |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-74 — Kiểm thử liên thông khách–hộ–Admin. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Chạy Admin duyệt hộ→hộ mở lịch→khách đặt→hộ xác nhận/thu; hoàn thành/review dùng fixture CONFIRMED có tất cả hạng mục đã kết thúc. Không bỏ quy tắc thời gian để nối demo.
2. Chạy nhánh cancel/refund, expiry không cron, slot CLOSED và thu hồi duyệt khi có đơn cũ.
3. User bị block mất quyền với token cũ trên cả hai app/web; Admin không đổi booking status.
4. Số tiền, khách thực tế/dự kiến, snapshot và lịch sử nhất quán giữa ba giao diện.
5. Lưu kết quả và triage lỗi trước release freeze.
6. Phần triển khai của "Chạy kịch bản liên vai trò và nhánh lỗi" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-202"></a>
### CTP-202 — Đối chiếu số liệu, mở lỗi và xác minh sửa

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-74 (Story) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 7 - Flutter Household & Integration |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-201 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-74 — Kiểm thử liên thông khách–hộ–Admin. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Chạy Admin duyệt hộ→hộ mở lịch→khách đặt→hộ xác nhận/thu; hoàn thành/review dùng fixture CONFIRMED có tất cả hạng mục đã kết thúc. Không bỏ quy tắc thời gian để nối demo.
2. Xác minh và lưu bằng chứng: Chạy nhánh cancel/refund, expiry không cron, slot CLOSED và thu hồi duyệt khi có đơn cũ.
3. Xác minh và lưu bằng chứng: User bị block mất quyền với token cũ trên cả hai app/web; Admin không đổi booking status.
4. Xác minh và lưu bằng chứng: Số tiền, khách thực tế/dự kiến, snapshot và lịch sử nhất quán giữa ba giao diện.
5. Xác minh và lưu bằng chứng: Lưu kết quả và triage lỗi trước release freeze.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-75"></a>
### CTP-75 — Đạt cổng chất lượng release và xử lý lỗi chặn demo

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-16 (Epic) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 8 |
| Giờ dự kiến | 8 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-74, CTP-49 |
| Blocks | CTP-76, CTP-81, CTP-206, CTP-216 |
| DoD profile | QA |

**Description**

Là người kiểm thử, tôi cần đạt cổng chất lượng release và xử lý lỗi chặn demo để đạt mục tiêu: Bằng chứng kiểm thử cho bảo mật, booking, concurrency, thời gian, tiền và luồng liên ứng dụng. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Chạy lại auth/ownership/timezone/booking/ledger/concurrency bằng MySQL thật và kiểm tra build các ứng dụng.
2. Không còn lỗi Highest/High chưa xử lý ảnh hưởng luồng demo hoặc nhất quán dữ liệu.
3. Đối chiếu Swagger request/response và validation; kiểm tra không hardcode secret.
4. Lỗi phát hiện được tạo Bug có bằng chứng; ngân sách story hữu hạn, vượt mức dùng dự phòng chứ không bỏ test lõi.
5. Testing report có phiên bản, môi trường, kết quả và hạn chế được ghi rõ.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-203"></a>
### CTP-203 — Xử lý và xác minh lỗi chặn release từ integration

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-75 (Story) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-74, CTP-49 |
| Blocks | CTP-204 |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-75 — Đạt cổng chất lượng release và xử lý lỗi chặn demo. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Không còn lỗi Highest/High chưa xử lý ảnh hưởng luồng demo hoặc nhất quán dữ liệu.
2. Lỗi phát hiện được tạo Bug có bằng chứng; ngân sách story hữu hạn, vượt mức dùng dự phòng chứ không bỏ test lõi.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-204"></a>
### CTP-204 — Chạy full regression và kiểm tra contract/security

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-75 (Story) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-203 |
| Blocks | CTP-205 |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-75 — Đạt cổng chất lượng release và xử lý lỗi chặn demo. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Chạy lại auth/ownership/timezone/booking/ledger/concurrency bằng MySQL thật và kiểm tra build các ứng dụng.
2. Đối chiếu Swagger request/response và validation; kiểm tra không hardcode secret.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-205"></a>
### CTP-205 — Chốt testing report và cổng nghiệm thu

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-75 (Story) |
| Epic | CTP-16 — TESTING & QUALITY |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | TESTING |
| Labels | testing, security, booking |
| Dependencies | CTP-204 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-75 — Đạt cổng chất lượng release và xử lý lỗi chặn demo. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Testing report có phiên bản, môi trường, kết quả và hạn chế được ghi rõ.
2. Bằng chứng regression và danh sách lỗi đã được đối chiếu với release gate.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-17 — DEPLOYMENT

<a id="ctp-17"></a>
### CTP-17 — DEPLOYMENT

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 8 |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: Render, Vercel, Aiven, APK, dữ liệu demo và smoke test bản triển khai. Phạm vi được phân rã thành 4 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. Render, Vercel, Aiven, APK, dữ liệu demo và smoke test bản triển khai.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-76"></a>
### CTP-76 — Triển khai bản release backend và React

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-17 (Epic) |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | CTP-75, CTP-20, CTP-72 |
| Blocks | CTP-77, CTP-78, CTP-208, CTP-210 |
| DoD profile | INFRA |

**Description**

Là người trình diễn hệ thống, tôi cần triển khai bản release backend và React để đạt mục tiêu: Render, Vercel, Aiven, APK, dữ liệu demo và smoke test bản triển khai. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Render chạy backend với env/CA/CORS đúng; Vercel có API URL và routing fallback.
2. Health/readiness kiểm tra được; log che secret và có hướng dẫn chẩn đoán.
3. Không lưu ảnh trên filesystem tạm của Render; Cloudinary và Aiven là nguồn lưu trữ.
4. Có hướng dẫn rollback bản ứng dụng và phương án chạy local khi dịch vụ free khởi động chậm.

**Definition of Done**

- Cấu hình/artefact hạ tầng hoàn thành và tái lập được; env mẫu không chứa secret thật.
- Kết nối/build/health/migration hoặc smoke test tương ứng pass, có bằng chứng và kiểm tra thủ công.
- Target môi trường được xác minh; không làm mất dữ liệu ngoài phạm vi; có hướng dẫn chẩn đoán/khôi phục phù hợp.
- Swagger/migration/README cập nhật khi liên quan; authorization/validation không áp dụng phải ghi lý do.

<a id="ctp-206"></a>
### CTP-206 — Cấu hình và deploy Render/Vercel bản release

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-76 (Story) |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | CTP-75, CTP-20, CTP-72 |
| Blocks | CTP-207 |
| DoD profile | INFRA |

**Description**

Đóng góp cho CTP-76 — Triển khai bản release backend và React. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Render chạy backend với env/CA/CORS đúng; Vercel có API URL và routing fallback.
2. Health/readiness kiểm tra được; log che secret và có hướng dẫn chẩn đoán.
3. Không lưu ảnh trên filesystem tạm của Render; Cloudinary và Aiven là nguồn lưu trữ.
4. Có hướng dẫn rollback bản ứng dụng và phương án chạy local khi dịch vụ free khởi động chậm.
5. Phần triển khai của "Cấu hình và deploy Render/Vercel bản release" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Cấu hình/artefact hạ tầng hoàn thành và tái lập được; env mẫu không chứa secret thật.
- Kết nối/build/health/migration hoặc smoke test tương ứng pass, có bằng chứng và kiểm tra thủ công.
- Target môi trường được xác minh; không làm mất dữ liệu ngoài phạm vi; có hướng dẫn chẩn đoán/khôi phục phù hợp.
- Swagger/migration/README cập nhật khi liên quan; authorization/validation không áp dụng phải ghi lý do.

<a id="ctp-207"></a>
### CTP-207 — Kiểm chứng health, env và routing

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-76 (Story) |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | CTP-206 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-76 — Triển khai bản release backend và React. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Render chạy backend với env/CA/CORS đúng; Vercel có API URL và routing fallback.
2. Xác minh và lưu bằng chứng: Health/readiness kiểm tra được; log che secret và có hướng dẫn chẩn đoán.
3. Xác minh và lưu bằng chứng: Không lưu ảnh trên filesystem tạm của Render; Cloudinary và Aiven là nguồn lưu trữ.
4. Xác minh và lưu bằng chứng: Có hướng dẫn rollback bản ứng dụng và phương án chạy local khi dịch vụ free khởi động chậm.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-77"></a>
### CTP-77 — Migration và dữ liệu demo trên môi trường trình diễn

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-17 (Epic) |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | 2 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | CTP-76, CTP-22 |
| Blocks | CTP-79, CTP-212 |
| DoD profile | INFRA |

**Description**

Là người trình diễn hệ thống, tôi cần migration và dữ liệu demo trên môi trường trình diễn để đạt mục tiêu: Render, Vercel, Aiven, APK, dữ liệu demo và smoke test bản triển khai. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Áp dụng migration đúng môi trường, có kiểm tra target và phương án khôi phục trước thay đổi.
2. Seed demo gồm các role, phòng/slot, booking nhiều trạng thái, ledger, review và bài văn hóa.
3. Seed không reset dữ liệu thật; tài khoản/mật khẩu demo được phân biệt và không dùng secret thật.
4. Seed có slot tương lai và booking CONFIRMED đã qua giờ kết thúc để demo đúng thời gian; snapshot/completed_at nhất quán, không sửa tay DB khi bảo vệ.

**Definition of Done**

- Cấu hình/artefact hạ tầng hoàn thành và tái lập được; env mẫu không chứa secret thật.
- Kết nối/build/health/migration hoặc smoke test tương ứng pass, có bằng chứng và kiểm tra thủ công.
- Target môi trường được xác minh; không làm mất dữ liệu ngoài phạm vi; có hướng dẫn chẩn đoán/khôi phục phù hợp.
- Swagger/migration/README cập nhật khi liên quan; authorization/validation không áp dụng phải ghi lý do.

<a id="ctp-208"></a>
### CTP-208 — Chạy migration và seed demo có kiểm soát

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-77 (Story) |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | CTP-76, CTP-22 |
| Blocks | CTP-209 |
| DoD profile | INFRA |

**Description**

Đóng góp cho CTP-77 — Migration và dữ liệu demo trên môi trường trình diễn. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Áp dụng migration đúng môi trường, có kiểm tra target và phương án khôi phục trước thay đổi.
2. Seed demo gồm các role, phòng/slot, booking nhiều trạng thái, ledger, review và bài văn hóa.
3. Seed không reset dữ liệu thật; tài khoản/mật khẩu demo được phân biệt và không dùng secret thật.
4. Seed có slot tương lai và booking CONFIRMED đã qua giờ kết thúc để demo đúng thời gian; snapshot/completed_at nhất quán, không sửa tay DB khi bảo vệ.
5. Phần triển khai của "Chạy migration và seed demo có kiểm soát" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Cấu hình/artefact hạ tầng hoàn thành và tái lập được; env mẫu không chứa secret thật.
- Kết nối/build/health/migration hoặc smoke test tương ứng pass, có bằng chứng và kiểm tra thủ công.
- Target môi trường được xác minh; không làm mất dữ liệu ngoài phạm vi; có hướng dẫn chẩn đoán/khôi phục phù hợp.
- Swagger/migration/README cập nhật khi liên quan; authorization/validation không áp dụng phải ghi lý do.

<a id="ctp-209"></a>
### CTP-209 — Kiểm tra dữ liệu, tài khoản và khả năng khôi phục

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-77 (Story) |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | CTP-208 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-77 — Migration và dữ liệu demo trên môi trường trình diễn. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Áp dụng migration đúng môi trường, có kiểm tra target và phương án khôi phục trước thay đổi.
2. Xác minh và lưu bằng chứng: Seed demo gồm các role, phòng/slot, booking nhiều trạng thái, ledger, review và bài văn hóa.
3. Xác minh và lưu bằng chứng: Seed không reset dữ liệu thật; tài khoản/mật khẩu demo được phân biệt và không dùng secret thật.
4. Xác minh và lưu bằng chứng: Seed có slot tương lai và booking CONFIRMED đã qua giờ kết thúc để demo đúng thời gian; snapshot/completed_at nhất quán, không sửa tay DB khi bảo vệ.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-78"></a>
### CTP-78 — Build APK dùng production API URL

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-17 (Epic) |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | 2 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | CTP-76, CTP-64, CTP-70 |
| Blocks | CTP-79, CTP-212 |
| DoD profile | INFRA |

**Description**

Là người trình diễn hệ thống, tôi cần build APK dùng production API URL để đạt mục tiêu: Render, Vercel, Aiven, APK, dữ liệu demo và smoke test bản triển khai. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Build APK release với API HTTPS của môi trường demo, không localhost và không secret backend.
2. Signing/config nhạy cảm ở ngoài repository; có hướng dẫn build tái lập.
3. Cài APK trên thiết bị thật và mở được login/discovery.
4. Ghi phiên bản APK/API và vị trí artifact trong hướng dẫn bàn giao.

**Definition of Done**

- Cấu hình/artefact hạ tầng hoàn thành và tái lập được; env mẫu không chứa secret thật.
- Kết nối/build/health/migration hoặc smoke test tương ứng pass, có bằng chứng và kiểm tra thủ công.
- Target môi trường được xác minh; không làm mất dữ liệu ngoài phạm vi; có hướng dẫn chẩn đoán/khôi phục phù hợp.
- Swagger/migration/README cập nhật khi liên quan; authorization/validation không áp dụng phải ghi lý do.

<a id="ctp-210"></a>
### CTP-210 — Cấu hình build release và API URL Android

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-78 (Story) |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | CTP-76, CTP-64, CTP-70 |
| Blocks | CTP-211 |
| DoD profile | INFRA |

**Description**

Đóng góp cho CTP-78 — Build APK dùng production API URL. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Build APK release với API HTTPS của môi trường demo, không localhost và không secret backend.
2. Signing/config nhạy cảm ở ngoài repository; có hướng dẫn build tái lập.

**Definition of Done**

- Cấu hình/artefact hạ tầng hoàn thành và tái lập được; env mẫu không chứa secret thật.
- Kết nối/build/health/migration hoặc smoke test tương ứng pass, có bằng chứng và kiểm tra thủ công.
- Target môi trường được xác minh; không làm mất dữ liệu ngoài phạm vi; có hướng dẫn chẩn đoán/khôi phục phù hợp.
- Swagger/migration/README cập nhật khi liên quan; authorization/validation không áp dụng phải ghi lý do.

<a id="ctp-211"></a>
### CTP-211 — Build/cài APK và kiểm tra khởi động

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-78 (Story) |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | CTP-210 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-78 — Build APK dùng production API URL. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Cài APK trên thiết bị thật và mở được login/discovery.
2. Ghi phiên bản APK/API và vị trí artifact trong hướng dẫn bàn giao.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

<a id="ctp-79"></a>
### CTP-79 — Smoke test bản triển khai và APK

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-17 (Epic) |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | 2 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | CTP-77, CTP-78 |
| Blocks | CTP-80, CTP-82, CTP-214, CTP-218 |
| DoD profile | INFRA |

**Description**

Là người trình diễn hệ thống, tôi cần smoke test bản triển khai và APK để đạt mục tiêu: Render, Vercel, Aiven, APK, dữ liệu demo và smoke test bản triển khai. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Trên APK/API deployed, tạo/xác nhận/thu đơn tương lai; dùng booking fixture CONFIRMED đã qua thời điểm kết thúc để hoàn thành/review. Không thay đồng hồ hoặc nới rule trên môi trường demo.
2. React Admin và Flutter cùng thấy dữ liệu; kiểm tra Cloudinary và nút chỉ đường.
3. Xác minh token user bị khóa bị từ chối, Swagger/health truy cập theo cấu hình.
4. Lưu checklist, ảnh/bằng chứng, phiên bản và các hạn chế của hạ tầng demo.

**Definition of Done**

- Cấu hình/artefact hạ tầng hoàn thành và tái lập được; env mẫu không chứa secret thật.
- Kết nối/build/health/migration hoặc smoke test tương ứng pass, có bằng chứng và kiểm tra thủ công.
- Target môi trường được xác minh; không làm mất dữ liệu ngoài phạm vi; có hướng dẫn chẩn đoán/khôi phục phù hợp.
- Swagger/migration/README cập nhật khi liên quan; authorization/validation không áp dụng phải ghi lý do.

<a id="ctp-212"></a>
### CTP-212 — Chạy smoke test deployed trên các vai trò

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-79 (Story) |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | CTP-77, CTP-78 |
| Blocks | CTP-213 |
| DoD profile | INFRA |

**Description**

Đóng góp cho CTP-79 — Smoke test bản triển khai và APK. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Trên APK/API deployed, tạo/xác nhận/thu đơn tương lai; dùng booking fixture CONFIRMED đã qua thời điểm kết thúc để hoàn thành/review. Không thay đồng hồ hoặc nới rule trên môi trường demo.
2. React Admin và Flutter cùng thấy dữ liệu; kiểm tra Cloudinary và nút chỉ đường.
3. Xác minh token user bị khóa bị từ chối, Swagger/health truy cập theo cấu hình.
4. Lưu checklist, ảnh/bằng chứng, phiên bản và các hạn chế của hạ tầng demo.
5. Phần triển khai của "Chạy smoke test deployed trên các vai trò" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Cấu hình/artefact hạ tầng hoàn thành và tái lập được; env mẫu không chứa secret thật.
- Kết nối/build/health/migration hoặc smoke test tương ứng pass, có bằng chứng và kiểm tra thủ công.
- Target môi trường được xác minh; không làm mất dữ liệu ngoài phạm vi; có hướng dẫn chẩn đoán/khôi phục phù hợp.
- Swagger/migration/README cập nhật khi liên quan; authorization/validation không áp dụng phải ghi lý do.

<a id="ctp-213"></a>
### CTP-213 — Lưu bằng chứng và chốt bản demo

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-79 (Story) |
| Epic | CTP-17 — DEPLOYMENT |
| Status | BACKLOG |
| Priority | Highest |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | INFRASTRUCTURE |
| Labels | deployment, aiven, flutter |
| Dependencies | CTP-212 |
| Blocks | Không có |
| DoD profile | QA |

**Description**

Đóng góp cho CTP-79 — Smoke test bản triển khai và APK. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Trên APK/API deployed, tạo/xác nhận/thu đơn tương lai; dùng booking fixture CONFIRMED đã qua thời điểm kết thúc để hoàn thành/review. Không thay đồng hồ hoặc nới rule trên môi trường demo.
2. Xác minh và lưu bằng chứng: React Admin và Flutter cùng thấy dữ liệu; kiểm tra Cloudinary và nút chỉ đường.
3. Xác minh và lưu bằng chứng: Xác minh token user bị khóa bị từ chối, Swagger/health truy cập theo cấu hình.
4. Xác minh và lưu bằng chứng: Lưu checklist, ảnh/bằng chứng, phiên bản và các hạn chế của hạ tầng demo.

**Definition of Done**

- Kịch bản, fixture và bằng chứng kiểm thử hoàn thành; môi trường/phiên bản và lệnh tái hiện được ghi rõ.
- Các case trong phạm vi pass; lỗi phát hiện có issue/liên kết và retest; build liên quan không lỗi.
- Các tiêu chí validation, authorization, secret, Swagger, migration và docs được kiểm tra theo phạm vi; N/A phải có lý do.
- Kiểm tra thủ công hoàn thành; không dùng mock/in-memory để kết luận concurrency MySQL đạt.

## CTP-18 — DOCUMENTATION & DEFENSE

<a id="ctp-18"></a>
### CTP-18 — DOCUMENTATION & DEFENSE

| Trường | Giá trị |
| --- | --- |
| Issue Type | Epic |
| Parent | Không có |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | Sprint 1, Sprint 3, Sprint 4, Sprint 8 |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | Không có |
| Blocks | Không có |
| DoD profile | EPIC |

**Description**

Mục tiêu: README, sơ đồ, tài liệu API/DB, báo cáo kiểm thử, hướng dẫn và bảo vệ. Phạm vi được phân rã thành 6 Story có acceptance criteria riêng. Epic là container, không cộng Story Points hoặc làm blocker chung cho toàn bộ Epic khác.

**Acceptance Criteria**

1. README, sơ đồ, tài liệu API/DB, báo cáo kiểm thử, hướng dẫn và bảo vệ.
2. Tất cả Story/sub-task của Epic có phạm vi, dependency và bằng chứng nghiệm thu.
3. Chỉ đóng Epic khi toàn bộ children hoàn thành; Epic có Post-MVP có thể còn mở khi release MVP đã đạt.

**Definition of Done**

- Toàn bộ children trong Epic DONE và acceptance criteria Epic đạt.
- Tổng hợp bằng chứng nghiệm thu; tài liệu/triển khai liên quan được đối chiếu.
- Không coi Epic đã DONE chỉ vì các Story MVP xong nếu còn children Post-MVP mở.

<a id="ctp-21"></a>
### CTP-21 — Chốt kiến trúc, use case và ranh giới MVP

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-18 (Epic) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | 1 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-19 |
| Blocks | CTP-22, CTP-97 |
| DoD profile | DOC |

**Description**

Là sinh viên thực hiện đồ án, tôi cần chốt kiến trúc, use case và ranh giới MVP để đạt mục tiêu: README, sơ đồ, tài liệu API/DB, báo cáo kiểm thử, hướng dẫn và bảo vệ. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Tài liệu mô tả một backend/một DB, ba vai trò, hai giao diện Flutter và React Admin.
2. Use case và ma trận quyền phân biệt nhận booking mới với xử lý đơn cũ khi hộ mất duyệt.
3. Phạm vi loại trừ partial cancellation, ngày riêng từng phòng, cổng thanh toán thật, kho và chat.
4. ERD bản nháp phản ánh hai bảng booking items, ledger, room blocks, slot và lịch sử trạng thái.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-95"></a>
### CTP-95 — Viết kiến trúc và use case MVP

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-21 (Story) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-19 |
| Blocks | CTP-96 |
| DoD profile | DOC |

**Description**

Đóng góp cho CTP-21 — Chốt kiến trúc, use case và ranh giới MVP. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Tài liệu mô tả một backend/một DB, ba vai trò, hai giao diện Flutter và React Admin.
2. Phạm vi loại trừ partial cancellation, ngày riêng từng phòng, cổng thanh toán thật, kho và chat.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-96"></a>
### CTP-96 — Đối chiếu ERD nháp và ma trận quyền

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-21 (Story) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 1 - Foundation |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-95 |
| Blocks | Không có |
| DoD profile | DOC |

**Description**

Đóng góp cho CTP-21 — Chốt kiến trúc, use case và ranh giới MVP. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Use case và ma trận quyền phân biệt nhận booking mới với xử lý đơn cũ khi hộ mất duyệt.
2. ERD bản nháp phản ánh hai bảng booking items, ledger, room blocks, slot và lịch sử trạng thái.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-43"></a>
### CTP-43 — Hoàn thiện ERD và mô tả database

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-18 (Epic) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | 1 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-22, CTP-36, CTP-41 |
| Blocks | CTP-80, CTP-81, CTP-214, CTP-216 |
| DoD profile | DOC |

**Description**

Là sinh viên thực hiện đồ án, tôi cần hoàn thiện ERD và mô tả database để đạt mục tiêu: README, sơ đồ, tài liệu API/DB, báo cáo kiểm thử, hướng dẫn và bảo vệ. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. ERD, data dictionary và index mô tả đúng schema hiện tại.
2. Giải thích DATE/UTC, hai loại booking items, unique slot và dữ liệu tiền.
3. Các rule liên bảng nằm ở service/transaction được phân biệt với ràng buộc database.
4. Tài liệu dùng được cho chương phân tích/thiết kế báo cáo.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-139"></a>
### CTP-139 — Cập nhật ERD và bảng mô tả dữ liệu

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-43 (Story) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-22, CTP-36, CTP-41 |
| Blocks | CTP-140 |
| DoD profile | DOC |

**Description**

Đóng góp cho CTP-43 — Hoàn thiện ERD và mô tả database. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. ERD, data dictionary và index mô tả đúng schema hiện tại.
2. Giải thích DATE/UTC, hai loại booking items, unique slot và dữ liệu tiền.
3. Các rule liên bảng nằm ở service/transaction được phân biệt với ràng buộc database.
4. Tài liệu dùng được cho chương phân tích/thiết kế báo cáo.
5. Phần triển khai của "Cập nhật ERD và bảng mô tả dữ liệu" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-140"></a>
### CTP-140 — Đối chiếu constraint và quy tắc nghiệp vụ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-43 (Story) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | Medium |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 3 - Schedules & Availability |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-139 |
| Blocks | Không có |
| DoD profile | DOC |

**Description**

Đóng góp cho CTP-43 — Hoàn thiện ERD và mô tả database. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: ERD, data dictionary và index mô tả đúng schema hiện tại.
2. Xác minh và lưu bằng chứng: Giải thích DATE/UTC, hai loại booking items, unique slot và dữ liệu tiền.
3. Xác minh và lưu bằng chứng: Các rule liên bảng nằm ở service/transaction được phân biệt với ràng buộc database.
4. Xác minh và lưu bằng chứng: Tài liệu dùng được cho chương phân tích/thiết kế báo cáo.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-50"></a>
### CTP-50 — Tài liệu API và sơ đồ nghiệp vụ booking

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-18 (Epic) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | 2 |
| Giờ dự kiến | 2 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-49 |
| Blocks | CTP-80, CTP-214 |
| DoD profile | DOC |

**Description**

Là sinh viên thực hiện đồ án, tôi cần tài liệu API và sơ đồ nghiệp vụ booking để đạt mục tiêu: README, sơ đồ, tài liệu API/DB, báo cáo kiểm thử, hướng dẫn và bảo vệ. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Swagger nêu body nhiều phòng/dịch vụ, các lỗi 400/403/409 và phản hồi danh sách/chi tiết.
2. Activity/sequence diagrams thể hiện khóa, rollback, expiry và actor chuyển trạng thái.
3. README có ví dụ booking service-only, room-only, combined và lịch qua đêm.
4. Traceability liên kết rule quan trọng với test; không mô tả partial cancellation.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-153"></a>
### CTP-153 — Hoàn thiện Swagger và sequence/activity booking

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-50 (Story) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-49 |
| Blocks | CTP-154 |
| DoD profile | DOC |

**Description**

Đóng góp cho CTP-50 — Tài liệu API và sơ đồ nghiệp vụ booking. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Swagger nêu body nhiều phòng/dịch vụ, các lỗi 400/403/409 và phản hồi danh sách/chi tiết.
2. Activity/sequence diagrams thể hiện khóa, rollback, expiry và actor chuyển trạng thái.
3. README có ví dụ booking service-only, room-only, combined và lịch qua đêm.
4. Traceability liên kết rule quan trọng với test; không mô tả partial cancellation.
5. Phần triển khai của "Hoàn thiện Swagger và sequence/activity booking" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-154"></a>
### CTP-154 — Đối chiếu ví dụ, lỗi và ma trận test

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-50 (Story) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 4 - Booking Core |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-153 |
| Blocks | Không có |
| DoD profile | DOC |

**Description**

Đóng góp cho CTP-50 — Tài liệu API và sơ đồ nghiệp vụ booking. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Swagger nêu body nhiều phòng/dịch vụ, các lỗi 400/403/409 và phản hồi danh sách/chi tiết.
2. Xác minh và lưu bằng chứng: Activity/sequence diagrams thể hiện khóa, rollback, expiry và actor chuyển trạng thái.
3. Xác minh và lưu bằng chứng: README có ví dụ booking service-only, room-only, combined và lịch qua đêm.
4. Xác minh và lưu bằng chứng: Traceability liên kết rule quan trọng với test; không mô tả partial cancellation.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-80"></a>
### CTP-80 — Hoàn thiện README và hướng dẫn chạy/triển khai/sử dụng

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-18 (Epic) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-79, CTP-50, CTP-43 |
| Blocks | CTP-81, CTP-216 |
| DoD profile | DOC |

**Description**

Là sinh viên thực hiện đồ án, tôi cần hoàn thiện README và hướng dẫn chạy/triển khai/sử dụng để đạt mục tiêu: README, sơ đồ, tài liệu API/DB, báo cáo kiểm thử, hướng dẫn và bảo vệ. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. README hướng dẫn backend, env, migration, seed, React, Flutter, build APK, Aiven TLS, Render và Vercel.
2. Hướng dẫn sử dụng cho khách/hộ/Admin; nêu xử lý hộ mất duyệt, slot đóng và các trạng thái tiền.
3. OpenAPI cuối cùng khớp API; có collection HTTP để tái hiện luồng demo quan trọng.
4. Một lần làm theo hướng dẫn được kiểm tra; không ghi credential thật vào tài liệu.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-214"></a>
### CTP-214 — Hoàn thiện README và deployment/user guides

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-80 (Story) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-79, CTP-50, CTP-43 |
| Blocks | CTP-215 |
| DoD profile | DOC |

**Description**

Đóng góp cho CTP-80 — Hoàn thiện README và hướng dẫn chạy/triển khai/sử dụng. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. README hướng dẫn backend, env, migration, seed, React, Flutter, build APK, Aiven TLS, Render và Vercel.
2. Hướng dẫn sử dụng cho khách/hộ/Admin; nêu xử lý hộ mất duyệt, slot đóng và các trạng thái tiền.
3. OpenAPI cuối cùng khớp API; có collection HTTP để tái hiện luồng demo quan trọng.
4. Một lần làm theo hướng dẫn được kiểm tra; không ghi credential thật vào tài liệu.
5. Phần triển khai của "Hoàn thiện README và deployment/user guides" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-215"></a>
### CTP-215 — Kiểm tra lại hướng dẫn và collection API

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-80 (Story) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-214 |
| Blocks | Không có |
| DoD profile | DOC |

**Description**

Đóng góp cho CTP-80 — Hoàn thiện README và hướng dẫn chạy/triển khai/sử dụng. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: README hướng dẫn backend, env, migration, seed, React, Flutter, build APK, Aiven TLS, Render và Vercel.
2. Xác minh và lưu bằng chứng: Hướng dẫn sử dụng cho khách/hộ/Admin; nêu xử lý hộ mất duyệt, slot đóng và các trạng thái tiền.
3. Xác minh và lưu bằng chứng: OpenAPI cuối cùng khớp API; có collection HTTP để tái hiện luồng demo quan trọng.
4. Xác minh và lưu bằng chứng: Một lần làm theo hướng dẫn được kiểm tra; không ghi credential thật vào tài liệu.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-81"></a>
### CTP-81 — Hoàn thiện báo cáo, sơ đồ và kết quả kiểm thử

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-18 (Epic) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 4 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-80, CTP-75, CTP-43 |
| Blocks | CTP-82, CTP-218 |
| DoD profile | DOC |

**Description**

Là sinh viên thực hiện đồ án, tôi cần hoàn thiện báo cáo, sơ đồ và kết quả kiểm thử để đạt mục tiêu: README, sơ đồ, tài liệu API/DB, báo cáo kiểm thử, hướng dẫn và bảo vệ. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Báo cáo có yêu cầu, thiết kế, DB, triển khai, kiểm thử, kết quả và giới hạn MVP.
2. ERD/use case/activity/sequence/architecture khớp bản release.
3. Trích dẫn tài liệu công nghệ và phân biệt dữ liệu minh họa với khảo sát thực tế.
4. Nội dung được viết tăng dần ở sprint trước; story này là tổng hợp/hiệu chỉnh, không viết toàn báo cáo từ đầu.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-216"></a>
### CTP-216 — Tổng hợp báo cáo và bộ sơ đồ cuối

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-81 (Story) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-80, CTP-75, CTP-43 |
| Blocks | CTP-217 |
| DoD profile | DOC |

**Description**

Đóng góp cho CTP-81 — Hoàn thiện báo cáo, sơ đồ và kết quả kiểm thử. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Báo cáo có yêu cầu, thiết kế, DB, triển khai, kiểm thử, kết quả và giới hạn MVP.
2. ERD/use case/activity/sequence/architecture khớp bản release.
3. Trích dẫn tài liệu công nghệ và phân biệt dữ liệu minh họa với khảo sát thực tế.
4. Nội dung được viết tăng dần ở sprint trước; story này là tổng hợp/hiệu chỉnh, không viết toàn báo cáo từ đầu.
5. Phần triển khai của "Tổng hợp báo cáo và bộ sơ đồ cuối" sẵn sàng để kiểm chứng trong Sub-task tiếp theo.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-217"></a>
### CTP-217 — Đối chiếu bằng chứng, số liệu và giới hạn

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-81 (Story) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-216 |
| Blocks | Không có |
| DoD profile | DOC |

**Description**

Đóng góp cho CTP-81 — Hoàn thiện báo cáo, sơ đồ và kết quả kiểm thử. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Xác minh và lưu bằng chứng: Báo cáo có yêu cầu, thiết kế, DB, triển khai, kiểm thử, kết quả và giới hạn MVP.
2. Xác minh và lưu bằng chứng: ERD/use case/activity/sequence/architecture khớp bản release.
3. Xác minh và lưu bằng chứng: Trích dẫn tài liệu công nghệ và phân biệt dữ liệu minh họa với khảo sát thực tế.
4. Xác minh và lưu bằng chứng: Nội dung được viết tăng dần ở sprint trước; story này là tổng hợp/hiệu chỉnh, không viết toàn báo cáo từ đầu.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-82"></a>
### CTP-82 — Slide, kịch bản demo và diễn tập bảo vệ

| Trường | Giá trị |
| --- | --- |
| Issue Type | Story |
| Parent | CTP-18 (Epic) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | 3 |
| Giờ dự kiến | 3 giờ; không cộng lại từ Sub-task |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-81, CTP-79 |
| Blocks | Không có |
| DoD profile | DOC |

**Description**

Là sinh viên thực hiện đồ án, tôi cần slide, kịch bản demo và diễn tập bảo vệ để đạt mục tiêu: README, sơ đồ, tài liệu API/DB, báo cáo kiểm thử, hướng dẫn và bảo vệ. Chỉ triển khai phạm vi trong acceptance criteria; thời gian dự kiến đã bao gồm review, test và tài liệu của Story.

**Acceptance Criteria**

1. Kịch bản trình bày đa phòng/dịch vụ, chống trùng, idempotency tiền và quyền truy cập.
2. Có nhánh demo lỗi: hết chỗ, expired không cron, user bị khóa và hộ mất duyệt.
3. Slide giải thích thuật toán/transaction/DB và đóng góp của người thực hiện.
4. Diễn tập có thời gian và phương án local/video dự phòng; không hứa dữ liệu demo là người dùng thật.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-218"></a>
### CTP-218 — Chuẩn bị slide và kịch bản demo có dữ liệu

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-82 (Story) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-81, CTP-79 |
| Blocks | CTP-219 |
| DoD profile | DOC |

**Description**

Đóng góp cho CTP-82 — Slide, kịch bản demo và diễn tập bảo vệ. Thực hiện phần công việc cụ thể trong summary; không mở rộng ngoài acceptance criteria của Story. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Kịch bản trình bày đa phòng/dịch vụ, chống trùng, idempotency tiền và quyền truy cập.
2. Có nhánh demo lỗi: hết chỗ, expired không cron, user bị khóa và hộ mất duyệt.
3. Slide giải thích thuật toán/transaction/DB và đóng góp của người thực hiện.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

<a id="ctp-219"></a>
### CTP-219 — Diễn tập và chuẩn bị phương án dự phòng

| Trường | Giá trị |
| --- | --- |
| Issue Type | Sub-task |
| Parent | CTP-82 (Story) |
| Epic | CTP-18 — DOCUMENTATION & DEFENSE |
| Status | BACKLOG |
| Priority | High |
| Story Points | — (không chấm ở cấp này) |
| Giờ dự kiến | — |
| Sprint | CTP Sprint 8 - Testing, Deployment & Defense |
| Scope | MVP |
| Component | DOCUMENTATION |
| Labels | documentation |
| Dependencies | CTP-218 |
| Blocks | Không có |
| DoD profile | DOC |

**Description**

Đóng góp cho CTP-82 — Slide, kịch bản demo và diễn tập bảo vệ. Kiểm chứng/tích hợp hoặc hoàn thiện phần còn lại nêu trong summary; ghi kết quả và cập nhật tài liệu liên quan. Không ước lượng Story Points riêng; công sức đã nằm trong Story cha.

**Acceptance Criteria**

1. Diễn tập có thời gian và phương án local/video dự phòng; không hứa dữ liệu demo là người dùng thật.
2. Chạy lại toàn bộ kịch bản và đối chiếu slide với APK/API sẽ dùng bảo vệ.

**Definition of Done**

- Nội dung đúng đặc tả và bản triển khai tương ứng; sơ đồ/bảng/link đọc được và không mâu thuẫn.
- Hướng dẫn/command/ví dụ được kiểm tra thủ công khi có thể; nguồn và giới hạn được ghi rõ.
- Không có secret; các thay đổi API/DB trong tài liệu khớp Swagger/migration; không yêu cầu viết code ứng dụng cho task tài liệu.
- Self-review hoàn tất; tiêu chí build/test/validation/authorization không áp dụng được ghi N/A kèm lý do, không ghi pass giả.

