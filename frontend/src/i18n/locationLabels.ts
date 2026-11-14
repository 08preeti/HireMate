import type { Language, LocalizedText } from "@/types";

// Locality names are proper nouns, so translate them by transliterating known
// Indian place names rather than changing the actual place/address.
const PLACE_NAMES: Record<string, readonly [string, string, string]> = {
  "parijat nagar": ["Parijat Nagar", "पारिजात नगर", "पारिजात नगर"],
  "nashik": ["Nashik", "नाशिक", "नाशिक"],
  "maharashtra": ["Maharashtra", "महाराष्ट्र", "महाराष्ट्र"],
  "pune": ["Pune", "पुणे", "पुणे"],
  "mumbai": ["Mumbai", "मुंबई", "मुंबई"],
  "nagpur": ["Nagpur", "नागपुर", "नागपूर"],
  "thane": ["Thane", "ठाणे", "ठाणे"],
  "aurangabad": ["Aurangabad", "औरंगाबाद", "छत्रपती संभाजीनगर"],
  "chhatrapati sambhajinagar": ["Chhatrapati Sambhajinagar", "छत्रपति संभाजीनगर", "छत्रपती संभाजीनगर"],
  "kolhapur": ["Kolhapur", "कोल्हापुर", "कोल्हापूर"],
  "ahmednagar": ["Ahmednagar", "अहमदनगर", "अहिल्यानगर"],
  "satpur": ["Satpur", "सातपुर", "सातपूर"],
  "gangapur road": ["Gangapur Road", "गंगापुर रोड", "गंगापूर रोड"],
  "indira nagar": ["Indira Nagar", "इंदिरा नगर", "इंदिरा नगर"],
  "panchavati": ["Panchavati", "पंचवटी", "पंचवटी"],
  "road": ["Road", "रोड", "रस्ता"],
  "nagar": ["Nagar", "नगर", "नगर"],
  "maharashtra, india": ["Maharashtra, India", "महाराष्ट्र, भारत", "महाराष्ट्र, भारत"],
  "india": ["India", "भारत", "भारत"],
};

export function localizedLocation(value: string | LocalizedText | null | undefined, language: Language): string {
  if (!value) return "";
  if (typeof value !== "string") {
    const selected = value[language]?.trim();
    value = selected || value.en || "";
  }
  if (language === "en" || !value) return value;

  return value.split(/(,|\s+•\s+)/).map((part) => {
    if (part === "," || /^\s+•\s+$/.test(part)) return part;
    const trimmed = part.trim();
    const exact = PLACE_NAMES[trimmed.toLowerCase()];
    if (exact) return exact[language === "hi" ? 1 : 2];
    // Translate known place-name segments while preserving unknown address details.
    const words = trimmed.split(/\s+/);
    const translated = words.map((word) => {
      const clean = word.replace(/[.]/g, "");
      const entry = PLACE_NAMES[clean.toLowerCase()];
      return entry ? entry[language === "hi" ? 1 : 2] : word;
    });
    return translated.join(" ");
  }).join("");
}
