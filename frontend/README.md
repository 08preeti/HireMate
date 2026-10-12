# HireMate — Next.js (TypeScript) frontend

Next.js App Router + **TypeScript** + **Tailwind CSS only**. Talks to the Express/MongoDB backend over REST.

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL (default http://localhost:5000)
npm run dev                    # http://localhost:3000
npm run typecheck && npm run build && npm start
```

## Structure

```
src/
  app/
    (public)/   /, /onboarding
    (auth)/     /worker-login, /employer-login, /employer-register  (GuestOnly)
    (browse)/   /jobs, /jobs/[id]            (visitors + workers; employers redirected)
    (worker)/   /worker-dashboard, /worker-profile, /my-jobs, /ai-suggestions, /navigate   (RequireRole worker)
    (employer)/ /employer-dashboard, /post-job, /applications                              (RequireRole employer)
  features/     auth/ worker/ employer/ jobs/ home/   (former src/screens, same UI)
  components/   layout/ (Header, BottomNav, RequireRole, GuestOnly, Footer)  ui/ (Loader, ErrorMessage, EmptyState, Toast, ...)
  context/      AuthContext (user, role, token, status, login, logout, refresh), LanguageContext
  hooks/        useRoleGuard
  services/     api.ts (only HTTP client) + auth, jobs, applications, workers, employer, ai
  lib/          session.ts (single stored session), geo, speech, leaflet
  config/       env.ts, routes.ts
  types/        auth, domain, api, forms, maps
```

## Auth / roles

One browser session (`hm.session` = `{ role, token, user }`). Signing in replaces any previous session, so only one
role is ever active. Old two-key sessions are migrated once (kept only if exactly one role was present).
Route groups apply the guards; Header and BottomNav render only the active role's links.
On load the stored session is checked with `GET /api/auth/me`; the role the server returns replaces the cached one, and a 401 signs the user out.
Frontend guards are UX only — the backend enforces `authenticate` + `requireRole` on every protected endpoint.
