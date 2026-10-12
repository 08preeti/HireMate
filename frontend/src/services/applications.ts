import api from "./api";
import type { ApiErrorBody, ApplicationStatus, ApplicationsResponse, ApplyResponse } from "@/types";

// ── Worker ──────────────────────────────────────────────────────────────────
export const applyToJob = (
  jobId: string,
  body: { applicantName: string; applicantContact?: string; message?: string }
): Promise<ApplyResponse> => api.post<ApplyResponse>(`/api/applications/${jobId}/apply`, body, true);

export const updateApplicationStatus = (id: string, status: ApplicationStatus): Promise<ApiErrorBody> =>
  api.put<ApiErrorBody>(`/api/applications/status/${id}`, { status }, true);

// ── Employer ────────────────────────────────────────────────────────────────
export const getEmployerApplications = (): Promise<ApplicationsResponse> =>
  api.get<ApplicationsResponse>("/api/applications/employer", true);

export const getLiveApplications = (): Promise<ApplicationsResponse> =>
  api.get<ApplicationsResponse>("/api/applications/employer/live", true);

export const rateApplication = (id: string, body: { rating: number; review: string }): Promise<ApiErrorBody> =>
  api.post<ApiErrorBody>(`/api/applications/rate/${id}`, body, true);
