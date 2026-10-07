# Besoia backend

Express API for sessions, answers, matching, events and CSV export. It is the only backend in the repo. For setup, see the [root README](../README.md).

```bash
npm run dev          # node --watch server.js on PORT (default 3000)
npm run db:migrate   # apply src/config/schema.sql (idempotent)
```

## Source layout

```
server.js                  Starts the HTTP server
src/app.js                 CORS, JSON, cookies, routes, /api/health, JSON 404 and error handler
src/config/
  db.js                    pg connection pool
  schema.sql, migrate.js   Tables: sessions, answers, matches, events
  questions.js             The seven questions and their options
  icebreakers.js           Icebreaker list (content comes from the client)
src/middleware/session.js  Reads and validates the besoia_session cookie
src/controllers/           userController, quizController, matchController, eventController
src/routes/                Route definitions; every async handler is wrapped in asyncHandler
src/utils/
  scoringEngine.js         calculateCompatibility, findSharedAnswers
  asyncHandler.js          Sends rejected promises to the Express error handler
```

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Database connectivity check |
| `POST` | `/api/register` | Create or rename the cookie session. Body: `{ name }` (1–80 characters) |
| `GET` | `/api/session` | `{ session: { sessionId, name, quizComplete } }`, or `{ session: null }` |
| `DELETE` | `/api/session` | Clear the session cookie |
| `GET` | `/api/quiz/questions` | The seven questions |
| `POST` | `/api/quiz/answers` | Body: `{ answers: { "1": "...", …, "7": "..." } }`. All seven are required |
| `POST` | `/api/matches/scan` | Body: `{ sessionId }` from the scanned QR. Creates and returns the match |
| `GET` | `/api/matches/pending` | Latest match for this session, or `{ match: null }` |
| `POST` | `/api/events` | Body: `{ eventType: "qr_generated" }` |
| `GET` | `/api/events/export.csv` | All events as CSV |

A match response looks like this:

```json
{
  "match": {
    "matchId": "uuid",
    "score": 57,
    "icebreaker": "What would your ideal low-effort day look like?",
    "createdAt": "2026-09-29T10:02:32.648Z",
    "friend": { "id": "uuid", "name": "Amaya" },
    "sharedAnswers": [
      { "questionId": 1, "question": "What is your ultimate idea of a perfect Saturday?", "answer": "Cozy night at home" }
    ]
  }
}
```

`friend` is always the other person from the caller's point of view.

## Validation and errors

- Session cookies that aren't a valid UUID are ignored.
- `POST /matches/scan` returns `400` with a message the user can read in these cases:
  - the scanned text isn't a Besoia code
  - it's your own code
  - you haven't finished your questions
  - the other person hasn't finished theirs
- Unknown `/api/*` routes return `404 { error: "Not found" }`. Unexpected errors return `500 { error: "Unexpected server error" }` and are logged to the console.

## Scoring

`calculateCompatibility` counts the questions where both answers are identical and returns `round(matches / 7 × 100)`. `findSharedAnswers` returns those questions with their text and the shared answer. If the client changes the scoring spec, update `src/utils/scoringEngine.js`.
