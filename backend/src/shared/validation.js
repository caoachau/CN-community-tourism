import { z } from 'zod';
import { AppError } from './errors.js';

const issueMessages = Object.freeze({
  invalid_type: 'Invalid value type',
  too_small: 'Value is below the allowed minimum',
  too_big: 'Value exceeds the allowed maximum',
  invalid_format: 'Invalid value format',
  invalid_value: 'Value is not one of the allowed options',
  unrecognized_keys: 'Unexpected fields are not allowed',
  invalid_union: 'Value does not match an allowed format',
  custom: 'Value does not meet the required rules',
});

export function validate(schemas) {
  const entries = Object.entries(schemas);
  if (!entries.length || entries.some(([source, schema]) =>
    !['params', 'query', 'body'].includes(source) || typeof schema?.safeParseAsync !== 'function')) {
    throw new TypeError('Validation requires body, query or params schemas');
  }

  return async (request, response, next) => {
    if (schemas.body && !request.is(['application/json', 'application/*+json'])) {
      throw new AppError('UNSUPPORTED_MEDIA_TYPE');
    }
    const validated = {};
    const details = [];
    for (const [source, schema] of entries) {
      const result = await schema.safeParseAsync(request[source]);
      if (result.success) validated[source] = result.data;
      else for (const issue of result.error.issues) {
        if (details.length >= 50) break;
        details.push({
          source,
          path: issue.path.map((part) => typeof part === 'number' ? part : String(part)),
          code: issue.code,
          // Do not echo input, unknown keys, or custom messages containing input.
          message: issueMessages[issue.code] ?? 'Invalid value',
        });
      }
    }
    if (details.length) throw new AppError('VALIDATION_ERROR', { details });
    // Express 5 request.query is a getter. Keep raw input separate from parsed data.
    response.locals.validated = { ...response.locals.validated, ...validated };
    next();
  };
}

// BIGINT UNSIGNED IDs stay strings across MySQL, JSON and JavaScript.
export const databaseIdSchema = z.string().min(1).max(20).regex(/^[1-9][0-9]*$/)
  .refine((value) => /^[1-9][0-9]{0,19}$/.test(value) && BigInt(value) <= 18_446_744_073_709_551_615n);

// DECIMAL(15,0), exact integers in VND; no implicit coercion from arbitrary input.
export const vndAmountSchema = z.number().int().min(0).max(999_999_999_999_999);

const pageNumber = (max, fallback) => z.string().max(6).regex(/^[1-9][0-9]*$/)
  .refine((value) => Number(value) <= max).transform(Number).default(fallback);

export const paginationSchema = z.strictObject({
  page: pageNumber(100_000, 1),
  pageSize: pageNumber(100, 20),
});
