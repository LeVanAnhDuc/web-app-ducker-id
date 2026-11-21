// libs
import { defaultMetadataStorage } from "class-transformer/cjs/storage";
import { getMetadataStorage, ValidationTypes } from "class-validator";
import { defaultConverters } from "class-validator-jsonschema/build/defaultConverters";
// types
import type { ValidationMetadata } from "class-validator/types/metadata/ValidationMetadata";
import type { IOptions } from "class-validator-jsonschema/build/options";
import type { OpenAPIV3 } from "openapi-types";
// validators
import { OBJECTID_PATTERN } from "@/validators/constants";
import { ITEM_CHECK } from "@/validators/validate-dto";
// others
import { isRequestDto } from "./api-property";

type Schema = OpenAPIV3.SchemaObject;
type Converter = (meta: ValidationMetadata, options: IOptions) => Schema | void;

const defaults = defaultConverters as Record<string, Converter>;

// An `EachItem` rule checks every item of an array; its schema describes the
// items, not the array.
const perItem = (meta: ValidationMetadata, schema: Schema): Schema =>
  meta.context?.[ITEM_CHECK] ? { type: "array", items: schema } : schema;

/**
 * Converters for our rules where class-validator-jsonschema's output is wrong
 * or missing (step 0, Q3). Passed to the library as options; nothing patches it.
 */
export const additionalConverters: Record<string, Converter | Schema> = {
  // Our EachItem rules reuse the name "isIn"; the default converter crashes on
  // one without constraints. EachItem passes the allowed values as constraints.
  isIn: (meta, options) =>
    Array.isArray(meta.constraints?.[0])
      ? perItem(meta, (defaults.isIn(meta, options) || {}) as Schema)
      : perItem(meta, { type: "string" }),
  isObjectId: (meta) =>
    perItem(meta, { type: "string", pattern: OBJECTID_PATTERN.source }),
  // toIsoDateString accepts a date and a date-time alike, so no `format`.
  isIsoDateString: {
    type: "string",
    description: "ISO 8601 date or date-time"
  },
  // The default adds `not: { type: "null" }`, noise next to `required`.
  isDefined: {},
  // The default adds `type: "number"`, which would override IsInt's
  // `integer` on a ToInt query field; the type comes from IsInt / IsNumber.
  min: (meta) => ({ minimum: meta.constraints[0] as number }),
  max: (meta) => ({ maximum: meta.constraints[0] as number }),
  // `@IsOptional()` lets `null` through as well as `undefined`; ValidateIf
  // (and so `UnlessMissing`) shares the validation type but skips `undefined` only.
  [ValidationTypes.CONDITIONAL_VALIDATION]: (meta) =>
    meta.name === "isOptional" ? { nullable: true } : {},
  // Any other named rule, and our `apiProperty` constraint. On a request DTO
  // the type comes from the real rules, and reflecting `design:type` would add
  // `$ref Array` to an array field; on a response DTO reflection is the type.
  [ValidationTypes.CUSTOM_VALIDATION]: (meta, options) =>
    isRequestDto(meta.target as Function)
      ? {}
      : defaults[ValidationTypes.CUSTOM_VALIDATION](meta, options)
};

export const SCHEMA_REF_PREFIX = "#/components/schemas/";

/** The options every schema in `/api-docs` is generated with. */
export const jsonSchemaOptions = {
  refPointerPrefix: SCHEMA_REF_PREFIX,
  additionalConverters,
  // Honours @Exclude (the `__body` of IsNotEmptyBody) and @Expose({ name }).
  classTransformerMetadataStorage: defaultMetadataStorage,
  classValidatorMetadataStorage: getMetadataStorage()
} as unknown as Partial<IOptions>;
