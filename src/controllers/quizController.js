import { pool } from '../config/db.js';
import { questions } from '../config/questions.js';

export function listQuestions(_request, response) {
  return response.json(questions);
}

export async function saveAnswers(request, response) {
  const answers = request.body?.answers;
  if (!request.sessionId) return response.status(401).json({ error: 'Register before submitting answers' });
  if (!answers || typeof answers !== 'object') return response.status(400).json({ error: 'Answers are required' });

  const questionIds = questions.map((question) => String(question.id));
  const suppliedIds = Object.keys(answers);
  const complete = questionIds.every((id) => suppliedIds.includes(id) && String(answers[id]).trim());
  if (!complete) return response.status(400).json({ error: 'All 7 questions must be answered' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const questionId of questionIds) {
      await client.query(
        'INSERT INTO answers (session_id, question_id, answer) VALUES ($1, $2, $3) ON CONFLICT (session_id, question_id) DO UPDATE SET answer = EXCLUDED.answer',
        [request.sessionId, questionId, String(answers[questionId]).trim()]
      );
    }
    await client.query(
      'INSERT INTO events (session_id, event_type, metadata) VALUES ($1, $2, $3)',
      [request.sessionId, 'questionnaire_completed', JSON.stringify({ questionCount: 7 })]
    );
    await client.query('COMMIT');
    return response.status(201).json({ saved: 7 });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
