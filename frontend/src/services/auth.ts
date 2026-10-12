import api from "./api";
import type {
  CurrentUserResponse,
  EmployerLoginForm,
  EmployerLoginResponse,
  EmployerRegisterForm,
  EmployerRegisterResponse,
  EmployerSession,
  SendOtpResponse,
  Session,
  WorkerAuthResponse,
  WorkerSession,
} from "@/types";

// ── Employer ────────────────────────────────────────────────────────────────
export async function employerLogin(form: EmployerLoginForm): Promise<EmployerSession> {
  const data = await api.post<EmployerLoginResponse>("/api/employer/login", form);
  return { role: "employer", token: data.token, user: data.employer };
}

/** Returns the new employer's session (signed in straight away), or null if the server sent none. */
export async function employerRegister(form: EmployerRegisterForm): Promise<EmployerSession | null> {
  const data = await api.post<EmployerRegisterResponse>("/api/employer/register", form);
  return data.token && data.employer ? { role: "employer", token: data.token, user: data.employer } : null;
}

// ── Session check ───────────────────────────────────────────────────────────
/** Asks the server who this token belongs to; the role in the answer is the verified one. */
export async function fetchVerifiedSession(token: string): Promise<Session> {
  const data = await api.get<CurrentUserResponse>("/api/auth/me", token);
  return data.role === "employer"
    ? { role: "employer", token, user: data.user }
    : { role: "worker", token, user: data.user };
}

// ── Worker (phone + OTP) ────────────────────────────────────────────────────
export function workerSendOtp(phone: string): Promise<SendOtpResponse> {
  return api.post<SendOtpResponse>("/api/workers/send-otp", { phone });
}

export interface WorkerVerifyInput {
  phone: string;
  otp: string;
  /** Only for first-time workers completing their profile. */
  name?: string;
  skills?: string;
  location?: string;
}

export async function workerVerifyOtp(input: WorkerVerifyInput): Promise<WorkerSession> {
  const data = await api.post<WorkerAuthResponse>("/api/workers/verify-otp", input);
  return { role: "worker", token: data.token, user: data.worker };
}
