// libs
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
// others
import i18next from "./config";
import { SUPPORTED_LOCALES } from "./locales.config";

/**
 * Every `"<namespace>:<key>"` literal in server code is a message some request
 * will translate. If the namespace is not in the `ns` list, or a locale lacks
 * the key, i18next answers the key itself and the client shows it raw.
 */
const SRC = join(__dirname, "..");
const LOCALES = join(__dirname, "locales");

const namespaces = readdirSync(join(LOCALES, "en"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -".json".length));

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === "locales" ? [] : sourceFiles(path);
    return path.endsWith(".ts") && !path.endsWith(".spec.ts") ? [path] : [];
  });

const KEY_RE = new RegExp(
  `["'\`](${namespaces.join("|")}):([A-Za-z0-9_.]+)["'\`]`,
  "g"
);

const usedKeys = [
  ...new Set(
    sourceFiles(SRC).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(KEY_RE)].map(
        (m) => `${m[1]}:${m[2]}`
      )
    )
  )
].sort();

const catalogueValue = (locale: string, key: string): unknown => {
  const [ns, path] = key.split(":");
  const json = JSON.parse(
    readFileSync(join(LOCALES, locale, `${ns}.json`), "utf8")
  ) as Record<string, unknown>;
  return path
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      json
    );
};

beforeAll(async () => {
  if (!i18next.isInitialized) {
    await new Promise<void>((resolve) =>
      i18next.on("initialized", () => resolve())
    );
  }
  await i18next.loadNamespaces(namespaces);
});

describe("server i18n catalogue", () => {
  it("loads every namespace that has a locale file", () => {
    expect([...(i18next.options.ns as string[])].sort()).toEqual(
      [...namespaces].sort()
    );
  });

  it("finds the keys the code uses", () => {
    expect(usedKeys.length).toBeGreaterThan(100);
  });

  it.each(SUPPORTED_LOCALES)(
    "%s translates every key the code uses",
    (locale) => {
      const t = i18next.getFixedT(locale);
      const untranslated = usedKeys.filter((key) => {
        const value = catalogueValue(locale, key);
        return typeof value !== "string" || t(key as I18n.Key) !== value;
      });

      expect(untranslated).toEqual([]);
    }
  );
});
