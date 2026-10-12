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
