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

/**
 * Context key under which an array rule carries its per-item check. Joi
 * reported a bad item at `field.<index>`, class-validator reports the whole
 * array at `field`; with the check at hand every failing index is named.
 */
export const ITEM_CHECK = "itemCheck";

export type ItemCheck = (
  item: unknown,
  index: number,
  items: unknown[]
) => boolean;

const itemCheckOf = (
  error: ClassValidatorError,
  reason: string
): ItemCheck | undefined => {
  const check: unknown = error.contexts?.[reason]?.[ITEM_CHECK];
  return typeof check === "function" && Array.isArray(error.value)
    ? (check as ItemCheck)
    : undefined;
};

const flatten = (
  errors: ClassValidatorError[],
  parentPath: string
): DtoFailure[] =>
  errors.flatMap((error) => {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.entries(error.constraints ?? {}).flatMap(
      ([reason, key]): DtoFailure[] => {
        const check = itemCheckOf(error, reason);
        if (check) {
          const items = error.value as unknown[];
          return items.flatMap((item, index) =>
            check(item, index, items)
              ? []
              : [{ field: `${path}.${index}`, reason, key }]
          );
        }
        return [
          {
            // An object-level rule (date range, empty PATCH body) sits on one
            // property but Joi reported it against the object itself.
            field: error.contexts?.[reason]?.root === true ? ROOT_FIELD : path,
            reason,
            key
          }
        ];
      }
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
    // The value stays on each error so an array rule can name its bad items;
    // it never leaves this function.
    validationError: { target: false, value: true }
  });

  // Joi ran an object's own rules (`.custom()` date range, `.min(1)`) only once
  // every key had passed, so a root failure never sat beside a field failure.
  // class-validator checks the root rule's property regardless; drop it here.
  const failures = flatten(errors, "");
  const anyFieldFailed = failures.some(
    (failure) => failure.field !== ROOT_FIELD
  );

  return {
    value,
    failures: anyFieldFailed
      ? failures.filter((failure) => failure.field !== ROOT_FIELD)
      : failures
  };
};
