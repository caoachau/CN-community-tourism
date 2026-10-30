# Nền API dùng chung

## Điểm truy cập và cấu hình

Sau khi cấu hình database/TLS và chạy `npm run dev:backend` từ root:

- Swagger UI: `http://localhost:5000/api/docs/`.
- OpenAPI 3.0.3: `http://localhost:5000/api/openapi.json`.
- Liveness: `GET /api/health`; readiness kiểm tra MySQL/TLS: `GET /api/ready`.

Swagger mô tả các API đã triển khai: hệ thống, xác thực, hồ sơ/nội dung/ảnh, lịch và khả dụng, booking nhiều hạng mục, giữ chỗ/hết hạn, thu/hoàn tiền và review. OpenAPI được ghép từ các module trong `src/openapi.js`; UI dùng tài nguyên nội bộ và tắt validator bên ngoài. Thiết kế, quyền và luồng booking: [BOOKINGS.md](BOOKINGS.md).

## Đăng ký, đăng nhập và phiên JWT

| API | Dữ liệu gửi | Kết quả |
| --- | --- | --- |
| `POST /api/v1/auth/register` | `email`, `password`, `displayName`, `phone` tùy chọn | 201; tài khoản CUSTOMER và cặp token |
| `POST /api/v1/auth/login` | `email`, `password` | 200; hỗ trợ CUSTOMER, HOUSEHOLD, ADMIN |
| `POST /api/v1/auth/refresh` | `refreshToken` | 200; thay refresh token và cấp access JWT mới |
| `GET /api/v1/auth/me` | Header `Authorization: Bearer <accessToken>` | Tài khoản và vai trò hiện tại |
| `POST /api/v1/auth/logout` | Cùng header Bearer | Thu hồi phiên hiện tại; thiết bị khác giữ phiên riêng |

Đăng ký công khai luôn tạo CUSTOMER, không tạo hộ dân và không nhận trường `role`/`status`. Mở hộ dân và cấp quyền qua luồng xét duyệt riêng bên dưới. Email được trim và chuyển chữ thường; mật khẩu giữ nguyên, dài 15–128 ký tự khi đăng ký, không bắt buộc quy tắc viết hoa/ký tự đặc biệt. Đăng nhập nhận mật khẩu 1–128 ký tự để không chặn tài khoản cũ. Tên hiển thị tối đa 150 ký tự; ID MySQL luôn là chuỗi.

