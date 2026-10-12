import api from "./api";
import type { EmployerDashboardResponse } from "@/types";

/** Employer-only. */
export const getEmployerDashboard = (): Promise<EmployerDashboardResponse> =>
  api.get<EmployerDashboardResponse>("/api/employer/dashboard", true);
