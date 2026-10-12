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
