import { AppError } from '../shared/errors.js';
import { publicUser } from './service.js';
import { assertCurrentUser, assertRoles, isActiveAccount, isBlockedAccount } from './policies.js';

// All commands share user IDs in numeric order -> caller session -> household
// -> managed object -> content revision. Recheck live authority after locking.
export async function lockCurrentActor(tx, auth, allowed, additionalIds = []) {
  assertCurrentUser(auth);
  const ids = [...new Set([auth.user.id, ...additionalIds])].sort((a,b) => BigInt(a) < BigInt(b) ? -1 : 1);
  const users = new Map();
  for (const id of ids) users.set(id, await tx.findUserById(id, true));
  const actor = users.get(auth.user.id);
  if (isBlockedAccount(actor)) throw new AppError('ACCOUNT_BLOCKED');
  if (!isActiveAccount(actor)) throw new AppError('UNAUTHENTICATED');
  assertRoles({ user: publicUser(actor), sessionId: auth.sessionId }, allowed);
  const session = await tx.findSession(auth.sessionId, actor.id, true);
  if (Number(session?.is_live) !== 1) throw new AppError('UNAUTHENTICATED');
  return { actor, users };
}
