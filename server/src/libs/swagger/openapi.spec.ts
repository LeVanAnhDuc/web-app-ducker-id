// libs
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import express from "express";
import { getMetadataStorage, IsDefined, IsString } from "class-validator";
import {
  Get,
  getMetadataArgsStorage,
  JsonController,
  Post
} from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { Dirent } from "fs";
import type { Server } from "http";
import type { AddressInfo } from "net";
import type { OpenAPIV3 } from "openapi-types";
import type { RedisClientType } from "redis";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
// common
import { isDocumented } from "@/common/openapi/bridge";
import {
  isNamedValueClass,
  readRouteMeta,
  Respond,
  ValidBody
} from "@/common/routing";
// others
import { i18nMiddleware } from "@/i18n";
import { createModules } from "@/loaders/modules";
import { RequestContext } from "@/utils/request-context";
import { mountHttp } from "@/loaders/http";
import { buildOpenApiSpec } from "./openapi";
import { diffOperations, resolveRefs } from "@test/helpers/openapi-diff";

/** The modules with a frozen fixture: `test/fixtures/openapi/<module>.json`. */
const FIXTURES_DIR = join(__dirname, "../../../test/fixtures/openapi");
const FIXTURE_MODULES = readdirSync(FIXTURES_DIR)
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.replace(/\.json$/, ""))
  .sort();

/**
 * Differences from the frozen hand-written operations
 * (`test/fixtures/openapi/<module>.json`) that are corrections, not drift.
 */
