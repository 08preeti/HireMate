import type { Language } from "@/types";

/** Localize fixed option labels returned by the API without translating user-entered text. */
export function paymentMethodLabel(value: string | undefined | null, language: Language): string {
  if (!value) return "";
  const key = value.trim().toLowerCase();
  const labels: Record<string, Record<Language, string>> = {
    cash: { en: "Cash", hi: "नकद", mr: "रोख" },
    upi: { en: "UPI", hi: "UPI", mr: "UPI" },
    "after work": { en: "After Work", hi: "काम पूरा होने के बाद", mr: "काम पूर्ण झाल्यानंतर" },
    "after work is completed": { en: "After Work", hi: "काम पूरा होने के बाद", mr: "काम पूर्ण झाल्यानंतर" },
    "cash at end of the day": { en: "Cash at end of the day", hi: "दिन के अंत में नकद", mr: "दिवसाच्या शेवटी रोख" },
    "upi / bank transfer": { en: "UPI / Bank transfer", hi: "UPI / बैंक ट्रांसफर", mr: "UPI / बँक ट्रान्सफर" },
  };
  return labels[key]?.[language] ?? value;
}
