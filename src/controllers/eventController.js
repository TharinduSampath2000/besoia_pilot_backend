import { pool } from '../config/db.js';

export async function logEvent(request, response) {
  if (!request.sessionId) return response.status(401).json({ error: 'Session required' });
  const eventType = String(request.body?.eventType || '').trim();
  if (!['qr_generated'].includes(eventType)) return response.status(400).json({ error: 'Unsupported event type' });
  await pool.query('INSERT INTO events (session_id, event_type, metadata) VALUES ($1, $2, $3)', [request.sessionId, eventType, JSON.stringify(request.body?.metadata || {})]);
  return response.status(201).json({ logged: true });
}

export async function exportEvents(_request, response) {
  const { rows } = await pool.query('SELECT id, session_id, event_type, metadata, created_at FROM events ORDER BY created_at ASC');
  const header = 'id,session_id,event_type,metadata,created_at';
  const lines = rows.map((row) => [row.id, row.session_id, row.event_type, JSON.stringify(row.metadata).replaceAll('"', '""'), row.created_at.toISOString()].map((value) => `"${value}"`).join(','));
  response.type('text/csv').send([header, ...lines].join('\n'));
}
