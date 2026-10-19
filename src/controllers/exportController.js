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

const RESEND_AFTER_MS = 60_000;
let lastSentAt = 0;

const escapeHtml = (text) => String(text).replace(/[<>&"]/g, (char) => `&#${char.charCodeAt(0)};`);

function page(response, { ok, message, stats }) {
  const appUrl = process.env.CLIENT_ORIGIN || '/';
  response.type('html').send(`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Besoia report</title>
<body style="font:16px/1.6 system-ui,sans-serif;margin:24px;max-width:480px">
<h1 style="font-size:22px">Besoia report</h1>
<p style="padding:12px 16px;border-radius:12px;background:${ok ? '#E7F6EC' : '#FEF3F2'};color:${ok ? '#14532D' : '#B42318'}">${escapeHtml(message)}</p>
${stats ? `<p>${statsText(stats).join('<br>')}</p>` : ''}
<a href="${escapeHtml(appUrl)}" style="display:inline-block;margin-top:8px;padding:12px 20px;border-radius:12px;background:#0F4C75;color:#fff;text-decoration:none;font-weight:600">Go to Besoia</a>
</body>`);
}

// opening /api/export emails every report in one message
export async function exportIndex(_request, response) {
  if (!mailConfigured()) return page(response.status(503), { ok: false, message: 'Email is not set up. Add the MAIL_* variables and REPORT_EMAIL.' });

  const [stats, users, matches, events] = await Promise.all([loadStats(), usersCsv(), matchesCsv(), eventsCsv()]);
  const waitSeconds = Math.ceil((lastSentAt + RESEND_AFTER_MS - Date.now()) / 1000);
  if (waitSeconds > 0) {
    return page(response, { ok: true, stats, message: `A report was already sent to ${process.env.REPORT_EMAIL} less than a minute ago. Reload in ${waitSeconds}s to send another.` });
  }

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
    return page(response.status(502), { ok: false, stats, message: `Couldn't send the report: ${error.message}` });
  }
  lastSentAt = Date.now();
  page(response, { ok: true, stats, message: `Report sent to ${process.env.REPORT_EMAIL}.` });
}
