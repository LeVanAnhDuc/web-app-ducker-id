// libs
import { Transform } from "class-transformer";

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

// Converts what Joi's `number()` converts (`" 2"`, `"+2"`, `"2.0"`, `"1e2"`) and
// leaves a number past MAX_SAFE_INTEGER as text, which Joi refused as unsafe.
export const ToInt = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== "string" || value.trim() === "") return value;
    const number = Number(value);
    return Number.isFinite(number) &&
      Math.abs(number) <= Number.MAX_SAFE_INTEGER
      ? number
      : value;
  });

// Not `enableImplicitConversion`: that runs `Boolean("false")`, which is true.
export const ToBoolean = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  });

const NUMERIC_STRING = /^[+-]?\d+(\.\d+)?$/;

// Converts what Joi's `date()` converts: a timestamp (number or numeric
// string) or any other string `new Date` can parse. Blank strings stay text,
// which Joi refuses too.
export const ToDate = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    let input: number | string;
    if (typeof value === "number") input = value;
    else if (typeof value === "string" && value.trim() !== "")
      input = NUMERIC_STRING.test(value) ? parseFloat(value) : value;
    else return value;

    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? value : date;
  });
