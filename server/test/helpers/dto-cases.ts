// libs
import { existsSync, readFileSync } from "fs";
import { join } from "path";
// types
import type { DtoClass } from "@/validators/validate-dto";
// others
import { SUPPORTED_LOCALES } from "@/i18n/locales.config";
// validators
import { validateDto } from "@/validators/validate-dto";

const LOCALES = join(__dirname, "..", "..", "src", "i18n", "locales");

const catalogues = new Map<string, Record<string, unknown> | null>();

const catalogue = (
  locale: string,
  ns: string
): Record<string, unknown> | null => {
  const file = join(LOCALES, locale, `${ns}.json`);
  if (!catalogues.has(file)) {
    catalogues.set(
      file,
      existsSync(file)
        ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>)
        : null
    );
  }
  return catalogues.get(file) ?? null;
};

/** The locales whose catalogue has no text for `key` ("ns:a.b.c"). */
const localesMissing = (key: string): string[] => {
  const [ns, path] = key.split(":");
  return SUPPORTED_LOCALES.filter((locale) => {
    const text = (path ?? "")
      .split(".")
      .reduce<unknown>(
        (node, part) => (node as Record<string, unknown> | undefined)?.[part],
        catalogue(locale, ns)
      );
    return typeof text !== "string";
  });
};

/**
 * Runs every case through the DTO and snapshots `{ value, failures }` under
 * the case name. The snapshots were written while the Joi schemas still
 * existed and every case was checked against them, so they pin the accepted
 * and refused inputs, the field of each failure and its i18n key.
 *
 * Every failure must also carry an i18n key that both locales translate,
 * never class-validator's English.
 */
export const expectDto = async (
  Dto: DtoClass<object>,
  cases: Record<string, unknown>
): Promise<void> => {
  for (const [caseName, input] of Object.entries(cases)) {
    const result = await validateDto(Dto, input);
    expect({ value: result.value, failures: result.failures }).toMatchSnapshot(
      caseName
    );

    for (const failure of result.failures) {
      const field = `case "${caseName}" field "${failure.field}"`;
      expect({
        field,
        key: failure.key,
        missingIn: localesMissing(failure.key)
      }).toEqual({ field, key: failure.key, missingIn: [] });
    }
  }
};
