import api from "./api";
import type { ApiErrorBody, Job } from "@/types";

export const getJobs = (): Promise<Job[]> => api.get<Job[]>("/api/jobs");

export const getJob = (id: string): Promise<Job> => api.get<Job>(`/api/jobs/${id}`);

export const reportJob = (id: string, body: { reason: string; reporterPhone?: string }): Promise<ApiErrorBody> =>
  api.post<ApiErrorBody>(`/api/jobs/report/${id}`, body, true);

export interface NewJobPayload {
  jobTitle: string;
  description: string;
  skills: string;
  location: string;
  latitude?: number;
  longitude?: number;
  salary: number | string;
  paymentMethod: string;
  isUrgent: boolean;
  companyName?: string;
  contactInfo?: string;
}

/** Employer-only. */
export const postJob = (payload: NewJobPayload): Promise<Job> => api.post<Job>("/api/jobs", payload, true);
