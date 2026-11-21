// libs
import { Transform } from "class-transformer";

const INTEGER_STRING = /^-?\d+$/;

// Every transform leaves a value it cannot convert untouched, so the type
// rule underneath still sees the original and reports it with its own key.

export const Trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value
  );

export const Lowercase = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.toLowerCase() : value
  );

export const ToInt = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string" && INTEGER_STRING.test(value)
      ? Number(value)
      : value
  );

// Not `enableImplicitConversion`: that runs `Boolean("false")`, which is true.
export const ToBoolean = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  });
