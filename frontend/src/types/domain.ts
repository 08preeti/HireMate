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
