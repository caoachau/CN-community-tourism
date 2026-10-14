import { AppError } from '../shared/errors.js';
import { databaseIdSchema } from '../shared/validation.js';
import { roles } from './tokens.js';

export function authenticate(service) {
  return async (request, response, next) => {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || header.length > 4096 || !/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/i.test(header)) {
      throw new AppError('UNAUTHENTICATED');
    }
    response.locals.auth = await service.authenticate(header.slice(7));
    next();
  };
}

export function requireRoles(...allowed) {
  if (!allowed.length || allowed.some((role) => !roles.includes(role))) throw new TypeError('Unknown authorization role');
  return (_request, response, next) => {
    const auth = response.locals.auth;
    if (!auth) throw new AppError('UNAUTHENTICATED');
    const effectiveRoles = auth.user.role === 'HOUSEHOLD' ? ['HOUSEHOLD', 'CUSTOMER'] : [auth.user.role];
    if (!allowed.some((role) => effectiveRoles.includes(role))) throw new AppError('FORBIDDEN');
    next();
  };
}

// Resolve the household from the loaded resource for nested objects. Never accept
// an ownership ID from the request body as proof of ownership.
export function requireHouseholdOwner(service, resolveId = (request) => request.params.householdId, options) {
  return async (request, response, next) => {
    if (!response.locals.auth) throw new AppError('UNAUTHENTICATED');
    const id = await resolveId(request, response);
    if (!databaseIdSchema.safeParse(id).success) throw new AppError('FORBIDDEN');
    response.locals.household = await service.ownedHousehold(response.locals.auth, id, options);
    next();
  };
}
