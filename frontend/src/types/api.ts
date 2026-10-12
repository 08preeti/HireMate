import type { Application, Job } from "./domain";
import type { Employer, Worker } from "./auth";

export interface ApiErrorBody {
  message?: string;
  error?: string;
}

export interface EmployerLoginResponse extends ApiErrorBody {
  token: string;
  employer: Employer;
}

/** Register returns the same session fields as login, so a new employer lands on the dashboard. */
export interface EmployerRegisterResponse extends ApiErrorBody {
  success?: boolean;
  token?: string;
  employer?: Employer;
}

/** GET /api/auth/me — the role here is the one the server verified from the token. */
export type CurrentUserResponse =
  | { role: "worker"; user: Worker }
  | { role: "employer"; user: Employer };

export interface WorkerAuthResponse extends ApiErrorBody {
  token: string;
  worker: Worker;
  otp?: string;
}

export interface SendOtpResponse extends ApiErrorBody {
  success?: boolean;
  otp?: string;
}

export interface EmployerDashboardResponse {
  jobs?: Job[];
  totalJobs?: number;
  totalApplications?: number;
}

export interface ApplicationsResponse {
  applications?: Application[];
}

export interface ApplyResponse extends ApiErrorBody {
  success?: boolean;
  application?: Application;
}

export interface AcceptJobResponse extends ApiErrorBody {
  applicationId?: string;
}

export interface AiSuggestion {
  jobId?: string;
  title?: string;
  location?: string;
  salary?: number | string;
  paymentMethod?: string;
  matchScore?: number;
  reason?: string;
  tip?: string;
  isUrgent?: boolean;
}

export interface AiSuggestionsResponse extends ApiErrorBody {
  suggestions?: AiSuggestion[];
  summary?: string;
}

export interface AiTipsResponse {
  tips?: string[];
}
