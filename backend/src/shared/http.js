import { AppError, normalizeError } from './errors.js';

export function sendSuccess(response, data, { status = 200, meta = {} } = {}) {
  return response.status(status).json({
    success: true,
    data,
    meta: { ...meta, requestId: response.locals.requestId },
  });
}

export function notFound(_request, _response, next) {
  next(new AppError('NOT_FOUND'));
}

// This must remain last in the middleware chain, including after module routers.
export function errorHandler(error, _request, response, _next) {
  const normalized = normalizeError(error);
  response.locals.errorCode = normalized.code;
  response.locals.errorStatus = normalized.status;
  if (response.headersSent) {
    // A partial response cannot be replaced with JSON. Close it without passing
    // the raw error to Express's fallback, which would print its stack/message.
    response.destroy();
    return;
  }

  response.set('Cache-Control', 'no-store');
  return response.status(normalized.status).json({
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
    },
    meta: { requestId: response.locals.requestId },
  });
}
