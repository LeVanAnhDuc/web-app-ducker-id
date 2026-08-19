// Type definitions for i18next resources to enable autocomplete
// Importing all translations from index to automatically pick up new namespaces
// This ensures type-safety is derived from actual JSON files (single source of truth)

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

// Utility type to recursively generate translation key paths
// Builds keys like "errors.notFound", "validation.emailRequired"
type PathsToStringProps<T, P extends string = ""> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? PathsToStringProps<T[K], `${P}${K}.`>
          : `${P}${K}`
        : never;
    }[keyof T]
  : never;

// Prefix namespace to resource key paths
type ResourceKey<N extends string, R> = `${N}:${PathsToStringProps<R>}`;

// Automatically generate union type from all namespaces in Resources
// When adding new JSON file, just export it in locales/en/index.ts and this will auto-update
type ResourceKeys<T> = {
  [K in keyof T]: K extends string ? ResourceKey<K, T[K]> : never;
}[keyof T];

// Making I18n namespace globally available without import
// Using namespace pattern to avoid potential naming conflicts with other libraries
declare global {
  namespace I18n {
    // Union type of all translation keys across all namespaces
    // Can be used as variable type to ensure type-safety with req.t()
    // Example: const key: I18n.Key = "common:errors.notFound"
    type Key = ResourceKeys<typeof Resources>;

    // Automatically inferred from SUPPORTED_LOCALES constant
    // When adding new locale: just add to SUPPORTED_LOCALES array in locales.config.ts
    // Type will automatically update without manual changes here
    // Example: const lang: I18n.Locale = "vi"
    type Locale = (typeof SUPPORTED_LOCALES)[number];
  }
}

export {};
