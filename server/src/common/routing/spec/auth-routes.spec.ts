// libs
import express from "express";
import cookieParser from "cookie-parser";
import { StatusCodes } from "http-status-codes";
// types
import type { Server } from "http";
import type { AddressInfo } from "net";
import type { RequestHandler } from "express";
import type { RateLimiters } from "@/middlewares/common/rate-limiter.middleware";
import type { LoginService } from "@/modules/login/services/login";
import type { SessionService } from "@/modules/session/services";
import type { TokenService } from "@/modules/token/services";
// common
import { RATE_LIMITS } from "@/middlewares/common/rate-limiter.middleware";
import {
  handleError,
  handleNotFound
} from "@/middlewares/filters/error.filter";
// modules
import { LoginController } from "@/modules/login/login.controller";
import { TokenController } from "@/modules/token/token.controller";
import { REFRESH_TOKEN } from "@/modules/token/constants";
// others
import { i18nMiddleware } from "@/i18n";
import { RequestContext } from "@/utils/request-context";
import { mountControllers } from "../mount";

const passThrough: RequestHandler = (_req, _res, next) => next();
const rl = Object.fromEntries(
  Object.keys(RATE_LIMITS).map((name) => [name, passThrough])
) as unknown as RateLimiters;

const passwordLogin = jest.fn();
const startSession = jest.fn();
const refreshAccessToken = jest.fn();

let server: Server;
let origin: string;

beforeAll(async () => {
  const app = express();
  app.use(i18nMiddleware);
  app.use(express.json());
  app.use(cookieParser());
  app.use(RequestContext.middleware());
  mountControllers(
    app,
    [
      new LoginController(
        { passwordLogin } as unknown as LoginService,
        { start: startSession } as unknown as SessionService
      ),
      new TokenController({ refreshAccessToken } as unknown as TokenService)
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

describe("auth routes over HTTP", () => {
  it("POST /auth/login sets the refresh cookie and keeps refreshToken out of the envelope", async () => {
    passwordLogin.mockResolvedValue({
      accessToken: "access-x",
      refreshToken: "refresh-x",
      idToken: "id-x",
      expiresIn: 3600
    });

    const res = await fetch(`${origin}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "pw" })
    });
    const raw = await res.text();
    const body = JSON.parse(raw) as { data: Record<string, unknown> };

    expect(res.status).toBe(StatusCodes.OK);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${REFRESH_TOKEN}=refresh-x`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(body.data).toEqual({
      accessToken: "access-x",
      idToken: "id-x",
      expiresIn: 3600
    });
    expect(raw).not.toContain("refreshToken");
    expect(raw).not.toContain("refresh-x");
  });

  it("POST /auth/token/refresh reads the refresh token from the cookie", async () => {
    refreshAccessToken.mockResolvedValue({ accessToken: "access-y" });

    const res = await fetch(`${origin}/api/v1/auth/token/refresh`, {
      method: "POST",
      headers: { cookie: `${REFRESH_TOKEN}=refresh-x` }
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect(refreshAccessToken).toHaveBeenCalledWith("refresh-x");
  });
});
