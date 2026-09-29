# Sprint plan — CTP

Tám sprint một tuần, 30–35 giờ khả dụng/tuần. Chưa gán ngày lịch vì chưa có ngày bắt đầu; tuần 9–10 chỉ là dự phòng. Không giả định Sprint ID bằng số thứ tự. Native Sprint trong CSV được gán sau import theo hướng dẫn [project plan](jira-project-plan.md).

## Tổng tải

| Sprint | Story | SP | Giờ planned | Dự phòng trong quỹ 30–35h |
| --- | --- | --- | --- | --- |
| CTP Sprint 1 - Foundation | 8 | 20 | 28 | 2–7h |
| CTP Sprint 2 - Household, Room & Service | 9 | 23 | 28 | 2–7h |
| CTP Sprint 3 - Schedules & Availability | 8 | 24 | 28 | 2–7h |
| CTP Sprint 4 - Booking Core | 7 | 24 | 26 | 4–9h |
| CTP Sprint 5 - Finance, Review & Admin | 7 | 21 | 26 | 4–9h |
| CTP Sprint 6 - Flutter Customer | 8 | 25 | 28 | 2–7h |
| CTP Sprint 7 - Flutter Household & Integration | 9 | 23 | 27 | 3–8h |
| CTP Sprint 8 - Testing, Deployment & Defense | 8 | 26 | 28 | 2–7h |

**MVP: 64 Story, 186 SP, 219 giờ planned.** Dự phòng trong tám tuần: 21–61 giờ, ngoài hai tuần dự phòng cuối. SP không phải giờ và không phải velocity đã được chứng minh.

Mọi dòng dưới đây là **Story**; Sub-task kế thừa sprint của Story. Thứ tự được sắp topo để dependency cùng sprint xong trước dependent. Một sinh viên làm nối tiếp; không giả định có nhiều người làm song song. Các giờ đã gồm test/review/docs của Story, không cộng thêm children.

## CTP Sprint 1 - Foundation

**Mục tiêu:** Repository và toolchain chạy; Express–Aiven TLS/migration/seed và auth cơ bản được chứng minh.

**Cổng kết thúc:** Probe Aiven/Render và CA sai có bằng chứng; API login/register và JWT khóa user có test; schema nền tái tạo được.

**Lưu ý tải:** CTP-19 → CTP-20: xử lý sớm SDK/Android và Aiven/TLS; không đợi đến Sprint 6 mới build thử Flutter.

| Thứ tự | Key | Story | SP | Giờ | Bắt buộc xong trước |
| --- | --- | --- | --- | --- | --- |
| 1 | CTP-19 | Dựng monorepo, Express và môi trường phát triển | 3 | 4 | Không có |
| 2 | CTP-20 | Kiểm chứng Prisma–Aiven TLS và kết nối từ Render | 3 | 5 | CTP-19 |
| 3 | CTP-21 | Chốt kiến trúc, use case và ranh giới MVP | 1 | 2 | CTP-19 |
| 4 | CTP-22 | Tạo schema, migration và seed nền tảng MVP | 3 | 4 | CTP-20, CTP-21 |
| 5 | CTP-23 | Chuẩn hóa validation, lỗi, log và Swagger nền | 2 | 3 | CTP-19 |
| 6 | CTP-24 | Dựng harness kiểm thử và MySQL test database | 2 | 2 | CTP-19, CTP-20 |
| 7 | CTP-25 | Đăng ký, đăng nhập và JWT cho ba vai trò | 3 | 4 | CTP-22, CTP-23, CTP-24 |
| 8 | CTP-26 | Kiểm tra user hiện hành, role, ownership và khóa tài khoản | 3 | 4 | CTP-25 |

Tổng Sprint 1: 8 Story / 20 SP / 28 giờ.

## CTP Sprint 2 - Household, Room & Service

**Mục tiêu:** Hộ được duyệt, CRUD phòng/dịch vụ/ảnh và Admin duyệt hộ dùng được.

