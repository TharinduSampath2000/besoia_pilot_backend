import { timingSafeEqual } from 'node:crypto';
import ExcelJS from 'exceljs';
import { pool } from '../config/db.js';
import { findOption, questions } from '../config/questions.js';
import { describeIcebreaker } from '../utils/scoringEngine.js';

const MAX_FAILURES = 10;
const LOCK_MS = 15 * 60_000;
const failures = new Map();

function passcodeMatches(supplied) {
  const expected = Buffer.from(process.env.REPORTS_PASSCODE);
  const given = Buffer.from(String(supplied || ''));
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function usersSheet() {
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.created_at,
      COALESCE(json_object_agg(a.question_id, a.answer) FILTER (WHERE a.id IS NOT NULL), '{}') AS answers
     FROM sessions s LEFT JOIN answers a ON a.session_id = s.id
     GROUP BY s.id ORDER BY s.created_at ASC`
  );
  return {
    name: 'Users',
    header: ['ID', 'Name', ...questions.map((question) => `Q${question.id}`), 'Created at'],
    rows: rows.map((row) => [row.id, row.name, ...questions.map((question) => findOption(question.id, row.answers[question.id])?.en ?? row.answers[question.id] ?? ''), row.created_at])
  };
}

async function matchesSheet() {
  const { rows } = await pool.query(
    `SELECT m.id, m.session_a, a.name AS name_a, m.session_b, b.name AS name_b, m.score, m.shared_answers, m.icebreaker, m.created_at
     FROM matches m JOIN sessions a ON a.id = m.session_a JOIN sessions b ON b.id = m.session_b
     ORDER BY m.created_at ASC`
  );
  return {
    name: 'Matches',
    header: ['ID', 'User A ID', 'User A', 'User B ID', 'User B', 'Score %', 'Shared count', 'Shared answers', 'Icebreaker', 'Created at'],
    rows: rows.map((row) => [
      row.id, row.session_a, row.name_a, row.session_b, row.name_b, row.score,
      row.shared_answers.length, row.shared_answers.map((item) => `Q${item.questionId}: ${findOption(item.questionId, item.optionId)?.en ?? item.optionId}`).join('; '),
      describeIcebreaker(row.icebreaker).en, row.created_at
    ])
  };
}

async function eventsSheet() {
  const { rows } = await pool.query('SELECT id, session_id, event_type, metadata, created_at FROM events ORDER BY created_at ASC');
  return {
    name: 'Events',
    header: ['ID', 'User ID', 'Event', 'Details', 'Created at'],
    rows: rows.map((row) => [Number(row.id), row.session_id ?? '', row.event_type, JSON.stringify(row.metadata), row.created_at])
  };
}

export async function downloadReport(request, response) {
  if (!process.env.REPORTS_PASSCODE) {
    if (process.env.NODE_ENV === 'production') return response.status(503).json({ error: 'Reports are disabled: set REPORTS_PASSCODE', code: 'reports_disabled' });
  } else {
    const key = String(request.headers['x-forwarded-for'] || request.ip).split(',')[0].trim();
    const entry = failures.get(key);
    if (entry && entry.count >= MAX_FAILURES && Date.now() - entry.since < LOCK_MS) return response.status(429).json({ error: 'Too many wrong passcodes. Try again in 15 minutes.', code: 'passcode_locked' });
    if (!passcodeMatches(request.body?.passcode)) {
      failures.set(key, entry && Date.now() - entry.since < LOCK_MS ? { ...entry, count: entry.count + 1 } : { count: 1, since: Date.now() });
      return response.status(401).json({ error: 'Wrong passcode', code: 'passcode_wrong' });
    }
    failures.delete(key);
  }

  const workbook = new ExcelJS.Workbook();
  for (const sheet of await Promise.all([usersSheet(), matchesSheet(), eventsSheet()])) {
    const worksheet = workbook.addWorksheet(sheet.name);
    worksheet.addRow(sheet.header).font = { bold: true };
    worksheet.addRows(sheet.rows);
    worksheet.columns.forEach((column, index) => { column.width = Math.min(40, Math.max(12, sheet.header[index].length + 4)); });
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  }
  const date = new Date().toISOString().slice(0, 10);
  response.attachment(`besoia-report-${date}.xlsx`).type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  response.send(Buffer.from(await workbook.xlsx.writeBuffer()));
}
