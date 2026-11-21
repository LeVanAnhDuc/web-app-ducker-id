// types
import type { Request, Response, NextFunction } from "express";
import type { ValidationErrorItem } from "@/types/common";
import type { DtoClass } from "@/validators/validate-dto";
// common
import { ValidationError } from "@/exceptions";
// validators
import { validateDto } from "@/validators/validate-dto";

type Source = "body" | "params" | "query";

// Express 5 forwards a rejected promise to the error handler, so a failure is
// thrown rather than handed to next().
const validationPipe =
  (source: Source, Dto: DtoClass<object>) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Express 5 leaves req.body undefined when no body was sent; validate it
    // as an empty object so a required field is reported missing.
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

export const bodyPipe = (Dto: DtoClass<object>) => validationPipe("body", Dto);
export const paramsPipe = (Dto: DtoClass<object>) =>
  validationPipe("params", Dto);
export const queryPipe = (Dto: DtoClass<object>) =>
  validationPipe("query", Dto);
