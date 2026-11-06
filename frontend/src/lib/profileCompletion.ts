import type { Worker } from "@/types";

export type CompletionKey = "name" | "phone" | "skills" | "location" | "about" | "experience" | "preferred" | "availability";

export interface CompletionItem {
  key: CompletionKey;
  done: boolean;
}

const filled = (v?: string | null): boolean => !!v && v.trim().length > 0;

/** Profile completeness from the fields stored on the server (the photo is a per-device setting, so it is not counted). */
export function profileCompletion(worker: Worker | null | undefined): { percent: number; items: CompletionItem[] } {
  const w = worker;
  const items: CompletionItem[] = [
    { key: "name", done: filled(w?.name) },
    { key: "phone", done: filled(w?.phone) || filled(w?.contact) },
    { key: "skills", done: filled(w?.skills) },
    { key: "location", done: filled(w?.location) },
    { key: "about", done: filled(w?.about) },
    { key: "experience", done: (w?.experienceYears ?? 0) > 0 || filled(w?.experienceDetails) },
    { key: "preferred", done: (w?.serviceAreas ?? []).length > 0 },
    { key: "availability", done: (w?.availability?.days ?? []).length > 0 },
  ];
  const percent = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return { percent, items };
}

export const COMPLETION_LABELS: Record<CompletionKey, [string, string, string]> = {
  name: ["Name", "नाम", "नाव"],
  phone: ["Phone number", "फ़ोन नंबर", "फोन नंबर"],
  skills: ["Skills", "कौशल", "कौशल्ये"],
  location: ["Home location", "घर का स्थान", "घराचे ठिकाण"],
  about: ["About me", "मेरे बारे में", "माझ्याबद्दल"],
  experience: ["Work experience", "कार्य अनुभव", "कामाचा अनुभव"],
  preferred: ["Preferred work locations", "पसंदीदा काम के स्थान", "पसंतीची कामाची ठिकाणे"],
  availability: ["Work availability", "काम की उपलब्धता", "कामाची उपलब्धता"],
};
