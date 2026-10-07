import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { pool } from './config/db.js';
import { sessionMiddleware } from './middleware/session.js';
import userRoutes from './routes/userRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import eventRoutes from './routes/eventRoutes.js';

export const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);
app.use('/api', userRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/events', eventRoutes);

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ ok: true, database: 'connected' });
  } catch {
    response.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'Not found' });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Unexpected server error' });
});
