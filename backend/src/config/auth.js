export class AuthConfigError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function authOptions(env = process.env) {
  const secret = env.JWT_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32 || Buffer.byteLength(secret) > 1024 ||
      /^(?:change|replace|example|your[-_ ]|secret)/i.test(secret) || /\s/.test(secret)) {
    throw new AuthConfigError('INVALID_JWT_SECRET');
  }
  const issuer = env.JWT_ISSUER ?? 'community-tourism-api';
  const audience = env.JWT_AUDIENCE ?? 'community-tourism-clients';
  if (![issuer, audience].every((value) => typeof value === 'string' && value.length >= 1 &&
      value.length <= 200 && value.trim() === value)) throw new AuthConfigError('INVALID_JWT_IDENTITY');
  const trustProxy = Number(env.TRUST_PROXY_HOPS ?? '0');
  if (!Number.isInteger(trustProxy) || trustProxy < 0 || trustProxy > 2) throw new AuthConfigError('INVALID_TRUST_PROXY_HOPS');
  return Object.freeze({ secret, issuer, audience, accessTtlSeconds: 900, refreshTtlSeconds: 604800, trustProxy });
}
