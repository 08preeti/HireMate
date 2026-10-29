// Roles, users and the one-and-only browser session.

export type UserRole = "worker" | "employer";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Worker {
  _id: string;
  id?: string;
  name: string;
  phone?: string;
  contact?: string;
  skills?: string;
  location?: string;
  rating?: number | string;
  totalReviews?: number;
  currentLocation?: LatLng;
  // Optional verification / profile details shown on the dashboard. Each section hides when empty.
  /** Short self-introduction shown under "About Me". */
  about?: string;
  experienceYears?: number;
  /** True only once an admin has completed the background check. */
  backgroundVerified?: boolean;
  /** Documents an admin has reviewed, e.g. { title: "Driving Licence", detail: "MH-15-…", verified: true }. */
  documents?: WorkerDocument[];
  /** Extra neighbourhoods the worker serves (besides `location`). */
  serviceAreas?: string[];
}

export interface WorkerDocument {
  title: string;
  detail?: string;
  verified: boolean;
}

export interface Employer {
  _id: string;
  companyName?: string;
  email?: string;
}

export type User = Worker | Employer;

/** The single source of truth for "who is logged in": ONE role, ONE token, ONE user. */
export interface WorkerSession {
  role: "worker";
  token: string;
  user: Worker;
}

export interface EmployerSession {
  role: "employer";
  token: string;
  user: Employer;
}

export type Session = WorkerSession | EmployerSession;

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";