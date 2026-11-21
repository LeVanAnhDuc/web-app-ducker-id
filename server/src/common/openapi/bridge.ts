// libs
import { getMetadataStorage } from "class-validator";
import { targetConstructorToSchema } from "class-validator-jsonschema";
import { StatusCodes } from "http-status-codes";
import { getMetadataArgsStorage } from "routing-controllers";
import {
  getOpenAPIMetadata,
  OpenAPI,
  routingControllersToSpec
} from "routing-controllers-openapi";
// types
import type { OpenAPIV3 } from "openapi-types";
import type { IRoute } from "routing-controllers-openapi";
import type { RespondType } from "@/common/routing/metadata";
// common
import { readRouteMeta } from "@/common/routing/metadata";
// others
import { API_ERROR_RESPONSES } from "./api-errors";
import { jsonSchemaOptions, SCHEMA_REF_PREFIX } from "./converters";
import { normalizePathKeys } from "./normalize-path-keys";
import { normalizeRefSiblings } from "./normalize-ref-siblings";

type Operation = OpenAPIV3.OperationObject;
type Parameter = OpenAPIV3.ParameterObject;
type Schema = OpenAPIV3.SchemaObject;

const responseRef = (name: string): OpenAPIV3.ReferenceObject => ({
  $ref: `#/components/responses/${name}`
});

const ENVELOPE = { $ref: `${SCHEMA_REF_PREFIX}SuccessResponse` };

const dtoSchema = (Dto: Function): Schema =>
  normalizeRefSiblings(
    targetConstructorToSchema(Dto, jsonSchemaOptions) as Schema
  );

/**
 * A body is required when the DTO has a required field or `IsNotEmptyBody`
 * (an empty `{}` fails). Otherwise an absent or empty body validates, as the
 * pipe validates a missing body as `{}`.
 */
const isBodyRequired = (Dto: Function): boolean =>
  (dtoSchema(Dto).required?.length ?? 0) > 0 ||
  getMetadataStorage()
    .getTargetValidationMetadatas(Dto, "", true, false)
    .some((meta) => meta.name === "isNotEmptyBody");

const dataSchema = (type: RespondType): OpenAPIV3.ReferenceObject | Schema =>
  Array.isArray(type)
    ? { type: "array", items: { $ref: SCHEMA_REF_PREFIX + type[0].name } }
    : { $ref: SCHEMA_REF_PREFIX + type.name };

const successResponse = (
  status: number,
  type: RespondType | undefined
): OpenAPIV3.ResponseObject => {
  if (status === StatusCodes.NO_CONTENT) return { description: "No content" };
  return {
    description: status === StatusCodes.CREATED ? "Created" : "Success",
    content: {
      "application/json": {
        // Without a type the runtime omits `data`, so the bare envelope.
        schema: type
          ? {
              allOf: [
                ENVELOPE,
                { type: "object", properties: { data: dataSchema(type) } }
              ]
            }
          : ENVELOPE
      }
    }
  };
};

const queryParameters = (Dto: Function): Parameter[] => {
  const schema = dtoSchema(Dto);
  return Object.entries(schema.properties ?? {}).map(([name, property]) => ({
    in: "query",
    name,
    required: (schema.required ?? []).includes(name),
    schema: property
  }));
};

/**
 * Fills one operation from what our routing decorators recorded — the same
 * store `mountControllers` builds the chain from — so a controller method
 * restates none of it:
 * - path parameters from the `@ValidParams` DTO, query parameters from the
 *   `@ValidQuery` DTO, the request body from the `@ValidBody` DTO (required
 *   only when the DTO has a required field or `IsNotEmptyBody`);
 * - `security` from the guards (`@OptionalAuth` makes it optional);
 * - `responses`, replaced entirely: the `@Respond` status (204 without
 *   content), 400 for any pipe, 401 for a required guard, 403 for `@Auth` or `@Admin`,
 *   429 for any limiter, and the `@ApiErrors` statuses.
 *
 * The library's default `summary` and `tags` (the method and class names) are
 * dropped first, so a method without `@OpenAPI({ summary })` shows up as one.
 */
