// types
import type { Locale } from "@/types/I18n";

const LOCALES = {
  EN: "en",
  VI: "vi"
} as const;

export const locales = Object.values(LOCALES);

export const defaultLocale = LOCALES.EN;

export const localeNames: Record<Locale, string> = {
  [LOCALES.EN]: "English",
  [LOCALES.VI]: "Tiếng Việt"
};

export const localeLabels: Record<Locale, string> = {
  [LOCALES.EN]: "EN",
  [LOCALES.VI]: "VI"
};
