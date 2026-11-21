// libs
import Joi from "joi";
// types
import type { Request, Response, NextFunction } from "express";
import type { Schema } from "joi";
import type { ValidationErrorItem } from "@/types/common";
import type { DtoClass } from "@/validators/validate-dto";
// common
import { ValidationError } from "@/exceptions";
// validators
import { validateDto } from "@/validators/validate-dto";

type Source = "body" | "params" | "query";
type SchemaOrDto = Schema | DtoClass<object>;

const validateWithJoi = (
  schema: Schema,
  data: unknown,
  req: Request
): { value: unknown; errors: ValidationErrorItem[] } => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  const errors: ValidationErrorItem[] = (error?.details ?? []).map(
    (detail) => ({
      field: detail.path.join("."),
      reason: detail.type,
      message: req.t(detail.message as I18n.Key)
    })
  );

  return { value, errors };
};

const validateWithDto = async (
  Dto: DtoClass<object>,
  data: unknown,
  req: Request
): Promise<{ value: unknown; errors: ValidationErrorItem[] }> => {
  const { value, failures } = await validateDto(Dto, data);

  const errors: ValidationErrorItem[] = failures.map((failure) => ({
    field: failure.field,
    reason: failure.reason,
    message: req.t(failure.key as I18n.Key)
  }));

  return { value, errors };
};

const validationPipe =
  (source: Source, schemaOrDto: SchemaOrDto) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: unknown = req[source] ?? {};
      const { value, errors } = Joi.isSchema(schemaOrDto)
        ? validateWithJoi(schemaOrDto, data, req)
        : await validateWithDto(schemaOrDto, data, req);

      if (errors.length > 0) {
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

export const bodyPipe = (schemaOrDto: SchemaOrDto) =>
  validationPipe("body", schemaOrDto);
export const paramsPipe = (schemaOrDto: SchemaOrDto) =>
  validationPipe("params", schemaOrDto);
export const queryPipe = (schemaOrDto: SchemaOrDto) =>
  validationPipe("query", schemaOrDto);
