// types
import type { Request, Response, NextFunction } from "express";
import type { Schema } from "joi";
import type { ValidationErrorItem } from "@/types/common";
// common
import { ValidationError } from "@/exceptions";

const validationPipe =
  (source: "body" | "params" | "query", schema: Schema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    // Express 5 leaves req.body undefined when no body was sent; validate it
    // as an empty object so a required field is reported missing.
    const data = req[source] ?? {};
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors: ValidationErrorItem[] = error.details.map((detail) => ({
        field: detail.path.join("."),
        reason: detail.type,
        message: req.t(detail.message as I18n.Key)
      }));

      throw new ValidationError({
        key: "common:errors.validationFailed",
        errors
      });
    }

    // req.query is a getter in Express 5 and cannot be assigned; shadow it
    // with an own property so handlers read the validated value.
    Object.defineProperty(req, source, {
      value,
      writable: true,
      enumerable: true,
      configurable: true
    });
    next();
  };

export const bodyPipe = (schema: Schema) => validationPipe("body", schema);
export const paramsPipe = (schema: Schema) => validationPipe("params", schema);
export const queryPipe = (schema: Schema) => validationPipe("query", schema);
