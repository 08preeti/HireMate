// Tiny argument validator for tool inputs. The model's arguments are untrusted input:
// unknown keys, wrong types, operator objects ({ $ne: ... }) and oversized strings are all rejected.
// Supported types: string (maxLength, enum, pattern, format:"objectId"), integer, number, boolean,
// and array of strings (maxItems, minItems, items.maxLength / items.enum).
const OBJECT_ID = /^[a-f\d]{24}$/i;

function checkString(label, v, rule) {
  if (typeof v !== "string") throw new Error(`"${label}" must be text`);
  const s = v.trim();
  if (s.length > (rule.maxLength ?? 200)) throw new Error(`"${label}" is too long`);
  if (rule.format === "objectId" && !OBJECT_ID.test(s)) throw new Error(`"${label}" is not a valid id`);
  if (rule.enum && !rule.enum.includes(s)) throw new Error(`"${label}" must be one of: ${rule.enum.join(", ")}`);
  if (rule.pattern && !new RegExp(rule.pattern).test(s)) throw new Error(`"${label}" is not in the expected format`);
  return s;
}

export function validateArgs(schema, args) {
  if (args === undefined || args === null) args = {};
  if (typeof args !== "object" || Array.isArray(args)) throw new Error("Arguments must be an object");
  const props = schema.properties || {};
  for (const key of Object.keys(args)) {
    if (!Object.hasOwn(props, key)) throw new Error(`Unknown argument "${key}"`);
  }
  const out = {};
  for (const [key, rule] of Object.entries(props)) {
    let v = args[key];
    if (v === undefined || v === null || v === "") {
      if ((schema.required || []).includes(key)) throw new Error(`"${key}" is required`);
      if (rule.default !== undefined) out[key] = rule.default;
      continue;
    }
    if (rule.type === "string") {
      v = checkString(key, v, rule);
    } else if (rule.type === "integer") {
      if (typeof v !== "number" || !Number.isInteger(v)) throw new Error(`"${key}" must be a whole number`);
      if (v < (rule.minimum ?? -Infinity) || v > (rule.maximum ?? Infinity)) throw new Error(`"${key}" is out of range`);
    } else if (rule.type === "number") {
      if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`"${key}" must be a number`);
      if (v < (rule.minimum ?? -Infinity) || v > (rule.maximum ?? Infinity)) throw new Error(`"${key}" is out of range`);
    } else if (rule.type === "boolean") {
      if (typeof v !== "boolean") throw new Error(`"${key}" must be true or false`);
    } else if (rule.type === "array") {
      if (!Array.isArray(v)) throw new Error(`"${key}" must be a list`);
      if (v.length < (rule.minItems ?? 0)) throw new Error(`"${key}" needs at least ${rule.minItems} item(s)`);
      if (v.length > (rule.maxItems ?? 20)) throw new Error(`"${key}" has too many items`);
      if (rule.items?.type !== "string") throw new Error(`Unsupported schema type for "${key}"`);
      const seen = new Set();
      v = v.map((item) => checkString(`${key} item`, item, rule.items)).filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
      if (!v.length) { if ((schema.required || []).includes(key)) throw new Error(`"${key}" is required`); continue; }
    } else {
      throw new Error(`Unsupported schema type for "${key}"`);
    }
    out[key] = v;
  }
  return out;
}
