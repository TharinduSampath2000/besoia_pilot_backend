import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { pool } from './db.js';
import { icebreakers } from './icebreakers.js';
import { questions } from './questions.js';

const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');

// answers, shared answers and icebreakers used to be stored as English text, now as ids
async function convertEnglishText() {
  for (const question of questions) {
    for (const option of question.options) {
      await pool.query('UPDATE answers SET answer = $1 WHERE question_id = $2 AND answer = $3', [option.id, question.id, option.en]);
    }
  }
  for (const icebreaker of icebreakers) {
    await pool.query('UPDATE matches SET icebreaker = $1 WHERE icebreaker = $2', [icebreaker.id, icebreaker.en]);
  }
  const { rows } = await pool.query(`SELECT id, shared_answers FROM matches WHERE shared_answers::text LIKE '%"answer"%'`);
  for (const row of rows) {
    const shared = row.shared_answers.map(({ questionId, answer }) => ({
      questionId,
      optionId: questions.find((question) => question.id === questionId)?.options.find((option) => option.en === answer)?.id ?? answer
    }));
    await pool.query('UPDATE matches SET shared_answers = $1 WHERE id = $2', [JSON.stringify(shared), row.id]);
  }
}

try {
  await pool.query(schema);
  await convertEnglishText();
  console.log('Database schema applied.');
} finally {
  await pool.end();
}
