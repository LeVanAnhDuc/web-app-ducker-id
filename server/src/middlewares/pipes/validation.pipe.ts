// types
import type { Request, Response, NextFunction } from "express";
import type { ValidationErrorItem } from "@/types/common";
import type { DtoClass } from "@/validators/validate-dto";
// common
import { ValidationError } from "@/exceptions";
// validators
import { validateDto } from "@/validators/validate-dto";

type Source = "body" | "params" | "query";

const validationPipe =
  (source: Source, Dto: DtoClass<object>) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const { value, failures } = await validateDto(Dto, req[source] ?? {});

      if (failures.length > 0) {
        const errors: ValidationErrorItem[] = failures.map((failure) => ({
          field: failure.field,
          reason: failure.reason,
          message: req.t(failure.key as I18n.Key)
        }));

        throw new ValidationError({
          key: "common:errors.validationFailed",
          errors
        });
      }

      // Express 5 turns req.query into a getter, so plain assignment would
      // either throw or be silently ignored there.
      Object.defineProperty(req, source, {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      });
      next();
    } catch (error) {
      next(error);
    }
  };

export const bodyPipe = (Dto: DtoClass<object>) => validationPipe("body", Dto);
export const paramsPipe = (Dto: DtoClass<object>) =>
  validationPipe("params", Dto);
export const queryPipe = (Dto: DtoClass<object>) =>
  validationPipe("query", Dto);