Mật khẩu dùng scrypt với salt ngẫu nhiên riêng, `N=32768, r=8, p=3`, giới hạn hai phép tính đồng thời. Cấu hình này dùng phương án khoảng 32 MiB trong [hướng dẫn lưu mật khẩu OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Không lưu hoặc log mật khẩu rõ. Đăng nhập sai mật khẩu, email không tồn tại hoặc tài khoản bị khóa cùng trả `INVALID_CREDENTIALS` (401); đăng ký trùng email trả `EMAIL_ALREADY_EXISTS` (409).

Access JWT dùng HS256, tối đa 15 phút, kiểm tra chữ ký, issuer, audience, loại token, thời hạn và claim bắt buộc. JWT không chứa email, số điện thoại hoặc mật khẩu. `JWT_SECRET` bắt buộc, ít nhất 32 byte; `JWT_ISSUER`/`JWT_AUDIENCE` mặc định `community-tourism-api`/`community-tourism-clients`. Render Blueprint sinh secret; local cấu hình qua `.env` được Git bỏ qua.

Refresh token là 32 byte ngẫu nhiên, mã hóa base64url. MySQL chỉ lưu SHA-256 trong `auth_sessions.token_hash`. Phiên có hạn cố định bảy ngày; refresh đổi token một lần trong transaction, không kéo dài hạn ban đầu. Chỉ một request thắng nếu hai request cùng dùng token cũ. Client phải tuần tự hóa refresh, thay cả hai token sau thành công và đăng nhập lại khi phiên hết hạn/thu hồi. Access JWT không được dùng thay refresh token.

Mỗi request được bảo vệ kiểm tra phiên và tài khoản hiện tại trong MySQL. Đăng xuất thu hồi cả access JWT và refresh token của phiên đó ngay; khóa tài khoản hoặc đổi vai trò có hiệu lực ở request tiếp theo. Mất database không được bỏ qua kiểm tra xác thực. API trả `Cache-Control: no-store`; khi nối API, ứng dụng Flutter cần lưu token bằng kho bảo mật của hệ điều hành. Swagger dùng nút **Authorize** với access token và không giữ token sau khi tải lại trang.

Middleware tại `src/auth/middleware.js`:

- `authenticate(service)` xác thực Bearer và lưu `{ user, sessionId }` tại `res.locals.auth`.
- `requireRoles('CUSTOMER')` cho CUSTOMER và HOUSEHOLD. ADMIN không tự có quyền xử lý booking/tiền của hộ.
- `requireHouseholdOwner(service, resolveId, { requireApproved })` kiểm tra chủ sở hữu thực tế. Với đối tượng con, `resolveId` phải lấy household ID từ đối tượng backend đã tải, không tin ID hộ do client tự khai.
- `requireOwnership(service, { resourceType, as, resolveId, requireApproved })` truy vết chủ sở hữu từ MySQL; `resolveId` mặc định lấy `req.params.id`. Kết quả nằm ở `res.locals.ownership`. Loại tài nguyên và chế độ kiểm tra do backend cố định khi khai báo route, không nhận từ request.
- Hộ DRAFT/REVOKED vẫn dùng chức năng khách và có thể quản lý nghĩa vụ cũ. `requireApproved: true` dành cho nhận cam kết mới. Các command booking sau này vẫn phải khóa và kiểm tra lại quyền/trạng thái hộ trong chính transaction ghi dữ liệu; middleware không thay thế bước đó.

Các chính sách tại `src/auth/policies.js` dùng chung việc xác định tài khoản hoạt động, role và quyền sở hữu. Thiếu phiên/token hợp lệ trả 401 `UNAUTHENTICATED` kèm `WWW-Authenticate: Bearer`; JWT hợp lệ gắn với tài khoản bị khóa/vô hiệu hóa trả 403 `ACCOUNT_BLOCKED`; sai role hoặc sai chủ sở hữu trả 403 `FORBIDDEN`. Login vẫn dùng lỗi 401 chung để không tiết lộ email tồn tại. Header Authorization trùng lặp bị từ chối. API được bảo vệ luôn trả `Cache-Control: no-store`.

| `as` | Quyền kiểm tra | `resourceType` hỗ trợ |
| --- | --- | --- |
| `household` | HOUSEHOLD và đúng `households.owner_user_id` | `household`, `room`, `service`, `product`, `article`, `offer`, `resource`, `availabilityBlock`, `serviceSlot`, `slotOffer`, `resourceAssignment`, `resourceRule`, `resourceUsage`, `financialEntry`, `booking`, `scheduleRequest`, `proposal`, `reservationSet`, `bookingItem`, `contentRevision`, `revisionMedia`, `productInquiry`, `place`, `depositCredit`, `creditMovement`, `resourceHandover`, `incident` |
| `customer` | CUSTOMER hoặc HOUSEHOLD và đúng khách sở hữu | `booking`, `scheduleRequest`, `proposal`, `reservationSet`, `bookingItem`, `productInquiry`, `review`, `complaint`, `depositCredit`, `creditMovement` |
| `user` | Đúng user sở hữu, cho cả ba role | `notification` |

Hạng mục được truy ngược qua tập giữ chỗ tới booking/phương án; phiên bản nội dung và ảnh được truy về nội dung gốc. Người tạo, người đăng ảnh, số điện thoại và ID hộ tự khai không thay thế chủ sở hữu. Booking ngoài app có `customer_user_id=NULL` không cấp quyền khách cho người nhập đơn. Bài văn hóa chung không có hộ không được quản lý bằng guard hộ. ADMIN không được tự vượt ownership để xác nhận booking hoặc ghi tiền; route kiểm duyệt riêng dùng quyền ADMIN theo đúng nghiệp vụ. Đối tượng không tồn tại và không thuộc quyền cùng trả `FORBIDDEN` ở guard ownership.

Các lookup sau khảo sát yêu cầu migration `003`. `incident` chỉ trả dòng `complaints.feedback_kind='INCIDENT'`, không cho hộ đọc phản ánh riêng tư qua cùng guard. Đây là chính sách truy quyền; chưa bổ sung endpoint nghiệp vụ điểm phục vụ, cọc hoặc giao/trả.

Các guard này là nền cho các module nghiệp vụ. API phòng/dịch vụ được mô tả bên dưới; booking, giữ chỗ, thu/hoàn và review xem [BOOKINGS.md](BOOKINGS.md). Khi tải dữ liệu sau guard phải giữ điều kiện chủ sở hữu trong truy vấn. Các thao tác ghi phải kiểm tra lại tài khoản, phiên, role, household và đối tượng dưới khóa trong chính transaction, tránh dùng kết quả middleware cũ để ghi dữ liệu. Đây cũng là nguyên tắc kiểm tra từng request và từng quan hệ sở hữu trong [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

API quản trị đã triển khai:

```http
PATCH /api/v1/admin/users/{userId}/status
Authorization: Bearer <accessToken-cua-admin>
Content-Type: application/json

{"status":"BLOCKED","reason":"Vi phạm quy định nền tảng"}
```

Để mở khóa dùng `status: "ACTIVE"`, vẫn bắt buộc lý do 1–2000 ký tự. Chỉ ADMIN hiện hành được gọi; không được tự khóa chính mình. Response có `user` (id, role, status, disabledAt), `changed` và `revokedSessionCount` (số bản ghi phiên chưa thu hồi được thu hồi trong lần gọi này). Không nhận trường `role` hoặc thao tác nâng quyền. User đích không tồn tại trả 404.

Trong một transaction, backend khóa các user theo thứ tự ID số tăng dần, kiểm tra lại tài khoản/role/phiên của ADMIN, cập nhật `users.status` và `disabled_at`, thu hồi mọi phiên của user đích và ghi lịch sử trong `activity_events` (`event_type=OTHER`, `entity_type=USER`, `after_data.action=ACCOUNT_STATUS_CHANGED`). Lịch sử chứa trạng thái trước/sau, người thực hiện, lý do và request ID; không chứa mật khẩu/token. Lỗi ghi lịch sử hoàn tác cả trạng thái và thu hồi phiên. Gửi lặp cùng trạng thái không tạo lịch sử trùng; nếu còn phiên chưa thu hồi khi khóa lại, hệ thống vẫn thu hồi và ghi nhận việc đó.

Mở khóa không phục hồi phiên cũ, khách phải đăng nhập lại. Khóa tài khoản không thay role, phê duyệt hộ, booking, giữ chỗ hoặc dữ liệu thu chi. Thu hồi duyệt hộ là nghiệp vụ khác: tài khoản còn ACTIVE vẫn có quyền khách và xử lý nghĩa vụ cũ trong giới hạn đã chốt. Dùng API quản trị để bảo toàn thu hồi phiên và lịch sử; cập nhật status trực tiếp qua Workbench sẽ bỏ qua các bước này.

Đăng ký/đăng nhập/refresh giới hạn tối đa 60 request/IP/15 phút và 12 request/email/15 phút, trả 429 kèm `Retry-After` khi limiter chặn. Giới hạn email dùng chung các IP. Đây là limiter bộ nhớ cho một instance MVP; restart xóa bộ đếm và nhiều instance cần kho giới hạn chung. `TRUST_PROXY_HOPS=0` khi chạy trực tiếp, `1` cho cấu hình Render hiện tại; không đặt khi hạ tầng proxy khác với cấu hình. Giới hạn scrypt có thể trả 429 sớm hơn khi máy bận.

ADMIN chỉ được tạo qua công cụ nội bộ, không qua API đăng ký. Người vận hành đặt tạm `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_NAME`, `ADMIN_BOOTSTRAP_PASSWORD` trong môi trường riêng rồi chạy từ root:

```powershell
npm run auth:create-admin --workspace backend -- --apply --confirm-database=community-tourism-db
```

Công cụ xác minh TLS/database trước khi ghi, chỉ tạo tài khoản ADMIN mới, không nâng quyền hoặc đặt lại mật khẩu của email đã có. Xóa các biến bootstrap khỏi môi trường sau khi dùng. Công cụ này **không chạy trong startup/build/migration/seed**; task xác thực không chạy nó trên Aiven.

`API_DOCS_ENABLED=true` bật cả UI và OpenAPI JSON; `false` tắt cả hai. Mặc định bật, kể cả cấu hình Render hiện tại. URL server trong OpenAPI là `/`, nên dùng cùng hostname với API, không lấy hostname từ header của khách. OpenAPI JSON trả trực tiếp tài liệu theo chuẩn, không bọc `success/data`; Swagger và tài nguyên tĩnh cũng không dùng envelope nghiệp vụ.

`LOG_LEVEL` nhận `trace`, `debug`, `info`, `warn`, `error`, `fatal`, `silent`. Mặc định `info`, hoặc `silent` khi `NODE_ENV=test`. `CORS_ORIGIN` là danh sách origin được phép, phân cách bằng dấu phẩy; request không có Origin như Flutter/CLI vẫn được xử lý. CORS không thay thế xác thực và kiểm tra quyền.

## Mở hồ sơ hộ dân và xét duyệt

| API | Quyền | Chức năng |
| --- | --- | --- |
| `POST /api/v1/households` | CUSTOMER hoặc HOUSEHOLD | Mở một hộ DRAFT và phiên bản hồ sơ đầu tiên; trả 201. Một tài khoản chỉ sở hữu một hộ; tạo trùng trả 409. |
| `GET /api/v1/households/me` | Chủ hồ sơ | Xem hộ, phiên bản mới nhất, bản đang công khai và tài khoản hiện hành; chưa mở hộ trả 404. |
| `PUT /api/v1/households/me/profile` | Chủ hồ sơ | Lưu bản nháp mới, tăng version; phải gửi `revisionId` + `version` mới nhất. |
| `POST /api/v1/households/me/submissions` | Chủ hồ sơ | Gửi bản nháp đã đủ thông tin, chỉ gửi `revisionId` + `version`. |
| `GET /api/v1/households/me/revisions?page=1&pageSize=20` | Chủ hồ sơ | Lịch sử phiên bản, người duyệt và lý do từ chối. |
| `GET /api/v1/admin/household-applications?status=PENDING&page=1&pageSize=20` | ADMIN | Hàng đợi theo trạng thái **phiên bản**, có cả bản sửa của hộ đã duyệt. Hỗ trợ PENDING/APPROVED/REJECTED, không liệt kê nháp. |
| `GET /api/v1/admin/household-applications/{revisionId}` | ADMIN | Xem đúng bản đã gửi; bản nháp chưa gửi trả 404. |
| `POST /api/v1/admin/household-applications/{revisionId}/review` | ADMIN | `version`, `decision: APPROVED/REJECTED`, `reason` bắt buộc nếu từ chối. |

Tất cả dùng Bearer và `Cache-Control: no-store`. Route `/me` truy hộ bằng user của phiên hiện hành; không nhận `ownerUserId`, `householdId`, `code`, `role`, trạng thái hoặc pointer công khai từ client. CUSTOMER được chỉnh **hồ sơ đăng ký của chính mình** khi chưa được duyệt, chưa có quyền quản lý phòng/dịch vụ của hộ. ADMIN dùng route xét duyệt, không tự có quyền mở hộ hoặc quản lý thay chủ hộ.

Ví dụ mở hồ sơ (có thể lưu nháp chỉ với `title`):

```json
{
  "title": "Hộ du lịch Ba Thành",
  "body": "Gia đình tổ chức trải nghiệm bắt cá và nấu món địa phương.",
  "details": {
    "address": "Ấp Bình Hòa, xã An Bình",
    "locality": "Vĩnh Long",
    "contactPhone": "0901234567",
    "zaloContact": "0901234567",
    "introductionSections": [{"heading": "Gia đình chúng tôi", "text": "Cùng gìn giữ nghề truyền thống địa phương."}]
  }
}
```

Gửi duyệt cần tên tối thiểu 3 ký tự, mô tả 20 ký tự, địa chỉ 5 ký tự, địa phương 2 ký tự và điện thoại hợp lệ 8–32 ký tự; thiếu trả `HOUSEHOLD_PROFILE_INCOMPLETE` (422). Tên tối đa 200, mô tả 20.000 ký tự, địa chỉ 500, địa phương 200; tối đa 20 phần giới thiệu. Schema lồng nhau là danh sách trường cho phép, không nhận giá/sức chứa/quyền trong `details`. SQL dùng `content_revisions` loại HOUSEHOLD/schema_version=1, ánh xạ camelCase sang `contact_phone`, `zalo_contact`, `introduction_sections`; không cần migration mới. Nội dung là văn bản; client hiển thị bằng text/escape thay vì thực thi HTML. Quản lý phòng/dịch vụ đã có các API bên dưới; upload và quản lý ảnh theo phiên bản, xóa mềm/khôi phục được mô tả trong CONTENT.md.

Mỗi lần lưu tạo revision DRAFT mới và giữ bản cũ để đối chiếu; `revisionId` và `version` chống ghi đè khi hai thiết bị cùng sửa. Bản PENDING không được sửa. Gửi lặp đúng bản PENDING trả `changed=false`. Bản đã bị từ chối phải được lưu thành nháp mới trước khi gửi lại. Sai ID/version trả `STALE_VERSION` (409).

Luồng đầu: hộ DRAFT → PENDING → APPROVED/REJECTED. Tài khoản vẫn CUSTOMER trong lúc chờ hoặc bị từ chối. Khi duyệt, transaction đồng thời đặt pointer công khai, cập nhật hộ APPROVED, đổi CUSTOMER thành HOUSEHOLD, ghi audit và thông báo trong ứng dụng. HOUSEHOLD kế thừa CUSTOMER; access JWT cũ dùng ngay quyền hiện hành từ DB, `/auth/me` và refresh trả role mới, không bắt tạo tài khoản hoặc đăng nhập lần hai. Không duyệt hộ của tài khoản BLOCKED/disabled hoặc đã thành ADMIN.

Với hộ APPROVED, lưu/gửi bản sửa giữ nguyên trạng thái APPROVED và bản công khai; từ chối bản sửa cũng giữ nguyên. Duyệt bản sửa mới chuyển pointer sang bản đó. Hộ REVOKED có thể sửa và gửi xin duyệt lại (PENDING), vẫn giữ HOUSEHOLD để xử lý nghĩa vụ cũ; được duyệt lại không tự khôi phục booking, request hoặc phương án đã kết thúc. Hộ archived không được lưu/gửi/duyệt. Chưa có API thu hồi phê duyệt trong module này vì thao tác đó cần engine xử lý cam kết hiện có.

ADMIN phải duyệt đúng phiên bản mới nhất đang PENDING. Gửi lặp cùng quyết định, lý do và ADMIN trên bản còn mới nhất trả `changed=false`; quyết định xung đột hoặc một ADMIN khác trả 409, không ghi trùng event/thông báo. Review response có `user` là **người sở hữu hộ**, không phải ADMIN đang duyệt. Lý do chấp thuận mặc định là “Hồ sơ đáp ứng điều kiện tham gia nền tảng”; lý do từ chối 1–2000 ký tự sau trim.

Các lệnh khóa user theo ID số tăng dần → session của actor → hộ → revision, rồi kiểm lại trạng thái user/role/phiên và quyền sở hữu dưới khóa. Quy tắc này tương thích với khóa tài khoản hiện có. Các thay đổi trạng thái, quyền, audit và thông báo commit/rollback cùng nhau; không upload hoặc gọi dịch vụ ngoài trong transaction. Cách kiểm quyền theo từng request/quan hệ và chỉ nhận trường cho phép dựa trên [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), [OWASP Mass Assignment](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html); cách khóa hàng tham khảo [MySQL 8.4 Locking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html).

## Danh mục và điểm phục vụ

Danh mục là dữ liệu chung của nền tảng, do ADMIN quản lý; không có chủ hộ riêng và không cần vòng xét duyệt thứ hai. Có ba loại `SERVICE`, `PRODUCT`, `CONTENT`; không tự gán danh mục này cho điểm phục vụ vì ERD không có quan hệ place/category. Phòng và dịch vụ sẽ tham chiếu `places` ở module tương ứng. Module dùng schema 003 hiện có, không thêm migration, không xóa dữ liệu cũ.

| API | Quyền / chức năng |
| --- | --- |
| `GET /api/v1/public/categories` | Khách vãng lai xem danh mục đang hoạt động; lọc `kind`, phân trang. |
| `GET /api/v1/admin/categories` | ADMIN xem cả danh mục ngừng hoạt động; lọc `kind`, `isActive=true/false`. |
| `POST /api/v1/admin/categories` | ADMIN tạo với `kind`, `code`, `name`, `isActive`, `reason`. |
| `GET /api/v1/admin/categories/{categoryId}` | ADMIN xem chi tiết. |
| `PATCH /api/v1/admin/categories/{categoryId}` | ADMIN đổi `name` và/hoặc `isActive`, kèm `expectedState: {name,isActive}` và `reason`. |
| `GET /api/v1/public/places` | Khách tìm điểm phục vụ công khai; lọc `householdId`, `locality`, `q`, phân trang. |
| `GET /api/v1/public/places/{placeId}` | Khách xem chi tiết đã công khai. |
| `GET /api/v1/households/me/places` | HOUSEHOLD xem danh sách điểm của mình, gồm bản mới nhất và bản công khai. |
| `POST /api/v1/households/me/places` | Hộ đã được duyệt tạo điểm DRAFT. Backend tự cấp mã và gắn hộ sở hữu. |
| `GET /api/v1/households/me/places/{placeId}` | HOUSEHOLD xem chi tiết điểm của mình. |
| `PUT /api/v1/households/me/places/{placeId}/profile` | Lưu bản DRAFT mới, gửi `revisionId`, `version` mới nhất cùng nội dung. |
| `POST /api/v1/households/me/places/{placeId}/submissions` | Gửi `{revisionId,version}` để Admin duyệt. |
| `GET /api/v1/households/me/places/{placeId}/revisions` | Xem lịch sử phiên bản và lý do xét duyệt. |
| `PATCH /api/v1/households/me/places/{placeId}/status` | Đổi `supplyStatus`, `visibility`, kèm `expectedState` tương ứng và `reason`. |
| `GET /api/v1/admin/place-submissions` | ADMIN xem phiên bản đã gửi, lọc `status=PENDING/APPROVED/REJECTED` và `householdId`. |
| `GET /api/v1/admin/place-submissions/{revisionId}` | ADMIN xem đúng bản đã gửi, không đọc nháp chưa gửi qua API này. |
| `POST /api/v1/admin/place-submissions/{revisionId}/review` | ADMIN gửi `{version,decision,reason?}`; `decision=APPROVED/REJECTED`, từ chối bắt buộc lý do. |

Mọi danh sách nhận `page` (mặc định 1, tối đa 100.000) và `pageSize` (mặc định 20, tối đa 100), trả `{items,total,page,pageSize}` trong envelope chung. Các query/body không nhận trường lạ. Không có API xóa cứng.

Code danh mục được trim/chuyển chữ hoa, tối đa 50 ký tự ASCII chữ/số/gạch dưới, bắt đầu bằng chữ. `(kind,code)` duy nhất; trùng trả `CATEGORY_ALREADY_EXISTS` (409). `kind` và `code` không được sửa sau khi tạo để giữ quan hệ tham chiếu. Tắt danh mục không xóa phòng/dịch vụ/sản phẩm/nội dung hoặc lịch sử đang tham chiếu nó. `expectedState` chống hai người ghi đè nhau; lệch trả `STALE_VERSION`. Cập nhật không thay đổi giá trị trả `changed=false`, không tạo audit trùng. Mọi thay đổi có audit trong cùng transaction.

Ví dụ tạo điểm phục vụ:

```json
{
  "title": "Vườn trải nghiệm Ba Thành",
  "body": "Điểm đón khách tham quan vườn và cùng gia đình thu hoạch trái cây.",
  "details": {
    "address": "Ấp Bình Hòa, xã An Bình",
    "locality": "Vĩnh Long",
    "coordinates": {"latitude": 10.25, "longitude": 105.97},
    "directions": "Đi theo đường vào cổng vườn, gọi trước khi đến.",
    "contactPhone": "0901234567"
  }
}
```

Nháp chỉ bắt buộc `title`; gửi duyệt cần title 3–200, body 20–20.000, address 5–500, locality 2–200 ký tự. Thiếu trả `PLACE_PROFILE_INCOMPLETE` (422). Tọa độ tùy chọn hoặc null; khi có phải đủ latitude/longitude dạng số, lần lượt trong [-90,90]/[-180,180]. Hướng dẫn đến tối đa 4.000 ký tự, điện thoại tùy chọn theo cùng định dạng hồ sơ hộ. Đây là metadata địa điểm, chưa có bản đồ nhúng hoặc lịch tài nguyên; quản lý ảnh hồ sơ hộ/phòng/dịch vụ xem CONTENT.md. SQL lưu `content_revisions` loại PLACE/schema_version=1; `contactPhone` ánh xạ `details.contact_phone`, địa chỉ/tọa độ/hướng dẫn không sao chép vào bảng gốc.

Chỉ HOUSEHOLD đang sở hữu hộ APPROVED và chưa archived được tạo/lưu/gửi điểm. CUSTOMER đang xin mở hộ chưa có quyền này. ADMIN chỉ dùng route kiểm duyệt; không quản lý điểm thay chủ hộ. Mọi route `/me` lấy hộ từ tài khoản, truy root bằng cả place ID và household ID; không nhận owner/hộ/code/pointer do client khai. ID thiếu và ID thuộc hộ khác đều trả 403 ở route quản lý. Hộ REVOKED vẫn xem được lịch sử; chỉ được đặt trạng thái không AVAILABLE đồng thời HIDDEN, không mở lại/công khai nội dung mới. Các lệnh kiểm lại user/role/phiên và chủ sở hữu trong transaction theo thứ tự khóa thống nhất với auth/hồ sơ hộ.

Lưu tạo revision mới, giữ nguyên bản công khai. Bản PENDING không sửa; bị từ chối phải lưu nháp mới rồi gửi lại. Admin duyệt đúng latest revision/version, từ chối phải có lý do. Chấp thuận còn kiểm chủ hộ ACTIVE/HOUSEHOLD, hộ APPROVED, các root chưa archived, điểm chưa RETIRED. Duyệt cập nhật pointer, audit và thông báo cho chủ hộ trong một transaction; không đổi quyền user hoặc phê duyệt hộ. Từ chối bản sửa giữ nguyên pointer cũ. Gửi lặp bản PENDING hoặc lặp cùng review/lý do/người duyệt trên bản mới nhất trả `changed=false`; quyết định xung đột/sai version trả 409.

Trạng thái cung cấp gồm AVAILABLE, PAUSED, RETIRED; hiển thị VISIBLE/HIDDEN. Thay đổi cần lý do và đúng `expectedState: {supplyStatus,visibility}`. RETIRED không được mở lại, lưu nháp hoặc gửi duyệt tiếp. Admin vẫn có thể từ chối một bản đang chờ của điểm đã nghỉ hẳn. Duyệt nội dung không tự bật lại điểm bị ẩn/tạm ngừng. Những trạng thái này không phải lịch chặn tài nguyên và không tự sửa/hủy booking hay giải phóng tài nguyên đang có nghĩa vụ phục vụ.

Public không cần đăng nhập và luôn `Cache-Control: no-store`. Cả list và detail chỉ lấy đúng `published_revision_id` đã APPROVED của PLACE và HOUSEHOLD; root phải VISIBLE/chưa archived, hộ APPROVED, tài khoản chủ ACTIVE/chưa disabled/vai trò HOUSEHOLD, điểm AVAILABLE. Không đạt một điều kiện thì bị loại khỏi list; detail trả cùng 404 như ID không có. Bản sửa của hộ/điểm đang chờ duyệt không thay nội dung khách đang xem. Response public có nội dung, địa chỉ và điện thoại **đã được duyệt**, không có owner user ID, email tài khoản, metadata tác giả, review note, trạng thái nháp hoặc JSON ngoài danh sách trường công khai; tọa độ cũng chỉ chiếu đúng hai trường số.

`q` (1–100 ký tự) tìm trong tên/địa chỉ của bản công khai, `locality` (1–200) lọc địa phương. Truy vấn tham số hóa và escape `%`, `_`, `!` thành ký tự thường khi tìm, theo [MySQL 8.4 LIKE/ESCAPE](https://dev.mysql.com/doc/refman/8.4/en/string-comparison-functions.html). Danh sách quản lý tải bản mới nhất và bản công khai theo lô; không phát sinh truy vấn riêng cho từng điểm. Chính sách truy dữ liệu theo từng quan hệ và tách response công khai dựa trên [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

## Dịch vụ/trải nghiệm và ServiceOffer

Module `src/services/` dùng các bảng hiện có của migration 003, không thêm bảng/migration. Một dịch vụ thuộc một hộ, có danh mục SERVICE, điểm phục vụ mặc định và nhiều phương thức bán. Phương thức bán là cấu hình thương mại, không phải lịch hoặc tài nguyên; sức chứa còn lại và quyền thuê riêng sẽ được kiểm tra bởi engine lịch/booking.

| API | Chức năng |
| --- | --- |
| `GET/POST /api/v1/households/me/services` | Hộ xem danh sách/tạo dịch vụ DRAFT. |
| `GET /api/v1/households/me/services/{serviceId}` | Hồ sơ mới nhất, bản công khai, mọi offer hiện hành và `offersToken`. |
| `PUT /api/v1/households/me/services/{serviceId}/profile` | Lưu DRAFT mới với `revisionId`, `version` và toàn bộ nội dung. |
| `POST /api/v1/households/me/services/{serviceId}/submissions` | Gửi `{revisionId,version,offersToken}` để xét duyệt. |
| `GET /api/v1/households/me/services/{serviceId}/revisions` | Lịch sử phiên bản và snapshot offer đã gửi. |
| `PATCH /api/v1/households/me/services/{serviceId}/status` | Đổi supplyStatus/visibility, cần expectedState và reason. |
| `POST /api/v1/households/me/services/{serviceId}/offers` | Tạo phương thức bán; mặc định đang bật, tối đa 32 offer active/dịch vụ. |
| `GET /api/v1/households/me/services/{serviceId}/offers/{offerId}` | Xem cấu hình, token và offersToken mới nhất. |
| `PUT /api/v1/households/me/services/{serviceId}/offers/{offerId}` | `{expectedToken,reason,configuration}` để sửa cấu hình chưa bị khóa. |
| `PATCH /api/v1/households/me/services/{serviceId}/offers/{offerId}/pricing` | Đổi giá/bật tắt offer hoặc giá/trạng thái phụ phí đang có. |
| `GET /api/v1/admin/service-submissions` | ADMIN xem hàng đợi theo status PENDING/APPROVED/REJECTED, householdId. |
| `GET /api/v1/admin/service-submissions/{revisionId}` | ADMIN xem đúng hồ sơ và snapshot đã gửi. |
| `POST /api/v1/admin/service-submissions/{revisionId}/review` | `{version,decision,reason?}`; từ chối phải có lý do. |
| `GET /api/v1/public/services` | Khách tìm dịch vụ công khai, không cần tài khoản. |
| `GET /api/v1/public/services/{serviceId}` | Khách xem nội dung, điểm phục vụ và offer đã công khai. |

Tất cả dùng envelope chung và `Cache-Control: no-store`; các danh sách hỗ trợ page/pageSize theo giới hạn dùng chung. Các route quản lý yêu cầu HOUSEHOLD hiện hành và đúng hộ sở hữu. Hộ APPROVED mới tạo/lưu/gửi hoặc chỉnh cấu hình; ADMIN chỉ duyệt nội dung, không quản lý giá/dịch vụ thay hộ. ID không tồn tại/khác hộ/sai quan hệ service–offer đều trả 403 ở route quản lý. Tài khoản/role/phiên/ownership được kiểm lại trong transaction dưới thứ tự khóa chung: user tăng dần → session actor → hộ → service → revision/offer và các tham chiếu cần kiểm tra.

Ví dụ mở dịch vụ:

```json
{
  "title": "Trải nghiệm giăng lưới bắt cá",
  "body": "Cùng gia đình giăng lưới, thu hoạch cá và tìm hiểu nghề địa phương.",
  "categoryId": "1",
  "defaultPlaceId": "1",
  "defaultDurationMinutes": 180,
  "details": {
    "participationConditions": ["Trẻ em đi cùng người lớn"],
    "preparationNotes": ["Mang quần áo thay"]
  }
}
```

Nháp cần title, categoryId và defaultDurationMinutes; body mặc định rỗng, defaultPlaceId có thể null. Category phải đang active và kind=SERVICE; place khi có phải cùng hộ, chưa archived/RETIRED. Thời lượng mặc định 1–10.080 phút là giới hạn kỹ thuật MVP, không phải lịch thực tế. Gửi duyệt cần tên tối thiểu 3, mô tả 20 ký tự, điểm phục vụ đã được duyệt/VISIBLE/AVAILABLE và 1–32 offer active hợp lệ; mỗi `terms.scopeDescription` cần ít nhất 10 ký tự để nói rõ phạm vi cung cấp. Các mảng điều kiện/chuẩn bị tối đa 20 chuỗi, mỗi chuỗi 1.000 ký tự. Không nhận giá, chủ sở hữu hoặc quyền trong `details`.

Category/place/default duration được lưu trong `content_revisions.details` cùng nội dung; khi sửa, các cột gốc của bản đang công khai giữ nguyên cho tới khi Admin duyệt. Giá và lịch sử booking không đọc lại từ nội dung nháp. Submit chụp `offers_snapshot` từ server dưới khóa; `offersToken` là fingerprint toàn bộ offer của dịch vụ để không gửi nhầm cấu hình đã đổi từ lúc người dùng xem. Fingerprint là kiểm soát phiên bản, không thay quyền sở hữu. Bản PENDING không sửa nội dung; gửi lặp đúng bản PENDING là no-op. Khi bị từ chối, lưu nháp mới rồi gửi lại.

Ví dụ tạo offer bắt cá ghép:

```json
{
  "name": "Khách ghép",
  "participationMode": "SHARED",
  "pricingType": "PER_PERSON",
  "unitPriceVnd": 150000,
  "minParticipants": 1,
  "maxParticipants": 10,
  "terms": {
    "scopeDescription": "Một người tham gia toàn bộ buổi giăng lưới bắt cá.",
    "includedItems": ["Hướng dẫn của hộ dân"],
    "excludedItems": []
  },
  "addons": [],
  "isActive": true
}
```

| pricingType | quantityRule trả về | Quy tắc |
| --- | --- | --- |
| PER_PERSON | PARTICIPANT_COUNT | Số lượng tính tiền bằng số khách tham gia. |
| PER_GROUP/PER_TRIP/FIXED_PACKAGE | ONE | Một nhóm/chuyến/gói của chính dịch vụ trong một hạng mục; không phải combo nhiều hộ. |
| PER_HOUR | SLOT_DURATION_HOURS | Backend lấy giờ từ thời gian lịch, không nhận số giờ tùy ý từ khách. |
| PER_UNIT | SELECTED_UNITS | Khách chọn số đơn vị cho trọn lịch; cần maxUnits và participantsPerUnit. |

`participationMode=SHARED/EXCLUSIVE` độc lập cách tính tiền; EXCLUSIVE sẽ phải giữ độc quyền slot khi xây engine đặt. `maxParticipants` là giới hạn một hạng mục của phương thức, không phải tổng chỗ còn lại. Cả min/max người và giới hạn đơn vị là số nguyên 1–100.000, min không vượt max. PER_UNIT bắt buộc nhãn đơn vị, maxUnits/participantsPerUnit dương, maxParticipants không vượt tích hai giới hạn đó. Các loại khác để hai giới hạn đơn vị null; nhãn được tự đặt theo người/nhóm/chuyến/gói/giờ, nếu gửi phải trùng nhãn chuẩn. Không suy công thức từ tên hoặc unitLabel, không nhận participantCount/quantity/resourceUsages như thuộc tính cấu hình offer. Tiền VND nguyên 0–999.999.999.999.999; engine đặt còn phải kiểm tổng tiền và overflow khi có số lượng thực tế.

Addons chỉ dành cho khoản không cần giữ tài nguyên riêng: tối đa 32 phần tử, key ASCII duy nhất, tên 150 ký tự, giá nguyên, maxQuantity 1–100.000, isActive boolean và **resourceFree=true bắt buộc**. Không nhận resourceId; xe/áo phao hữu hạn phải qua module tài nguyên. Included/excluded tối đa 32 chuỗi, mỗi chuỗi 500 ký tự; scopeDescription tối đa 2.000. Key/tên/giới hạn phụ phí là một phần cấu trúc không được đổi nghĩa sau khi đã dùng.

Cấu trúc offer (tên, mode, pricingType, đơn vị, giới hạn, terms và danh tính/giới hạn addons) sửa được trước khi gửi/dùng. Một khi offer có mặt trong phiên bản đã gửi hoặc được slot/booking tham chiếu, sửa cấu trúc trả `OFFER_CONFIGURATION_LOCKED` (409): tạo offer thay thế, tắt offer cũ, lưu một bản DRAFT mới của dịch vụ và gửi duyệt. Không tạo/sửa cấu trúc trong lúc đang PENDING. Offer mới trên dịch vụ đã công khai chưa xuất hiện cho khách cho tới khi được đưa vào bản mới được duyệt.

Giá và trạng thái bán cập nhật độc lập qua `/pricing`, kể cả lúc đang PENDING; phải gửi `expectedToken` hiện hành và `reason`. Có thể gửi `unitPriceVnd`, `isActive` và/hoặc `addonPrices: [{key,unitPriceVnd?,isActive?}]`; chỉ được dùng key đã tồn tại, không trùng key, ít nhất một trường thay đổi mỗi phần tử. Không thay đổi trả changed=false; stale token trả 409. Ví dụ:

```json
{
  "expectedToken": "<token 64 ký tự từ GET offer>",
  "reason": "Cập nhật giá phục vụ",
  "unitPriceVnd": 180000,
  "addonPrices": [{"key": "meal_preparation", "unitPriceVnd": 50000}]
}
```

Chỉ gửi addonPrices nếu key đã được tạo. Snapshot đã gửi/được chấp nhận vẫn giữ giá tại thời điểm đó; khách xem giá hiện hành từ offer và snapshot cấu trúc đã duyệt. Giá riêng từng slot, sức chứa, mức dùng tài nguyên và khả dụng đã có trong module lịch; xem CALENDAR.md. Giữ chỗ và tính tiền thuộc module booking, xem [BOOKINGS.md](BOOKINGS.md). Hộ bị thu hồi duyệt hoặc dịch vụ RETIRED vẫn đọc lịch sử, nhưng chỉ được tắt offer (isActive=false, không đổi giá/addon); không được mở lại. Root RETIRED không trở lại AVAILABLE. Hộ archived không ghi thay đổi.

Admin chỉ duyệt đúng latest revision/version; snapshot cấu trúc phải còn khớp các offer gốc và tham chiếu phải còn hợp lệ. Chấp thuận cập nhật pointer/category/place/default duration, audit và thông báo cùng transaction; từ chối giữ bản công khai cũ. Duyệt không tự bật lại offer, thay quyền user hoặc sửa bất kỳ slot/booking/item nào. Request review lặp cùng quyết định/lý do/người duyệt trên bản còn mới nhất là no-op. Audit lỗi thì rollback cả giá; thông báo lỗi thì rollback cả review/publication.

Public lọc theo householdId/categoryId/placeId, pricingType, participationMode, q (tên/mô tả đã công khai, wildcard được escape). Bộ lọc mode và pricing phải khớp **cùng một offer**. Hộ/điểm/dịch vụ phải đang hiển thị/cung cấp, chưa archived; hộ APPROVED, chủ hộ ACTIVE/HOUSEHOLD, category SERVICE đang active và cả ba pointer nội dung HOUSEHOLD/PLACE/SERVICE phải trỏ bản APPROVED đúng gốc. Chỉ lấy offer active có trong `offers_snapshot` của bản công khai và đúng cấu trúc; dịch vụ không còn offer phù hợp bị ẩn/404. Khách không nhận draft, review note, tác giả/email hoặc các token nội bộ. Các danh sách quản lý tải bản hồ sơ và offer theo lô.

Snapshot dùng JSON vì thuộc tính cấu hình cần giữ nguyên theo phiên bản; ID quan hệ nghiệp vụ chính vẫn ở các cột/FK có sẵn. Kiểm tra ID offer trong snapshot và truy vấn public dùng [MySQL 8.4 JSON_CONTAINS](https://dev.mysql.com/doc/refman/8.4/en/json-search-functions.html); quyền vẫn được kiểm trên đối tượng/hộ thực tế theo [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

## Phòng lưu trú

Phòng là loại cung cấp tùy chọn. Mỗi `rooms` đại diện **một phòng có thể được đặt riêng**, không phải loại phòng với số lượng tồn; nhiều phòng tạo nhiều bản ghi. Hộ chỉ cung cấp trải nghiệm vẫn hoạt động bình thường. Module dùng `rooms`, `places`, `content_revisions` loại ROOM, audit/thông báo trong schema 003; **không cần migration mới**.

| Endpoint | Quyền | Chức năng |
| --- | --- | --- |
| `GET /api/v1/households/me/rooms` | HOUSEHOLD | Danh sách phòng của hộ đang sở hữu, phân trang. |
| `POST /api/v1/households/me/rooms` | HOUSEHOLD, hộ APPROVED | Tạo phòng và bản nháp đầu tiên. |
| `GET /api/v1/households/me/rooms/{roomId}` | Chủ hộ | Xem cấu hình hiện hành, bản mới nhất và bản đã công khai. |
| `PUT /api/v1/households/me/rooms/{roomId}/profile` | Chủ hộ, hộ APPROVED | Tạo phiên bản nháp mới bằng `revisionId`, `version`. |
| `POST /api/v1/households/me/rooms/{roomId}/submissions` | Chủ hộ, hộ APPROVED | Gửi đúng bản nháp, kiểm `pricingToken` và chụp giá tại thời điểm gửi. |
| `GET /api/v1/households/me/rooms/{roomId}/revisions` | Chủ hộ | Lịch sử nội dung và kết quả xét duyệt. |
| `PATCH /api/v1/households/me/rooms/{roomId}/pricing` | Chủ hộ, hộ APPROVED | Đổi giá hiện hành theo đêm, có token và lý do. |
| `PATCH /api/v1/households/me/rooms/{roomId}/status` | Chủ hộ | Tạm ngừng/ngừng hẳn cung cấp, ẩn/hiện nội dung. |
| `GET /api/v1/admin/room-submissions` | ADMIN | Lọc bản đã gửi theo `status`, `householdId`, phân trang. |
| `GET /api/v1/admin/room-submissions/{revisionId}` | ADMIN | Xem đúng bản đã gửi; bản nháp trả 404. |
| `POST /api/v1/admin/room-submissions/{revisionId}/review` | ADMIN | Duyệt/từ chối phiên bản mới nhất. |
| `GET /api/v1/public/rooms` | Khách vãng lai | Lọc phòng công khai theo hộ, điểm, từ khóa, sức chứa và giá. |
| `GET /api/v1/public/rooms/{roomId}` | Khách vãng lai | Chi tiết phòng đang đủ điều kiện công khai. |

Route `/me` lấy hộ từ tài khoản và kiểm sở hữu trong truy vấn. Không nhận `householdId`, chủ sở hữu, code, trạng thái duyệt, pointer công khai hoặc `pricingType` trong body. ADMIN không có quyền quản lý phòng thay hộ. HOUSEHOLD vẫn kế thừa CUSTOMER. Tất cả response dùng envelope chung và `Cache-Control: no-store`.

Ví dụ tạo phòng:

```json
{
  "title": "Phòng Hoa Sen",
  "body": "Phòng nghỉ hướng vườn, thoáng mát và phù hợp gia đình nhỏ.",
  "placeId": "1",
  "maxGuests": 4,
  "nightlyPriceVnd": 400000,
  "checkInTime": "14:00",
  "checkOutTime": "12:00",
  "terms": {"includedItems": ["Nước uống"], "excludedItems": ["Ăn sáng"]},
  "details": {"amenities": ["Điều hòa", "Wi-Fi"], "houseRules": ["Giữ yên tĩnh sau 22 giờ"]}
}
```

Nháp cần `title`, `maxGuests`, `nightlyPriceVnd`; mặc định mô tả rỗng, điểm null, nhận phòng 14:00, trả phòng 12:00, các danh sách rỗng. Điểm được chọn phải thuộc chính hộ, chưa archive/ngừng hẳn; khi gửi và duyệt phải có điểm đã APPROVED, VISIBLE, AVAILABLE. Gửi cần tên tối thiểu 3 ký tự và mô tả 20 ký tự. Hộ và tài khoản phải còn đủ quyền trong transaction.

Giới hạn API: sức chứa 1–1.000 người/phòng; giá là số nguyên VND 0–999.999.999.999.999; không nhận chuỗi, tiền lẻ hoặc giá âm. Giờ chỉ nhận `HH:mm` từ 00:00 đến 23:59 theo `Asia/Ho_Chi_Minh`. Giờ trả phòng nằm ở **ngày trả**, nên 14:00 nhận/12:00 trả hợp lệ. `terms` có tối đa 32 khoản bao gồm và 32 khoản không bao gồm; `details` tối đa 50 tiện nghi, 32 nội quy; mỗi mục 1–500 ký tự. Không nhận trường JSON tùy ý hoặc thực thi HTML. Phụ phí có tài nguyên hữu hạn không được biểu diễn như một khoản bán không kiểm tra khả dụng.

Response riêng có `{room,profile,publishedProfile}`. `room` là cấu hình vận hành/giá hiện hành; `profile` là bản mới nhất; `publishedProfile` là bản đang được công khai hoặc null. PUT profile gửi các trường nội dung như ví dụ, bỏ `nightlyPriceVnd`, thêm `revisionId` và `version` từ `profile`. Mỗi lần lưu tạo DRAFT mới; không sửa PENDING hoặc ghi đè revision cũ. Điểm, số khách tối đa, giờ nhận/trả và điều kiện trong bản nháp chỉ cập nhật sang root khi được duyệt. Trong lúc chờ hoặc khi bị từ chối, bản công khai cũ tiếp tục hiển thị.

Gửi xét duyệt bằng:

```json
{"revisionId":"12","version":2,"pricingToken":"<room.pricingToken-vua-doc>"}
```

Mã và phiên bản phải đúng bản mới nhất; giá thay đổi trước lúc gửi làm `pricingToken` cũ trả `STALE_VERSION`. Hệ thống lưu giá lúc gửi vào `profile.nightlyPriceSnapshotVnd`. Gửi lặp cùng bản PENDING trả `changed=false`, không tạo thêm audit. ADMIN review dùng `{"version":2,"decision":"APPROVED"}` hoặc REJECTED kèm `reason`; cùng ADMIN/quyết định/lý do trên bản còn mới nhất trả `changed=false`. Quyết định xung đột hoặc phiên bản cũ trả 409. Duyệt không tự mở phòng đã tạm ngừng/ẩn và không nâng quyền chủ hộ.

Đổi giá qua `/pricing`:

```json
{"expectedToken":"<room.pricingToken-vua-doc>","nightlyPriceVnd":450000,"reason":"Cập nhật giá áp dụng cho yêu cầu mới"}
```

Giá mới có hiệu lực cho danh mục công khai ngay, kể cả lúc bản sửa đang chờ duyệt. Phép đổi giá không sửa snapshot trong revision đã gửi, phương án, reservation set hoặc booking item. Duyệt nội dung cũng không khôi phục giá cũ. Token giá tách khỏi tham chiếu nội dung để hai thiết bị không ghi đè giá mới; dùng đúng token với cùng giá là no-op. Giá phòng là **một phòng/một đêm**, không nhân số khách. Số đêm và tổng tiền được AvailabilityService tính theo ngày nhận/trả trong module booking; API cập nhật giá này không tự giữ phòng.

Đổi trạng thái dùng `{expectedState:{supplyStatus,visibility},supplyStatus,visibility,reason}`. AVAILABLE/PAUSED/RETIRED độc lập VISIBLE/HIDDEN; RETIRED không được mở lại. Hộ bị thu hồi duyệt vẫn đọc phòng/lịch sử, tạm ngừng hoặc ngừng hẳn và ẩn phòng, nhưng không tạo/sửa/gửi nội dung, đổi giá hoặc mở nhận đặt. Phòng archive vẫn đọc lịch sử nhưng không sửa. Ngừng cung cấp/ẩn không giải phóng hay hủy booking cũ.

Khi còn hạng mục phòng chưa giải phóng, chưa kết thúc trong reservation set COMMITTED hoặc HELD còn hạn, việc đổi **điểm, sức chứa, giờ nhận/trả** không được gửi/duyệt (`ROOM_CONFIGURATION_LOCKED`, 409). Vẫn được sửa nội dung giới thiệu và điều kiện áp dụng cho giao dịch tương lai; cam kết cũ giữ snapshot riêng. Kiểm lại cam kết ở cả submit và approve; HELD hết hạn không chặn dù worker chưa đổi trạng thái. Truy vấn dùng locking read hiện hành, không dựa trên snapshot đọc trước khi lấy khóa. Quy tắc khóa: user ID tăng dần → session → hộ → phòng → revision → điểm → hạng mục/cam kết. Engine booking hiện tại khóa các user liên quan theo ID tăng dần rồi khóa hộ trước các phòng/hạng mục; khóa hộ tuần tự hóa mọi lần nhận cam kết cùng hộ.

Public chỉ lấy pointer APPROVED của phòng, hộ và điểm; cả ba phải chưa archive, VISIBLE và đang cho phép cung cấp, chủ hộ ACTIVE/HOUSEHOLD, hộ APPROVED. Không lộ nháp, review note, tài khoản, token hoặc giá chụp trong lịch sử kiểm duyệt. Query hỗ trợ `page`, `pageSize`, `householdId`, `placeId`, `q`, `guests`, `minPriceVnd`, `maxPriceVnd`; `guests` kiểm `maxGuests >= guests`, khoảng giá bao gồm hai đầu. Từ khóa `%`, `_`, `!` được tìm theo ký tự thường, không biến thành wildcard SQL. Kết quả **không xác nhận còn phòng theo ngày**; chưa nhận ngày đến/ngày đi ở endpoint này.

Lỗi riêng: `ROOM_PROFILE_INCOMPLETE` (422), `ROOM_PLACE_NOT_READY` (409), `ROOM_CONFIGURATION_LOCKED` (409). Validation/ownership/trạng thái dùng mã chung. Ghi root/revision, audit và thông báo xét duyệt cùng commit/rollback. Xóa mềm/khôi phục và quản lý ảnh theo phiên bản xem CONTENT.md. Không xóa cứng. Lịch trống/chặn phòng xem CALENDAR.md; đặt phòng chưa thuộc module này.

## Phản hồi và request ID

API JSON dùng envelope sau; trường `meta.requestId` được thêm vào contract hiện có:

```json
{
  "success": true,
  "data": { "status": "ready" },
  "meta": { "requestId": "f8bda2c0-8664-4b8d-8b26-d0d8a56b933f" }
}
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "source": "body",
        "path": ["participantCount"],
        "code": "too_small",
        "message": "Value is below the allowed minimum"
      }
    ]
  },
  "meta": { "requestId": "f8bda2c0-8664-4b8d-8b26-d0d8a56b933f" }
}
```

Server luôn tạo UUID mới cho từng request và trả `X-Request-Id`; không dùng lại header ID do khách gửi. CORS cho frontend đọc header này. Lỗi và endpoint vận hành trả `Cache-Control: no-store`. Client xử lý theo `error.code`, dùng `details` gắn lỗi vào trường nhập và lưu request ID khi cần đối chiếu sự cố. Thông điệp hiện dùng tiếng Anh cố định; giao diện có thể dịch theo mã lỗi.

## Validation và cách thêm router

`src/shared/validation.js` dùng Zod 4, hỗ trợ schema `params`, `query`, `body`, kể cả refinement bất đồng bộ. Kết quả parse/transform được lưu ở `res.locals.validated`; controller chỉ dùng dữ liệu đã parse. Không ghi đè `req.query`, vì Express 5 cung cấp nó qua getter.

Ví dụ tích hợp **khi xây module danh sách**, chưa phải endpoint hiện có:

```js
import { Router } from 'express';
import { paginationSchema, validate } from './shared/validation.js';
import { sendSuccess } from './shared/http.js';

const apiRouter = Router();
apiRouter.get('/items', validate({ query: paginationSchema }), async (_req, res) => {
  const { page, pageSize } = res.locals.validated.query;
  const result = await itemService.list({ page, pageSize });
  return sendSuccess(res, result.items, { meta: { page, pageSize, total: result.total } });
});
// Truyền apiRouter cho createApp({ checkDatabase, apiRouter }); mount tại /api/v1.
```

- Dùng `z.strictObject(...)` cho request có danh sách trường cố định để từ chối trường ngoài contract. Kiểm tra cả object lồng nhau. Schema phân trang chỉ nhận chuỗi số nguyên dương ở query: `page` mặc định 1, tối đa 100000; `pageSize` mặc định 20, tối đa 100. Query trùng tên, số thập phân hoặc trường lạ bị từ chối.
- `databaseIdSchema` nhận ID dạng chuỗi số dương đến giới hạn MySQL `BIGINT UNSIGNED`. Không ép ID sang `Number`, vì có thể mất chính xác.
- `vndAmountSchema` nhận số nguyên VND không âm, tối đa 999999999999999, phù hợp `DECIMAL(15,0)`. Schema cụ thể vẫn phải giới hạn giá/số lượng theo nghiệp vụ. Tổng tiền chính thức luôn do backend tính.
- Middleware có schema `body` yêu cầu JSON hoặc `application/*+json`. JSON parser giới hạn 1 MiB. Upload ảnh dùng middleware raw riêng, tối đa 8 MiB; xem CONTENT.md.
- Lỗi schema trả tối đa 50 chi tiết; không trả input, danh sách khóa lạ hoặc thông điệp refinement có thể chứa dữ liệu nhập. `path` gồm tên trường/chỉ số phần tử. Quy tắc tùy chỉnh dùng thông điệp an toàn mặc định.
- Validation chỉ kiểm tra hình dạng và giá trị đầu vào. Ownership, trạng thái, thời hạn, giá, phiên bản và khả dụng phải được kiểm tra trong application service/transaction theo đặc tả. Không dùng schema để thay thế các kiểm tra đó.

## Mã lỗi và xử lý lỗi

`src/shared/errors.js` là nguồn mã lỗi, HTTP status và thông điệp công khai; OpenAPI lấy danh sách mã từ cùng nguồn.

| HTTP | Mã | Trường hợp |
| --- | --- | --- |
| 400 | `INVALID_JSON`, `INVALID_REQUEST` | JSON sai cú pháp, URL/request không hợp lệ |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` | Phiên/token không hợp lệ hoặc đăng nhập thất bại |
| 409 | `EMAIL_ALREADY_EXISTS` | Email đăng ký đã có tài khoản |
| 403 | `ACCOUNT_BLOCKED`, `FORBIDDEN`, `CORS_ORIGIN_DENIED`, `HOUSEHOLD_NOT_APPROVED` | Tài khoản bị khóa, không có quyền/origin/hộ không được nhận cam kết mới |
| 404 | `NOT_FOUND` | Không tìm thấy route hoặc đối tượng |
| 409 | `INVALID_STATE`, `HOLD_EXPIRED`, `STALE_VERSION` | Xung đột trạng thái/thời hạn/phiên bản |
| 409 | `AVAILABILITY_CONFLICT`, `IDEMPOTENCY_CONFLICT` | Hết khả dụng hoặc dùng lại khóa với payload khác |
| 413 | `PAYLOAD_TOO_LARGE` | Body vượt giới hạn |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Sai loại nội dung/encoding/charset |
| 422 | `VALIDATION_ERROR` | JSON đọc được nhưng sai schema |
| 429 | `RATE_LIMITED` | Vượt giới hạn xác thực hoặc máy đang đủ hai phép tính scrypt |
| 503 | `DATABASE_UNAVAILABLE` | Readiness không kiểm chứng được database |
| 500 | `INTERNAL_ERROR` | Lỗi chưa được xử lý hoặc lỗi lập trình |

Service ném `new AppError('STALE_VERSION')` hoặc mã được khai báo phù hợp. Dùng `cause` để giữ nguyên lỗi nội bộ khi cần, không trả nó ra client. Không lấy `error.message` từ MySQL hoặc request làm thông báo công khai. Lỗi bất kỳ có thuộc tính `status`/`code` không được tự động tin là lỗi nghiệp vụ; driver error ngoài dự kiến vẫn trả 500. Chỉ ánh xạ lỗi database thành xung đột ở nơi biết rõ constraint/use case liên quan.

Express 5 tự chuyển lỗi từ handler `async` vào error middleware; không cần wrapper riêng. `notFound` và `errorHandler` luôn ở cuối chuỗi, sau router module. Lỗi xảy ra khi response đã gửi một phần sẽ đóng kết nối; không cố ghi thêm envelope và không đưa raw error sang fallback logger của Express.

## Log

`src/shared/logger.js` dùng Pino, xuất một JSON mỗi dòng ra stdout cho local/Render. Startup, xác minh database và shutdown cùng dùng logger này. Công cụ CLI kiểm chứng TLS giữ báo cáo chẩn đoán riêng.

Mỗi HTTP request có một bản ghi khi hoàn tất hoặc ngắt kết nối: `time`, `level`, `service`, `environment`, `requestId`, `event`, `method`, `route`, `status`, `durationMs`, và `errorCode` nếu có. `route` chỉ là mẫu route cuối, ví dụ `/bookings/:id`; router lồng nhau không ghép các giá trị thực của `baseUrl`. Request không match route ghi `unmatched`. Lỗi 4xx ghi `warn`, 5xx ghi `error`, còn lại `info`; ngắt kết nối không có lỗi server ghi status nội bộ 499.

Module dùng `req.log` để thêm sự kiện với request ID sẵn có, hoặc import `logger` cho job. Chỉ ghi thông điệp cố định và ngữ cảnh được chọn rõ như mã đối tượng/hành động; thêm actor ID sau khi có xác thực. Không ghi payload, thông tin liên hệ, URL/query, token, SQL, certificate hay connection URI. Logger che các khóa nhạy cảm phổ biến ở cấp gốc và một cấp con; đây là lớp bảo vệ bổ sung, không phải bộ lọc dữ liệu tùy ý ở mọi độ sâu. Khi log lỗi dùng khóa `err`; serializer chỉ giữ loại lỗi và mã an toàn, bỏ message/stack/cause từ driver.

Log vận hành này không thay thế audit lịch sử nghiệp vụ trong database.

## Kiểm chứng

Chạy `npm test` và `npm run check --workspace backend` từ root. HTTP tests chạy server cổng ngẫu nhiên, không cần MySQL/Aiven. Suite kiểm tra parse/validation, lỗi async, CORS, giới hạn body, precision ID/VND, request ID, log che dữ liệu, partial response và Swagger. OpenAPI được kiểm tra bằng Swagger Parser; Ajv đối chiếu response thực tế với schema công khai. Khi thêm endpoint, bổ sung schema OpenAPI và test contract cùng thay đổi code.
