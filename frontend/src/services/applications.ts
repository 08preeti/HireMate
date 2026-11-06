import api from "./api";
import type { ApiErrorBody, ApplicationStatus, ApplicationsResponse, ApplyResponse, LiveApplication, OfferResponse } from "@/types";

// ── Worker ──────────────────────────────────────────────────────────────────
export const applyToJob = (
  jobId: string,
  body: { applicantName: string; applicantContact?: string; message?: string }
): Promise<ApplyResponse> => api.post<ApplyResponse>(`/api/applications/${jobId}/apply`, body, true);

export const respondToOffer = (id: string, response: OfferResponse): Promise<ApiErrorBody> =>
  api.put<ApiErrorBody>(`/api/applications/offer/${id}`, { response }, true);

export const updateApplicationStatus = (id: string, status: ApplicationStatus): Promise<ApiErrorBody> =>
  api.put<ApiErrorBody>(`/api/applications/status/${id}`, { status }, true);

/** Worker withdraws their own application; the server releases its vacancy if it held one. */
export const withdrawApplication = (id: string): Promise<ApiErrorBody> =>
  api.put<ApiErrorBody>(`/api/applications/withdraw/${id}`, {}, true);

/** Worker grants / withdraws consent to share live GPS with the employer for this application. */
export const setLocationConsent = (id: string, consent: boolean): Promise<ApiErrorBody> =>
  api.put<ApiErrorBody>(`/api/applications/location-consent/${id}`, { consent }, true);

// ── Employer ────────────────────────────────────────────────────────────────
export const getEmployerApplications = (): Promise<ApplicationsResponse> =>
  api.get<ApplicationsResponse>("/api/applications/employer", true);

export const getLiveApplications = (): Promise<{ applications?: LiveApplication[] }> =>
  api.get<{ applications?: LiveApplication[] }>("/api/applications/employer/live", true);

export const decideApplication = (id: string, decision: "accepted" | "declined"): Promise<ApiErrorBody> =>
  api.put<ApiErrorBody>(`/api/applications/decision/${id}`, { decision }, true);

export const rateApplication = (id: string, body: { rating: number; review: string }): Promise<ApiErrorBody> =>
  api.post<ApiErrorBody>(`/api/applications/rate/${id}`, body, true);

/** Employer opened a pending application; recorded once on its timeline. */
export const markApplicationReviewed = (id: string): Promise<ApiErrorBody> =>
  api.put<ApiErrorBody>(`/api/applications/review/${id}`, {}, true);

/** Employer ends an offer or a hire (accepted / confirmed / on the way / arrived); the server releases the vacancy. */
export const cancelApplication = (id: string): Promise<ApiErrorBody> =>
  api.put<ApiErrorBody>(`/api/applications/cancel/${id}`, {}, true);
