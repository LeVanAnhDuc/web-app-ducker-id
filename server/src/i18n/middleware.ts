// types
import type { Request, Response, NextFunction } from "express";
// others
import i18next from "./config";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "./locales.config";

export const i18nMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const acceptLanguage = req.headers["accept-language"];
  const lang = parseAcceptLanguage(acceptLanguage);

  req.language = lang;

  // Using getFixedT to create language-specific translator bound to request
  // Ensures consistent language per request even in async operations
  req.t = i18next.getFixedT(lang);

  next();
};

const parseAcceptLanguage = (header: string | undefined): string => {
  if (!header) return DEFAULT_LOCALE;

  // Parsing Accept-Language header according to RFC 2616
  // Format: "en-US,en;q=0.9,vi;q=0.8" where q indicates preference weight
  const languages = header
    .split(",")
    .map((lang) => {
      const [code, q = "1"] = lang.trim().split(";q=");
      // Taking only primary language code (en-US -> en) for broader compatibility
      return { code: code.split("-")[0], quality: parseFloat(q) };
    })
    .sort((a, b) => b.quality - a.quality);

  // Returning first supported language from user preferences
  // Falls back to default if none match to prevent undefined behavior
  const preferredLanguage = languages.find((lang) =>
    SUPPORTED_LOCALES.includes(lang.code as I18n.Locale)
  );

  return preferredLanguage?.code ?? DEFAULT_LOCALE;
};
