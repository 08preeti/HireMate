"use client";

/**
 * Re-export canonical AssistantContext implementation.
 * Consolidates assistant provider architecture into a single source of truth.
 */
export * from "./AssistantContext";
export { AssistantProvider as default } from "./AssistantContext";
