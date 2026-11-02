import api from "./api";
import type { EmployerDashboardResponse, WorkersListResponse } from "@/types";

/** Employer-only. */
export const getEmployerDashboard = (): Promise<EmployerDashboardResponse> =>
  api.get<EmployerDashboardResponse>("/api/employer/dashboard", true);

/** Employer-only: every worker who has created a work profile, newest first. */
export const getWorkersList = (): Promise<WorkersListResponse> =>
  api.get<WorkersListResponse>("/api/employer/workers", true);