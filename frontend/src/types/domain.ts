import type { Worker } from "./auth";

export type Language = "en" | "hi" | "mr";

/** A string available in every supported language (English is always present). */
export type LocalizedText = { en: string } & Partial<Record<Language, string>>;

export type PaymentMethod = "Cash" | "UPI" | string;

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
  status?: string;
  // ── Optional employer-supplied details shown on the job page (each section hides when empty) ──
  /** Trade category tag, e.g. "Automobile Repair". */
  category?: string | LocalizedText;
  ownerName?: string;
  employerVerified?: boolean;
  /** Wage period. Without it the page shows the amount with no "/ Day" label. */
  salaryUnit?: "hour" | "day" | "week" | "month";
  vacancies?: number;
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
}

export type ApplicationStatus = "accepted" | "on_the_way" | "arrived" | "completed";

export interface Application {
  _id: string;
  status?: ApplicationStatus;
  isCompleted?: boolean;
  rating?: number;
  review?: string;
  message?: string;
  applicantName?: string;
  applicantContact?: string;
  updatedAt?: string;
  job?: Job;
  worker?: Worker;
}