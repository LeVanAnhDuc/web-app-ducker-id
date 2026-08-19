// libs
import { defineRouting } from "next-intl/routing";
// others
import { locales, defaultLocale } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed"
});
