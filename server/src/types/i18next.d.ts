// types
import type * as Resources from "../i18n/locales/en";
import type { SUPPORTED_LOCALES } from "../i18n/locales.config";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: typeof Resources;
    returnNull: false;
    returnEmptyString: false;
  }
}

type PathsToStringProps<T, P extends string = ""> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? PathsToStringProps<T[K], `${P}${K}.`>
          : `${P}${K}`
        : never;
    }[keyof T]
  : never;

type ResourceKey<N extends string, R> = `${N}:${PathsToStringProps<R>}`;

// When adding new JSON file, just export it in locales/en/index.ts and this will auto-update
type ResourceKeys<T> = {
  [K in keyof T]: K extends string ? ResourceKey<K, T[K]> : never;
}[keyof T];

// Using namespace pattern to avoid potential naming conflicts with other libraries
declare global {
  namespace I18n {
    type Key = ResourceKeys<typeof Resources>;

    // When adding new locale: just add to SUPPORTED_LOCALES array in locales.config.ts
    // Type will automatically update without manual changes here
    type Locale = (typeof SUPPORTED_LOCALES)[number];
  }
}

export {};
