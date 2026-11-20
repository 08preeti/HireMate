import api from "./api";

export type AssistantItemKind = "job" | "application";
export interface AssistantShownItem { kind: AssistantItemKind; id: string; title: string }
export interface AssistantAction { type: "navigate"; path: string }
/** A prepared action awaiting the user's button press. `token` is opaque and signed by the server. */
export interface AssistantPendingAction {
  token: string;
  expiresAt: number;
  title: string;
  summary: string;
  details: { label: string; value: string }[];
  confirmLabel: string;
  danger?: boolean;
}
export interface AssistantReply { reply: string; actions: AssistantAction[]; shown: AssistantShownItem[] | null; pending: AssistantPendingAction[] }
export interface AssistantTurn { role: "user" | "assistant"; text: string }
export interface AssistantRequestContext {
  language: string;
  route: string;
  timeZone: string;
  shown: AssistantShownItem[];
}

// Auth token is attached by the shared API client; the server derives identity and role from it, never from this payload.
export const getAssistantStatus = (): Promise<{ available: boolean }> =>
  api.get<{ available: boolean }>("/api/assistant/status", true);

export const sendAssistantMessage = (
  message: string,
  history: AssistantTurn[],
  context: AssistantRequestContext,
): Promise<AssistantReply> =>
  api.post<AssistantReply>("/api/assistant/message", { message, history, context }, true);

/** Executes a prepared action. Only called when the user presses Confirm. Resolves with the server's real result text. */
/** `affects` is set when the action changed data an open page may be showing (profile, jobs). */
export interface AssistantConfirmResult { ok: true; message: string; affects?: "profile" | "jobs" }
export const confirmAssistantAction = (token: string): Promise<AssistantConfirmResult> =>
  api.post<AssistantConfirmResult>("/api/assistant/confirm", { token }, true);

export const cancelAssistantAction = (token: string): Promise<{ ok: true }> =>
  api.post<{ ok: true }>("/api/assistant/cancel", { token }, true);