**Cổng kết thúc:** API chặn hộ chưa duyệt/khác chủ; ảnh qua backend; Admin block/approve gọi API thật; Flutter shell kết nối Android.

**Lưu ý tải:** Chuẩn bị shell Flutter ở Sprint 2 để giảm tải cuối kỳ; chưa cần toàn bộ màn hình khách.

| Thứ tự | Key | Story | SP | Giờ | Bắt buộc xong trước |
| --- | --- | --- | --- | --- | --- |
| 1 | CTP-27 | Quản lý hồ sơ, duyệt và thu hồi duyệt hộ | 3 | 4 | CTP-26 |
| 2 | CTP-28 | Upload và quản lý ảnh an toàn qua Express | 3 | 3 | CTP-26, CTP-27 |
| 3 | CTP-29 | CRUD từng phòng vật lý và sức chứa | 3 | 3 | CTP-27, CTP-22 |
| 4 | CTP-30 | Danh mục và CRUD dịch vụ có đơn vị bán | 3 | 3 | CTP-27, CTP-22 |
| 5 | CTP-31 | API khám phá hộ, phòng và dịch vụ công khai | 2 | 3 | CTP-27, CTP-29, CTP-30, CTP-28 |
| 6 | CTP-32 | React Admin đăng nhập và quản lý user | 3 | 4 | CTP-26, CTP-23 |
| 7 | CTP-33 | React Admin duyệt hộ và xem hồ sơ | 2 | 3 | CTP-32, CTP-27 |
| 8 | CTP-34 | Dựng Flutter shell dùng chung cho khách và hộ | 3 | 4 | CTP-19, CTP-25 |
| 9 | CTP-35 | API current user, hồ sơ và đổi mật khẩu | 1 | 1 | CTP-26 |

Tổng Sprint 2: 9 Story / 23 SP / 28 giờ.

## CTP Sprint 3 - Schedules & Availability

**Mục tiêu:** Lịch phòng/slot và AvailabilityService có cùng quy tắc ngày, giờ, trạng thái giữ chỗ.

**Cổng kết thúc:** Fixture MySQL chứng minh PENDING hết hạn không chiếm chỗ, unique slot và capacity đúng; probe khóa bằng hai kết nối.

**Lưu ý tải:** Làm trước UI quản lý phòng cơ bản khi API đã có; không gọi đây là hoàn tất booking concurrency (gate đó ở Sprint 4).

| Thứ tự | Key | Story | SP | Giờ | Bắt buộc xong trước |
| --- | --- | --- | --- | --- | --- |
| 1 | CTP-36 | Chuẩn hóa DATE, UTC và phạm vi ngày dịch vụ | 3 | 3 | CTP-22, CTP-24 |
| 2 | CTP-37 | Tạo và quản lý lịch service slot | 3 | 4 | CTP-30, CTP-36 |
| 3 | CTP-38 | Quản lý room blocks cho đặt ngoài ứng dụng | 2 | 3 | CTP-29, CTP-36 |
| 4 | CTP-39 | AvailabilityService tính phòng trống và suất còn lại | 5 | 5 | CTP-37, CTP-38, CTP-22 |
| 5 | CTP-40 | Khóa tài nguyên và retry trong Prisma transaction | 5 | 5 | CTP-39, CTP-20 |
| 6 | CTP-41 | Đóng/mở slot và thay đổi capacity an toàn | 2 | 2 | CTP-37, CTP-39, CTP-40 |
| 7 | CTP-42 | Flutter hộ: danh sách, form phòng và ảnh | 3 | 4 | CTP-34, CTP-29, CTP-28, CTP-27 |
| 8 | CTP-43 | Hoàn thiện ERD và mô tả database | 1 | 2 | CTP-22, CTP-36, CTP-41 |

Tổng Sprint 3: 8 Story / 24 SP / 28 giờ.

## CTP Sprint 4 - Booking Core

**Mục tiêu:** Booking nhiều mục nguyên tử, state machine đúng actor và concurrency có bằng chứng.

