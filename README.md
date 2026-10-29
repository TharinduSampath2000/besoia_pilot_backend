# besoia_pilot_backend

Express + Postgres API for the Besoia pilot. Frontend: [besoia_pilot_frontend](https://github.com/TharinduSampath2000/besoia_pilot_frontend).

## Setup

Needs Node 20+ and Postgres.

```bash
sudo -u postgres psql -c "CREATE USER besoia WITH PASSWORD 'besoia';"
sudo -u postgres createdb -O besoia besoia

cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

Runs on http://localhost:3000. Check http://localhost:3000/api/health.

Then start the frontend (`npm run dev` in besoia_pilot_frontend) and open http://localhost:5173. Use a private window for a second user.

## Env

| Var | |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `QR_SECRET` | Signs QR tokens. Required in production |
| `CLIENT_ORIGIN` | CORS origin, defaults to http://localhost:5173 |
| `REPORTS_PASSCODE` | Passcode for the `/reports` download. Required in production |

## API

| Method | Path | |
|---|---|---|
| GET | `/api/health` | DB check |
| POST | `/api/register` | `{ name }` |
| GET | `/api/session` | Current session |
| DELETE | `/api/session` | Clear session |
| GET | `/api/quiz/questions` | |
| POST | `/api/quiz/answers` | `{ answers: { "1": "...", ..., "7": "..." } }` |
| GET | `/api/matches/qr-token` | `{ token, refreshIn }` |
| POST | `/api/matches/scan` | `{ code }` |
| GET | `/api/matches/recent` | Last 20 matches for the session |
| POST | `/api/events` | `{ eventType: "qr_generated" }` |
| POST | `/api/reports` | `{ passcode }`, returns an .xlsx with Users, Matches and Events sheets |

QR tokens refresh every 30s and are valid for 60s.

Score = identical answers / 7. Score, shared answers and icebreaker are saved on the match.

Questions, options and icebreakers live in `src/config/questions.js` and `src/config/icebreakers.js` with `en` and `es` text. Answers are stored as option ids (e.g. `night_out`), so people using different languages still match. The API returns `{ en, es }` text and the frontend picks one. Errors include a `code` the frontend translates. The Excel report is in English.

## Deploy

Render blueprint in `render.yaml` (API, Postgres, frontend static site, Frankfurt).

1. Push both repos.
2. Render > New > Blueprint > this repo.
3. If the API URL isn't `besoia-api.onrender.com`, fix the `/api/*` rewrite in `render.yaml`.
4. Check `https://besoia.onrender.com/api/health`.

Free instance sleeps after 15 min idle. Switch `besoia-api` to Starter before the test day and back after.

Free Postgres expires after 30 days, so download the report after the test.

Report: open `https://besoia.onrender.com/reports` and enter `REPORTS_PASSCODE` (set it in the service's Environment tab). The device remembers it, so later visits download straight away. 10 wrong passcodes from one IP lock it out for 15 minutes.
