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
| `EXPORT_TOKEN` | Needed for CSV exports in production |
| `CLIENT_ORIGIN` | CORS origin, defaults to http://localhost:5173 |
| `GMAIL_USER` | Gmail address the report is sent from |
| `GMAIL_APP_PASSWORD` | Google app password for that account |
| `REPORT_EMAIL` | Who gets the report (comma-separate for several) |

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
| GET | `/api/export` | Counts and download links |
| POST | `/api/export/email` | Email the counts and CSVs to `REPORT_EMAIL` |
| GET | `/api/export/users.csv?token=` | |
| GET | `/api/export/matches.csv?token=` | |
| GET | `/api/export/events.csv?token=` | |

QR tokens refresh every 30s and are valid for 60s.

Score = identical answers / 7. Score, shared answers and icebreaker are saved on the match.

## Deploy

Render blueprint in `render.yaml` (API, Postgres, frontend static site, Frankfurt).

1. Push both repos.
2. Render > New > Blueprint > this repo.
3. If the API URL isn't `besoia-api.onrender.com`, fix the `/api/*` rewrite in `render.yaml`.
4. Check `https://besoia.onrender.com/api/health`.

Free instance sleeps after 15 min idle. Switch `besoia-api` to Starter before the test day and back after.

Free Postgres expires after 30 days, so download the CSVs after the test.

Exports: open `https://besoia.onrender.com/api/export` and enter `EXPORT_TOKEN` as the password (username can be anything). `?token=` also works. Set `EXPORT_TOKEN` in the service's Environment tab. The page has an **Email report** button once the three email variables are set.

Gmail app password: turn on 2-Step Verification, then create one at https://myaccount.google.com/apppasswords.