**Cổng kết thúc:** Không bán vượt/phòng trùng, không giữ chỗ dở dang, completed_at một lần, expiry không phụ thuộc cron; MySQL concurrency suite pass.

**Lưu ý tải:** Sprint quan trọng nhất; khi trễ phải dùng dự phòng hoặc giảm polish, không bỏ locking/authorization/idempotency tiền ở sprint sau.

| Thứ tự | Key | Story | SP | Giờ | Bắt buộc xong trước |
| --- | --- | --- | --- | --- | --- |
| 1 | CTP-44 | Mã booking, price snapshot và tính tổng | 3 | 3 | CTP-22, CTP-36, CTP-29, CTP-30 |
| 2 | CTP-45 | Tạo booking nhiều phòng và nhiều dịch vụ nguyên tử | 5 | 6 | CTP-44, CTP-40, CTP-41, CTP-26, CTP-27 |
| 3 | CTP-46 | Chuyển trạng thái đúng actor và hoàn thành đúng một lần | 5 | 5 | CTP-45, CTP-27 |
| 4 | CTP-47 | Hết hạn booking không phụ thuộc cron | 2 | 2 | CTP-45, CTP-46 |
| 5 | CTP-48 | Lịch sử và chi tiết booking theo vai trò | 2 | 2 | CTP-46, CTP-47 |
| 6 | CTP-49 | Chứng minh chống đặt trùng trên MySQL thật | 5 | 6 | CTP-48, CTP-40, CTP-41 |
| 7 | CTP-50 | Tài liệu API và sơ đồ nghiệp vụ booking | 2 | 2 | CTP-49 |

Tổng Sprint 4: 7 Story / 24 SP / 26 giờ.

## CTP Sprint 5 - Finance, Review & Admin

**Mục tiêu:** Ledger, idempotency, chi phí/review và Admin overview hoạt động.

**Cổng kết thúc:** Replay tiền không nhân entry, không overpayment, thống kê không nhân JOIN; review đúng quyền; API văn hóa sẵn sàng cho UI.

**Lưu ý tải:** Đưa API văn hóa và form dịch vụ hộ lên sớm; đây là preparation cho Sprint 7, dependency backend đã hoàn thành.

| Thứ tự | Key | Story | SP | Giờ | Bắt buộc xong trước |
| --- | --- | --- | --- | --- | --- |
| 1 | CTP-51 | Ghi sổ thu/hoàn tiền thủ công và trạng thái thanh toán | 3 | 4 | CTP-46, CTP-22 |
| 2 | CTP-52 | Chống ghi tiền trùng và thu vượt khi đồng thời | 5 | 5 | CTP-51 |
| 3 | CTP-53 | Ghi chi phí và API tài chính/thống kê cơ bản | 3 | 4 | CTP-52, CTP-48 |
| 4 | CTP-54 | Review tổng thể hộ dân sau booking hoàn thành | 2 | 2 | CTP-46, CTP-31 |
| 5 | CTP-55 | Admin xem booking, dịch vụ, review và dashboard | 3 | 4 | CTP-33, CTP-48, CTP-53, CTP-54 |
| 6 | CTP-56 | API bài viết văn hóa và trạng thái xuất bản | 2 | 3 | CTP-26, CTP-28 |
| 7 | CTP-57 | Flutter hộ: form dịch vụ và ảnh | 3 | 4 | CTP-34, CTP-30, CTP-28, CTP-27 |

Tổng Sprint 5: 7 Story / 21 SP / 26 giờ.

## CTP Sprint 6 - Flutter Customer

**Mục tiêu:** Khách thao tác được trên Flutter: auth, khám phá, chọn và đặt, lịch sử/hủy/review/profile.

**Cổng kết thúc:** Android gọi API thật; thử room-only/service-only/combined, 8 khách/4 suất, 409, expiry và user blocked.

**Lưu ý tải:** UI tối giản, dùng shared components; không dành tuần này cho animation/banner nâng cao.

