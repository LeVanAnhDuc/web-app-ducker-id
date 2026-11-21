// libs
import { getMetadataStorage, registerDecorator } from "class-validator";
import { JSONSchema } from "class-validator-jsonschema";
// types
import type { OpenAPIV3 } from "openapi-types";

type SchemaObject = OpenAPIV3.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;

/** A DTO class, or `[Class]` for an array of them. */
type ClassType = Function | [Function];

export interface ApiPropertyOptions {
  example?: unknown;
  description?: string;
  // Response DTOs only:
  /** A JSON Schema type, a DTO class (`$ref`) or `[Class]` (array of `$ref`). */
  type?: SchemaObject["type"] | ClassType;
  items?: SchemaObject | ReferenceObject;
  nullable?: boolean;
  enum?: unknown[];
  format?: string;
}

export type ApiPropertySchema =
  | ApiPropertyOptions
  | (() => SchemaObject | ReferenceObject);

/**
 * The name of the no-op class-validator constraint ApiProperty registers.
 * class-validator-jsonschema only lists properties that carry class-validator
 * metadata, so an `@Expose`-only response field is invisible without it; with
 * it, the field's type is reflected from `design:type` (step 0, Q4).
 */
export const API_PROPERTY = "apiProperty";

const REQUEST_KEYS = new Set(["example", "description"]);
const RESPONSE_KEYS = new Set([
  ...REQUEST_KEYS,
  "type",
  "items",
  "nullable",
  "enum",
  "format"
]);

const REF = "#/components/schemas/";

/**
 * A class is a **request DTO** when it (or a parent) carries any
 * class-validator rule other than the `apiProperty` constraint itself: then
 * type, required, format, length, pattern and enum come from those rules, and
 * `@ApiProperty` may only add `example` and `description`. A class with no
 * other rule is a **response DTO**, where reflection is blind to `| null`,
 * arrays, enums and nested DTOs, so `@ApiProperty` may say them.
 */
export const isRequestDto = (Ctor: Function): boolean =>
  getMetadataStorage()
    .getTargetValidationMetadatas(Ctor, "", true, false)
    .some((meta) => meta.name !== API_PROPERTY);

interface Declared {
  Ctor: Function;
  property: string;
  options: ApiPropertyOptions;
  schema?: () => SchemaObject | ReferenceObject;
}

// Every property ApiProperty was applied to, so the builder can re-check
// classes whose rules were declared after the decorator ran.
const declared = new Map<Function, Map<string, Declared>>();

const record = (entry: Declared): void => {
  let byProperty = declared.get(entry.Ctor);
  if (!byProperty) {
    byProperty = new Map();
    declared.set(entry.Ctor, byProperty);
  }
  if (!byProperty.has(entry.property)) {
    registerDecorator({
      name: API_PROPERTY,
      target: entry.Ctor,
      propertyName: entry.property,
      validator: { validate: () => true }
    });
  }
  byProperty.set(entry.property, entry);
};

const misuse = ({
  Ctor,
  property,
  options,
  schema
}: Declared): string | null => {
  const keys = Object.keys(options);
  if (isRequestDto(Ctor)) {
    const extra = [
      ...(schema ? ["a schema function"] : []),
      ...keys.filter((key) => !REQUEST_KEYS.has(key))
    ];
    return extra.length
      ? `${Ctor.name}.${property}: @ApiProperty on a request DTO takes only example and description (got ${extra.join(", ")})`
      : null;
  }
  const extra = keys.filter((key) => !RESPONSE_KEYS.has(key));
  return extra.length
    ? `${Ctor.name}.${property}: @ApiProperty does not take ${extra.join(", ")}`
    : null;
};

const isClassType = (type: unknown): type is ClassType =>
  typeof type === "function" ||
  (Array.isArray(type) && typeof type[0] === "function");

const classSchema = (type: ClassType): SchemaObject | ReferenceObject =>
  Array.isArray(type)
    ? { type: "array", items: { $ref: REF + type[0].name } }
    : { $ref: REF + type.name };

// The object form is merged into the schema reflected from `design:type`; a
// class, `items` or a schema function replace it, because reflection turns
// `Dto[]` into `$ref Array` and a type-only import into `$ref Object`.
const toJsonSchema = ({ options, schema }: Declared) => {
  const { type, ...rest } = options;
  if (!schema && !isClassType(type) && !options.items) return options;

  const base: SchemaObject | ReferenceObject = schema
    ? schema()
    : isClassType(type)
      ? classSchema(type)
      : ({ type: type ?? "array" } as SchemaObject);
  if (Object.keys(rest).length === 0) return () => base;
  // OpenAPI 3.0 ignores the siblings of a $ref; allOf keeps them.
  return "$ref" in base
    ? () => ({ ...rest, allOf: [base] })
    : () => ({ ...base, ...rest });
};

/**
 * Documents one DTO property. Repeated calls on a property merge, so
 * `ExposeOrNull` can mark it nullable and a second `@ApiProperty` give its type.
 */
export const ApiProperty =
  (schema: ApiPropertySchema = {}): PropertyDecorator =>
  (target, key) => {
    const Ctor = target.constructor;
    const property = String(key);
    const previous = declared.get(Ctor)?.get(property);
    const entry: Declared =
      typeof schema === "function"
        ? { Ctor, property, options: previous?.options ?? {}, schema }
        : {
            Ctor,
            property,
            options: { ...previous?.options, ...schema },
            schema: previous?.schema
          };

    // Refused before anything is recorded.
    const problem = misuse(entry);
    if (problem) throw new Error(problem);
    record(entry);

    JSONSchema(
      toJsonSchema(entry) as unknown as Parameters<typeof JSONSchema>[0]
    )(target, property);
  };

/**
 * Re-checks every `@ApiProperty`: a property decorated before its class's
 * first rule was registered could not be refused when it was applied.
 */
export const assertApiPropertyUsage = (): void => {
  for (const byProperty of declared.values()) {
    for (const entry of byProperty.values()) {
      const problem = misuse(entry);
      if (problem) throw new Error(problem);
    }
  }
};
