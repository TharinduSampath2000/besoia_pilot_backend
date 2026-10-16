import { pool } from '../config/db.js';
import { questions } from '../config/questions.js';
import { sendCsv } from '../utils/csv.js';

export async function exportUsers(_request, response) {
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.created_at,
      COALESCE(json_object_agg(a.question_id, a.answer) FILTER (WHERE a.id IS NOT NULL), '{}') AS answers
     FROM sessions s LEFT JOIN answers a ON a.session_id = s.id
     GROUP BY s.id ORDER BY s.created_at ASC`
  );
  const header = ['id', 'name', ...questions.map((question) => `q${question.id}`), 'created_at'];
  sendCsv(response, 'users.csv', header, rows.map((row) => [row.id, row.name, ...questions.map((question) => row.answers[question.id]), row.created_at]));
}

export async function exportMatches(_request, response) {
  const { rows } = await pool.query(
    `SELECT m.id, m.session_a, a.name AS name_a, m.session_b, b.name AS name_b, m.score, m.shared_answers, m.icebreaker, m.created_at
     FROM matches m JOIN sessions a ON a.id = m.session_a JOIN sessions b ON b.id = m.session_b
     ORDER BY m.created_at ASC`
  );
  const header = ['id', 'session_a', 'name_a', 'session_b', 'name_b', 'score', 'shared_count', 'shared_answers', 'icebreaker', 'created_at'];
  sendCsv(response, 'matches.csv', header, rows.map((row) => [
    row.id, row.session_a, row.name_a, row.session_b, row.name_b, row.score,
    row.shared_answers.length, row.shared_answers.map((item) => `Q${item.questionId}: ${item.answer}`).join('; '),
    row.icebreaker, row.created_at
  ]));
}

export async function exportEvents(_request, response) {
  const { rows } = await pool.query('SELECT id, session_id, event_type, metadata, created_at FROM events ORDER BY created_at ASC');
  sendCsv(response, 'events.csv', ['id', 'session_id', 'event_type', 'metadata', 'created_at'], rows.map((row) => [row.id, row.session_id, row.event_type, row.metadata, row.created_at]));
}
