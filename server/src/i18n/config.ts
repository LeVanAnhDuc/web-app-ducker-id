// libs
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import { join } from "path";
// others
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "./locales.config";

const DEFAULT_NAMESPACE = "common" as const;

// Using process.cwd() for absolute path from project root
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

  // Using namespaces to separate concerns by domain/module
  // Prevents large monolithic translation files and improves maintainability
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
    "contactAdmin",
    "user",
    "webApp",
    "favorite"
  ],

  // Preload all supported languages and namespaces on startup
  // Ensures translations are available immediately without lazy loading
  preload: SUPPORTED_LOCALES,

  backend: {
    // Using absolute path to ensure files are found in all environments
    loadPath: join(I18N_BASE_PATH, "{{lng}}", "{{ns}}.json")
  },

  interpolation: {
    // Disabling HTML escaping because server-side doesn't need XSS protection
    // React/frontend handles sanitization for client-side rendering
    escapeValue: false
  },

  // Disable debug to prevent verbose i18n logging. Set to true only when troubleshooting
  debug: false,

  // Explicitly return undefined for missing keys to catch translation errors early
  // Prevents silent failures where empty strings might be valid values
  saveMissing: false,
  returnEmptyString: false,
  returnNull: false
});

export default i18next;
