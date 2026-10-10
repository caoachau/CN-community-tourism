# Nền API dùng chung

## Điểm truy cập và cấu hình

Sau khi cấu hình database/TLS và chạy `npm run dev:backend` từ root:

- Swagger UI: `http://localhost:5000/api/docs/`.
- OpenAPI 3.0.3: `http://localhost:5000/api/openapi.json`.
- Liveness: `GET /api/health`; readiness kiểm tra MySQL/TLS: `GET /api/ready`.

Swagger hiện mô tả hai endpoint vận hành đã triển khai. Chưa có API đăng nhập, booking hoặc phân quyền. Schema/mã lỗi dùng chung là nền cho các module tiếp theo. OpenAPI được khai báo trong `src/openapi.js`; UI dùng tài nguyên nội bộ và tắt validator bên ngoài.

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
| 401 | `UNAUTHENTICATED` | Chưa xác thực |
| 403 | `FORBIDDEN`, `CORS_ORIGIN_DENIED`, `HOUSEHOLD_NOT_APPROVED` | Không có quyền/origin/hộ không được nhận cam kết mới |
| 404 | `NOT_FOUND` | Không tìm thấy route hoặc đối tượng |
| 409 | `INVALID_STATE`, `HOLD_EXPIRED`, `STALE_VERSION` | Xung đột trạng thái/thời hạn/phiên bản |
| 409 | `AVAILABILITY_CONFLICT`, `IDEMPOTENCY_CONFLICT` | Hết khả dụng hoặc dùng lại khóa với payload khác |
| 413 | `PAYLOAD_TOO_LARGE` | Body vượt giới hạn |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Sai loại nội dung/encoding/charset |
| 422 | `VALIDATION_ERROR` | JSON đọc được nhưng sai schema |
| 429 | `RATE_LIMITED` | Dành cho middleware giới hạn sau này |
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
