# HireMate backend (Express + MongoDB)

```bash
npm install
cp .env.example .env     # MONGODB_URI, JWT_SECRET required
npm run dev              # or: npm start
npm run check            # syntax check
npm run seed             # optional sample jobs
```

Flow: route → `authenticate` → `requireRole` → controller → service → model.
JWTs carry a signed `role`; identity is re-loaded from MongoDB on every request. Role is never read from the client.

| Area | Access |
|---|---|
| `POST /api/employer/register|login` (both return `{ token, employer }`), `POST /api/workers/send-otp|verify-otp|register` | public (rate-limited) |
| `GET /api/jobs`, `GET /api/jobs/:id` | visitors + workers (employers get 403) |
| `POST /api/jobs`, `/api/employer/dashboard`, `/api/applications/rate|employer|employer/live`, `GET /api/applications/rating/:name` | employer only |
| `/api/workers/*` (profile, update, my-jobs, job-alerts, accept-job, job-history, update-location), `POST /api/applications/:jobId/apply`, `PUT /api/applications/status/:id`, `POST /api/jobs/report/:id`, `/api/ai/*` | worker only |
| `GET /api/auth/me` | any signed-in user (returns the role verified from the token) |

## Employer job management (Task 4)

All routes require an employer token; the employer id always comes from the token.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/jobs/mine` | Own jobs with vacancy counts, application stats, allowed actions + dashboard summary |
| GET | `/api/jobs/mine/:id` | One job with the confirmed worker list |
| PUT | `/api/jobs/:id` | Edit (critical fields are locked while workers hold a position) |
| PUT | `/api/jobs/:id/close` | Close; body `{ declinePending }` |
| PUT | `/api/jobs/:id/reopen` | Reopen a closed job that still has free vacancies |
| PUT | `/api/jobs/:id/fill` | Mark as filled (total becomes the number already accepted); body `{ declinePending }` |
| PUT | `/api/jobs/:id/complete` | Complete when nobody is still working and at least one worker finished |
| DELETE | `/api/jobs/:id` | Delete a job that has no applications |

`GET /api/employer/dashboard` now also returns `stats`. Tests: `npm test` (set `MONGO_TEST_URI` to a disposable database to include the MongoDB tests).

## Employer job management (Task 4)

All routes require an employer token; the employer id always comes from the token.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/jobs/mine` | Own jobs with vacancy counts, application stats, allowed actions + dashboard summary |
| GET | `/api/jobs/mine/:id` | One job with the confirmed worker list |
| PUT | `/api/jobs/:id` | Edit (critical fields are locked while workers hold a position) |
| PUT | `/api/jobs/:id/close` | Close; body `{ declinePending }` |
| PUT | `/api/jobs/:id/reopen` | Reopen a closed job that still has free vacancies |
| PUT | `/api/jobs/:id/fill` | Mark as filled (total becomes the number already accepted); body `{ declinePending }` |
| PUT | `/api/jobs/:id/complete` | Complete when nobody is still working and at least one worker finished |
| DELETE | `/api/jobs/:id` | Delete a job that has no applications |

`GET /api/employer/dashboard` now also returns `stats`. Tests: `npm test` (set `MONGO_TEST_URI` to a disposable database to include the MongoDB tests).
