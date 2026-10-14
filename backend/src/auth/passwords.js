import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { AppError } from '../shared/errors.js';

const derive = promisify(scrypt);
const parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const prefix = 'scrypt$v1$32768$8$3';
const dummy = `${prefix}$${Buffer.alloc(16).toString('base64url')}$${Buffer.alloc(64).toString('base64url')}`;
let active = 0;

async function key(password, salt) {
  // Bound memory/CPU on the Free instance rather than queueing unbounded KDFs.
  if (active >= 2) throw new AppError('RATE_LIMITED');
  active++;
  try { return await derive(password, salt, 64, parameters); }
  finally { active--; }
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await key(password, salt);
  return `${prefix}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  const valid = typeof encoded === 'string' && /^scrypt\$v1\$32768\$8\$3\$[\w-]{22}\$[\w-]{86}$/.test(encoded);
  const parts = (valid ? encoded : dummy).split('$');
  const derived = await key(password, Buffer.from(parts[5], 'base64url'));
  const matches = timingSafeEqual(derived, Buffer.from(parts[6], 'base64url'));
  return valid && matches;
}
