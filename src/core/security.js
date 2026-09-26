import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(password, salt, 64, { N: 16_384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, saltEncoded, hashEncoded] = String(stored).split('$');
    if (scheme !== 'scrypt' || !saltEncoded || !hashEncoded) return false;
    const expected = Buffer.from(hashEncoded, 'base64url');
    const actual = Buffer.from(await scryptAsync(password, Buffer.from(saltEncoded, 'base64url'), expected.length, { N: 16_384, r: 8, p: 1 }));
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function tokenDigest(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function sessionCookie(token, maxAgeSeconds, { secure = false } = {}) {
  const age = maxAgeSeconds === null || maxAgeSeconds === undefined ? '' : `; Max-Age=${Math.max(0, Math.floor(Number(maxAgeSeconds)))}`;
  return `germinal_session=${token}; Path=/; HttpOnly; SameSite=Lax${age}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie({ secure = false } = {}) {
  return `germinal_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
      const at = part.indexOf('=');
      return at < 0 ? [part, ''] : [part.slice(0, at), decodeURIComponent(part.slice(at + 1))];
    }),
  );
}
