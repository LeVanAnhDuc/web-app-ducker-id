// libs
import express from "express";
import { StatusCodes } from "http-status-codes";
// types
import type { Server } from "http";
import type { AddressInfo } from "net";
import type { RequestHandler } from "express";
import type { RateLimiters } from "@/middlewares/common/rate-limiter.middleware";
import type { CategoryService } from "@/modules/category/services";
import type { UserService } from "@/modules/user/user.service";
// common
import { RATE_LIMITS } from "@/middlewares/common/rate-limiter.middleware";
import {
  handleError,
  handleNotFound
} from "@/middlewares/filters/error.filter";
// modules
import { CategoryController } from "@/modules/category/category.controller";
import { UserController } from "@/modules/user/user.controller";
// others
import { i18nMiddleware } from "@/i18n";
import { RequestContext } from "@/utils/request-context";
import { mountControllers } from "../mount";

const passThrough: RequestHandler = (_req, _res, next) => next();
const rl = Object.fromEntries(
  Object.keys(RATE_LIMITS).map((name) => [name, passThrough])
) as unknown as RateLimiters;

const getPublicProfile = jest.fn();
const listPublic = jest.fn();

let server: Server;
let origin: string;

beforeAll(async () => {
  const app = express();
  app.use(i18nMiddleware);
  app.use(express.json());
  app.use(RequestContext.middleware());
  mountControllers(
    app,
    [
      new UserController({ getPublicProfile } as unknown as UserService),
      new CategoryController({ listPublic } as unknown as CategoryService)
    ],
    rl
  );
  app.use(handleNotFound);
  app.use(handleError);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, () => resolve(started));
  });
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("profile routes over HTTP", () => {
  it("answers /users/me as the guarded action, never as /users/:id", async () => {
    const res = await fetch(`${origin}/api/v1/users/me`);

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(getPublicProfile).not.toHaveBeenCalled();
  });

  it("sets Cache-Control and still wraps the data for the public categories", async () => {
    listPublic.mockResolvedValue([{ slug: "tools" }]);

    const res = await fetch(`${origin}/api/v1/apps/categories`);
    const body = (await res.json()) as { data: unknown };

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
    expect(body.data).toEqual([{ slug: "tools" }]);
  });
});
