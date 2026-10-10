// Public messages are fixed here. Never construct an API message from SQL or input.
export const ERROR_DEFINITIONS = Object.freeze(Object.fromEntries(Object.entries({
  INVALID_JSON: [400, 'Request body must contain valid JSON'],
  INVALID_REQUEST: [400, 'Invalid request'],
  VALIDATION_ERROR: [422, 'Request validation failed'],
  UNAUTHENTICATED: [401, 'Authentication is required'],
  FORBIDDEN: [403, 'You do not have permission to perform this action'],
  CORS_ORIGIN_DENIED: [403, 'Origin is not allowed'],
  HOUSEHOLD_NOT_APPROVED: [403, 'Household is not approved to accept new commitments'],
  NOT_FOUND: [404, 'Route or resource not found'],
  INVALID_STATE: [409, 'Action is not allowed in the current state'],
  HOLD_EXPIRED: [409, 'The reservation hold has expired'],
  STALE_VERSION: [409, 'The version is no longer current'],
  AVAILABILITY_CONFLICT: [409, 'The requested availability is no longer available'],
  IDEMPOTENCY_CONFLICT: [409, 'The idempotency key was used with different input'],
  PAYLOAD_TOO_LARGE: [413, 'Request body exceeds the size limit'],
  UNSUPPORTED_MEDIA_TYPE: [415, 'Request media type or encoding is not supported'],
  RATE_LIMITED: [429, 'Too many requests'],
  DATABASE_UNAVAILABLE: [503, 'Service is not ready'],
  INTERNAL_ERROR: [500, 'Internal server error'],
}).map(([code, [status, message]]) => [code, Object.freeze({ status, message })])));

export class AppError extends Error {
  constructor(code, { details, cause } = {}) {
    const definition = ERROR_DEFINITIONS[code];
    if (!Object.hasOwn(ERROR_DEFINITIONS, code)) throw new TypeError('Unknown application error code');
    super(definition.message, { cause });
    this.name = 'AppError';
    this.code = code;
    // Details are only for sanitized schema issues, never arbitrary driver errors.
    if (code === 'VALIDATION_ERROR') this.details = details;
  }
}

const parserErrors = Object.freeze({
  'entity.parse.failed': 'INVALID_JSON',
  'entity.too.large': 'PAYLOAD_TOO_LARGE',
  'encoding.unsupported': 'UNSUPPORTED_MEDIA_TYPE',
  'charset.unsupported': 'UNSUPPORTED_MEDIA_TYPE',
  'request.aborted': 'INVALID_REQUEST',
  'request.size.invalid': 'INVALID_REQUEST',
});

export function normalizeError(error) {
  let code = 'INTERNAL_ERROR';
  if (error instanceof AppError && Object.hasOwn(ERROR_DEFINITIONS, error.code)) code = error.code;
  else if (Object.hasOwn(parserErrors, error?.type)) code = parserErrors[error.type];
  else if (error instanceof URIError) code = 'INVALID_REQUEST';

  const definition = ERROR_DEFINITIONS[code];
  return {
    status: definition.status,
    code,
    message: definition.message,
    ...(code === 'VALIDATION_ERROR' && error.details ? { details: error.details } : {}),
  };
}
