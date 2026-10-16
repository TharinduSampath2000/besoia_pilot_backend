import { pool } from '../config/db.js';

export async function logEvent(request, response) {
  if (!request.sessionId) return response.status(401).json({ error: 'Session required' });
  const eventType = String(request.body?.eventType || '').trim();
  if (!['qr_generated'].includes(eventType)) return response.status(400).json({ error: 'Unsupported event type' });
  await pool.query('INSERT INTO events (session_id, event_type, metadata) VALUES ($1, $2, $3)', [request.sessionId, eventType, JSON.stringify(request.body?.metadata || {})]);
  return response.status(201).json({ logged: true });
}

