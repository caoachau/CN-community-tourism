import { AppError } from '../shared/errors.js';
import { databaseIdSchema } from '../shared/validation.js';
import { roles } from './tokens.js';
import { assertCurrentUser, assertRoles } from './policies.js';
import { ownershipRule } from './ownership.js';

export function authenticate(service) {
  return async (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    const header = request.headers.authorization;
    const copies = request.rawHeaders?.filter((value, index) => index % 2 === 0 && value.toLowerCase() === 'authorization').length;
    if (copies > 1 || typeof header !== 'string' || header.length > 4096 || !/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/i.test(header)) {
      throw new AppError('UNAUTHENTICATED');
    }
    const auth = await service.authenticate(header.slice(7));
    assertCurrentUser(auth);
    response.locals.auth = auth;
    next();
  };
}

export function requireRoles(...allowed) {
  if (!allowed.length || allowed.some((role) => !roles.includes(role))) throw new TypeError('Unknown authorization role');
  return (_request, response, next) => {
    assertRoles(response.locals.auth, allowed);
    next();
  };
}

// Resolve the household from the loaded resource for nested objects. Never accept
// an ownership ID from the request body as proof of ownership.
export function requireHouseholdOwner(service, resolveId = (request) => request.params.householdId, options) {
  return async (request, response, next) => {
    assertCurrentUser(response.locals.auth);
    const id = await resolveId(request, response);
    if (!databaseIdSchema.safeParse(id).success) throw new AppError('FORBIDDEN');
    response.locals.household = await service.ownedHousehold(response.locals.auth, id, options);
    next();
  };
}

export function requireOwnership(service, {
  resourceType, as = 'household', resolveId = (request) => request.params.id, requireApproved = false,
}) {
  ownershipRule(resourceType, as);
  if (requireApproved && as !== 'household') throw new TypeError('Approval applies only to household access');
  return async (request, response, next) => {
    assertCurrentUser(response.locals.auth);
    const id = await resolveId(request, response);
    if (!databaseIdSchema.safeParse(id).success) throw new AppError('FORBIDDEN');
    response.locals.ownership = await service.authorizeResource(response.locals.auth, resourceType, id, { as, requireApproved });
    next();
  };
}
