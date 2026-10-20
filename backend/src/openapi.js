import { ERROR_DEFINITIONS } from './shared/errors.js';
import { authOpenApi } from './auth/openapi.js';
import { householdOpenApi } from './households/openapi.js';
import { catalogOpenApi } from './catalog/openapi.js';
import { servicesOpenApi } from './services/openapi.js';
import { roomsOpenApi } from './rooms/openapi.js';

const reference = (name) => ({ $ref: `#/components/schemas/${name}` });
const requestIdHeader = {
  description: 'Server-generated request ID for support and log correlation.',
  schema: { type: 'string', format: 'uuid' },
};
const jsonResponse = (description, schema) => ({
  description,
  headers: { 'X-Request-Id': requestIdHeader },
  content: { 'application/json': { schema } },
});
const successSchema = (data) => ({
  type: 'object',
  additionalProperties: false,
  required: ['success', 'data', 'meta'],
  properties: { success: { type: 'boolean', enum: [true] }, data, meta: reference('ResponseMeta') },
});

const auth = authOpenApi({ reference, jsonResponse, successSchema });
const households = householdOpenApi({ reference, jsonResponse, successSchema });
const catalog = catalogOpenApi({ reference, jsonResponse, successSchema });
const services = servicesOpenApi({ reference, jsonResponse, successSchema });
const rooms = roomsOpenApi({ reference, jsonResponse, successSchema });

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Community Tourism API',
    version: '0.1.0',
    description: 'API nền cho nền tảng du lịch cộng đồng: health/readiness, xác thực JWT và mở/xét duyệt hồ sơ hộ dân. '
      + 'Đăng ký tạo CUSTOMER; Admin duyệt hộ mới cấp HOUSEHOLD, kế thừa quyền CUSTOMER. API nghiệp vụ dùng /api/v1. '
      + 'Các mã lỗi dùng chung không có nghĩa những chức năng tương ứng đã được triển khai.',
  },
  servers: [{ url: '/', description: 'Same origin as the API, including Render' }],
  tags: [
    { name: 'System', description: 'Process and database readiness checks' },
    { name: 'Authentication', description: 'CUSTOMER signup; CUSTOMER, HOUSEHOLD and ADMIN sessions' },
    { name: 'Administration', description: 'Platform account administration; requires the current ADMIN role' },
    { name: 'Households', description: 'Own household onboarding and versioned profiles; CUSTOMER and HOUSEHOLD' },
    { name: 'Places', description: 'Household-owned service locations and versioned content' },
    { name: 'Services', description: 'Household services/experiences, moderated versions and selling offers' },
    { name: 'Rooms', description: 'Household lodging, nightly pricing and moderated content versions' },
    { name: 'Public catalog', description: 'Active categories and approved, available locations; no account required' },
  ],
  paths: {
    ...auth.paths,
    ...households.paths,
    ...catalog.paths,
    ...services.paths,
    ...rooms.paths,
    '/api/health': {
      get: {
        operationId: 'getHealth',
        tags: ['System'],
        summary: 'Kiểm tra tiến trình API',
        description: 'Không kiểm tra database. X-Request-Id luôn được server tạo mới.',
        responses: {
          200: jsonResponse('Process is alive', reference('HealthResponse')),
          default: { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/api/ready': {
      get: {
        operationId: 'getReadiness',
        tags: ['System'],
        summary: 'Kiểm tra kết nối MySQL và TLS',
        description: 'Kiểm tra database bằng truy vấn chỉ đọc; không chạy migration hoặc seed. '
          + 'Trả Cache-Control: no-store.',
        responses: {
          200: jsonResponse('Database and TLS are ready', reference('ReadinessResponse')),
          503: {
            ...jsonResponse('Database is unavailable or not configured', reference('ErrorResponse')),
            content: {
              'application/json': {
                schema: reference('ErrorResponse'),
                example: {
                  success: false,
                  error: { code: 'DATABASE_UNAVAILABLE', message: ERROR_DEFINITIONS.DATABASE_UNAVAILABLE.message },
                  meta: { requestId: 'f8bda2c0-8664-4b8d-8b26-d0d8a56b933f' },
                },
              },
            },
          },
          default: { $ref: '#/components/responses/ApiError' },
        },
      },
    },
  },
  components: {
    securitySchemes: { BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      ...auth.schemas,
      ...households.schemas,
      ...catalog.schemas,
      ...services.schemas,
      ...rooms.schemas,
      ResponseMeta: {
        type: 'object',
        required: ['requestId'],
        properties: { requestId: { type: 'string', format: 'uuid' } },
        additionalProperties: true,
      },
      ErrorCode: {
        type: 'string',
        enum: Object.keys(ERROR_DEFINITIONS),
        description: Object.entries(ERROR_DEFINITIONS)
          .map(([code, { status, message }]) => `${code} (${status}): ${message}`).join('\n\n'),
      },
      ValidationIssue: {
        type: 'object',
        additionalProperties: false,
        required: ['source', 'path', 'code', 'message'],
        properties: {
          source: { type: 'string', enum: ['body', 'params', 'query'] },
          path: { type: 'array', items: { oneOf: [{ type: 'string' }, { type: 'integer' }] } },
          code: { type: 'string' },
          message: { type: 'string' },
        },
      },
      ErrorResponse: {
        type: 'object',
        additionalProperties: false,
        required: ['success', 'error', 'meta'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: {
            type: 'object',
            additionalProperties: false,
            required: ['code', 'message'],
            properties: {
              code: reference('ErrorCode'),
              message: { type: 'string' },
              details: { type: 'array', maxItems: 50, items: reference('ValidationIssue') },
            },
          },
          meta: reference('ResponseMeta'),
        },
      },
      HealthResponse: successSchema({
        type: 'object',
        additionalProperties: false,
        required: ['status', 'service', 'timestamp'],
        properties: {
          status: { type: 'string', enum: ['ok'] },
          service: { type: 'string', enum: ['community-tourism-api'] },
          timestamp: { type: 'string', format: 'date-time' },
        },
      }),
      ReadinessResponse: successSchema({
        type: 'object',
        additionalProperties: false,
        required: ['status'],
        properties: { status: { type: 'string', enum: ['ready'] } },
      }),
      DatabaseId: {
        type: 'string',
        minLength: 1,
        maxLength: 20,
        pattern: '^[1-9][0-9]*$',
        description: 'MySQL BIGINT UNSIGNED ID, maximum 18446744073709551615; transmitted as a string.',
        example: '9007199254740993',
      },
      VndAmount: {
        type: 'integer',
        minimum: 0,
        maximum: 999_999_999_999_999,
        description: 'Exact whole VND, matching DECIMAL(15,0).',
        example: 150_000,
      },
    },
    responses: {
      ApiError: jsonResponse('Standard error; details are only included for validation failures.', reference('ErrorResponse')),
    },
  },
};
