import { randomUUID } from 'node:crypto';
import { pool } from '../config/db.js';
import { questions } from '../config/questions.js';
import { clearSession, ensureSession } from '../middleware/session.js';

export async function register(request, response) {
  const name = String(request.body?.name || '').trim();
  if (!name) return response.status(400).json({ error: 'Name is required' });
  if (name.length > 80) return response.status(400).json({ error: 'Name must be 80 characters or fewer' });

  const sessionId = ensureSession(response, request.sessionId || randomUUID());
  await pool.query(
    'INSERT INTO sessions (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name',
    [sessionId, name]
  );
  await pool.query(
    'INSERT INTO events (session_id, event_type, metadata) VALUES ($1, $2, $3)',
    [sessionId, 'registration', JSON.stringify({ name })]
  );
  return response.status(201).json({ sessionId, name });
}

export async function getSession(request, response) {
  if (!request.sessionId) return response.json({ session: null });
  const { rows } = await pool.query(
    `SELECT s.id AS "sessionId", s.name, COUNT(a.id)::int AS "answerCount"
     FROM sessions s LEFT JOIN answers a ON a.session_id = s.id
     WHERE s.id = $1 GROUP BY s.id`,
    [request.sessionId]
  );
  if (!rows[0]) return response.json({ session: null });
  const { answerCount, ...session } = rows[0];
  return response.json({ session: { ...session, quizComplete: answerCount === questions.length } });
}

export function endSession(_request, response) {
  clearSession(response);
  return response.status(204).end();
}
