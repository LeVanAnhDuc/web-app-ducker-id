// others
import enTranslations from "@/i18n/locales/en/sendEmail.json";
import viTranslations from "@/i18n/locales/vi/sendEmail.json";

type EmailTranslations = typeof enTranslations;

const translations: Record<I18n.Locale, EmailTranslations> = {
  en: enTranslations,
  vi: viTranslations
};

export const getEmailT = (locale?: I18n.Locale): EmailTranslations =>
  translations[locale ?? "vi"] ?? translations.vi;
