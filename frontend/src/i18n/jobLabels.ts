import type { Language } from "@/types";

// Translate only HireMate's known, predefined trade labels. Custom job titles
// and user-written skills are intentionally returned unchanged.
const LABELS: Record<string, readonly [string, string, string]> = {
  "driver": ["Driver", "ड्राइवर", "चालक"],
  "concrete worker": ["Concrete Worker", "कंक्रीट कामगार", "काँक्रीट कामगार"],
  "cab driver": ["Cab Driver", "कैब चालक", "कॅब चालक"],
  "car driver": ["Car Driver", "कार चालक", "कार चालक"],
  "truck driver": ["Truck Driver", "ट्रक चालक", "ट्रक चालक"],
  "auto rickshaw driver": ["Auto Rickshaw Driver", "ऑटो रिक्शा चालक", "ऑटो रिक्षा चालक"],
  "tempo / pickup driver": ["Tempo / Pickup Driver", "टेम्पो / पिकअप चालक", "टेम्पो / पिकअप चालक"],
  "bus driver": ["Bus Driver", "बस चालक", "बस चालक"],
  "tractor driver": ["Tractor Driver", "ट्रैक्टर चालक", "ट्रॅक्टर चालक"],
  "forklift operator": ["Forklift Operator", "फोर्कलिफ्ट ऑपरेटर", "फोर्कलिफ्ट ऑपरेटर"],
  "bike delivery rider": ["Bike Delivery Rider", "बाइक डिलीवरी राइडर", "बाईक डिलिव्हरी रायडर"],
  "courier delivery boy": ["Courier Delivery Boy", "कूरियर डिलीवरी कर्मचारी", "कुरिअर डिलिव्हरी कर्मचारी"],
  "electrician": ["Electrician", "इलेक्ट्रीशियन", "इलेक्ट्रिशियन"],
  "plumber": ["Plumber", "प्लंबर", "प्लंबर"],
  "cook": ["Cook", "रसोइया", "स्वयंपाकी"],
  "carpenter": ["Carpenter", "बढ़ई", "सुतार"],
  "painter": ["Painter", "पेंटर", "रंगारी"],
  "cleaner": ["Cleaner", "सफाई कर्मचारी", "स्वच्छता कर्मचारी"],
  "security guard": ["Security Guard", "सुरक्षा गार्ड", "सुरक्षा रक्षक"],
  "gardener": ["Gardener", "माली", "माळी"],
  "delivery boy": ["Delivery Boy", "डिलीवरी कर्मचारी", "डिलिव्हरी कर्मचारी"],
  "mechanic": ["Mechanic", "मैकेनिक", "मेकॅनिक"],
  "mason": ["Mason", "राजमिस्त्री", "गवंडी"],
  "house maid": ["House Maid", "घरेलू सहायिका", "घरकाम करणारी"],
  "waiter": ["Waiter", "वेटर", "वेटर"],
  "helper": ["Helper", "सहायक", "मदतनीस"],
  "welder": ["Welder", "वेल्डर", "वेल्डर"],
  "construction helper": ["Construction Helper", "निर्माण सहायक", "बांधकाम मदतनीस"],
  "mason / rajmistri": ["Mason / Rajmistri", "राजमिस्त्री", "गवंडी"],
  "bar bender / steel fixer": ["Bar Bender / Steel Fixer", "सरिया बांधने वाला / स्टील फिक्सर", "लोखंडी सळई बांधणारा / स्टील फिक्सर"],
  "shuttering carpenter": ["Shuttering Carpenter", "शटरिंग बढ़ई", "शटरिंग सुतार"],
  "kitchen helper": ["Kitchen Helper", "रसोई सहायक", "स्वयंपाकघर मदतनीस"],
  "chef / head cook": ["Chef / Head Cook", "शेफ / मुख्य रसोइया", "शेफ / मुख्य स्वयंपाकी"],
  "tandoor / roti maker": ["Tandoor / Roti Maker", "तंदूर / रोटी बनाने वाला", "तंदूर / पोळी बनवणारा"],
  "chai / tea maker": ["Chai / Tea Maker", "चाय बनाने वाला", "चहा बनवणारा"],
  "cashier": ["Cashier", "कैशियर", "कॅशियर"],
};

export function localizedTradeLabel(value: string, language: Language): string {
  const entry = LABELS[value.trim().toLowerCase()];
  return entry ? entry[language === "hi" ? 1 : language === "mr" ? 2 : 0] : value;
}

export function localizedSkillText(value: string | undefined, language: Language): string {
  if (!value) return "";
  return value.split(/([,،;、])/).map((part) => /^[,،;、]$/.test(part) ? part : localizedTradeLabel(part.trim(), language)).join("");
}

export function localizedCategory(value: string, language: Language): string {
  const categories: Record<string, readonly [string, string, string]> = {
    "electrical & welding": ["Electrical & Welding", "बिजली और वेल्डिंग", "इलेक्ट्रिकल आणि वेल्डिंग"],
    "driving & delivery": ["Driving & Delivery", "ड्राइविंग और डिलीवरी", "ड्रायव्हिंग आणि डिलिव्हरी"],
    plumbing: ["Plumbing", "प्लंबिंग", "प्लंबिंग"],
    "cleaning & housekeeping": ["Cleaning & Housekeeping", "सफाई और घरेलू सेवाएं", "स्वच्छता आणि घरगुती सेवा"],
    "food & hospitality": ["Food & Hospitality", "खानपान और आतिथ्य", "खाद्यपदार्थ आणि आदरातिथ्य"],
    security: ["Security", "सुरक्षा", "सुरक्षा"],
    "construction & repair": ["Construction & Repair", "निर्माण और मरम्मत", "बांधकाम आणि दुरुस्ती"],
    mechanic: ["Mechanic", "मैकेनिक", "मेकॅनिक"],
    gardening: ["Gardening", "बागवानी", "बागकाम"],
    other: ["Other", "अन्य", "इतर"],
  };
  const entry = categories[value.trim().toLowerCase()];
  return entry ? entry[language === "hi" ? 1 : language === "mr" ? 2 : 0] : value;
}
