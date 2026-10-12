// The ONLY place that talks HTTP to the Express API.
// It attaches the signed-in user's token and handles expired sessions in one spot.
import { API_URL } from "@/config/env";
import { getToken } from "@/lib/session";
import type { ApiErrorBody } from "@/types";

/** Thrown for non-2xx responses so callers can read the status and server message. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** AuthProvider registers this so a 401 on a protected call signs the user out everywhere. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  body?: unknown;
  /**
   * `true` sends the signed-in user's token; a string sends that exact token (used once, right after
   * sign-in, before the session is stored). The backend decides whether their ROLE may call the endpoint.
   */
  auth?: boolean | string;
}

async function request<T>(method: string, path: string, { body, auth = false }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = typeof auth === "string" ? auth : getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & ApiErrorBody;

  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized?.();
    throw new ApiError(data.message || data.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}

const api = {
  get: <T>(path: string, auth: boolean | string = false) => request<T>("GET", path, { auth }),
  post: <T>(path: string, body: unknown, auth: boolean | string = false) => request<T>("POST", path, { body, auth }),
  put: <T>(path: string, body: unknown, auth: boolean | string = false) => request<T>("PUT", path, { body, auth }),
};

export default api;
