// libs
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import express from "express";
import { IsDefined, IsString, MaxLength } from "class-validator";
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Post, Res } from "routing-controllers";
// types
import type { Server } from "http";
import type { AddressInfo } from "net";
import type { Express, RequestHandler, Response } from "express";
import type { RateLimiters } from "@/middlewares/common/rate-limiter.middleware";
// common
import { RATE_LIMITS } from "@/middlewares/common/rate-limiter.middleware";
import {
  handleError,
  handleNotFound
} from "@/middlewares/filters/error.filter";
import { bodyPipe } from "@/middlewares/pipes/validation.pipe";
// others
import { i18nMiddleware } from "@/i18n";
import { Logger } from "@/libs/logger";
import { RequestContext } from "@/utils/request-context";
import {
  Auth,
  RateLimit,
  Respond,
  ValidBody,
  ValidParams
} from "../decorators";
import { findDisallowedRoutingImports, mountControllers } from "../mount";

class FixtureBodyDto {
  @MaxLength(2, { message: "validation:fixture.max" })
  @IsString({ message: "validation:fixture.invalid" })
  @IsDefined({ message: "validation:fixture.required" })
  name!: string;
}

class FixtureIdParamsDto {
  @IsString()
  id!: string;
}

const trace: string[] = [];
const fellThrough: string[] = [];

// Fake limiters that only record their name, under a per-app prefix.
const fakeLimiters = (prefix = "") =>
  Object.fromEntries(
    Object.keys(RATE_LIMITS).map((name) => {
      const handler: RequestHandler = (_req, _res, next) => {
        trace.push(`${prefix}rl:${name}`);
        next();
      };
      return [name, handler];
    })
  ) as unknown as RateLimiters;

const rl = fakeLimiters();

@JsonController("/fixtures")
class FixtureController {
  constructor(private readonly who: string = "first") {}

  @Get("/")
  @Respond({ message: "favorite:success.list" })
  list() {
    return { items: [] };
  }

  @Post("/created")
  @Respond({ status: StatusCodes.CREATED, message: "favorite:success.add" })
  create() {
    return undefined;
  }

  @Delete("/:id")
  @Respond({ status: StatusCodes.NO_CONTENT })
  remove(@ValidParams(FixtureIdParamsDto) _params: FixtureIdParamsDto) {
    return undefined;
  }

  @Post("/validated")
  @Respond()
  validated(@ValidBody(FixtureBodyDto) body: FixtureBodyDto) {
    return { received: body.name, isInstance: body instanceof FixtureBodyDto };
  }

  @Get("/raw")
  raw(@Res() res: Response) {
    res.status(StatusCodes.ACCEPTED).json({ raw: true });
    return res;
  }

  @Get("/boom")
  boom() {
    throw new Error("boom");
  }

  @Get("/guarded")
  @RateLimit("updateProfileByIp")
  @Auth()
  guarded() {
    trace.push("action");
    return {};
  }

  @Get("/who")
  whoAmI() {
    return { who: this.who };
  }
}

let server: Server;
let origin: string;

const listen = (app: Express) =>
  new Promise<Server>((resolve) => {
    const started = app.listen(0, () => resolve(started));
  });
const originOf = (running: Server) =>
  `http://127.0.0.1:${(running.address() as AddressInfo).port}`;

beforeAll(async () => {
  const app = express();
  app.use(i18nMiddleware);
  app.use(express.json());
  app.use(RequestContext.middleware());

  // The same DTO behind the plain pipe, to compare error bodies against.
  app.post("/plain", bodyPipe(FixtureBodyDto), (_req, res) => {
    res.json({});
  });

  mountControllers(app, [new FixtureController()], rl);
  // routing-controllers calls next() after it has answered; nothing past the
  // mount should see such a request.
  app.use((req, res, next) => {
    if (res.headersSent) fellThrough.push(req.originalUrl);
    next();
  });
  app.use(handleNotFound);
  app.use(handleError);

  server = await listen(app);
  origin = originOf(server);
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  trace.length = 0;
  fellThrough.length = 0;
});

