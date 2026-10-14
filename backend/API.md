# Nền API dùng chung

## Điểm truy cập và cấu hình

Sau khi cấu hình database/TLS và chạy `npm run dev:backend` từ root:

- Swagger UI: `http://localhost:5000/api/docs/`.
- OpenAPI 3.0.3: `http://localhost:5000/api/openapi.json`.
- Liveness: `GET /api/health`; readiness kiểm tra MySQL/TLS: `GET /api/ready`.

Swagger mô tả health/readiness, năm API xác thực dưới `/api/v1/auth` và API ADMIN khóa/mở khóa tài khoản. Booking và luồng mở hộ dân sẽ bổ sung ở module riêng. OpenAPI được khai báo trong `src/openapi.js` và `src/auth/openapi.js`; UI dùng tài nguyên nội bộ và tắt validator bên ngoài.

## Đăng ký, đăng nhập và phiên JWT

| API | Dữ liệu gửi | Kết quả |
| --- | --- | --- |
| `POST /api/v1/auth/register` | `email`, `password`, `displayName`, `phone` tùy chọn | 201; tài khoản CUSTOMER và cặp token |
| `POST /api/v1/auth/login` | `email`, `password` | 200; hỗ trợ CUSTOMER, HOUSEHOLD, ADMIN |
| `POST /api/v1/auth/refresh` | `refreshToken` | 200; thay refresh token và cấp access JWT mới |
| `GET /api/v1/auth/me` | Header `Authorization: Bearer <accessToken>` | Tài khoản và vai trò hiện tại |
| `POST /api/v1/auth/logout` | Cùng header Bearer | Thu hồi phiên hiện tại; thiết bị khác giữ phiên riêng |

Đăng ký công khai luôn tạo CUSTOMER, không tạo hộ dân và không nhận trường `role`/`status`. Mở hộ dân và chuyển quyền là bước riêng, không thuộc task xác thực này. Email được trim và chuyển chữ thường; mật khẩu giữ nguyên, dài 15–128 ký tự khi đăng ký, không bắt buộc quy tắc viết hoa/ký tự đặc biệt. Đăng nhập nhận mật khẩu 1–128 ký tự để không chặn tài khoản cũ. Tên hiển thị tối đa 150 ký tự; ID MySQL luôn là chuỗi.

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
| `household` | HOUSEHOLD và đúng `households.owner_user_id` | `household`, `room`, `service`, `product`, `article`, `offer`, `resource`, `availabilityBlock`, `serviceSlot`, `slotOffer`, `resourceAssignment`, `resourceRule`, `resourceUsage`, `financialEntry`, `booking`, `scheduleRequest`, `proposal`, `reservationSet`, `bookingItem`, `contentRevision`, `revisionMedia`, `productInquiry` |
| `customer` | CUSTOMER hoặc HOUSEHOLD và đúng khách sở hữu | `booking`, `scheduleRequest`, `proposal`, `reservationSet`, `bookingItem`, `productInquiry`, `review`, `complaint` |
| `user` | Đúng user sở hữu, cho cả ba role | `notification` |

Hạng mục được truy ngược qua tập giữ chỗ tới booking/phương án; phiên bản nội dung và ảnh được truy về nội dung gốc. Người tạo, người đăng ảnh, số điện thoại và ID hộ tự khai không thay thế chủ sở hữu. Booking ngoài app có `customer_user_id=NULL` không cấp quyền khách cho người nhập đơn. Bài văn hóa chung không có hộ không được quản lý bằng guard hộ. ADMIN không được tự vượt ownership để xác nhận booking hoặc ghi tiền; route kiểm duyệt riêng dùng quyền ADMIN theo đúng nghiệp vụ. Đối tượng không tồn tại và không thuộc quyền cùng trả `FORBIDDEN` ở guard ownership.

Các guard này là nền để các module phòng/dịch vụ/booking tích hợp khi triển khai API; chưa có endpoint nghiệp vụ cho các module đó. Khi tải dữ liệu sau guard phải giữ điều kiện chủ sở hữu trong truy vấn. Các thao tác ghi phải kiểm tra lại tài khoản, phiên, role, household và đối tượng dưới khóa trong chính transaction, tránh dùng kết quả middleware cũ để ghi dữ liệu. Đây cũng là nguyên tắc kiểm tra từng request và từng quan hệ sở hữu trong [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

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
- Middleware có schema `body` yêu cầu JSON hoặc `application/*+json`. JSON parser giới hạn 1 MiB. Upload sau này cần middleware riêng.
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
