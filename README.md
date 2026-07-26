# HireMate

**Find work near you.** HireMate is a full-stack job-matching platform built for India's blue-collar and gig workforce — electricians, plumbers, drivers, cooks, cleaners, security guards, and 10+ other skilled trades — connecting them directly with local employers who need to hire fast.

🔗 **Live app:** https://hiremate-git-main-preetis-projects-d8e52359.vercel.app

---

## Why I built this

Most job platforms are built for white-collar, resume-driven hiring. They assume a stable internet connection, comfort with typing long forms, and English fluency — assumptions that don't hold for a large share of India's workforce. HireMate is designed around the opposite constraints: phone-number login instead of email/password, voice input for skill selection, multi-language UI (English/Hindi/Marathi), and a job feed that prioritizes urgency and proximity over keyword search.

## Core features

**For workers**
- Phone number + OTP login — no email, no password to remember
- Voice-based skill selection for low-literacy users
- Location-aware job matching with a rules-based scoring engine (skill relevance, distance, urgency, pay, recency)
- Human-readable match explanations ("why this job fits you") and a quick "what to say when you call" tip per listing
- Live navigation to job sites (Leaflet + routing)
- Application history, ratings, and job status tracking (accepted → on the way → arrived → completed)
- Installable as a PWA with offline support

**For employers**
- Company registration/login with JWT-based sessions
- Post jobs with multi-language fields, urgency flag, salary, and payment method
- Dashboard with live job/application counts
- Rate and review workers after job completion

## How matching works

Rather than a black-box ML model, HireMate uses a transparent, explainable scoring system: skill-synonym matching (e.g. "wireman" ↔ "electrician"), location proximity scoring, and bonus weighting for urgent/recent/well-paid listings. Each suggestion comes with a plain-language reason, so workers understand *why* a job was recommended, not just that it was. I made this choice deliberately over an opaque ML ranking — for this audience, trust and interpretability matter more than marginal ranking accuracy.

## Tech stack

**Frontend:** React 19, React Router 7, Tailwind CSS, Framer Motion, Leaflet/React-Leaflet (maps + routing), Web Speech API (voice search), PWA (service worker, install prompt)

**Backend:** Node.js, Express 5, MongoDB (Mongoose), JWT authentication, bcrypt, Twilio (SMS OTP delivery), Express Rate Limit

**Deployment:** Frontend on Vercel, backend on Render, database on MongoDB Atlas

## Security

This started as a fast MVP build, and I later went back through it with a security-focused pass:
- Removed OTP values from API responses in production (previously echoed back for local testing convenience — fine in dev, a real vulnerability in prod)
- Added JWT-based session auth to worker profile/update/application endpoints, which were previously reachable by anyone who knew a worker's ID or phone number
- Added rate limiting to OTP and login endpoints to reduce brute-force/SMS-bombing risk
- Locked down CORS to explicit allowed origins instead of accepting all origins
- Removed verbose auth debug logging that was printing tokens to the server console

## Architecture

```
ai-job-finder-frontend/     React SPA (CRA)
  src/pages/                 Route-level views (worker/employer flows)
  src/components/            Shared UI (nav, cards, search, voice input)
  src/context/                Auth + language context providers
  src/services/                API client wrapper

ai-job-finder-backend/      Express REST API
  routes/                     Route handlers (jobs, applications, workers, employer auth/dashboard, AI matching)
  models/                     Mongoose schemas
  middleware/                  JWT auth (worker + employer), rate limiting
```

## Running locally

**Backend**
```bash
cd ai-job-finder-backend
npm install
# create a .env with MONGODB_URI, JWT_SECRET, and optionally Twilio credentials
npm run dev
```

**Frontend**
```bash
cd ai-job-finder-frontend
npm install
npm start
```

## What I'd build next

- Automated tests around the matching/scoring logic
- Employer-side worker search (currently one-directional: workers find jobs, not employers finding workers)
- Push notifications for new matching jobs instead of polling
