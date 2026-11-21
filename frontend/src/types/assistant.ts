export type AssistantOrbState =
  | "idle"
  | "greeting"
  | "listening"
  | "thinking"
  | "speaking"
  | "executing"
  | "confirmation"
  | "success"
  | "error"
  // Backward compatibility aliases
  | "processing"
  | "action";

export interface ProfileDiffDetails {
  field: string;
  oldValue: string;
  newValue: string;
  payload?: Record<string, any>;
}

export interface CandidateComparisonItem {
  id: string;
  name: string;
  skills: string[];
  experience: string;
  rating: number;
  location: string;
  status: string;
}

export interface CandidateComparisonData {
  compared: boolean;
  jobTitle?: string;
  recommended?: string;
  reason?: string;
  opinion?: string;
  candidates?: CandidateComparisonItem[];
  message?: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  action?: {
    type?: string;
    requiresConfirmation?: boolean;
    title?: string;
    summary?: string;
    details?: Record<string, any>;
    safetyWarning?: string | null;
    data?: any;
  };
  suggestedQueries?: string[];
  error?: string;
}

export interface WeatherData {
  city: string;
  coordinates: { latitude: number; longitude: number };
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  weatherDesc: string;
  isRaining: boolean;
  precipitationProbability: number;
  aqi: number;
  aqiLabel: string;
  safetyAdvice: string;
  primaryAlert: string;
  isOutdoorSafe: boolean;
  fetchedAt: string;
}

export interface DailyBriefing {
  role: "worker" | "employer";
  userName: string;
  date: string;
  voiceBriefing: string;
  weather: WeatherData | null;
  metrics: {
    matchingJobsCount?: number;
    pendingOffersCount?: number;
    activeWorkCount?: number;
    pendingApplicationsCount?: number;
    activeJobsCount?: number;
    totalVacancies?: number;
    filledPositions?: number;
    remainingVacancies?: number;
    pendingApplicantsCount?: number;
    activeWorkersCount?: number;
  };
  actionItems: Array<{ type: string; text: string }>;
  recommendedJobs?: Array<{
    id: string;
    title: string;
    dailyWage: number;
    location: string;
    remainingVacancies: number;
  }>;
}

export interface AssistantGreeting {
  period: "morning" | "afternoon" | "evening" | "night";
  name: string;
  role: "worker" | "employer";
  language: "en" | "hi" | "mr";
  spokenGreeting: string;
  shortGreeting: string;
  weather: WeatherData | null;
  unreadNotifications: number;
  timestamp: string;
  suggestedActions: Array<{ label: string; query: string }>;
}

export interface ConfirmationPayload {
  requiresConfirmation: boolean;
  action: string;
  title: string;
  summary: string;
  details: Record<string, any>;
  safetyWarning?: string | null;
}

export interface AssistantVoiceSettings {
  enabled: boolean;
  autoSpeakGreeting: boolean;
  voiceName: string;
  speechRate: number;
  pitch: number;
}
