// Public messages are fixed here. Never construct an API message from SQL or input.
export const ERROR_DEFINITIONS = Object.freeze(Object.fromEntries(Object.entries({
  INVALID_JSON: [400, 'Request body must contain valid JSON'],
  INVALID_REQUEST: [400, 'Invalid request'],
  VALIDATION_ERROR: [422, 'Request validation failed'],
  UNAUTHENTICATED: [401, 'Authentication is required'],
  ACCOUNT_BLOCKED: [403, 'This account is blocked or disabled'],
  INVALID_CREDENTIALS: [401, 'Email or password is incorrect'],
  EMAIL_ALREADY_EXISTS: [409, 'An account with this email already exists'],
  FORBIDDEN: [403, 'You do not have permission to perform this action'],
  CORS_ORIGIN_DENIED: [403, 'Origin is not allowed'],
  HOUSEHOLD_NOT_APPROVED: [403, 'Household is not approved to accept new commitments'],
  HOUSEHOLD_ALREADY_EXISTS: [409, 'This account already owns a household profile'],
  HOUSEHOLD_PROFILE_INCOMPLETE: [422, 'Complete the household name, description, address, locality and contact phone before submitting'],
  CATEGORY_ALREADY_EXISTS: [409, 'A category with this kind and code already exists'],
  PLACE_PROFILE_INCOMPLETE: [422, 'Complete the place name, description, address and locality before submitting'],
  SERVICE_PROFILE_INCOMPLETE: [422, 'Complete the service name and description before submitting'],
  INVALID_SERVICE_CATEGORY: [422, 'Select an active SERVICE category'],
  SERVICE_PLACE_NOT_READY: [409, 'Select an available, visible and approved place owned by this household'],
  SERVICE_OFFER_INVALID: [422, 'Provide at least one complete active service offer with a clear scope of service'],
  SERVICE_OFFER_LIMIT: [409, 'A service can have at most 32 active offers'],
  OFFER_CONFIGURATION_LOCKED: [409, 'This offer structure is already submitted or referenced; create a replacement offer'],
  ROOM_PROFILE_INCOMPLETE: [422, 'Complete the room name, description and lodging configuration before submitting'],
  ROOM_PLACE_NOT_READY: [409, 'Select an available, visible and approved place owned by this household'],
  ROOM_CONFIGURATION_LOCKED: [409, 'Room location, capacity and check-in/out times cannot change while active commitments remain'],
  NOT_FOUND: [404, 'Route or resource not found'],
  INVALID_STATE: [409, 'Action is not allowed in the current state'],
  HOLD_EXPIRED: [409, 'The reservation hold has expired'],
  HOLD_LIMIT: [429, 'At most five unexpired booking holds are allowed per customer'],
  QUOTE_CHANGED: [409, 'Prices or terms have changed; request and accept a new quote'],
  FINANCIAL_CONFLICT: [409, 'The entry conflicts with receipts, refund obligations or previous reversals'],
  REVIEW_ALREADY_EXISTS: [409, 'This booking already has a review'],
  STALE_VERSION: [409, 'The version is no longer current'],
  AVAILABILITY_CONFLICT: [409, 'The requested availability is no longer available'],
  SLOT_NOT_READY: [409, 'Open slots require published service offers, an available place and confirmed readiness'],
  CALENDAR_COMMITMENT_CONFLICT: [409, 'This change conflicts with active reservations or resource allocations'],
  RESOURCE_CODE_EXISTS: [409, 'A resource with this code already exists in this household'],
  IDEMPOTENCY_CONFLICT: [409, 'The idempotency key was used with different input'],
  PAYLOAD_TOO_LARGE: [413, 'Request body exceeds the size limit'],
  INVALID_IMAGE: [422, 'Select a valid, single-frame JPEG, PNG or WebP image up to 25 megapixels'],
  IMAGE_LIMIT: [409, 'A profile revision can have at most 12 images'],
  MEDIA_STORAGE_UNAVAILABLE: [503, 'Image storage is temporarily unavailable'],
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
