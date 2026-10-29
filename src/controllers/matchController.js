import { randomUUID } from 'node:crypto';
import { pool } from '../config/db.js';
import { icebreakers } from '../config/icebreakers.js';
import { questions } from '../config/questions.js';
import { calculateCompatibility, describeIcebreaker, describeSharedAnswers, findSharedAnswers } from '../utils/scoringEngine.js';
import { createQrToken, verifyQrToken } from '../utils/qrToken.js';

const RECENT_MATCH_LIMIT = 20;

const describeMatch = (match) => ({ ...match, icebreaker: describeIcebreaker(match.icebreaker), sharedAnswers: describeSharedAnswers(match.sharedAnswers) });

async function loadAnswers(sessionId) {
  const { rows } = await pool.query('SELECT question_id, answer FROM answers WHERE session_id = $1', [sessionId]);
  return Object.fromEntries(rows.map((row) => [String(row.question_id), row.answer]));
}

export function getQrToken(request, response) {
  if (!request.sessionId) return response.status(401).json({ error: 'Register before showing your code', code: 'register_first' });
  return response.json(createQrToken(request.sessionId));
}

export async function createMatch(request, response) {
  if (!request.sessionId) return response.status(401).json({ error: 'Register before scanning a code', code: 'register_first' });
  const { sessionId: scannedSessionId, error } = verifyQrToken(request.body?.code);
  if (error === 'expired') return response.status(400).json({ error: 'That code has expired', code: 'code_expired' });
  if (error) return response.status(400).json({ error: 'Not a Besoia QR code', code: 'code_invalid' });
  if (scannedSessionId === request.sessionId) return response.status(400).json({ error: 'That is your own code', code: 'own_code' });

  const [firstAnswers, secondAnswers] = await Promise.all([loadAnswers(scannedSessionId), loadAnswers(request.sessionId)]);
  if (Object.keys(secondAnswers).length !== questions.length) return response.status(400).json({ error: 'Complete your questions before scanning', code: 'finish_questions' });
  if (Object.keys(firstAnswers).length !== questions.length) return response.status(400).json({ error: 'Partner has not finished their questions', code: 'partner_not_finished' });

  const score = calculateCompatibility(firstAnswers, secondAnswers);
  const sharedAnswers = findSharedAnswers(firstAnswers, secondAnswers);
  const icebreaker = icebreakers[Math.floor(Math.random() * icebreakers.length)].id;
  const { rows } = await pool.query(
    `WITH created AS (
      INSERT INTO matches (id, session_a, session_b, score, icebreaker, shared_answers)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id AS "matchId", score, icebreaker, shared_answers, session_a, session_b, created_at
    )
    SELECT created."matchId", created.score, created.icebreaker, created.shared_answers AS "sharedAnswers", created.created_at AS "createdAt",
      json_build_object('id', friend.id, 'name', friend.name) AS friend
    FROM created
    JOIN sessions friend ON friend.id = created.session_a`,
    [randomUUID(), scannedSessionId, request.sessionId, score, icebreaker, JSON.stringify(sharedAnswers)]
  );
  await pool.query('INSERT INTO events (session_id, event_type, metadata) VALUES ($1, $2, $3), ($4, $5, $6)', [request.sessionId, 'qr_scanned', JSON.stringify({ scannedSessionId }), scannedSessionId, 'match_created', JSON.stringify({ score })]);
  return response.status(201).json({ match: describeMatch(rows[0]) });
}

export async function getRecentMatches(request, response) {
  if (!request.sessionId) return response.json({ matches: [] });
  const { rows } = await pool.query(
    `SELECT m.id AS "matchId", m.score, m.icebreaker, m.shared_answers AS "sharedAnswers", m.created_at AS "createdAt",
      json_build_object('id', friend.id, 'name', friend.name) AS friend
     FROM matches m
     JOIN sessions friend ON friend.id = CASE WHEN m.session_a = $1 THEN m.session_b ELSE m.session_a END
     WHERE m.session_a = $1 OR m.session_b = $1
     ORDER BY m.created_at DESC LIMIT $2`,
    [request.sessionId, RECENT_MATCH_LIMIT]
  );
  return response.json({ matches: rows.map(describeMatch) });
}
