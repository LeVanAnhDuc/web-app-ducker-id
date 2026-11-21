// libs
import i18next from "i18next";
// others
import * as en from "./locales/en";
import * as vi from "./locales/vi";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "./locales.config";

// Catalogues are imported, not read from disk: tsc bundles the JSON into dist,
// the namespace list follows the en exports, and init finishes synchronously.
i18next.init({
  resources: { en, vi },
  ns: Object.keys(en),
  defaultNS: "common",

  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES,

  initAsync: false,

  interpolation: {
    // Messages go out as JSON, never into HTML — the client escapes on render
    escapeValue: false
  },

  returnEmptyString: false,
  returnNull: false
});

export default i18next;
