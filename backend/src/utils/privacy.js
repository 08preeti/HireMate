export const maskPhone = (phone) => {
  const digits = String(phone ?? "");
  return digits.length > 4 ? `${"*".repeat(digits.length - 4)}${digits.slice(-4)}` : "****";
};

// Single line, no control characters, bounded: safe to write to a log.
export const loggable = (value, max = 200) =>
  String(value ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
