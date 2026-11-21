// libs
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import { join } from "path";
// others
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "./locales.config";

const DEFAULT_NAMESPACE = "common" as const;

// Avoids path resolution errors in both dev (src) and prod (dist)
const isCompiledCode = __dirname.includes("dist");
const PROJECT_ROOT = process.cwd();
const I18N_BASE_PATH = join(
  PROJECT_ROOT,
  isCompiledCode ? "dist" : "src",
  "i18n/locales"
);

// i18next init is async but we don't await here
// Backend will load files synchronously on first access
i18next.use(Backend).init({
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES,

  defaultNS: DEFAULT_NAMESPACE,
  ns: [
    "common",
    "validation",
    "signup",
    "login",
    "logout",
    "unlockAccount",
    "sendEmail",
    "forgotPassword",
    "changePassword",
    "contactAdmin",
    "loginHistory",
    "user",
    "webApp",
    "favorite",
    "notification",
    "recentApp",
    "category",
    "entitlement"
  ],

  preload: SUPPORTED_LOCALES,

  backend: {
    loadPath: join(I18N_BASE_PATH, "{{lng}}", "{{ns}}.json")
  },

  interpolation: {
    // Disabling HTML escaping because server-side doesn't need XSS protection
    // React/frontend handles sanitization for client-side rendering
    escapeValue: false
  },

  debug: false,

  saveMissing: false,
  returnEmptyString: false,
  returnNull: false
});

export default i18next;
