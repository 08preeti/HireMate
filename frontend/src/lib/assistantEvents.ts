import type { Worker } from "@/types";

/** The assistant changed saved data (after the user pressed Confirm). Open pages listen and reload. */
export const ASSISTANT_DATA_CHANGED = "hiremate:assistant-data-changed";

export type AssistantDataArea = "profile" | "jobs";
export interface AssistantDataChange {
  area: AssistantDataArea;
  /** Present for "profile": the fresh profile the server now holds. */
  worker?: Worker;
}

export const announceAssistantDataChanged = (change: AssistantDataChange): void => {
  window.dispatchEvent(new CustomEvent<AssistantDataChange>(ASSISTANT_DATA_CHANGED, { detail: change }));
};

/** Subscribes to one area. Returns the unsubscribe function (use it as a useEffect cleanup). */
export const onAssistantDataChanged = (area: AssistantDataArea, handler: (change: AssistantDataChange) => void): (() => void) => {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<AssistantDataChange>).detail;
    if (detail?.area === area) handler(detail);
  };
  window.addEventListener(ASSISTANT_DATA_CHANGED, listener);
  return () => window.removeEventListener(ASSISTANT_DATA_CHANGED, listener);
};
