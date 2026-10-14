import { timingSafeEqual } from 'node:crypto';
import { AppError } from '../shared/errors.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { createTokenCodec, newRefreshToken, hashRefreshToken } from './tokens.js';
import { assertCurrentUser, assertRoles, assertHouseholdOwner, isBlockedAccount, isActiveAccount } from './policies.js';
import { ownershipRule } from './ownership.js';
import { databaseIdSchema } from '../shared/validation.js';
import { accountStatusSchema } from './schemas.js';

export const publicUser = (user) => ({
  id: String(user.id), email: user.email, phone: user.phone, displayName: user.display_name,
  role: user.role, status: user.status,
});
const activeUser = isActiveAccount;

export function createAuthService({ repository, options, now = () => new Date(), passwords = { hash: hashPassword, verify: verifyPassword } }) {
  const tokens = createTokenCodec(options, now);
  async function credentials(user, session, refreshToken) {
    return { user: publicUser(user), ...await tokens.sign(user, session), refreshToken, refreshExpiresAt: session.expires_at.toISOString() };
  }
  async function startSession(tx, user) {
    const refreshToken = newRefreshToken();
    const expiresAt = new Date(now().getTime() + options.refreshTtlSeconds * 1000);
    const session = await tx.createSession(user.id, hashRefreshToken(refreshToken), expiresAt);
    return credentials(user, session, refreshToken);
  }
  return {
    async register(input) {
      const passwordHash = await passwords.hash(input.password);
      return repository.transaction(async (tx) => {
        // Never take role/status/household from public input, including direct service calls.
        const user = await tx.createUser({ email: input.email, phone: input.phone, displayName: input.displayName, passwordHash, role: 'CUSTOMER' });
        return startSession(tx, user);
      });
    },
    async login(input) {
      const candidate = await repository.read((tx) => tx.findUserByEmail(input.email));
      const matches = await passwords.verify(input.password, candidate?.password_hash);
      if (!matches || !activeUser(candidate)) throw new AppError('INVALID_CREDENTIALS');
      return repository.transaction(async (tx) => {
        const user = await tx.findUserById(candidate.id, true);
        if (!activeUser(user) || user.password_hash !== candidate.password_hash) throw new AppError('INVALID_CREDENTIALS');
        return startSession(tx, user);
      });
    },
    async refresh(refreshToken) {
      const oldHash = hashRefreshToken(refreshToken);
      const candidate = await repository.read((tx) => tx.findSessionByHash(oldHash));
      if (!candidate) throw new AppError('UNAUTHENTICATED');
      return repository.transaction(async (tx) => {
        // One lock order for login, refresh and logout: user -> session.
        const user = await tx.findUserById(candidate.user_id, true);
        const session = await tx.findSession(candidate.id, candidate.user_id, true);
        if (!activeUser(user) || Number(session?.is_live) !== 1 || !timingSafeEqual(oldHash, session.token_hash)) throw new AppError('UNAUTHENTICATED');
        const nextToken = newRefreshToken();
        await tx.rotateSession(session.id, hashRefreshToken(nextToken));
        // Rotation keeps the original session deadline; it does not extend it.
        return credentials(user, session, nextToken);
      });
    },
    async authenticate(accessToken) {
      const claims = await tokens.verify(accessToken);
      const user = await repository.read((tx) => tx.findAuthentication(claims.sid, claims.sub));
      if (isBlockedAccount(user)) throw new AppError('ACCOUNT_BLOCKED');
      if (!activeUser(user) || Number(user.session_live) !== 1) throw new AppError('UNAUTHENTICATED');
      // Live DB role wins over a stale JWT claim, including demotion/revocation.
      return { user: publicUser(user), sessionId: claims.sid };
    },
    async logout(auth) {
      await repository.transaction(async (tx) => {
        await tx.findUserById(auth.user.id, true);
        await tx.revokeSession(auth.sessionId, auth.user.id);
      });
    },
    async ownedHousehold(auth, id, { requireApproved = false } = {}) {
      assertRoles(auth, ['HOUSEHOLD']);
      if (!databaseIdSchema.safeParse(id).success) throw new AppError('FORBIDDEN');
      const household = await repository.read((tx) => tx.findHousehold(id));
      return assertHouseholdOwner(auth, household, { requireApproved });
    },
    async authorizeResource(auth, type, id, { as = 'household', requireApproved = false } = {}) {
      ownershipRule(type, as);
      assertCurrentUser(auth);
      if (requireApproved && as !== 'household') throw new TypeError('Approval applies only to household access');
      if (!databaseIdSchema.safeParse(id).success) throw new AppError('FORBIDDEN');
      if (as !== 'user') assertRoles(auth, [as === 'household' ? 'HOUSEHOLD' : 'CUSTOMER']);
      return repository.read(async (tx) => {
        const resource = await tx.findOwnership(type, id);
        if (!resource) throw new AppError('FORBIDDEN');
        if (as === 'household') {
          const household = resource.household_id ? await tx.findHousehold(String(resource.household_id)) : null;
          assertHouseholdOwner(auth, household, { requireApproved });
          return { resource, household };
        }
        const ownerId = as === 'customer' ? resource.customer_user_id : resource.user_id;
        if (ownerId === null || ownerId === undefined || String(ownerId) !== auth.user.id) throw new AppError('FORBIDDEN');
        return { resource };
      });
    },
    async setAccountStatus(auth, targetId, input, correlationId) {
      assertRoles(auth, ['ADMIN']);
      if (!databaseIdSchema.safeParse(targetId).success || !accountStatusSchema.safeParse(input).success ||
          typeof correlationId !== 'string' || !correlationId || correlationId.length > 100) throw new AppError('INVALID_REQUEST');
      if (targetId === auth.user.id && input.status === 'BLOCKED') throw new AppError('FORBIDDEN');
      return repository.transaction(async (tx) => {
        // Multiple user rows lock by numeric ID, then the caller's session.
        // Concurrent admins blocking each other cannot deadlock or disable both.
        const locked = new Map();
        const ids = [...new Set([auth.user.id, targetId])].sort((a, b) => BigInt(a) < BigInt(b) ? -1 : 1);
        for (const id of ids) locked.set(id, await tx.findUserById(id, true));
        const actor = locked.get(auth.user.id);
        if (isBlockedAccount(actor)) throw new AppError('ACCOUNT_BLOCKED');
        if (!activeUser(actor)) throw new AppError('UNAUTHENTICATED');
        if (actor.role !== 'ADMIN') throw new AppError('FORBIDDEN');
        const session = await tx.findSession(auth.sessionId, actor.id, true);
        if (Number(session?.is_live) !== 1) throw new AppError('UNAUTHENTICATED');
        const target = locked.get(targetId);
        if (!target) throw new AppError('NOT_FOUND');
        const changed = target.status !== input.status || Boolean(target.disabled_at) !== (input.status === 'BLOCKED');
        if (changed) await tx.setUserStatus(targetId, input.status);
        // Repeated BLOCKED is safe and also removes any manually added sessions.
        const revokedSessionCount = changed || input.status === 'BLOCKED' ? await tx.revokeUserSessions(targetId) : 0;
        const updated = await tx.findUserById(targetId);
        if (changed || revokedSessionCount > 0) await tx.recordAccountStatus(actor.id, target, updated, input.reason.trim(), correlationId, revokedSessionCount);
        return {
          user: { id: String(updated.id), role: updated.role, status: updated.status, disabledAt: updated.disabled_at?.toISOString() ?? null },
          changed, revokedSessionCount,
        };
      });
    },
  };
}
