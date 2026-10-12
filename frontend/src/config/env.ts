// Single place for frontend environment config.
// Next.js only exposes variables that start with NEXT_PUBLIC_ to the browser
// (set them in .env.local, then restart `npm run dev`).
// Never put secrets here — anything in the frontend bundle is public.
export const API_URL: string = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");
