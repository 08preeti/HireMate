import api from "./api";
import type { AcceptJobResponse, Application, Job, Worker } from "@/types";

// Every call here is worker-only; the backend rejects any other role.
export const getWorkerProfile = (id: string): Promise<Worker> => api.get<Worker>(`/api/workers/profile/${id}`, true);

export const updateWorkerProfile = (
  id: string,
  body: { name?: string; skills?: string; location?: string },
  /** Pass a token only right after sign-in, before the session is stored. */
  token?: string
): Promise<Worker> => api.put<Worker>(`/api/workers/update/${id}`, body, token ?? true);

export const getMyJobs = (phone: string): Promise<Application[]> =>
  api.get<Application[]>(`/api/workers/my-jobs/${encodeURIComponent(phone)}`, true);

export const getJobAlerts = (lat: number, lng: number): Promise<Job[]> =>
  api.get<Job[]>(`/api/workers/job-alerts?lat=${lat}&lng=${lng}`, true);

export const getJobHistory = (workerId: string): Promise<Application[]> =>
  api.get<Application[]>(`/api/workers/job-history/${workerId}`, true);

export const acceptJob = (workerId: string, jobId: string): Promise<AcceptJobResponse> =>
  api.post<AcceptJobResponse>("/api/workers/accept-job", { workerId, jobId }, true);

export const updateWorkerLocation = (workerId: string, lat: number, lng: number): Promise<{ message?: string }> =>
  api.post("/api/workers/update-location", { workerId, lat, lng }, true);
