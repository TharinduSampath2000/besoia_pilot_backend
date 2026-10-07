import { randomUUID } from 'node:crypto';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COOKIE_NAME = 'besoia_session';
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
});

export function sessionMiddleware(request, response, next) {
  const cookie = request.cookies[COOKIE_NAME];
  request.sessionId = UUID_PATTERN.test(cookie || '') ? cookie : null;
  next();
}

export function ensureSession(response, sessionId = randomUUID()) {
  response.cookie(COOKIE_NAME, sessionId, { ...cookieOptions(), maxAge: 1000 * 60 * 60 * 24 });
  return sessionId;
}

export function clearSession(response) {
  response.clearCookie(COOKIE_NAME, cookieOptions());
}
