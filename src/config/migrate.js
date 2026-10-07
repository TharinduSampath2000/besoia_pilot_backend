import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { pool } from './db.js';

const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');

try {
  await pool.query(schema);
  console.log('Database schema applied.');
} finally {
  await pool.end();
}