export const routeOperation = (
  op: Operation,
  route: { target: Function; method: string }
): Operation => {
  const meta = readRouteMeta(route.target, route.method);
  const { summary: _summary, tags: _tags, ...out } = op;
  const guards = [...meta.classGuards, ...meta.methodGuards];
  const required = guards.filter((guard) => guard !== "optionalAuth");

  const paramsSchema = meta.pipes.params
    ? dtoSchema(meta.pipes.params)
    : undefined;
  const parameters: Parameter[] = [
    ...((op.parameters ?? []) as Parameter[])
      .filter((param) => param.in === "path")
      .map((param) => ({
        in: "path",
        name: param.name,
        required: true,
        // The library's own schema carries a leaked path-to-regexp pattern.
        schema: paramsSchema?.properties?.[param.name] ?? { type: "string" }
      })),
    ...(meta.pipes.query ? queryParameters(meta.pipes.query) : [])
  ];
  if (parameters.length) out.parameters = parameters;
  else delete out.parameters;

  if (meta.pipes.body) {
    out.requestBody = {
      required: isBodyRequired(meta.pipes.body),
      content: {
        "application/json": {
          schema: { $ref: SCHEMA_REF_PREFIX + meta.pipes.body.name }
        }
      }
    };
  } else delete out.requestBody;

  if (required.length) out.security = [{ bearerAuth: [] }];
  else if (guards.length) out.security = [{}, { bearerAuth: [] }];
  else delete out.security;

  const derived: Record<number, string> = {};
  if (Object.keys(meta.pipes).length) derived[400] = "ValidationError";
  if (required.length) derived[401] = "Unauthorized";
  // authGuard also answers 403 AUTH_PASSWORD_CHANGE_REQUIRED inside a
  // temporary-password session; passwordChangeAuth admits that session and
  // optionalAuth never refuses.
  if (guards.some((guard) => guard === "auth" || guard === "admin")) {
    derived[403] = "Forbidden";
  }
  if (meta.rateLimits.length) derived[429] = "TooManyRequests";

  const responses: OpenAPIV3.ResponsesObject = {
    [meta.respond.status]: successResponse(
      meta.respond.status,
      meta.respond.type
    )
  };
  for (const status of meta.errors) {
    if (derived[status]) {
      throw new Error(
        `${meta.id}: @ApiErrors(${status}) restates a status its decorators already document`
      );
    }
  }
  const errors = { ...derived };
  for (const status of meta.errors)
    errors[status] = API_ERROR_RESPONSES[status];
  for (const status of Object.keys(errors)
    .map(Number)
    .sort((a, b) => a - b)) {
    responses[status] = responseRef(errors[status]);
  }
  out.responses = responses;
  return out;
};

const bridge = (op: unknown, route: IRoute) =>
  routeOperation(op as Operation, route.action) as never;

const bridged = new WeakSet<Function>();

/**
 * Whether a controller class declares its own `@OpenAPI(...)` (its tags), the
 * mark of a controller documented from annotations rather than by a
 * hand-written `swagger/` folder.
 */
export const isDocumented = (Ctor: Function): boolean =>
  getOpenAPIMetadata(Ctor).some((entry) => entry !== bridge);

/**
 * The `paths` the library generates for these controller classes, each
 * operation filled by `routeOperation` and the keys normalised, relative to
 * `/api/v1` (the server URL carries the prefix).
 */
export const generatePaths = (ctors: Function[]): OpenAPIV3.PathsObject => {
  for (const Ctor of ctors) {
    if (bridged.has(Ctor)) continue;
    // Prepended, so it runs before the class's own @OpenAPI and the methods'.
    OpenAPI(bridge)(Ctor);
    bridged.add(Ctor);
  }

  const storage = getMetadataArgsStorage();
  const wanted = new Set(ctors);
  const only = Object.assign(Object.create(storage) as typeof storage, {
    controllers: storage.controllers.filter((c) => wanted.has(c.target)),
    actions: storage.actions.filter((a) => wanted.has(a.target))
  });

  const { paths } = routingControllersToSpec(only) as unknown as {
    paths: OpenAPIV3.PathsObject;
  };
  return normalizePathKeys({ paths }).paths;
};