const ACCEPTED_DIFFS: Record<string, string[]> = {
  favorite: [
    // `sort` defaults to recent in the service (`favorite.list`), not on the DTO, so no schema default is generated; the description says it.
    'GET /users/me/favorites: parameter query sort default is "recent" in hand-written, none in generated',
    // authGuard can answer 403 AUTH_PASSWORD_CHANGE_REQUIRED (a temporary-password session); the hand-written docs never listed it.
    "GET /users/me/favorites: response status 403 only in generated",
    "POST /users/me/favorites/{appId}: response status 403 only in generated",
    "DELETE /users/me/favorites/{appId}: response status 403 only in generated"
  ],
  "recent-app": [
    // [400] The API answers a validation failure with 400 VALIDATION_ERROR; nothing in recent-app can throw 422 (grep of the module and the exceptions), so the hand-written 422 was wrong and is dropped.
    // [403] authGuard can answer 403 AUTH_PASSWORD_CHANGE_REQUIRED (a temporary-password session); the hand-written docs never listed it.
    // [stats] The route exists (RecentAppController.stats) and the launcher uses it; the hand-written docs left it out.
    "GET /users/me/recent-apps: response status 422 only in hand-written", // [400]
    "GET /users/me/recent-apps: response status 400 only in generated", // [400]
    "GET /users/me/recent-apps: response status 403 only in generated", // [403]
    "DELETE /users/me/recent-apps: response status 403 only in generated", // [403]
    "POST /users/me/recent-apps/{appId}: response status 422 only in hand-written", // [400]
    "POST /users/me/recent-apps/{appId}: response status 400 only in generated", // [400]
    "POST /users/me/recent-apps/{appId}: response status 403 only in generated", // [403]
    "DELETE /users/me/recent-apps/{appId}: response status 422 only in hand-written", // [400]
    "DELETE /users/me/recent-apps/{appId}: response status 400 only in generated", // [400]
    "DELETE /users/me/recent-apps/{appId}: response status 403 only in generated", // [403]
    "POST /users/me/recent-apps/{appId}/restore: response status 422 only in hand-written", // [400]
    "POST /users/me/recent-apps/{appId}/restore: response status 400 only in generated", // [400]
    "POST /users/me/recent-apps/{appId}/restore: response status 403 only in generated", // [403]
    "GET /users/me/recent-apps/stats: only in generated" // [stats]
  ],
  notification: [
    // [default] page, limit and sortOrder are defaulted in the service (`resolvePaging`), not on the DTO, so no schema default is generated.
    // [403] authGuard can answer 403 AUTH_PASSWORD_CHANGE_REQUIRED (a temporary-password session); the hand-written docs never listed it.
    "GET /notifications: parameter query page default is 1 in hand-written, none in generated", // [default]
    "GET /notifications: parameter query limit default is 20 in hand-written, none in generated", // [default]
    'GET /notifications: parameter query sortOrder default is "desc" in hand-written, none in generated', // [default]
    "GET /notifications: response status 403 only in generated", // [403]
    "GET /notifications/unread-count: response status 403 only in generated", // [403]
    "PATCH /notifications/{id}/read: response status 403 only in generated", // [403]
    "PATCH /notifications/read-all: response status 403 only in generated" // [403]
  ],
  "login-history": [
    // [default] page and limit are defaulted in the service (`resolvePaging`), not on the DTO, so no schema default is generated.
    // [date] The validator accepts any ISO 8601 string and keeps it as sent, so the schema is a plain string; the hand-written `format: date` was narrower than the validator.
    // [403] authGuard can answer 403 AUTH_PASSWORD_CHANGE_REQUIRED (a temporary-password session); the hand-written docs never listed it on the user routes (the admin routes already did).
    "GET /login-history: parameter query page default is 1 in hand-written, none in generated", // [default]
    "GET /login-history: parameter query limit default is 20 in hand-written, none in generated", // [default]
    'GET /login-history: parameter query fromDate format is "date" in hand-written, none in generated', // [date]
    'GET /login-history: parameter query toDate format is "date" in hand-written, none in generated', // [date]
    "GET /login-history: response status 403 only in generated", // [403]
    "GET /login-history/stats: response status 403 only in generated", // [403]
    "GET /admin/login-history: parameter query page default is 1 in hand-written, none in generated", // [default]
    "GET /admin/login-history: parameter query limit default is 20 in hand-written, none in generated", // [default]
    'GET /admin/login-history: parameter query fromDate format is "date" in hand-written, none in generated', // [date]
    'GET /admin/login-history: parameter query toDate format is "date" in hand-written, none in generated' // [date]
  ],
  category: [
    // [optional] The route takes an optional Bearer token (`@OptionalAuth`); the hand-written docs described it in prose but declared no security.
    // [nested] The hand-written update `name` was an inline object; the generated one is an `allOf` $ref to UpdateCategoryNameDto (so a description can sit beside it), whose type is on the referenced schema.
    // [400] A malformed `:id` is a validation failure answered with 400 (`@PathVariable`); the hand-written docs left it off this GET.
    'GET /apps/categories: security undefined in hand-written, [{},{"bearerAuth":[]}] in generated', // [optional]
    "PATCH /admin/categories/{id}: request property name type is object in hand-written, none in generated", // [nested]
    "GET /admin/categories/{id}/delete-impact: response status 400 only in generated" // [400]
  ],
  "web-app": [
    // [422] Nothing in the code can answer 422 (grep of src for 422 and UnprocessableEntity finds only hand-written docs); validation failures are 400, so the hand-written 422 was wrong and is dropped.
    // [400] A query failing validation (`@RequestParam`) is answered with 400; the hand-written docs listed 422 instead.
    // [fields] `postLogoutRedirectUris` and `tokenEndpointAuthMethod` are accepted by CreateAppBodyDto and UpdateAppBodyDto; the hand-written bodies left them out.
    // [404] createApp cannot throw NotFoundError: a missing category is `BadRequestError` WEB_APP_CATEGORY_NOT_FOUND (400), so the hand-written 404 on POST is dropped.
    // [403] authGuard can answer 403 AUTH_PASSWORD_CHANGE_REQUIRED (a temporary-password session); the hand-written docs never listed it on the user route (the admin routes already did).
    "GET /admin/apps: response status 422 only in hand-written", // [422]
    "GET /admin/apps: response status 400 only in generated", // [400]
    "POST /admin/apps: request property postLogoutRedirectUris only in generated", // [fields]
    "POST /admin/apps: request property tokenEndpointAuthMethod only in generated", // [fields]
    "POST /admin/apps: response status 404 only in hand-written", // [404]
    "POST /admin/apps: response status 422 only in hand-written", // [422]
    "PATCH /admin/apps/{id}: request property postLogoutRedirectUris only in generated", // [fields]
    "PATCH /admin/apps/{id}: request property tokenEndpointAuthMethod only in generated", // [fields]
    "PATCH /admin/apps/{id}: response status 422 only in hand-written", // [422]
    "GET /apps: response status 422 only in hand-written", // [422]
    "GET /apps: response status 403 only in generated" // [403]
  ],
  user: [
    // [500] No user service throws InternalServerError (grep of modules/user finds none), so the route-specific list has no 500; an unexpected failure still goes through the error filter, which is not documented per route.
    // [403] authGuard can answer 403 AUTH_PASSWORD_CHANGE_REQUIRED (a temporary-password session); the hand-written docs never listed it on the profile routes (the admin routes already did).
    // [404] getMyProfile and updateMyProfile throw NotFoundError USER_NOT_FOUND when the record is gone; the hand-written docs did not list it.
    // [422] Nothing in the code can answer 422 (grep of src for 422 and UnprocessableEntity finds only hand-written docs); a body failing validation is 400.
    // [400] A body or query failing validation is answered with 400 (`@ValidBody`, `@RequestParam`); the hand-written docs listed 422 or nothing.
    // [body] UpdateProfileBodyDto has no required field and no IsNotEmptyBody, so an empty body is accepted and no field is required; the hand-written body was `required: true`.
    // [default] page, limit, sortBy and sortOrder are defaulted in the service (`resolvePaging`: page 1, limit 20, sort createdAt, order desc), not on the DTO, so no schema default is generated; the descriptions say them.
    "GET /users/me: response status 500 only in hand-written", // [500]
    "GET /users/me: response status 403 only in generated", // [403]
    "GET /users/me: response status 404 only in generated", // [404]
    "PATCH /users/me: request body required is true in hand-written, false in generated", // [body]
    "PATCH /users/me: response status 422 only in hand-written", // [422]
    "PATCH /users/me: response status 500 only in hand-written", // [500]
    "PATCH /users/me: response status 400 only in generated", // [400]
    "PATCH /users/me: response status 403 only in generated", // [403]
    "PATCH /users/me: response status 404 only in generated", // [404]
    "GET /admin/users: parameter query page default is 1 in hand-written, none in generated", // [default]
    "GET /admin/users: parameter query limit default is 20 in hand-written, none in generated", // [default]
    'GET /admin/users: parameter query sortBy default is "createdAt" in hand-written, none in generated', // [default]
    'GET /admin/users: parameter query sortOrder default is "desc" in hand-written, none in generated', // [default]
    "GET /admin/users: response status 400 only in generated", // [400]
    "GET /users/{id}: response status 500 only in hand-written" // [500]
  ],
  "contact-admin": [
    // [optional] The route takes an optional Bearer token (`@OptionalAuth`); the hand-written docs described it in prose but declared no security.
    // [403] authGuard can answer 403 AUTH_PASSWORD_CHANGE_REQUIRED (a temporary-password session); the hand-written docs never listed it on the owner routes (the admin routes already did).
    // [pattern] The validator accepts only a 24-hex ObjectId (`IsRequiredObjectId`); the hand-written owner route declared a bare string.
    // [date] The validator accepts any ISO 8601 string and keeps it as sent, so the schema is a plain string; the hand-written `format: date` was narrower than the validator.
    'POST /contact/submit: security undefined in hand-written, [{},{"bearerAuth":[]}] in generated', // [optional]
    "GET /contacts: response status 403 only in generated", // [403]
    'GET /contacts/{id}: parameter path id pattern is none in hand-written, "^[a-fA-F0-9]{24}$" in generated', // [pattern]
    "GET /contacts/{id}: response status 403 only in generated", // [403]
    'GET /admin/contacts: parameter query fromDate format is "date" in hand-written, none in generated', // [date]
    'GET /admin/contacts: parameter query toDate format is "date" in hand-written, none in generated' // [date]
  ],
  signup: [
    // [date] `ToDate` + `IsDate` accept an ISO date or date-time (and a timestamp), so the schema is a `oneOf` of the two string formats with no single top-level type; the hand-written `type: string, format: date` was narrower than the validator.
    // [201] `@Respond({ status: StatusCodes.CREATED })`: the route answers 201; the hand-written docs said 200.
    // [500] createUserAccount throws InternalServerError when the sign-up transaction is aborted (services/complete-signup.ts).
    // [query] BREAKING in #50 (5ce6bf4a): `GET /auth/signup/check-email/:email` became `GET /auth/signup/check-email?email=` — an email is the value looked up, not a resource, and it stays out of the access-logged path. The operation moved, so the fixture's path is only in hand-written and the new one only in generated; the `email` query parameter it now takes is pinned by "documents a named @RequestParam value inline" below.
    "POST /auth/signup/complete: request property dateOfBirth type is string in hand-written, none in generated", // [date]
    "POST /auth/signup/complete: response status 200 only in hand-written", // [201]
    "POST /auth/signup/complete: response status 201 only in generated", // [201]
    "POST /auth/signup/complete: response status 500 only in generated", // [500]
    "GET /auth/signup/check-email/{email}: only in hand-written", // [query]
    "GET /auth/signup/check-email: only in generated" // [query]
  ],
  login: [
    // [422] Nothing in the code can answer 422 (no exception class carries it); a body failing validation is 400, which every route already documented or now derives from `@ValidBody`.
    // [400] `@ValidBody(MagicLinkVerifyBodyDto)`: a body failing validation is answered with 400; the hand-written docs listed 422 instead.
    // [429] `@RateLimit("loginByIp")` on the route, and PasswordLockoutGuard throws TooManyRequestsError (verify-link.ts); the hand-written docs left 429 off.
    "POST /auth/login: response status 422 only in hand-written", // [422]
    "POST /auth/login/otp/send: response status 422 only in hand-written", // [422]
    "POST /auth/login/otp/verify: response status 422 only in hand-written", // [422]
    "POST /auth/login/magic-link/send: response status 422 only in hand-written", // [422]
    "POST /auth/login/magic-link/verify: response status 422 only in hand-written", // [422]
    "POST /auth/login/magic-link/verify: response status 400 only in generated", // [400]
    "POST /auth/login/magic-link/verify: response status 429 only in generated" // [429]
  ],
  "forgot-password": [
    // [422] Nothing in the code can answer 422 (no exception class carries it); a body failing validation is 400.
    // [400] `@ValidBody(...)`: a body failing validation is answered with 400; the hand-written docs listed 422 instead.
    "POST /auth/forgot-password/otp/send: response status 422 only in hand-written", // [422]
    "POST /auth/forgot-password/otp/verify: response status 422 only in hand-written", // [422]
    "POST /auth/forgot-password/magic-link/send: response status 422 only in hand-written", // [422]
    "POST /auth/forgot-password/magic-link/verify: response status 422 only in hand-written", // [422]
    "POST /auth/forgot-password/magic-link/verify: response status 400 only in generated", // [400]
    "POST /auth/forgot-password/reset: response status 422 only in hand-written", // [422]
    "POST /auth/forgot-password/reset: response status 400 only in generated" // [400]
  ],
  "change-password": [
    // [422] Nothing in the code can answer 422 (no exception class carries it); a body failing validation is 400, already documented.
    "PATCH /auth/change-password: response status 422 only in hand-written" // [422]
  ],
  logout: [
    // [204] `@Respond({ status: StatusCodes.NO_CONTENT })`: the route answers 204 with no body; the hand-written docs said 200 with `{ success }`.
    "POST /auth/logout: response status 200 only in hand-written", // [204]
    "POST /auth/logout: response status 204 only in generated" // [204]
  ]
};

