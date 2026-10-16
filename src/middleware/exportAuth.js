import { timingSafeEqual } from 'node:crypto';

export function requireExportToken(request, response, next) {
  const expected = process.env.EXPORT_TOKEN;
  if (!expected) {
    if (process.env.NODE_ENV === 'production') return response.status(403).json({ error: 'Exports are disabled: set EXPORT_TOKEN' });
    return next();
  }
  const supplied = Buffer.from(String(request.query.token || ''));
  const wanted = Buffer.from(expected);
  if (supplied.length !== wanted.length || !timingSafeEqual(supplied, wanted)) return response.status(401).json({ error: 'Invalid export token' });
  return next();
}
