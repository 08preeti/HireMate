/**
 * Safety and Anti-Scam Intelligence Service for HireMate JARVIS.
 * Protects daily-wage workers and employers against unrealistic wages,
 * advance fee fraud, suspicious phone requests, and unsafe conditions.
 */

// Normal daily wage ranges in INR by skill trade
const REALISTIC_WAGE_RANGES = {
  painter: { min: 500, max: 2000, typical: 800 },
  mason: { min: 600, max: 2200, typical: 900 },
  carpenter: { min: 600, max: 2200, typical: 950 },
  plumber: { min: 500, max: 2500, typical: 850 },
  electrician: { min: 500, max: 2500, typical: 850 },
  helper: { min: 400, max: 1000, typical: 550 },
  welder: { min: 600, max: 2000, typical: 900 },
  cleaner: { min: 400, max: 1200, typical: 600 },
  default: { min: 400, max: 3000, typical: 750 },
};

const SCAM_KEYWORDS = [
  "registration fee",
  "joining fee",
  "advance payment required",
  "deposit money",
  "send otp",
  "bank account details",
  "credit card",
  "lottery",
  "earn from home without work",
  "processing charges",
];

export function analyzeJobSafety({ jobTitle = "", description = "", dailyWage = 0, skills = "" }) {
  const issues = [];
  const text = `${jobTitle} ${description} ${skills}`.toLowerCase();

  // 1. Check for advance fee scam patterns
  for (const keyword of SCAM_KEYWORDS) {
    if (text.includes(keyword)) {
      issues.push(`Suspicious condition detected: mentions '${keyword}'. Legitimate employers on HireMate never ask workers to pay any fees.`);
    }
  }

  // 2. Unrealistic wage checks
  const wage = Number(dailyWage);
  if (wage > 10000) {
    issues.push(`Extremely high daily wage (₹${wage}/day) looks unrealistic for daily wage labor. Verify site details carefully.`);
  } else if (wage > 0 && wage < 300) {
    issues.push(`Daily wage of ₹${wage}/day is below standard minimum daily living wages.`);
  }

  // 3. Trade benchmark
  let benchmark = REALISTIC_WAGE_RANGES.default;
  for (const [trade, range] of Object.entries(REALISTIC_WAGE_RANGES)) {
    if (text.includes(trade)) {
      benchmark = range;
      break;
    }
  }

  return {
    isSafe: issues.length === 0,
    issues,
    benchmark,
    advice: issues.length === 0
      ? "Job posting appears legitimate and within normal market parameters."
      : issues.join(" "),
  };
}
