// types
import type { DtoClass } from "@/validators/validate-dto";
// validators
import { validateDto } from "@/validators/validate-dto";

const I18N_KEY = /^[a-zA-Z]+:/;

/**
 * Runs every case through the DTO and snapshots `{ value, failures }` under
 * the case name. The snapshots were written while the Joi schemas still
 * existed and every case was checked against them, so they pin the accepted
 * and refused inputs, the field of each failure and its i18n key.
 *
 * Every failure must also carry an i18n key, never class-validator's English.
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
      expect({ field, key: failure.key }).toEqual({
        field,
        key: expect.stringMatching(I18N_KEY)
      });
    }
  }
};
