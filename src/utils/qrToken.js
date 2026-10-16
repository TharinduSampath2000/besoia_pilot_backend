import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { UUID_PATTERN } from '../middleware/session.js';

// token format: B1.<sessionId>.<expiry>.<signature>
export const REFRESH_SECONDS = 30;
const TTL_SECONDS = 60;
const PREFIX = 'B1';

if (!process.env.QR_SECRET && process.env.NODE_ENV === 'production') throw new Error('QR_SECRET must be set in production');
const secret = process.env.QR_SECRET || randomBytes(32).toString('hex');

function sign(payload) {
  return createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 22);
}

export function createQrToken(sessionId) {
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${PREFIX}.${sessionId}.${expiresAt.toString(36)}`;
  return { token: `${payload}.${sign(payload)}`, refreshIn: REFRESH_SECONDS };
}

export function verifyQrToken(token) {
  const parts = String(token || '').trim().split('.');
  if (parts.length !== 4 || parts[0] !== PREFIX || !UUID_PATTERN.test(parts[1])) return { error: 'invalid' };
  const [prefix, sessionId, expiry, signature] = parts;
  const expected = Buffer.from(sign(`${prefix}.${sessionId}.${expiry}`));
  const supplied = Buffer.from(signature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return { error: 'invalid' };
  if (parseInt(expiry, 36) < Date.now() / 1000) return { error: 'expired' };
  return { sessionId: sessionId.toLowerCase() };
}
