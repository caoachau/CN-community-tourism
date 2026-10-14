export function authOpenApi({ reference, jsonResponse, successSchema }) {
  const request = (name) => ({ required: true, content: { 'application/json': { schema: reference(name) } } });
  const operation = (operationId, summary, responseName, { body, secured = false, status = 200, errors = [] } = {}) => ({
    operationId, tags: ['Authentication'], summary,
    security: secured ? [{ BearerAuth: [] }] : [],
    ...(body ? { requestBody: request(body) } : {}),
    responses: {
      [status]: jsonResponse('Success; Cache-Control: no-store', reference(responseName)),
      ...Object.fromEntries(errors.map((code) => [code, { $ref: '#/components/responses/ApiError' }])),
      default: { $ref: '#/components/responses/ApiError' },
    },
  });
  const email = { type: 'string', format: 'email', maxLength: 254, description: 'Trimmed and lowercased before lookup/storage.' };
  const phone = { type: 'string', minLength: 8, maxLength: 32, pattern: '^\\+?[0-9 ()-]+$' };
  return {
    paths: {
      '/api/v1/auth/register': { post: operation('registerCustomer', 'Create a CUSTOMER account and session', 'AuthResponse', {
        body: 'RegisterRequest', status: 201, errors: [409, 415, 422, 429],
      }) },
      '/api/v1/auth/login': { post: operation('login', 'Sign in as CUSTOMER, HOUSEHOLD or ADMIN', 'AuthResponse', {
        body: 'LoginRequest', errors: [401, 415, 422, 429],
      }) },
      '/api/v1/auth/refresh': { post: {
        ...operation('refreshSession', 'Rotate an opaque refresh token and issue a new access JWT', 'AuthResponse', {
          body: 'RefreshRequest', errors: [401, 415, 422, 429],
        }),
        description: 'Single-use refresh token. Atomic rotation preserves the original seven-day session expiry. '
          + 'Clients must serialize refresh calls and replace both tokens after success.',
      } },
      '/api/v1/auth/me': { get: operation('getCurrentUser', 'Read the current active account and live role', 'CurrentUserResponse', { secured: true, errors: [401] }) },
      '/api/v1/auth/logout': { post: {
        ...operation('logout', 'Revoke the current session, including its access JWTs', 'LogoutResponse', { secured: true, errors: [401] }),
        description: 'Other devices stay signed in. A revoked or expired session returns 401 on subsequent calls.',
      } },
    },
    schemas: {
      RegisterRequest: {
        type: 'object', additionalProperties: false, required: ['email', 'password', 'displayName'],
        description: 'Public signup always creates CUSTOMER. role, status and household IDs are not accepted.',
        properties: {
          email, password: { type: 'string', format: 'password', minLength: 15, maxLength: 128, description: 'Not trimmed or normalized; spaces and Unicode are allowed.' },
          displayName: { type: 'string', minLength: 1, maxLength: 150 }, phone,
        },
      },
      LoginRequest: {
        type: 'object', additionalProperties: false, required: ['email', 'password'],
        properties: { email, password: { type: 'string', format: 'password', minLength: 1, maxLength: 128 } },
      },
      RefreshRequest: {
        type: 'object', additionalProperties: false, required: ['refreshToken'],
        properties: { refreshToken: { type: 'string', minLength: 43, maxLength: 43, pattern: '^[\\w-]{43}$' } },
      },
      AuthUser: {
        type: 'object', additionalProperties: false,
        required: ['id', 'email', 'phone', 'displayName', 'role', 'status'],
        properties: {
          id: reference('DatabaseId'), email, phone: { ...phone, nullable: true },
          displayName: { type: 'string', minLength: 1, maxLength: 150 },
          role: { type: 'string', enum: ['CUSTOMER', 'HOUSEHOLD', 'ADMIN'] }, status: { type: 'string', enum: ['ACTIVE'] },
        },
      },
      AuthResponse: successSchema({
        type: 'object', additionalProperties: false,
        required: ['user', 'accessToken', 'tokenType', 'expiresIn', 'refreshToken', 'refreshExpiresAt'],
        properties: {
          user: reference('AuthUser'), accessToken: { type: 'string', description: 'HS256 JWT; send as Authorization: Bearer <accessToken>.' },
          tokenType: { type: 'string', enum: ['Bearer'] }, expiresIn: { type: 'integer', minimum: 1, maximum: 900 },
          refreshToken: { type: 'string', minLength: 43, maxLength: 43, description: 'Opaque random token; only its SHA-256 hash is stored.' },
          refreshExpiresAt: { type: 'string', format: 'date-time' },
        },
      }),
      CurrentUserResponse: successSchema({
        type: 'object', additionalProperties: false, required: ['user'], properties: { user: reference('AuthUser') },
      }),
      LogoutResponse: successSchema({
        type: 'object', additionalProperties: false, required: ['loggedOut'], properties: { loggedOut: { type: 'boolean', enum: [true] } },
      }),
    },
  };
}
