// libs
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
// types
import type { ValidationError as ClassValidatorError } from "class-validator";

export type DtoClass<T extends object> = new () => T;

export interface DtoFailure {
  field: string;
  reason: string;
  key: string;
}

const ROOT_FIELD = "";

const flatten = (
  errors: ClassValidatorError[],
  parentPath: string
): DtoFailure[] =>
  errors.flatMap((error) => {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.entries(error.constraints ?? {}).map(
      ([reason, key]) => ({
        // An object-level rule (date range, empty PATCH body) sits on one
        // property but Joi reported it against the object itself.
        field: error.contexts?.[reason]?.root === true ? ROOT_FIELD : path,
        reason,
        key
      })
    );

    return [...own, ...flatten(error.children ?? [], path)];
  });

export const validateDto = async <T extends object>(
  Dto: DtoClass<T>,
  plain: unknown
): Promise<{ value: T; failures: DtoFailure[] }> => {
  const value = plainToInstance(Dto, plain ?? {});
  const errors = await validate(value, {
    whitelist: true,
    // One entry per field. Decorators register bottom to top, so the
    // bottom-most failing decorator wins (`@IsDefined` always runs first):
    // a DTO lists its rules in reverse of Joi's, the rule Joi reports first
    // going lowest.
    stopAtFirstError: true,
    // Otherwise a value with no decorator metadata fails with class-validator's
    // own "unknownValue" constraint, which carries no i18n key.
    forbidUnknownValues: false,
    validationError: { target: false, value: false }
  });

  return { value, failures: flatten(errors, "") };
};