// The factories only construct objects, so stub connections are enough.
const stubDeps = () => ({
  // rate-limit-redis loads its scripts at construction and wants a sha back.
  redis: {
    sendCommand: () => Promise.resolve("sha")
  } as unknown as RedisClientType,
  emailDispatcher: {} as EmailDispatcher,
  notificationDispatcher: {} as NotificationDispatcher
});

const { controllers } = createModules(stubDeps());
const document = buildOpenApiSpec(controllers);

const MODULES_DIR = join(__dirname, "../../modules");

/** The controller classes a module's `*.controller.ts` files export. */
const controllersOfModule = (name: string): Function[] => {
  const dir = join(MODULES_DIR, name);
  const known = new Set(
    getMetadataArgsStorage().controllers.map((c) => c.target)
  );
  return (readdirSync(dir, { recursive: true }) as string[])
    .filter((file) => file.endsWith(".controller.ts"))
    .flatMap((file) =>
      Object.values(require(join(dir, file)) as Record<string, unknown>)
    )
    .filter((value): value is Function => known.has(value as Function));
};

const collectRefs = (node: unknown, refs: Set<string>): Set<string> => {
  if (Array.isArray(node)) node.forEach((n) => collectRefs(n, refs));
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") refs.add(value);
      else collectRefs(value, refs);
    }
  }
  return refs;
};

