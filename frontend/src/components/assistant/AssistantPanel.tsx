"use client";

/**
 * Re-export modern voice-first AssistantHUD.
 * Consolidates assistant UI to eliminate the legacy chatbot panel.
 */
import { AssistantHUD } from "./AssistantHUD";

export function AssistantPanel() {
  return <AssistantHUD />;
}

export default AssistantPanel;
