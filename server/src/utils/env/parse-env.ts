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