const unresolvedRefs = (doc: OpenAPIV3.Document): string[] =>
  [...collectRefs(doc, new Set())].filter(
    (ref) =>
      ref
        .slice(2)
        .split("/")
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown> | undefined)?.[part],
          doc
        ) === undefined
  );

const VERBS = ["get", "post", "put", "patch", "delete"] as const;

const operationsOf = (doc: OpenAPIV3.Document) =>
  Object.entries(doc.paths).flatMap(([path, item]) =>
    VERBS.filter((verb) => item?.[verb]).map((verb) => ({
      path,
      verb,
      op: item![verb] as OpenAPIV3.OperationObject
    }))
  );

const openApiPathOf = (...parts: string[]): string => {
  const path = parts.join("").replace(/\/{2,}/g, "/");
  return (path.length > 1 ? path.replace(/\/$/, "") : path).replace(
    /:(\w+)/g,
    "{$1}"
  );
};

/**
 * Drift checks 1, 2 and 4 of design §"Guarding against drift" for the given
 * controllers: one operation per action at its method and path, a summary,
 * and the status, security and 400/401/403/429 our decorators imply.
 */
const driftProblems = (
  doc: OpenAPIV3.Document,
  ctors: Function[]
): string[] => {
  const storage = getMetadataArgsStorage();
  const operations = operationsOf(doc);
  const problems: string[] = [];

  for (const Ctor of ctors) {
    const controller = storage.controllers.find((c) => c.target === Ctor);
    for (const action of storage.actions.filter((a) => a.target === Ctor)) {
      const id = `${Ctor.name}.${action.method}`;
      const path = openApiPathOf(
        String(controller?.route ?? ""),
        String(action.route ?? "")
      );
      const found = operations.filter(({ op }) => op.operationId === id);
      if (found.length !== 1) {
        problems.push(`${id} has ${found.length} operations`);
        continue;
      }
      const [{ op, verb, path: documentedAt }] = found;
      if (documentedAt !== path || verb !== action.type) {
        problems.push(
          `${id} is documented at ${verb} ${documentedAt}, mounted at ${action.type} ${path}`
        );
      }
      if (!op.summary) problems.push(`${id} has no summary`);

      const meta = readRouteMeta(Ctor, action.method);
      const guards = [...meta.classGuards, ...meta.methodGuards];
      const required = guards.filter((g) => g !== "optionalAuth");
      const statuses = Object.keys(op.responses);
      const success = statuses.filter((s) => s.startsWith("2"));
      if (success.join() !== String(meta.respond.status)) {
        problems.push(
          `${id} documents ${success.join() || "no 2xx"}, answers ${meta.respond.status}`
        );
      }

      const security = required.length
        ? [{ bearerAuth: [] }]
        : guards.length
          ? [{}, { bearerAuth: [] }]
          : undefined;
      if (JSON.stringify(op.security) !== JSON.stringify(security)) {
        problems.push(`${id} security ${JSON.stringify(op.security)}`);
      }

      const expect = (status: string, derived: boolean) => {
        const wanted = derived || meta.errors.includes(Number(status));
        if (statuses.includes(status) !== wanted) {
          problems.push(`${id} ${wanted ? "lacks" : "has"} ${status}`);
        }
      };
      expect("400", Object.keys(meta.pipes).length > 0);
      expect("401", required.length > 0);
      expect(
        "403",
        guards.some((guard) => guard === "auth" || guard === "admin")
      );
      expect("429", meta.rateLimits.length > 0);
    }
  }
  return problems;
};

