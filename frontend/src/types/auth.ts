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
  gender?: "male" | "female" | "";
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
  /** Preferred work locations (besides `location`). */
  serviceAreas?: string[];
  /** Free-text summary of previous work. */
  experienceDetails?: string;
  availability?: WorkerAvailability;
  createdAt?: string;
}

export interface WorkerAvailability {
  isAvailable?: boolean;
  /** Working days: mon … sun. */
  days?: string[];
  /** Daily start / end time, "HH:MM". */
  from?: string;
  to?: string;
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