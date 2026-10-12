import api from "./api";
import type { AiSuggestionsResponse, AiTipsResponse } from "@/types";

// Worker-only.
export const getAiSuggestions = (skills: string, location: string): Promise<AiSuggestionsResponse> =>
  api.post<AiSuggestionsResponse>("/api/ai/suggestions", { skills, location }, true);

export const getCareerTips = (skill: string): Promise<AiTipsResponse> =>
  api.post<AiTipsResponse>("/api/ai/career-tips", { skill }, true);