class DupFixtureA {
  static readonly make = () => {
    class DuplicatedNameDto {
      @IsString()
      @IsDefined()
      first!: string;
    }
    return DuplicatedNameDto;
  };
}
class DupFixtureB {
  static readonly make = () => {
    class DuplicatedNameDto {
      @IsString()
      @IsDefined()
      second!: string;
    }
    return DuplicatedNameDto;
  };
}

describe("buildOpenApiSpec", () => {
  it("rejects two schemas with one class name", () => {
    const First = DupFixtureA.make();
    const Second = DupFixtureB.make();

    @JsonController("/dup-fixtures")
    @OpenAPI({ tags: ["Dup"] })
    class DupController {
      @Post("/a")
      @OpenAPI({ summary: "a" })
      a(@ValidBody(First) _body: object) {
        return {};
      }

      @Post("/b")
      @OpenAPI({ summary: "b" })
      b(@ValidBody(Second) _body: object) {
        return {};
      }
    }

    expect(() => buildOpenApiSpec([new DupController()])).toThrow(
      /Two classes are named DuplicatedNameDto: .*openapi\.spec\.ts:\d+.*openapi\.spec\.ts:\d+/
    );
  });

  it("ignores the classes built for named values, though several are named id", () => {
    const { validationMetadatas } = getMetadataStorage() as unknown as {
      validationMetadatas: Map<unknown, unknown>;
    };
    const namedIds = [...validationMetadatas.keys()].filter(
      (target) =>
        isNamedValueClass(target) && (target as Function).name === "id"
    );

    // Built without a duplicate-name error, and none of them is a schema.
    expect(namedIds.length).toBeGreaterThan(1);
    const schemas = Object.keys(document.components?.schemas ?? {});
    expect(schemas).not.toContain("id");
    expect(schemas).not.toContain("appId");
    expect(schemas).not.toContain("email");
    expect(schemas).not.toContain("");
  });

  it("documents a named @PathVariable value inline, with the example passed among its rules", () => {
    const op = (document.paths["/admin/categories/{id}/delete-impact"] ?? {})
      .get as OpenAPIV3.OperationObject;

    expect(op.parameters).toEqual([
      {
        in: "path",
        name: "id",
        required: true,
        schema: expect.objectContaining({
          type: "string",
          pattern: "^[a-fA-F0-9]{24}$",
          example: "507f1f77bcf86cd799439012",
          description: "MongoDB ObjectId of the category"
        })
      }
    ]);
  });

  it("documents a named @RequestParam value inline (check-email moved from the path in #50)", () => {
    const op = (document.paths["/auth/signup/check-email"] ?? {})
      .get as OpenAPIV3.OperationObject;

    expect(document.paths["/auth/signup/check-email/{email}"]).toBeUndefined();
    expect(op.parameters).toEqual([
      {
        in: "query",
        name: "email",
        required: true,
        schema: expect.objectContaining({
          type: "string",
          example: "user@example.com",
          description: "Email address to check"
        })
      }
    ]);
    expect(
      (op.parameters as OpenAPIV3.ParameterObject[])[0].schema
    ).toHaveProperty("pattern");
    expect(op.responses["400"]).toBeDefined();
  });

  it("has no $ref to Array or Object anywhere", () => {
    const refs = [...collectRefs(document, new Set())];
    expect(refs.filter((ref) => /\/(Array|Object)$/.test(ref))).toEqual([]);
  });

  it("resolves every local $ref (drift check 3)", () => {
    expect(unresolvedRefs(document)).toEqual([]);
  });

  it("catches a controller operation without a summary", () => {
    class Body {
      @IsString()
      @IsDefined()
      name!: string;
    }

    @JsonController("/drift-fixtures")
    @OpenAPI({ tags: ["Drift"] })
    class DriftFixtureController {
      @Get("/")
      @OpenAPI({ summary: "List" })
      list() {
        return [];
      }

      @Post("/:id")
      @Respond({ status: 201 })
      create(@ValidBody(Body) _body: Body) {
        return undefined;
      }
    }

    const doc = buildOpenApiSpec([
      ...controllers,
      new DriftFixtureController()
    ]);
    expect(driftProblems(doc, [DriftFixtureController])).toEqual([
      "DriftFixtureController.create has no summary"
    ]);
    expect(unresolvedRefs(doc)).toEqual([]);
    expect(doc.paths["/auth/login"]).toEqual(document.paths["/auth/login"]);
  });

  it("documents every controller and has exactly 63 operations", () => {
    const undocumented = controllers
      .map((instance) => instance.constructor)
      .filter((Ctor) => !isDocumented(Ctor));
    expect(undocumented.map((Ctor) => Ctor.name)).toEqual([]);
    expect(operationsOf(document)).toHaveLength(63);
  });

  it("lists every controller of every module in the document's controllers", () => {
    const modules = (
      readdirSync(MODULES_DIR, { withFileTypes: true }) as Dirent[]
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const found = modules.flatMap(controllersOfModule).map((c) => c.name);
    expect(found.sort()).toEqual(
      controllers.map((instance) => instance.constructor.name).sort()
    );
  });

  it("describes every tag a controller uses exactly once, and no other", () => {
    const used = new Set(
      operationsOf(document).flatMap(({ op }) => op.tags ?? [])
    );
    const described = (document.tags ?? []).map((tag) => tag.name);
    expect(new Set(described).size).toBe(described.length);
    expect([...used].sort()).toEqual([...described].sort());
    for (const tag of document.tags ?? []) {
      expect(tag.description).toBeTruthy();
    }
  });

  // The refresh token lives only in its HttpOnly cookie (BUG-AUTH-07); a
  // schema that names it would document a body that leaks it to page script.
  it("has no refreshToken property in any schema", () => {
    const named = (node: unknown, path: string, found: string[]): string[] => {
      if (Array.isArray(node)) {
        node.forEach((item, i) => named(item, `${path}[${i}]`, found));
      } else if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node)) {
          if (
            key === "properties" &&
            value &&
            typeof value === "object" &&
            "refreshToken" in value
          ) {
            found.push(path);
          }
          named(value, `${path}.${key}`, found);
        }
      }
      return found;
    };
    expect(named(document, "document", [])).toEqual([]);
  });

  describe("drift checks over every mounted action", () => {
    const all = controllers.map((instance) => instance.constructor);

    it.each(FIXTURE_MODULES)(
      "%s: generated operations match the hand-written ones",
      (module) => {
        const frozen = JSON.parse(
          readFileSync(
            join(__dirname, `../../../test/fixtures/openapi/${module}.json`),
            "utf8"
          )
        ) as OpenAPIV3.PathsObject;
        // A fixture that froze nothing, or operations nothing generates,
        // would make an empty diff mean nothing.
        expect(
          operationsOf({ paths: frozen } as OpenAPIV3.Document).length
        ).toBeGreaterThan(0);
        // The module's own operations, by controller: a path prefix would also
        // catch another module's routes under it (`/users/me/favorites`).
        const owners = controllersOfModule(module).map((c) => `${c.name}.`);
        const generatedPaths: OpenAPIV3.PathsObject = {};
        for (const { path, verb, op } of operationsOf(document)) {
          if (owners.some((owner) => op.operationId?.startsWith(owner))) {
            generatedPaths[path] = { ...generatedPaths[path], [verb]: op };
          }
        }
        expect(Object.keys(generatedPaths).length).toBeGreaterThan(0);
        expect(
          diffOperations(frozen, resolveRefs(generatedPaths, document))
        ).toEqual(ACCEPTED_DIFFS[module] ?? []);
      }
    );

    it("has one operation per action, each with a summary, status, security and derived errors (checks 1, 2, 4)", () => {
      expect(driftProblems(document, all)).toEqual([]);
    });
  });
});

