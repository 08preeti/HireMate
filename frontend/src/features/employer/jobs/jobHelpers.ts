import type { EmployerKey } from "@/i18n/employerText";
import type { JobStatus, JobType } from "@/types";

export const JOB_STATUS_ORDER: readonly JobStatus[] = ["active", "filled", "closed", "completed"];

export const STATUS_LABEL: Record<JobStatus, EmployerKey> = {
  active: "jm_st_active",
  filled: "jm_st_filled",
  closed: "jm_st_closed",
  completed: "jm_st_completed",
};

export const STATUS_TAB_LABEL: Record<JobStatus, EmployerKey> = {
  active: "jm_tab_active",
  filled: "jm_tab_filled",
  closed: "jm_tab_closed",
  completed: "jm_tab_completed",
};

export const STATUS_TONE: Record<JobStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  filled: "bg-blue-50 text-blue-700",
  closed: "bg-slate-100 text-slate-600",
  completed: "bg-violet-50 text-violet-700",
};

export const JOB_TYPE_LABEL: Record<JobType, EmployerKey> = {
  one_day: "jt_one_day",
  multi_day: "jt_multi_day",
  part_time: "jt_part_time",
  full_time: "jt_full_time",
  contract: "jt_contract",
};

export const jobStatusOf = (status?: string): JobStatus => (JOB_STATUS_ORDER.includes(status as JobStatus) ? (status as JobStatus) : "active");