// vi is the default locale; English unless a test asks otherwise.
const call = (path: string, init: RequestInit = {}) =>
  fetch(`${origin}${path}`, {
    ...init,
    headers: { "accept-language": "en", ...(init.headers ?? {}) }
  });

const postJson = (path: string, body: unknown) =>
  call(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

const json = async (
  res: Awaited<ReturnType<typeof fetch>>
): Promise<Record<string, unknown>> =>
  (await res.json()) as Record<string, unknown>;

const withoutVolatile = ({
  timestamp: _timestamp,
  path: _path,
  ...rest
}: Record<string, unknown>) => rest;

describe("mountControllers", () => {
  it("answers the class root with and without a trailing slash", async () => {
    const bare = await call("/api/v1/fixtures");
    const slashed = await call("/api/v1/fixtures/");

    expect(bare.status).toBe(StatusCodes.OK);
    expect(slashed.status).toBe(StatusCodes.OK);
    expect(await bare.json()).toEqual({
      timestamp: expect.any(String),
      path: "/api/v1/fixtures",
      message: "Favorite apps retrieved successfully.",
      data: { items: [] }
    });
  });

  it("sends the envelope with data omitted when a 201 action returns undefined", async () => {
    const res = await call("/api/v1/fixtures/created", { method: "POST" });
    const body = await res.json();

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(body).toEqual({
      timestamp: expect.any(String),
      path: "/api/v1/fixtures/created",
      message: "App added to favorites."
    });
    expect(body).not.toHaveProperty("data");
  });

  it("does not hand an answered request on to the 404 handler", async () => {
    await call("/api/v1/fixtures");
    await call("/api/v1/fixtures/app-1", { method: "DELETE" });
    await call("/api/v1/fixtures/raw");

    expect(fellThrough).toEqual([]);
  });

  it("sends 204 with an empty body for a NO_CONTENT route", async () => {
    const res = await call("/api/v1/fixtures/app-1", { method: "DELETE" });

    expect(res.status).toBe(StatusCodes.NO_CONTENT);
    expect(await res.text()).toBe("");
  });

  it("translates @Respond message per request", async () => {
    const res = await call("/api/v1/fixtures", {
      headers: { "accept-language": "vi" }
    });

    expect((await json(res)).message).toBe(
      "Lấy danh sách ứng dụng yêu thích thành công."
    );
  });

  it("leaves a response written through @Res untouched", async () => {
    const res = await call("/api/v1/fixtures/raw");

    expect(res.status).toBe(StatusCodes.ACCEPTED);
    expect(await json(res)).toEqual({ raw: true });
  });

  it("injects the validated DTO instance through ValidBody", async () => {
    const res = await postJson("/api/v1/fixtures/validated", {
      name: "ab",
      extra: "stripped"
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect((await json(res)).data).toEqual({
      received: "ab",
      isInstance: true
    });
  });

  it("answers a failed ValidBody with 400 VALIDATION_ERROR and errors[] as bodyPipe does", async () => {
    const routed = await postJson("/api/v1/fixtures/validated", {
      name: "abcd"
    });
    const plain = await postJson("/plain", { name: "abcd" });
    const body = await json(routed);

    expect(routed.status).toBe(StatusCodes.BAD_REQUEST);
    expect(body).toMatchObject({
      code: "VALIDATION_ERROR",
      path: "/api/v1/fixtures/validated",
      errors: [{ field: "name", reason: "maxLength" }]
    });
    expect(withoutVolatile(body)).toEqual(withoutVolatile(await json(plain)));
  });

  it("runs the computed chain and hands a guard's 401 to the error filter", async () => {
    const res = await call("/api/v1/fixtures/guarded");

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
    expect((await json(res)).code).toBe("AUTH_MISSING_TOKEN");
    expect(trace).toEqual(["rl:updateProfileByIp"]);
  });

  it("answers an unknown /api/v1 path with the 404 envelope", async () => {
    const res = await call("/api/v1/nowhere");

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
    expect(await json(res)).toEqual({
      code: "NOT_FOUND",
      message: "Not Found",
      timestamp: expect.any(String),
      path: "/api/v1/nowhere"
    });
  });

  it("logs and answers an unknown throw as 500", async () => {
    const res = await call("/api/v1/fixtures/boom");

    expect(res.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(await json(res)).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server error",
      path: "/api/v1/fixtures/boom"
    });
    expect(Logger.error).toHaveBeenCalledWith(
      "GET /api/v1/fixtures/boom failed",
      expect.any(Error),
      expect.anything()
    );
  });

  it("refuses at mount a user-keyed limiter on a route without a guard", () => {
    @JsonController("/unguarded")
    class UnguardedController {
      @Post("/")
      @RateLimit("recordRecentAppByUser")
      record() {
        return undefined;
      }
    }

    expect(() =>
      mountControllers(express(), [new UnguardedController()], rl)
    ).toThrow(/UnguardedController\.record.*recordRecentAppByUser/);
  });

  it("serves a second app with its own limiters and instances", async () => {
    const second = express();
    second.use(i18nMiddleware);
    mountControllers(
      second,
      [new FixtureController("second")],
      fakeLimiters("second:")
    );
    second.use(handleNotFound);
    second.use(handleError);
    const running = await listen(second);

    try {
      const secondOrigin = originOf(running);
      const headers = { "accept-language": "en" };

      await fetch(`${secondOrigin}/api/v1/fixtures/guarded`, { headers });
      await call("/api/v1/fixtures/guarded");
      expect(trace).toEqual([
        "second:rl:updateProfileByIp",
        "rl:updateProfileByIp"
      ]);

      const fromSecond = await fetch(`${secondOrigin}/api/v1/fixtures/who`, {
        headers
      });
      const fromFirst = await call("/api/v1/fixtures/who");
      expect((await json(fromSecond)).data).toEqual({ who: "second" });
      expect((await json(fromFirst)).data).toEqual({ who: "first" });
    } finally {
      await new Promise<void>((resolve) => running.close(() => resolve()));
    }
  });

  it("refuses to mount the same app twice", () => {
    const app = express();
    mountControllers(app, [new FixtureController()], rl);

    expect(() => mountControllers(app, [new FixtureController()], rl)).toThrow(
      "mountControllers was already called for this app"
    );
  });
});

describe("routing-controllers imports in module controllers", () => {
  it("reports every name off the allowlist, in every import form", () => {
    const fixture = [
      `import { Get, JsonController } from "routing-controllers";`,
      `import type { Action } from "routing-controllers";`,
      `import {`,
      `  UseBefore,`,
      `  Authorized as Guarded,`,
      `  Param,`,
      `  type InterceptorInterface,`,
      `  Req`,
      `} from "routing-controllers";`,
      `import rc, { Res, CurrentUser } from "routing-controllers";`,
      `import * as all from "routing-controllers";`,
      `export { HttpCode } from "routing-controllers";`,
      `export * from "routing-controllers";`,
      `const loaded = require("routing-controllers");`
    ].join("\n");

    expect(findDisallowedRoutingImports(fixture)).toEqual([
      "UseBefore",
      "Authorized",
      "Param",
      "default",
      "CurrentUser",
      "*",
      "HttpCode",
      "*",
      "require(...)"
    ]);
  });

  it("finds none in src/modules/**/*.controller.ts", () => {
    const modulesDir = join(__dirname, "../../../modules");
    const controllers = (
      readdirSync(modulesDir, { recursive: true }) as string[]
    ).filter((file) => file.endsWith(".controller.ts"));
    const offenders = controllers
      .map((file) => ({
        file,
        names: findDisallowedRoutingImports(
          readFileSync(join(modulesDir, file), "utf8")
        )
      }))
      .filter(({ names }) => names.length > 0);

    expect(controllers.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});
