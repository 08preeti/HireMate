# HireMate JARVIS — progress

## Phase 1 (done): secure agent backend + global text assistant
Backend (`backend/src`): `services/assistant/{llmProvider,schema,toolRegistry,agentOrchestrator}.js`,
`validators/assistantValidators.js`, `controllers/assistantController.js`, `routes/assistantRoutes.js` (mounted at `/api/assistant`),
`config/env.js` (+`ai` block). Tests: `backend/tests/assistant.test.js` (no DB / API key needed).
Frontend (`frontend/src`): `services/assistantApi.ts`, `context/AssistantProvider.tsx`, `components/assistant/*`; mounted in `app/providers.tsx` and `app/layout.tsx`.

Endpoints: `GET /api/assistant/status`, `POST /api/assistant/message` (worker or employer token required).

Environment (backend): `ANTHROPIC_API_KEY` (required to enable), `AI_MODEL` (default claude-haiku-5-5), optional `AI_PROVIDER`, `AI_BASE_URL`, `AI_TIMEOUT_MS`, `AI_MAX_OUTPUT_TOKENS`.
Without a key the assistant shows "unavailable"; nothing else in the app changes.

Tools available now (read-only + navigation): worker — get_my_profile, check_profile_completeness, search_jobs, get_job_details, get_my_applications, navigate;
employer — get_dashboard_summary, get_my_jobs, get_applications, navigate. The assistant is told it cannot yet apply/edit/post, and says so.

Not yet tested: a live model call (needs a key), the UI in a real browser, `next build` (needs Google Fonts access).

## Phase 4 (done): confirmed actions
**Rule:** the model can only *prepare* an action. The server returns a signed, single-use, 5-minute token bound to that user, role, tool and exact
arguments; only the user pressing Confirm (`POST /api/assistant/confirm`) executes it, through the same service functions the app's own buttons use.
Chatting "yes" never executes anything. The success message shown comes from the server after the real operation finishes.

Endpoints added: `POST /api/assistant/confirm`, `POST /api/assistant/cancel`.
Files: `services/assistant/actionTokens.js`, write tools in `toolRegistry.js` (prepare/commit), `controllers/assistantController.js` (factory), card UI in `AssistantPanel.tsx`.

Write tools — worker: apply_to_job, withdraw_application, respond_to_offer. Employer: decide_application (accept/decline), shortlist_application, close_job, reopen_job.
`shortlist_application` = existing "mark reviewed" (HireMate has no separate shortlist state). Job delete is intentionally not exposed.
Not yet: update profile, publish job (Phase 5 form flow). Replay protection is in-memory per server instance (the services' own checks, e.g. the unique application index, still apply across instances).

## Phase 5 (done): form flow — update profile, publish job
Same rule as Phase 4: the model only *prepares*; the user pressing Confirm is the only thing that saves. Both tools reuse the app's own
validators and services, so the assistant can never store anything the screens would reject.

**Conversation → one card.** The assistant collects details by chat (asks only for what is missing, never guesses pay, phone numbers, addresses or
dates), then prepares ONCE with the full set. The card lists every value; for profile changes each row is `before → after` and unchanged fields are left out.

Tools added — worker: `update_my_profile` (name, skills, location, about, experienceYears, experienceDetails, serviceAreas, availableDays/From/To, isAvailable).
Phone and gender cannot be changed this way (unknown arguments are rejected). Employer: `post_job` (required: jobTitle, location, salary, salaryUnit, contactInfo;
company name defaults to the account; optional vacancies, summary, skills, category, experience, jobType, shift, startDate, duration, paymentMethod, city, state, isUrgent).

Files: `services/assistant/toolRegistry.js` (two tools + helpers), `services/assistant/schema.js` (now also boolean / number / array-of-string / pattern),
`services/assistant/agentOrchestrator.js` (system prompt: form rules), `controllers/assistantController.js` (confirm returns `affects`),
frontend `lib/assistantEvents.ts`, `context/AssistantProvider.tsx` (refreshes the open page after a confirmed change), `features/worker/WorkerProfile.tsx` and
`features/employer/MyJobs.tsx` (listen for it), `components/assistant/AssistantPanel.tsx` (suggestion chips). Tests: `backend/tests/assistant.forms.test.js`.

Decisions to know about:
- **A job posted through the assistant has no map pin and no photos.** The model cannot obtain real coordinates and invented ones are not acceptable (Task 6 routing and tracking use them).
  The card says "Map pin: Not set", and the success message tells the employer to open the job from My Jobs and press Edit. The Post Job form itself still requires a confirmed pin.
- Double-confirm protection: if an active job with the same title and address was published in the last 10 minutes, a second one is refused. An older twin only adds a "Heads-up" row.
- Contact numbers follow the form: exactly 10 digits, stored as `+91…`.

Not yet: editing an existing job, deleting, photos, map pin, profile photo/documents. Replay protection is still in-memory per server instance.
Not tested: a live model call, the UI in a browser, `next build`, `tsc` against real React/Next types (this sandbox had no network).
