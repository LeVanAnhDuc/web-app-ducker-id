const SENSITIVE_PATTERNS = [
  "password",
  "otp",
  "token",
  "secret",
  "authorization",
  "credential",
  "apikey",
  "api_key",
  "cookie"
];

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_PATTERNS.some((pattern) => lower.includes(pattern));
}

function redactValue(value: unknown, depth: number): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return REDACTED;

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redactValue(val, depth + 1);
  }
  return out;
}

/**
 * Deep-copy `value`, replacing the value of any key whose name matches a
 * sensitive substring (case-insensitive) with "[REDACTED]". Pure — never
 * mutates the input. Used before logging request payloads.
 */
export function redactSensitive(value: unknown): unknown {
  return redactValue(value, 0);
}
