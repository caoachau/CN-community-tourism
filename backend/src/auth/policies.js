import { AppError } from '../shared/errors.js';
import { databaseIdSchema } from '../shared/validation.js';
import { roles } from './tokens.js';

export const isBlockedAccount = (user) => Boolean(user && (user.status === 'BLOCKED' || user.disabled_at));
export const isActiveAccount = (user) => Boolean(user && user.status === 'ACTIVE' && !user.disabled_at && roles.includes(user.role));

export function assertCurrentUser(auth) {
  if (!auth?.user || !databaseIdSchema.safeParse(auth.user.id).success ||
      !databaseIdSchema.safeParse(auth.sessionId).success) throw new AppError('UNAUTHENTICATED');
  if (isBlockedAccount(auth.user)) throw new AppError('ACCOUNT_BLOCKED');
  if (!isActiveAccount(auth.user)) throw new AppError('UNAUTHENTICATED');
  return auth.user;
}

export function hasRole(role, allowed) {
  return roles.includes(role) && (allowed.includes(role) || (role === 'HOUSEHOLD' && allowed.includes('CUSTOMER')));
}

export function assertRoles(auth, allowed) {
  const user = assertCurrentUser(auth);
  if (!hasRole(user.role, allowed)) throw new AppError('FORBIDDEN');
  return user;
}

export function assertHouseholdOwner(auth, household, { requireApproved = false } = {}) {
  const user = assertRoles(auth, ['HOUSEHOLD']);
  if (!household || String(household.owner_user_id) !== user.id) throw new AppError('FORBIDDEN');
  if (requireApproved && (household.approval_status !== 'APPROVED' || household.archived_at)) {
    throw new AppError('HOUSEHOLD_NOT_APPROVED');
  }
  return household;
}
