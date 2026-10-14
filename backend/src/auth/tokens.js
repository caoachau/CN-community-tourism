import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { databaseIdSchema } from '../shared/validation.js';
import { AppError } from '../shared/errors.js';

export const roles = Object.freeze(['CUSTOMER', 'HOUSEHOLD', 'ADMIN']);
export const newRefreshToken = () => randomBytes(32).toString('base64url');
export const hashRefreshToken = (token) => createHash('sha256').update(token).digest();

export function createTokenCodec(options, now = () => new Date()) {
  const secret = new TextEncoder().encode(options.secret);
  return {
    async sign(user, session) {
      const issuedAt = Math.floor(now().getTime() / 1000);
      const expiresAt = Math.min(issuedAt + options.accessTtlSeconds, Math.floor(session.expires_at.getTime() / 1000));
      if (expiresAt <= issuedAt) throw new AppError('UNAUTHENTICATED');
      const accessToken = await new SignJWT({ role: user.role, sid: String(session.id) })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(String(user.id)).setIssuer(options.issuer).setAudience(options.audience)
        .setJti(randomUUID()).setIssuedAt(issuedAt).setExpirationTime(expiresAt).sign(secret);
      return { accessToken, tokenType: 'Bearer', expiresIn: expiresAt - issuedAt };
    },
    async verify(token) {
      try {
        const { payload, protectedHeader } = await jwtVerify(token, secret, {
          algorithms: ['HS256'], issuer: options.issuer, audience: options.audience,
          requiredClaims: ['sub', 'sid', 'role', 'jti', 'iat', 'exp'], currentDate: now(),
          maxTokenAge: options.accessTtlSeconds,
        });
        if (protectedHeader.typ !== 'JWT' || !databaseIdSchema.safeParse(payload.sub).success ||
            !databaseIdSchema.safeParse(payload.sid).success || !roles.includes(payload.role) ||
            typeof payload.jti !== 'string' || !payload.jti ||
            !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) ||
            payload.exp <= payload.iat || payload.exp - payload.iat > options.accessTtlSeconds) throw new Error();
        return payload;
      } catch { throw new AppError('UNAUTHENTICATED'); }
    },
  };
}
