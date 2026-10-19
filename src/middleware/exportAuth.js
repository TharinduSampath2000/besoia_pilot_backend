import { timingSafeEqual } from 'node:crypto';

function matches(supplied, expected) {
  const a = Buffer.from(String(supplied || ''));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// password is EXPORT_TOKEN, either as ?token= or via the browser's basic auth prompt
function basicAuthPassword(request) {
  const [scheme, encoded] = String(request.headers.authorization || '').split(' ');
  if (scheme !== 'Basic' || !encoded) return null;
  const decoded = Buffer.from(encoded, 'base64').toString();
  return decoded.slice(decoded.indexOf(':') + 1);
}

export function requireExportToken(request, response, next) {
  const expected = process.env.EXPORT_TOKEN;
  if (!expected) {
    if (process.env.NODE_ENV === 'production') return response.status(403).json({ error: 'Exports are disabled: set EXPORT_TOKEN' });
    return next();
  }
  if (matches(request.query.token, expected) || matches(basicAuthPassword(request), expected)) return next();
  response.set('WWW-Authenticate', 'Basic realm="Besoia exports", charset="UTF-8"');
  return response.status(401).json({ error: 'Invalid export token' });
}
