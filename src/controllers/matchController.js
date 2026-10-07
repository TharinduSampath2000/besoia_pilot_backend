import { randomUUID } from 'node:crypto';
import { pool } from '../config/db.js';
import { icebreakers } from '../config/icebreakers.js';
import { questions } from '../config/questions.js';
import { UUID_PATTERN } from '../middleware/session.js';
import { calculateCompatibility, findSharedAnswers } from '../utils/scoringEngine.js';

async function loadAnswers(sessionId) {
  const { rows } = await pool.query('SELECT question_id, answer FROM answers WHERE session_id = $1', [sessionId]);
  return Object.fromEntries(rows.map((row) => [String(row.question_id), row.answer]));
}

export async function createMatch(request, response) {
  const scannedSessionId = String(request.body?.sessionId || '').trim();
  if (!request.sessionId) return response.status(401).json({ error: 'Register before scanning a code' });
  if (!UUID_PATTERN.test(scannedSessionId)) return response.status(400).json({ error: "That doesn't look like a Besoia QR code. Ask your partner to open their code and try again." });
  if (scannedSessionId === request.sessionId) return response.status(400).json({ error: "That's your own code. Scan your partner's code instead." });

  const [firstAnswers, secondAnswers] = await Promise.all([loadAnswers(scannedSessionId), loadAnswers(request.sessionId)]);
  if (Object.keys(secondAnswers).length !== questions.length) return response.status(400).json({ error: 'Complete your questions before scanning' });
  if (Object.keys(firstAnswers).length !== questions.length) return response.status(400).json({ error: "Your partner hasn't finished their questions yet" });

  const score = calculateCompatibility(firstAnswers, secondAnswers);
  const icebreaker = icebreakers[Math.floor(Math.random() * icebreakers.length)];
  const { rows } = await pool.query(
    `WITH created AS (
      INSERT INTO matches (id, session_a, session_b, score, icebreaker)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id AS "matchId", score, icebreaker, session_a, session_b, created_at
    )
    SELECT created."matchId", created.score, created.icebreaker, created.created_at AS "createdAt",
      json_build_object('id', friend.id, 'name', friend.name) AS friend
    FROM created
    JOIN sessions friend ON friend.id = created.session_a`,
    [randomUUID(), scannedSessionId, request.sessionId, score, icebreaker]
  );
  await pool.query('INSERT INTO events (session_id, event_type, metadata) VALUES ($1, $2, $3), ($4, $5, $6)', [request.sessionId, 'qr_scanned', JSON.stringify({ scannedSessionId }), scannedSessionId, 'match_created', JSON.stringify({ score })]);
  return response.status(201).json({ match: { ...rows[0], sharedAnswers: findSharedAnswers(firstAnswers, secondAnswers) } });
}

export async function getPendingMatch(request, response) {
  if (!request.sessionId) return response.json({ match: null });
  const { rows } = await pool.query(
    `SELECT m.id AS "matchId", m.score, m.icebreaker, m.created_at AS "createdAt", m.session_a, m.session_b,
      json_build_object('id', friend.id, 'name', friend.name) AS friend
     FROM matches m
     JOIN sessions friend ON friend.id = CASE WHEN m.session_a = $1 THEN m.session_b ELSE m.session_a END
     WHERE m.session_a = $1 OR m.session_b = $1
     ORDER BY m.created_at DESC LIMIT 1`,
    [request.sessionId]
  );
  if (!rows[0]) return response.json({ match: null });

  const { session_a: sessionA, session_b: sessionB, ...match } = rows[0];
  const [firstAnswers, secondAnswers] = await Promise.all([loadAnswers(sessionA), loadAnswers(sessionB)]);
  return response.json({ match: { ...match, sharedAnswers: findSharedAnswers(firstAnswers, secondAnswers) } });
}
