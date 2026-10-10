import { randomUUID } from 'node:crypto';

export function requestContext(logger) {
  return (request, response, next) => {
    // Always generate on the server; do not trust a client-supplied log identity.
    const requestId = randomUUID();
    const started = process.hrtime.bigint();
    request.id = requestId;
    request.log = logger.child({ requestId });
    response.locals.requestId = requestId;
    response.set('X-Request-Id', requestId);
    let logged = false;

    function logCompletion() {
      if (logged) return;
      logged = true;
      const aborted = !response.writableFinished;
      const status = aborted ? (response.locals.errorStatus ?? 499) : response.statusCode;
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      request.log[level]({
        event: aborted ? 'http_request_aborted' : 'http_request',
        method: request.method,
        // Only the route pattern: URLs, query strings and path values are private.
        route: typeof request.route?.path === 'string' ? request.route.path : 'unmatched',
        status,
        durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e6 * 100) / 100,
        ...(response.locals.errorCode ? { errorCode: response.locals.errorCode } : {}),
      }, 'HTTP request finished');
    }

    response.once('finish', logCompletion);
    response.once('close', logCompletion);
    next();
  };
}
