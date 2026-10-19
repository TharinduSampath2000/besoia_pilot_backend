import { pool } from '../config/db.js';
import { questions } from '../config/questions.js';
import { toCsv } from '../utils/csv.js';
import { mailConfigured, sendMail } from '../utils/mailer.js';

async function usersCsv() {
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.created_at,
      COALESCE(json_object_agg(a.question_id, a.answer) FILTER (WHERE a.id IS NOT NULL), '{}') AS answers
     FROM sessions s LEFT JOIN answers a ON a.session_id = s.id
     GROUP BY s.id ORDER BY s.created_at ASC`
  );
  const header = ['id', 'name', ...questions.map((question) => `q${question.id}`), 'created_at'];
  return toCsv(header, rows.map((row) => [row.id, row.name, ...questions.map((question) => row.answers[question.id]), row.created_at]));
}

async function matchesCsv() {
  const { rows } = await pool.query(
    `SELECT m.id, m.session_a, a.name AS name_a, m.session_b, b.name AS name_b, m.score, m.shared_answers, m.icebreaker, m.created_at
     FROM matches m JOIN sessions a ON a.id = m.session_a JOIN sessions b ON b.id = m.session_b
     ORDER BY m.created_at ASC`
  );
  const header = ['id', 'session_a', 'name_a', 'session_b', 'name_b', 'score', 'shared_count', 'shared_answers', 'icebreaker', 'created_at'];
  return toCsv(header, rows.map((row) => [
    row.id, row.session_a, row.name_a, row.session_b, row.name_b, row.score,
    row.shared_answers.length, row.shared_answers.map((item) => `Q${item.questionId}: ${item.answer}`).join('; '),
    row.icebreaker, row.created_at
  ]));
}

async function eventsCsv() {
  const { rows } = await pool.query('SELECT id, session_id, event_type, metadata, created_at FROM events ORDER BY created_at ASC');
  return toCsv(['id', 'session_id', 'event_type', 'metadata', 'created_at'], rows.map((row) => [row.id, row.session_id, row.event_type, row.metadata, row.created_at]));
}

async function loadStats() {
  const { rows } = await pool.query(
    `SELECT
      (SELECT count(*) FROM sessions)::int AS users,
      (SELECT count(*) FROM (SELECT session_id FROM answers GROUP BY session_id HAVING count(*) = $1) done)::int AS completed,
      (SELECT count(*) FROM matches)::int AS matches,
      (SELECT round(avg(score))::int FROM matches) AS "averageScore"`,
    [questions.length]
  );
  return rows[0];
}

const statsText = (stats) => [
  `Users: ${stats.users}`,
  `Completed questions: ${stats.completed}`,
  `Matches: ${stats.matches}`,
  `Average score: ${stats.averageScore ?? '-'}%`
];

const csvHandler = (filename, build) => async (_request, response) => {
  response.attachment(filename).type('text/csv').send(await build());
};

export const exportUsers = csvHandler('users.csv', usersCsv);
export const exportMatches = csvHandler('matches.csv', matchesCsv);
export const exportEvents = csvHandler('events.csv', eventsCsv);

function page(response, body) {
  response.type('html').send(`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Besoia exports</title>
<body style="font:16px/1.6 system-ui,sans-serif;margin:24px">
<h1 style="font-size:22px">Besoia exports</h1>
${body}
</body>`);
}

const tokenQuery = (request) => (request.query.token ? `?token=${encodeURIComponent(request.query.token)}` : '');

export async function exportIndex(request, response) {
  const stats = await loadStats();
  const token = tokenQuery(request);
  const link = (file) => `<li><a href="/api/export/${file}${token}">${file}</a></li>`;
  const email = mailConfigured()
    ? `<form method="post" action="/api/export/email${token}"><button style="font:inherit;padding:10px 16px">Email report to ${process.env.REPORT_EMAIL}</button></form>`
    : '<p>Email not set up (MAIL_* and REPORT_EMAIL).</p>';
  page(response, `<p>${statsText(stats).join('<br>')}</p>
<ul>${['users.csv', 'matches.csv', 'events.csv'].map(link).join('')}</ul>
${email}`);
}

export async function emailReport(request, response) {
  const back = `<p><a href="/api/export${tokenQuery(request)}">Back</a></p>`;
  if (!mailConfigured()) return page(response.status(400), `<p>Email not set up.</p>${back}`);

  const [stats, users, matches, events] = await Promise.all([loadStats(), usersCsv(), matchesCsv(), eventsCsv()]);
  const date = new Date().toISOString().slice(0, 10);
  try {
    await sendMail({
      subject: `Besoia report ${date}`,
      text: `${statsText(stats).join('\n')}\n\nCSV files attached.`,
      attachments: [
        { filename: `users-${date}.csv`, content: users },
        { filename: `matches-${date}.csv`, content: matches },
        { filename: `events-${date}.csv`, content: events }
      ]
    });
  } catch (error) {
    console.error('Report email failed:', error.message);
    return page(response.status(502), `<p>Couldn't send the email: ${error.message.replace(/[<>&]/g, '')}</p>${back}`);
  }
  page(response, `<p>Report sent to ${process.env.REPORT_EMAIL}.</p>${back}`);
}
