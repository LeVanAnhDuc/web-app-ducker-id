// types
import type { Request, Response, NextFunction } from "express";
import type { Schema } from "joi";
import type { ValidationErrorItem } from "@/types/common";
// common
import { ValidationError } from "@/common/exceptions";

const validationPipe =
  (source: "body" | "params" | "query", schema: Schema) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req[source];
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
          i18nMessage: (t) => t("common:errors.validationFailed"),
          errors
        });
      }

      req[source] = value;
      next();
    } catch (error) {
      next(error);
    }
  };

export const bodyPipe = (schema: Schema) => validationPipe("body", schema);
export const paramsPipe = (schema: Schema) => validationPipe("params", schema);
export const queryPipe = (schema: Schema) => validationPipe("query", schema);
