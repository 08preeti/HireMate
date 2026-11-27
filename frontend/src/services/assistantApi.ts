import api from "./api";
import type {
  AssistantGreeting,
  AssistantVoiceSettings,
  DailyBriefing,
  WeatherData,
} from "@/types/assistant";

export interface SendMessagePayload {
  message: string;
  context?: {
    currentRoute?: string;
    latitude?: number;
    longitude?: number;
    activeApplicationId?: string;
    city?: string;
    [key: string]: any;
  };
}

export interface AssistantResponse {
  reply: string;
  action?: any;
  executedTool?: string;
  suggestedQueries?: string[];
  error?: string;
}

export async function sendMessageToAssistant(payload: SendMessagePayload): Promise<AssistantResponse> {
  return await api.post<AssistantResponse>("/api/assistant/message", payload, true);
}

export async function fetchGreeting(coords?: { latitude?: number; longitude?: number }): Promise<AssistantGreeting> {
  const params = new URLSearchParams();
  if (coords?.latitude) params.set("latitude", String(coords.latitude));
  if (coords?.longitude) params.set("longitude", String(coords.longitude));
  params.set("timezoneOffset", String(new Date().getTimezoneOffset()));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return await api.get<AssistantGreeting>(`/api/assistant/greeting${qs}`, true);
}

export async function fetchDailyBriefing(coords?: { latitude?: number; longitude?: number }): Promise<DailyBriefing> {
  const params = new URLSearchParams();
  if (coords?.latitude) params.set("latitude", String(coords.latitude));
  if (coords?.longitude) params.set("longitude", String(coords.longitude));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return await api.get<DailyBriefing>(`/api/assistant/briefing${qs}`, true);
}

export async function fetchWeather(coords?: { latitude?: number; longitude?: number; cityName?: string }): Promise<WeatherData> {
  const params = new URLSearchParams();
  if (coords?.latitude) params.set("latitude", String(coords.latitude));
  if (coords?.longitude) params.set("longitude", String(coords.longitude));
  if (coords?.cityName) params.set("cityName", coords.cityName);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return await api.get<WeatherData>(`/api/assistant/weather${qs}`, true);
}

export async function executeAssistantAction(action: string, payload: any): Promise<{ success: boolean; result: any }> {
  return await api.post<{ success: boolean; result: any }>(
    "/api/assistant/execute-action",
    { action, payload },
    true,
  );
}

export async function fetchPreferences(): Promise<{
  voiceSettings: AssistantVoiceSettings;
  preferredLanguage: string;
  preferredName: string;
}> {
  return await api.get("/api/assistant/preferences", true);
}

export async function savePreferences(body: {
  voiceSettings?: Partial<AssistantVoiceSettings>;
  preferredLanguage?: string;
  preferredName?: string;
}) {
  return await api.patch("/api/assistant/preferences", body, true);
}

export async function clearAssistantHistory() {
  return await api.post("/api/assistant/clear-history", {}, true);
}

export interface GenerateTtsPayload {
  text: string;
  language?: string;
  voiceId?: string;
}

export interface GenerateTtsResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
  code?: string;
  quotaExceeded?: boolean;
  cached?: boolean;
  voiceId?: string;
  voiceName?: string;
  language?: string;
}

export async function generateTtsAudio(payload: GenerateTtsPayload): Promise<GenerateTtsResponse> {
  try {
    return await api.post<GenerateTtsResponse>("/api/assistant/tts", payload, true);
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to generate TTS audio",
      code: "API_ERROR",
    };
  }
}

