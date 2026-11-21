// libs
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import express from "express";
import { IsDefined, IsString } from "class-validator";
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
import { readRouteMeta, Respond, ValidBody } from "@/common/routing";
// others
import { i18nMiddleware } from "@/i18n";
import { createModules } from "@/loaders/modules";
import { RequestContext } from "@/utils/request-context";
import { mountHttp } from "@/loaders/http";
import { buildOpenApiSpec } from "./openapi";
import { diffOperations, resolveRefs } from "@test/helpers/openapi-diff";

/**
 * Modules whose `/api/v1` routes are documented from their controllers. The
 * drift checks below cover exactly these; Task 6 of
 * docs/specs/openapi-annotations/plan.md drops the list and covers every route.
 */
export const GENERATED_MODULES: string[] = [
  "favorite",
  "recent-app",
  "notification",
  "login-history"
];

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

const controllersOfGenerated = (): number =>
  GENERATED_MODULES.flatMap(controllersOfModule).length;

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

  it("has no $ref to Array or Object anywhere", () => {
    const refs = [...collectRefs(document, new Set())];
    expect(refs.filter((ref) => /\/(Array|Object)$/.test(ref))).toEqual([]);
  });

  it("resolves every local $ref (drift check 3)", () => {
    expect(unresolvedRefs(document)).toEqual([]);
  });

  it("documents a generated controller's operations, and catches a missing summary", () => {
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
    // The generated operation sits beside the hand-written ones.
    expect(doc.paths["/auth/login"]).toEqual(document.paths["/auth/login"]);
  });

  // Until every module is generated, a hand-written module's paths could
  // vanish unnoticed (a dropped barrel import in openapi.ts). Every controller
  // of a module not in GENERATED_MODULES must have a documented path under its
  // route. Task 6 drops this check once the drift checks assert all 63
  // operations.
  const handWrittenRoutes = (
    readdirSync(MODULES_DIR, { withFileTypes: true }) as Dirent[]
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((module) => !GENERATED_MODULES.includes(module))
    .flatMap((module) =>
      controllersOfModule(module).map((Ctor) => [
        module,
        String(
          getMetadataArgsStorage().controllers.find((c) => c.target === Ctor)
            ?.route ?? ""
        )
      ])
    );

  it("finds the controllers of the hand-written modules", () => {
    expect(handWrittenRoutes).toHaveLength(22 - controllersOfGenerated());
  });

  it.each(handWrittenRoutes)(
    "documents %s routes under %s while the module is hand-written",
    (_module, prefix) => {
      expect(
        Object.keys(document.paths).some(
          (p) => p === prefix || p.startsWith(`${prefix}/`)
        )
      ).toBe(true);
    }
  );

  describe("drift checks over GENERATED_MODULES", () => {
    const generated = GENERATED_MODULES.flatMap(controllersOfModule);

    it("documents from annotations exactly the controllers of GENERATED_MODULES", () => {
      const documented = controllers
        .map((instance) => instance.constructor)
        .filter(isDocumented);
      expect(documented.map((c) => c.name).sort()).toEqual(
        generated.map((c) => c.name).sort()
      );
    });

    it.each(GENERATED_MODULES)(
      "%s: generated operations match the hand-written ones",
      (module) => {
        const frozen = JSON.parse(
          readFileSync(
            join(__dirname, `../../../test/fixtures/openapi/${module}.json`),
            "utf8"
          )
        ) as OpenAPIV3.PathsObject;
        const prefixes = Object.keys(frozen);
        // A fixture that froze nothing, or paths nothing generates, would
        // make an empty diff mean nothing.
        expect(
          operationsOf({ paths: frozen } as OpenAPIV3.Document).length
        ).toBeGreaterThan(0);
        const generatedPaths = Object.fromEntries(
          Object.entries(document.paths).filter(([path]) =>
            prefixes.some((p) => path === p || path.startsWith(`${p}/`))
          )
        );
        expect(Object.keys(generatedPaths).length).toBeGreaterThan(0);
        expect(
          diffOperations(frozen, resolveRefs(generatedPaths, document))
        ).toEqual(ACCEPTED_DIFFS[module] ?? []);
      }
    );

    it("has one operation per action, each with a summary, status, security and derived errors (checks 1, 2, 4)", () => {
      expect(driftProblems(document, generated)).toEqual([]);
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
