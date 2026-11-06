import api from "./api";
import type { ApiErrorBody, EmployerJobDetail, EmployerJobsResponse, Job, JobChangeResponse, JobType, ShiftKey } from "@/types";

export const getJobs = (): Promise<Job[]> => api.get<Job[]>("/api/jobs");

export const getJob = (id: string): Promise<Job> => api.get<Job>(`/api/jobs/${id}`);

export const reportJob = (id: string, body: { reason: string; reporterPhone?: string }): Promise<ApiErrorBody> =>
  api.post<ApiErrorBody>(`/api/jobs/report/${id}`, body, true);

export interface NewJobPayload {
  jobTitle: string;
  skills: string;
  location: string;
  latitude?: number;
  longitude?: number;
  salary: number | string;
  paymentMethod: string;
  isUrgent: boolean;
  companyName?: string;
  contactInfo?: string;
  /** Workers needed; the server defaults to 1 when omitted. */
  vacancies?: number;
  category?: string;
  jobType?: JobType;
  experience?: string;
  salaryUnit?: "hour" | "day" | "week" | "month";
  paymentDetails?: string;
  summary?: string;
  shift?: ShiftKey;
  workSchedule?: string;
  startDate?: string | null;
  duration?: string;
  workInstructions?: string;
  gateNote?: string;
  perkItems?: string[];
  overtimeRate?: number;
  addressLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  /** Only used when editing a job posted before `summary` existed. */
  description?: string;
}

/** Employer-only. */
export const postJob = (payload: NewJobPayload): Promise<Job> => api.post<Job>("/api/jobs", payload, true);

export type UpdateJobPayload = Partial<NewJobPayload>;

/** Employer-only: every job of the signed-in employer with vacancy counts, application stats and allowed actions. */
export const getMyJobs = (): Promise<EmployerJobsResponse> => api.get<EmployerJobsResponse>("/api/jobs/mine", true);

export const getMyJob = (id: string): Promise<EmployerJobDetail> => api.get<EmployerJobDetail>(`/api/jobs/mine/${id}`, true);

export const updateJob = (id: string, payload: UpdateJobPayload): Promise<EmployerJobDetail> => api.put<EmployerJobDetail>(`/api/jobs/${id}`, payload, true);

export const closeJob = (id: string, declinePending: boolean): Promise<JobChangeResponse> => api.put<JobChangeResponse>(`/api/jobs/${id}/close`, { declinePending }, true);

export const reopenJob = (id: string): Promise<EmployerJobDetail> => api.put<EmployerJobDetail>(`/api/jobs/${id}/reopen`, {}, true);

export const fillJob = (id: string, declinePending: boolean): Promise<JobChangeResponse> => api.put<JobChangeResponse>(`/api/jobs/${id}/fill`, { declinePending }, true);

export const completeJob = (id: string): Promise<JobChangeResponse> => api.put<JobChangeResponse>(`/api/jobs/${id}/complete`, {}, true);

export const deleteJob = (id: string): Promise<ApiErrorBody> => api.delete<ApiErrorBody>(`/api/jobs/${id}`, true);
