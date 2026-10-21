// types
import type { Request, Response } from "express";
import type { LoginService } from "./services/login";
import type { SessionService } from "@/modules/session/services";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";
// others
import { makeMockRequest } from "@test/helpers/request.helper";
import { LoginController } from "./login.controller";

const EMAIL = "user@example.com";

type ResponseMock = {
  status: jest.Mock;
  json: jest.Mock;
  cookie: jest.Mock;
};

function createResponseMock(): ResponseMock {
  const res: ResponseMock = {
    status: jest.fn(),
    json: jest.fn(),
    cookie: jest.fn()
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.cookie.mockReturnValue(res);
  return res;
}

function createServiceMock(): jest.Mocked<LoginService> {
  return {
    passwordLogin: jest.fn(),
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    sendMagicLink: jest.fn(),
    verifyMagicLink: jest.fn(),
    isEmailLocked: jest.fn(),
    resetFailedAttempts: jest.fn()
  } as unknown as jest.Mocked<LoginService>;
}

const TOKENS_WITH_REFRESH = {
  accessToken: "access-x",
  refreshToken: "refresh-x",
  idToken: "id-x",
  expiresIn: 3600
};

const TOKENS_NO_REFRESH = {
  accessToken: "access-x",
  refreshToken: undefined,
  idToken: "id-x",
  expiresIn: 3600
};

describe("LoginController", () => {
  let req: Request;
  let res: ResponseMock;
  let service: jest.Mocked<LoginService>;
  let sessionService: jest.Mocked<SessionService>;
  let controller: LoginController;

  beforeEach(() => {
    req = makeMockRequest();
    (req as unknown as { originalUrl: string }).originalUrl = "/api/login";
    res = createResponseMock();
    service = createServiceMock();
    // RequestContext rỗng ngoài AsyncLocalStorage nên startSession sẽ no-op —
    // controller vẫn phải trả response bình thường.
    sessionService = {
      start: jest.fn()
    } as unknown as jest.Mocked<SessionService>;
    controller = new LoginController(service, sessionService);
  });

  describe("login (password)", () => {
    it("dispatches to service.passwordLogin, sets refresh cookie, returns data without refreshToken", async () => {
      service.passwordLogin.mockResolvedValue(TOKENS_WITH_REFRESH);
      const body = { email: EMAIL, password: "pw" };
      (req as unknown as { body: unknown }).body = body;

      const data = await controller.login(
        req as never,
        res as unknown as Response
      );

      expect(service.passwordLogin).toHaveBeenCalledWith(body, req);
      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_TOKEN,
        "refresh-x",
        REFRESH_TOKEN_COOKIE_OPTIONS
      );

      expect(data).toEqual({
        accessToken: "access-x",
        idToken: "id-x",
        expiresIn: 3600
      });
      expect(data).not.toHaveProperty("refreshToken");
    });

    it("does not set cookie when refreshToken absent", async () => {
      service.passwordLogin.mockResolvedValue(TOKENS_NO_REFRESH);

      await controller.login(req as never, res as unknown as Response);

      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe("sendOtp", () => {
    it("dispatches to service.sendOtp and returns its result", async () => {
      const dto = { success: true, expiresIn: 300, cooldown: 60 };
      service.sendOtp.mockResolvedValue(dto);
      const body = { email: EMAIL };
      (req as unknown as { body: unknown }).body = body;

      const data = await controller.sendOtp(req as never);

      expect(service.sendOtp).toHaveBeenCalledWith(body, req);
      expect(res.cookie).not.toHaveBeenCalled();

      expect(data).toBe(dto);
    });
  });

  describe("verifyOtp", () => {
    it("sets refresh cookie and strips refreshToken from response data", async () => {
      service.verifyOtp.mockResolvedValue(TOKENS_WITH_REFRESH);
      const body = { email: EMAIL, otp: "123456" };
      (req as unknown as { body: unknown }).body = body;

      const data = await controller.verifyOtp(
        req as never,
        res as unknown as Response
      );

      expect(service.verifyOtp).toHaveBeenCalledWith(body, req);
      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_TOKEN,
        "refresh-x",
        REFRESH_TOKEN_COOKIE_OPTIONS
      );

      expect(data).not.toHaveProperty("refreshToken");
    });

    it("skips cookie when refreshToken missing", async () => {
      service.verifyOtp.mockResolvedValue(TOKENS_NO_REFRESH);

      await controller.verifyOtp(req as never, res as unknown as Response);

      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe("sendMagicLink", () => {
    it("dispatches to service.sendMagicLink and returns its result", async () => {
      const dto = { success: true, expiresIn: 900, cooldown: 60 };
      service.sendMagicLink.mockResolvedValue(dto);
      const body = { email: EMAIL };
      (req as unknown as { body: unknown }).body = body;

      const data = await controller.sendMagicLink(req as never);

      expect(service.sendMagicLink).toHaveBeenCalledWith(body, req);
      expect(res.cookie).not.toHaveBeenCalled();

      expect(data).toBe(dto);
    });
  });

  describe("verifyMagicLink", () => {
    it("sets refresh cookie and strips refreshToken from response data", async () => {
      service.verifyMagicLink.mockResolvedValue(TOKENS_WITH_REFRESH);
      const body = { email: EMAIL, token: "tok" };
      (req as unknown as { body: unknown }).body = body;

      const data = await controller.verifyMagicLink(
        req as never,
        res as unknown as Response
      );

      expect(service.verifyMagicLink).toHaveBeenCalledWith(body, req);
      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_TOKEN,
        "refresh-x",
        REFRESH_TOKEN_COOKIE_OPTIONS
      );

      expect(data).not.toHaveProperty("refreshToken");
    });

    it("skips cookie when refreshToken missing", async () => {
      service.verifyMagicLink.mockResolvedValue(TOKENS_NO_REFRESH);

      await controller.verifyMagicLink(
        req as never,
        res as unknown as Response
      );

      expect(res.cookie).not.toHaveBeenCalled();
    });
  });
});
