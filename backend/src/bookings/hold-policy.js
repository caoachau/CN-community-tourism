export const HOLD_POLICY_VERSION = 'HOUSEHOLD_24H_2H_30M_V1';
export function holdWindow(now, firstUse, {firstHeldAt = now, previousDeadline, oldFirstUse} = {}) {
  const deadlines = [+new Date(firstHeldAt) + 86400000, +new Date(firstUse) - 7200000];
  if (previousDeadline) deadlines.push(+new Date(previousDeadline));
  if (oldFirstUse) deadlines.push(+new Date(oldFirstUse) - 7200000);
  const end = Math.min(...deadlines);
  if (!Number.isFinite(end) || !Number.isFinite(+new Date(now))) throw new TypeError('Invalid hold window');
  const canHold = end - +new Date(now) >= 1800000;
  return {canHold, holdExpiresAt: new Date(end).toISOString(), holdPolicyVersion: HOLD_POLICY_VERSION,
    holdUnavailableReason: canHold ? null : 'HOLD_WINDOW_TOO_SHORT', serverNow: new Date(now).toISOString()};
}