describe("/api-docs over HTTP", () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    // What app.ts puts ahead of mountHttp that the error filter reads.
    const app = express();
    app.use(i18nMiddleware);
    app.use(RequestContext.middleware());
    const deps = stubDeps();
    const modules = createModules(deps);
    mountHttp(app, {
      redis: deps.redis,
      bullBoardRouter: express.Router(),
      oauthRouter: modules.oauthRouter,
      controllers: modules.controllers,
      rateLimiters: modules.rateLimiters
    });
    server = await new Promise<Server>((resolve) => {
      const started = app.listen(0, () => resolve(started));
    });
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("serves the document at /api-docs.json", async () => {
    const res = await fetch(`${origin}/api-docs.json`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as OpenAPIV3.Document;
    expect(body.openapi).toBe("3.0.3");
    expect(body).toEqual(JSON.parse(JSON.stringify(document)));
  });

  it("embeds the generated document in the Swagger UI assets", async () => {
    const res = await fetch(`${origin}/api-docs/swagger-ui-init.js`);
    expect(res.status).toBe(200);
    const script = await res.text();
    expect(script).toContain('"openapi": "3.0.3"');
    expect(script).toContain("/auth/login/otp/send");
    expect(script).toContain("/admin/categories/{id}/delete-impact");
  });

  it("serves the Swagger UI at /api-docs", async () => {
    const res = await fetch(`${origin}/api-docs`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    expect(await res.text()).toContain("Ducker ID API Documentation");
  });

  it("still answers an unknown /api/v1 path with the 404 envelope", async () => {
    const res = await fetch(`${origin}/api/v1/no-such-route`);
    expect(res.status).toBe(404);
    expect(((await res.json()) as { code: string }).code).toBe("NOT_FOUND");
  });
});