| Thứ tự | Key | Story | SP | Giờ | Bắt buộc xong trước |
| --- | --- | --- | --- | --- | --- |
| 1 | CTP-58 | Flutter khách: đăng nhập, đăng ký và phiên người dùng | 3 | 3 | CTP-34, CTP-35, CTP-26 |
| 2 | CTP-59 | Flutter khách: trang chủ, khám phá và tìm kiếm | 3 | 4 | CTP-58, CTP-31 |
| 3 | CTP-60 | Flutter khách: chi tiết hộ, phòng, dịch vụ và chỉ đường | 3 | 3 | CTP-59, CTP-54 |
| 4 | CTP-61 | Flutter khách: chọn nhiều phòng và nhiều dịch vụ | 5 | 5 | CTP-60, CTP-39, CTP-41 |
| 5 | CTP-62 | Flutter khách: tạo đơn và xử lý xung đột đặt chỗ | 3 | 3 | CTP-61, CTP-45, CTP-48 |
| 6 | CTP-63 | Flutter khách: lịch sử, chi tiết và hủy toàn booking | 3 | 4 | CTP-62, CTP-46, CTP-47 |
| 7 | CTP-64 | Flutter khách: review, hồ sơ và đổi mật khẩu | 2 | 3 | CTP-63, CTP-54, CTP-35 |
| 8 | CTP-65 | Kiểm thử luồng khách trên Android với API thật | 3 | 3 | CTP-64, CTP-52 |

Tổng Sprint 6: 8 Story / 25 SP / 28 giờ.

## CTP Sprint 7 - Flutter Household & Integration

**Mục tiêu:** Hộ quản lý lịch, đơn và tiền; văn hóa và toàn luồng ba vai trò được tích hợp.

**Cổng kết thúc:** Chạy nhánh approve/create/confirm/receipt, cancel/refund, complete/review và các trạng thái thu hồi duyệt/CLOSED.

**Lưu ý tải:** Room form đã có ở Sprint 3, service form đã có ở Sprint 5; Sprint 7 hoàn thiện slot/block/actions, không viết lại toàn app hộ.

| Thứ tự | Key | Story | SP | Giờ | Bắt buộc xong trước |
| --- | --- | --- | --- | --- | --- |
| 1 | CTP-66 | Flutter hộ: dashboard, hồ sơ và trạng thái duyệt | 3 | 3 | CTP-58, CTP-27, CTP-53, CTP-42, CTP-57 |
| 2 | CTP-67 | Flutter hộ: chặn lịch phòng nhận khách ngoài app | 2 | 2 | CTP-42, CTP-38, CTP-40 |
| 3 | CTP-68 | Flutter hộ: quản lý slot, capacity và OPEN/CLOSED | 3 | 3 | CTP-57, CTP-41, CTP-36 |
| 4 | CTP-69 | Flutter hộ: xử lý booking đúng quyền và trạng thái | 3 | 4 | CTP-66, CTP-48, CTP-46, CTP-47 |
| 5 | CTP-70 | Flutter hộ: ghi nhận thu/hoàn với idempotency | 3 | 4 | CTP-69, CTP-52 |
| 6 | CTP-71 | Flutter hộ: chi phí và báo cáo tài chính cơ bản | 2 | 2 | CTP-66, CTP-53 |
| 7 | CTP-72 | React Admin quản lý bài viết văn hóa | 2 | 3 | CTP-55, CTP-56 |
| 8 | CTP-73 | Flutter khách đọc nội dung văn hóa đã xuất bản | 2 | 2 | CTP-59, CTP-56 |
| 9 | CTP-74 | Kiểm thử liên thông khách–hộ–Admin | 3 | 4 | CTP-70, CTP-71, CTP-68, CTP-67, CTP-72, CTP-73, CTP-65 |

Tổng Sprint 7: 9 Story / 23 SP / 27 giờ.

## CTP Sprint 8 - Testing, Deployment & Defense

**Mục tiêu:** Đóng cổng chất lượng, deploy, APK, dữ liệu demo, tài liệu và bảo vệ.

**Cổng kết thúc:** Không còn lỗi Highest/High ảnh hưởng dữ liệu/demo; smoke trên bản deploy pass; báo cáo/slides/README khớp release.

