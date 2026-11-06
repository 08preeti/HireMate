import type { Worker } from "./auth";

export type Language = "en" | "hi" | "mr";

/** A string available in every supported language (English is always present). */
export type LocalizedText = { en: string } & Partial<Record<Language, string>>;

export type PaymentMethod = "Cash" | "UPI" | string;

export type JobStatus = "active" | "filled" | "closed" | "completed";
export type JobType = "one_day" | "multi_day" | "part_time" | "full_time" | "contract";
export type ShiftKey = "day" | "night" | "half";

export interface Job {
  _id: string;
  jobTitle?: LocalizedText;
  companyName?: string;
  location?: LocalizedText;
  skills?: LocalizedText;
  description?: LocalizedText;
  salary?: number | string;
  paymentMethod?: PaymentMethod;
  contactInfo?: string;
  isUrgent?: boolean;
  rating?: number;
  totalReviews?: number;
  latitude?: number;
  longitude?: number;
  applicationCount?: number;
  status?: JobStatus;
  // ── Optional employer-supplied details shown on the job page (each section hides when empty) ──
  /** Trade category tag, e.g. "Automobile Repair". */
  category?: string | LocalizedText;
  ownerName?: string;
  employerVerified?: boolean;
  /** Wage period. Without it the page shows the amount with no "/ Day" label. */
  salaryUnit?: "hour" | "day" | "week" | "month";
  /** Total workers needed (1 for jobs posted before vacancies existed). */
  vacancies?: number;
  /** Vacancies held by accepted / confirmed / active / completed applications. */
  filledPositions?: number;
  availablePositions?: number;
  /** e.g. "Afternoon lunch + 2 cups hot tea included". */
  perks?: string | LocalizedText;
  /** Nearby landmarks; the first is highlighted. */
  landmarks?: (string | LocalizedText)[];
  busStop?: string | LocalizedText;
  dutyTimings?: string;
  dutyNote?: string | LocalizedText;
  toolsProvided?: string | LocalizedText;
  toolsNote?: string | LocalizedText;
  /** ISO timestamp from the API (when present), used for "Posted 2 hours ago". */
  createdAt?: string;
  jobType?: JobType;
  experience?: string;
  paymentDetails?: string;
  /** The employer's own description; absent on jobs posted before structured fields existed. */
  summary?: string;
  shift?: ShiftKey;
  workSchedule?: string;
  startDate?: string;
  duration?: string;
  workInstructions?: string;
  gateNote?: string;
  perkItems?: string[];
  overtimeRate?: number;
  addressLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  closedAt?: string;
  completedAt?: string;
}

export interface JobStats {
  total: number;
  pending: number;
  reserved: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  confirmedWorkers: number;
  declined: number;
  rejected: number;
  withdrawn: number;
  cancelled: number;
  ended: number;
  totalVacancies: number;
  filledVacancies: number;
  availableVacancies: number;
}

export interface JobActions {
  canEdit: boolean;
  canClose: boolean;
  canReopen: boolean;
  canFill: boolean;
  canComplete: boolean;
  canDelete: boolean;
}

/** A job as the employer sees it: vacancy counts, application breakdown and the actions the server allows. */
export interface EmployerJob extends Job {
  status: JobStatus;
  vacancies: number;
  filledPositions: number;
  availablePositions: number;
  applicationCount: number;
  stats: JobStats;
  actions: JobActions;
}

export interface ConfirmedWorker {
  applicationId: string;
  name: string;
  phone: string;
  status: "confirmed" | "on_the_way" | "arrived" | "completed";
  rating: number | null;
  confirmedAt: string | null;
}

export interface EmployerJobDetail extends EmployerJob {
  confirmedWorkerList: ConfirmedWorker[];
}

export interface EmployerJobsSummary {
  totalJobs: number;
  activeJobs: number;
  filledJobs: number;
  closedJobs: number;
  completedJobs: number;
  totalApplications: number;
  pendingApplications: number;
  confirmedWorkers: number;
  reservedVacancies: number;
  totalVacancies: number;
  availableVacancies: number;
}

export type ApplicationStatus = "accepted" | "on_the_way" | "arrived" | "completed";

/** The worker's answer to an offer (an application the employer accepted). */
export type OfferResponse = "confirmed" | "rejected";

/**
 * Everything an application can be: pending → accepted (offer sent) | declined,
 * accepted → confirmed | rejected (worker answers), then the worker's job steps.
 */
export type ApplicationRecordStatus = ApplicationStatus | OfferResponse | "pending" | "declined" | "withdrawn" | "cancelled";

export type TimelineEventName = "submitted" | "reviewed" | "accepted" | "declined" | "confirmed" | "rejected" | "withdrawn" | "cancelled" | "on_the_way" | "arrived" | "completion_requested" | "completion_rejected" | "completed";

export interface TimelineEntry {
  event: TimelineEventName;
  at: string;
  by: "worker" | "employer";
  note?: string;
}

export interface EmployerProfileSummary {
  completedJobs: number;
  totalReviews: number;
  rating: number;
}

export interface Application {
  _id: string;
  status?: ApplicationRecordStatus;
  isCompleted?: boolean;
  rating?: number;
  review?: string;
  ratedAt?: string;
  employerRating?: number;
  employerReview?: string;
  employerRatedAt?: string;
  completionRequestedAt?: string;
  completionRejection?: { reason?: string; at?: string };
  completedAt?: string;
  cancellationReason?: string;
  employerProfile?: EmployerProfileSummary;
  message?: string;
  applicantName?: string;
  applicantContact?: string;
  createdAt?: string;
  updatedAt?: string;
  timeline?: TimelineEntry[];
  job?: Job;
  worker?: Worker;
}

/** Live-tracking list: the server never includes pending or declined applications. */
export type LiveApplication = Omit<Application, "status"> & { status?: ApplicationStatus };
