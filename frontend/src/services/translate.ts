import api from "./api";
import type { Language } from "@/types";

export interface TranslateResponse {
  text: string;
  translated: boolean;
}

// Signed-in users only. Short user-written text (reviews) -> the viewer's language.
export const translateText = (text: string, to: Language): Promise<TranslateResponse> =>
  api.post<TranslateResponse>("/api/translate", { text, to }, true);