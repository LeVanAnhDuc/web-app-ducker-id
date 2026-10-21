// common
import { ConfigError } from "@/exceptions";

export const parseRequired = (
  name: string,
  raw: string | undefined
): string => {
  const value = raw?.trim();
  if (!value) {
    throw new ConfigError(`Missing required environment variable ${name}`);
  }
  return value;
};

// `Number(raw) || fallback` would turn a deliberate 0 into the fallback.
export const parseNumber = (
  raw: string | undefined,
  fallback: number
): number => {
  const value = Number(raw);
  return raw?.trim() && !Number.isNaN(value) ? value : fallback;
};

export const parseBoolean = (raw: string | undefined): boolean =>
  raw?.trim() === "true";

export const parseList = (raw: string): string[] =>
  raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const parseTrustProxy = (
  raw: string | undefined
): boolean | number | string => {
  const value = (raw ?? "loopback").trim();
  if (value === "true") return true;
  if (value === "false") return false;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && value !== "") return asNumber;
  return value;
};
