"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { ApiError } from "@/services/api";
import { getWorkerProfile } from "@/services/workers";
import { announceAssistantDataChanged } from "@/lib/assistantEvents";
import {
  cancelAssistantAction,
  confirmAssistantAction,
  getAssistantStatus,
  sendAssistantMessage,
  type AssistantAction,
  type AssistantPendingAction,
  type AssistantShownItem,
} from "@/services/assistantApi";
import type { UserRole } from "@/types";

export type CardState = "pending" | "confirming" | "done" | "failed" | "cancelled";
export interface AssistantCard extends AssistantPendingAction { state: CardState }

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  error?: boolean;
  /** An action result the model should know about on later turns (kept in history even when it is an error). */
  outcome?: boolean;
  cards?: AssistantCard[];
}

export type OrbState = "idle" | "processing" | "confirm" | "error";

interface AssistantContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: AssistantMessage[];
  busy: boolean;
  /** null until the server has answered; false when no AI key is configured. */
  available: boolean | null;
  orbState: OrbState;
  send: (text: string) => Promise<void>;
  confirmCard: (messageId: string, token: string) => Promise<void>;
  cancelCard: (messageId: string, token: string) => Promise<void>;
  clear: () => void;
}

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);

const MAX_KEPT = 40;
const storageKey = (userId: string) => `hm.assistant.${userId}`;

// The server is the real gate (it re-checks the role and every id). This is a second, client-side allowlist so a
// reply can never push the browser to an arbitrary URL.
const ALLOWED_PATHS: Record<UserRole, RegExp> = {
  worker: /^\/(worker-dashboard|worker-profile|my-applications|jobs|worker-notifications|worker-help|worker-settings|job-offers|active-work|work-history|ai-suggestions)(\/[a-f\d]{24})?$/i,
  employer: /^\/(employer-dashboard|post-job|employer-jobs|applications|workers|employer-notifications|employer-profile|employer-active-work|employer-completed-work)(\/[a-f\d]{24})?$/i,
};

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { user, role, authenticated, setWorker: cacheWorker } = useAuth();
  const { language } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const userId = authenticated && user ? `${role}:${user._id}` : null;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [shown, setShown] = useState<AssistantShownItem[]>([]);
  const [lastFailed, setLastFailed] = useState(false);
  const loadedFor = useRef<string | null>(null);

  // Conversation survives page navigation (this provider lives in the root layout) and a refresh (sessionStorage,
  // per account). It is wiped when a different account signs in or the user signs out, so nothing leaks between users.
  useEffect(() => {
    if (loadedFor.current === userId) return;
    loadedFor.current = userId;
    setShown([]);
    setOpen(false);
    setBusy(false);
    setLastFailed(false);
    if (!userId) { setMessages([]); setAvailable(null); return; }
    try {
      const raw = window.sessionStorage.getItem(storageKey(userId));
      const saved = raw ? (JSON.parse(raw) as AssistantMessage[]) : [];
      // A reload mid-confirmation leaves the outcome unknown: show the button again (the server refuses a second run).
      setMessages(saved.map((m) => m.cards ? { ...m, cards: m.cards.map((c) => (c.state === "confirming" ? { ...c, state: "pending" as const } : c)) } : m));
    } catch { setMessages([]); }
    getAssistantStatus().then((s) => setAvailable(s.available)).catch(() => setAvailable(null));
  }, [userId]);

  useEffect(() => {
    if (!userId || loadedFor.current !== userId) return;
    try { window.sessionStorage.setItem(storageKey(userId), JSON.stringify(messages.slice(-MAX_KEPT))); } catch { /* storage blocked */ }
  }, [messages, userId]);

  const runActions = useCallback((actions: AssistantAction[]) => {
    if (!role) return;
    for (const a of actions) {
      if (a.type === "navigate" && ALLOWED_PATHS[role].test(a.path)) router.push(a.path);
    }
  }, [role, router]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || busy || !userId) return;
    const history = messages.filter((m) => !m.error || m.outcome).map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { id: newId(), role: "user", text }]);
    setBusy(true);
    setLastFailed(false);
    try {
      const res = await sendAssistantMessage(text, history, {
        language,
        route: pathname || "/",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
        shown,
      });
      const cards = (res.pending ?? []).map((p) => ({ ...p, state: "pending" as const }));
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", text: res.reply, ...(cards.length && { cards }) }]);
      if (res.shown) setShown(res.shown);
      runActions(res.actions);
    } catch (err) {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      const msg = offline
        ? "You appear to be offline. Please check your connection and try again."
        : err instanceof ApiError ? err.message : "I couldn't reach the assistant. Please try again.";
      if (err instanceof ApiError && err.status === 503) setAvailable(false);
      setLastFailed(true);
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", text: msg, error: true }]);
    } finally {
      setBusy(false);
    }
  }, [busy, userId, messages, language, pathname, shown, runActions]);

  const setCardState = useCallback((messageId: string, token: string, state: CardState) => {
    setMessages((prev) => prev.map((m) => m.id === messageId && m.cards
      ? { ...m, cards: m.cards.map((c) => (c.token === token ? { ...c, state } : c)) } : m));
  }, []);

  // The only way anything is changed: the user presses Confirm. The result text comes from the server after the real
  // operation finished (or failed); the assistant never announces success on its own.
  const confirmCard = useCallback(async (messageId: string, token: string) => {
    setCardState(messageId, token, "confirming");
    try {
      const res = await confirmAssistantAction(token);
      setCardState(messageId, token, "done");
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", text: res.message, outcome: true }]);
      // The change is saved. Refresh what the user may be looking at (best effort: the action itself already succeeded).
      if (res.affects === "profile" && role === "worker" && user?._id) {
        try {
          const fresh = await getWorkerProfile(String(user._id));
          if (fresh?._id) { cacheWorker(fresh); announceAssistantDataChanged({ area: "profile", worker: fresh }); }
        } catch { /* the profile page loads fresh data the next time it opens */ }
      } else if (res.affects === "jobs") {
        announceAssistantDataChanged({ area: "jobs" });
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "I couldn't complete that. Please check your connection and try again.";
      // Network failure: outcome unknown, allow another try (the server refuses duplicates). Server answer: final.
      setCardState(messageId, token, err instanceof ApiError ? "failed" : "pending");
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", text: msg, error: true, outcome: err instanceof ApiError }]);
    }
  }, [setCardState, role, user, cacheWorker]);

  const cancelCard = useCallback(async (messageId: string, token: string) => {
    setCardState(messageId, token, "cancelled");
    try { await cancelAssistantAction(token); } catch { /* the token expires on its own in minutes */ }
    setMessages((prev) => [...prev, { id: newId(), role: "assistant", text: "Okay, I've cancelled that. Nothing was changed.", outcome: true }]);
  }, [setCardState]);

  const clear = useCallback(() => { setMessages([]); setShown([]); setLastFailed(false); }, []);

  const awaitingConfirmation = messages.some((m) => m.cards?.some((c) => c.state === "pending" && c.expiresAt > Date.now()));

  const value = useMemo<AssistantContextValue>(() => ({
    open, setOpen, messages, busy, available,
    orbState: busy ? "processing" : lastFailed ? "error" : awaitingConfirmation ? "confirm" : "idle",
    send, confirmCard, cancelCard, clear,
  }), [open, messages, busy, available, lastFailed, awaitingConfirmation, send, confirmCard, cancelCard, clear]);

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used inside <AssistantProvider>");
  return ctx;
}