**Lưu ý tải:** Báo cáo và sơ đồ đã viết tăng dần; dùng hai nhánh booking demo để giữ nguyên quy tắc thời gian.

| Thứ tự | Key | Story | SP | Giờ | Bắt buộc xong trước |
| --- | --- | --- | --- | --- | --- |
| 1 | CTP-75 | Đạt cổng chất lượng release và xử lý lỗi chặn demo | 8 | 8 | CTP-74, CTP-49 |
| 2 | CTP-76 | Triển khai bản release backend và React | 3 | 3 | CTP-75, CTP-20, CTP-72 |
| 3 | CTP-77 | Migration và dữ liệu demo trên môi trường trình diễn | 2 | 2 | CTP-76, CTP-22 |
| 4 | CTP-78 | Build APK dùng production API URL | 2 | 2 | CTP-76, CTP-64, CTP-70 |
| 5 | CTP-79 | Smoke test bản triển khai và APK | 2 | 2 | CTP-77, CTP-78 |
| 6 | CTP-80 | Hoàn thiện README và hướng dẫn chạy/triển khai/sử dụng | 3 | 4 | CTP-79, CTP-50, CTP-43 |
| 7 | CTP-81 | Hoàn thiện báo cáo, sơ đồ và kết quả kiểm thử | 3 | 4 | CTP-80, CTP-75, CTP-43 |
| 8 | CTP-82 | Slide, kịch bản demo và diễn tập bảo vệ | 3 | 3 | CTP-81, CTP-79 |

Tổng Sprint 8: 8 Story / 26 SP / 28 giờ.

## Post-MVP — không phải Sprint 9

| Key | Story | SP | Phụ thuộc |
| --- | --- | --- | --- |
| CTP-83 | Nâng cấp banner, carousel và giao diện trang chủ | 3 | CTP-73 |
| CTP-84 | Dashboard Admin phân tích và biểu đồ nâng cao | 3 | CTP-55, CTP-53 |
| CTP-85 | Biểu đồ và bộ lọc báo cáo hộ nâng cao | 3 | CTP-71 |
| CTP-86 | Sửa/ẩn chi phí có lưu vết | 3 | CTP-53 |
| CTP-87 | Nhúng video và trình bày bài văn hóa nâng cao | 2 | CTP-72, CTP-73 |
| CTP-88 | Ẩn/hiện review có lý do và lịch sử quản trị | 3 | CTP-54, CTP-55 |
| CTP-89 | Tạo nhiều service slot từ lịch mẫu | 5 | CTP-41, CTP-68 |
| CTP-90 | Tìm kiếm nâng cao theo khoảng cách và nhiều tiêu chí | 5 | CTP-59, CTP-31 |

Tám Story Low, 27 SP. Không gán Native Sprint hoặc Fix Version MVP-1.0. Các feature này không phải điều kiện để kết luận luồng booking lõi đạt.

## Theo dõi trong từng tuần

- Đầu sprint: đối chiếu dependency, AC, thời gian thực tế và external prerequisites; chọn scope vừa sức.
- Mỗi ngày: cập nhật Story/Sub-task, ghi blocker và giờ còn lại; giới hạn một Story chính đang làm.
- Cuối sprint: demo increment, lưu bằng chứng, đóng đúng issue đã đạt DoD; không đổi estimate cũ để che phần chưa hoàn thành.
- Sau Sprint 1–2: hiệu chỉnh estimate tương lai theo velocity và giờ thực tế. Nếu scope vượt capacity, không hi sinh kiểm thử/DB consistency; chuyển polish sang Post-MVP hoặc dùng hai tuần dự phòng.
- Story chưa đạt vẫn chưa DONE; carry-over ghi rõ nguyên nhân, không chia nhỏ lại chỉ để nhận điểm đã hoàn thành.
- Sprint 8 có 8h cho regression/sửa lỗi chặn, không phải ngân sách vô hạn. Lỗi mới được tạo Bug và làm rõ ảnh hưởng đến release.
