import { timingSafeEqual } from 'node:crypto';
import { AppError } from '../shared/errors.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { createTokenCodec, newRefreshToken, hashRefreshToken, roles } from './tokens.js';

export const publicUser = (user) => ({
  id: String(user.id), email: user.email, phone: user.phone, displayName: user.display_name,
  role: user.role, status: user.status,
});
const activeUser = (user) => user && user.status === 'ACTIVE' && !user.disabled_at && roles.includes(user.role);

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
      if (!activeUser(user)) throw new AppError('UNAUTHENTICATED');
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
      if (auth.user.role !== 'HOUSEHOLD') throw new AppError('FORBIDDEN');
      const household = await repository.read((tx) => tx.findHousehold(id));
      if (!household || String(household.owner_user_id) !== auth.user.id) throw new AppError('FORBIDDEN');
      if (requireApproved && (household.approval_status !== 'APPROVED' || household.archived_at)) throw new AppError('HOUSEHOLD_NOT_APPROVED');
      return household;
    },
  };
}
