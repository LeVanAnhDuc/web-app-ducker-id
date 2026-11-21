/**
 * Step 0 of docs/specs/routing-controllers/design.md: does routing-controllers
 * 0.11.3 work on Express 5, in the order the design relies on? Throwaway —
 * this file is deleted once the routing core lands.
 */
import "reflect-metadata";
// libs
import express, {
  type NextFunction,
  type Request,
  type Response
} from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";
import {
  Delete,
  Get,
  HttpCode,
  JsonController,
  OnUndefined,
  Param,
  Post,
  QueryParam,
  UseBefore,
  useContainer,
  useExpressServer
} from "routing-controllers";

const trace: string[] = [];
const mark =
  (label: string) => (_req: Request, _res: Response, next: NextFunction) => {
    trace.push(label);
    next();
  };

const guard = (req: Request, res: Response, next: NextFunction) => {
  trace.push("guard");
  if (req.headers.authorization !== "ok") {
    res.status(401).json({ code: "UNAUTHORIZED" });
    return;
  }
  next();
};

class FavoriteService {
  list(limit: number) {
    return { items: [], limit };
  }
}

@JsonController("/users/me/favorites")
@UseBefore(guard)
class SpikeFavoriteController {
  constructor(private readonly service: FavoriteService) {}

  @Get("/")
  @UseBefore(mark("limitA"), mark("limitB"))
  list(@QueryParam("limit") limit: number) {
    trace.push("action");
    return this.service.list(Number(limit));
  }

  @Post("/:appId")
  @HttpCode(201)
  add(@Param("appId") appId: string) {
    return { appId };
  }

  @Delete("/:appId")
  @OnUndefined(204)
  remove() {
    return undefined;
  }

  @Get("/boom")
  async boom() {
    throw Object.assign(new Error("async failure"), { status: 418 });
  }

  @Get("/stacked")
  @UseBefore(mark("first"))
  @UseBefore(mark("second"))
  stacked() {
    trace.push("action");
    return {};
  }
}

let server: Server;
let base: string;

beforeAll(async () => {
  const controller = new SpikeFavoriteController(new FavoriteService());
  useContainer({ get: () => controller } as never);

  const app = express();
  app.use(express.json());
  useExpressServer(app, {
    routePrefix: "/api/v1",
    controllers: [SpikeFavoriteController],
    defaultErrorHandler: false,
    validation: false,
    classTransformer: false
  });
  app.use(
    (
      err: Error & { status?: number },
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      res
        .status(err.status ?? 500)
        .json({ code: "FROM_OUR_FILTER", message: err.message });
    }
  );

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/users/me/favorites`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
beforeEach(() => {
  trace.length = 0;
});

const call = (path: string, init: RequestInit = {}) =>
  fetch(`${base}${path}`, {
    ...init,
    headers: { authorization: "ok", ...(init.headers ?? {}) }
  });

describe("routing-controllers 0.11.3 on Express 5", () => {
  it("serves a GET with a query param through the pre-built instance", async () => {
    const res = await call("/?limit=5");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [], limit: 5 });
  });

  it("runs class @UseBefore, then method @UseBefore in list order, then the action", async () => {
    await call("/?limit=1");

    expect(trace).toEqual(["guard", "limitA", "limitB", "action"]);
  });

  it("stops at the class guard before any method middleware", async () => {
    const res = await call("/?limit=1", { headers: { authorization: "no" } });

    expect(res.status).toBe(401);
    expect(trace).toEqual(["guard"]);
  });

  it("runs stacked @UseBefore decorators bottom-up", async () => {
    await call("/stacked");

    expect(trace).toEqual(["guard", "second", "first", "action"]);
  });

  it("answers @HttpCode(201) and @OnUndefined(204)", async () => {
    const created = await call("/app-1", { method: "POST" });
    const removed = await call("/app-1", { method: "DELETE" });

    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ appId: "app-1" });
    expect(removed.status).toBe(204);
    expect(await removed.text()).toBe("");
  });

  it("hands an async rejection to our own error middleware", async () => {
    const res = await call("/boom");

    expect(res.status).toBe(418);
    expect(await res.json()).toEqual({
      code: "FROM_OUR_FILTER",
      message: "async failure"
    });
  });
});
