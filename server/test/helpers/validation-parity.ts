// types
import type { Schema } from "joi";
import type { DtoClass } from "@/validators/validate-dto";
// validators
import { validateDto } from "@/validators/validate-dto";

const I18N_KEY = /^[a-zA-Z]+:/;

// Only Joi's first entry per field is compared: abortEarly:false can report two
// rules for one field (min + pattern), while the DTO reports at most one.
const firstJoiMessagePerField = (schema: Schema, input: unknown) => {
  const { error, value } = schema.validate(input ?? {}, {
    abortEarly: false,
    stripUnknown: true
  });
  const messages = new Map<string, string>();

  for (const detail of error?.details ?? []) {
    const field = detail.path.join(".");
    if (!messages.has(field)) messages.set(field, detail.message);
  }

  return { value: value as unknown, messages };
};

const snapshotDto = async (
  Dto: DtoClass<object>,
  caseName: string,
  input: unknown
) => {
  const result = await validateDto(Dto, input);
  expect({ value: result.value, failures: result.failures }).toMatchSnapshot(
    caseName
  );
  return result;
};

/**
 * Runs every case through both the Joi schema being replaced and the DTO
 * replacing it, and fails on any observable difference. The DTO result is
 * snapshotted under the case name so `expectDto` can keep guarding the same
 * cases once the Joi schema is deleted.
 */
export const expectParity = async (
  joiSchema: Schema,
  Dto: DtoClass<object>,
  cases: Record<string, unknown>
): Promise<void> => {
  for (const [caseName, input] of Object.entries(cases)) {
    const joi = firstJoiMessagePerField(joiSchema, input);
    const dto = await snapshotDto(Dto, caseName, input);
    const label = `case "${caseName}"`;

    expect({ label, accepted: dto.failures.length === 0 }).toEqual({
      label,
      accepted: joi.messages.size === 0
    });

    const dtoFields = dto.failures.map((failure) => failure.field).sort();
    expect({ label, fields: dtoFields }).toEqual({
      label,
      fields: [...joi.messages.keys()].sort()
    });

    for (const failure of dto.failures) {
      const joiMessage = joi.messages.get(failure.field) ?? "";
      const field = `${label} field "${failure.field}"`;

      if (I18N_KEY.test(joiMessage)) {
        expect({ field, key: failure.key }).toEqual({ field, key: joiMessage });
      } else {
        // Joi shipped its own English sentence here; the DTO must ship a key.
        expect({ field, key: failure.key }).toEqual({
          field,
          key: expect.stringMatching(I18N_KEY)
        });
      }
    }

    if (dto.failures.length === 0) {
      expect({ label, value: { ...dto.value } }).toEqual({
        label,
        value: joi.value
      });
    }
  }
};

/** The parity cases, minus Joi: matches the snapshots `expectParity` wrote. */
export const expectDto = async (
  Dto: DtoClass<object>,
  cases: Record<string, unknown>
): Promise<void> => {
  for (const [caseName, input] of Object.entries(cases)) {
    await snapshotDto(Dto, caseName, input);
  }
};
