// types
import type { Request, Response } from "express";
import type {
  PasswordLoginRequest,
  OtpSendRequest,
  OtpVerifyRequest,
  MagicLinkSendRequest,
  MagicLinkVerifyRequest
} from "./types";
import type { LoginService } from "./services/login";
import type { SessionService } from "@/modules/session/services";
// common
import { OkSuccess } from "@/common/responses";
// modules
import { REFRESH_TOKEN_COOKIE_OPTIONS } from "@/modules/token/constants";
import { REFRESH_TOKEN } from "@/modules/token/constants";
// others
import { RequestContext } from "@/utils/request-context";

export class LoginController {
  constructor(
    private readonly service: LoginService,
    private readonly sessionService: SessionService
  ) {}

  /**
   * Mở phiên IdP (cookie `sid`) sau khi đăng nhập thành công. Phiên này là thứ
   * /oauth/authorize đọc để biết user đã đăng nhập — access token nằm trong bộ
   * nhớ của tab nên một navigation từ app vệ tinh sang không thấy được nó.
   *
   * Danh tính lấy từ RequestContext do LoginCompletionService đặt vào.
   */
  private startSession = async (req: Request, res: Response): Promise<void> => {
    const identity = RequestContext.getUser();
    if (!identity) return;

    await this.sessionService.start({
      authId: identity.authId,
      userId: identity.sub,
      roles: identity.roles,
      req,
      res
    });
  };

  login = async (req: PasswordLoginRequest, res: Response): Promise<void> => {
    const data = await this.service.passwordLogin(req.body, req);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    await this.startSession(req, res);

    new OkSuccess({
      data: responseData,
      message: "login:success.loginSuccessful"
    }).send(req, res);
  };

  sendOtp = async (req: OtpSendRequest, res: Response): Promise<void> => {
    const data = await this.service.sendOtp(req.body, req);
    new OkSuccess({ data, message: "login:success.otpSent" }).send(req, res);
  };

  verifyOtp = async (req: OtpVerifyRequest, res: Response): Promise<void> => {
    const data = await this.service.verifyOtp(req.body, req);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    await this.startSession(req, res);

    new OkSuccess({
      data: responseData,
      message: "login:success.loginSuccessful"
    }).send(req, res);
  };

  sendMagicLink = async (
    req: MagicLinkSendRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.sendMagicLink(req.body, req);
    new OkSuccess({ data, message: "login:success.magicLinkSent" }).send(
      req,
      res
    );
  };

  verifyMagicLink = async (
    req: MagicLinkVerifyRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.verifyMagicLink(req.body, req);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    await this.startSession(req, res);

    new OkSuccess({
      data: responseData,
      message: "login:success.loginSuccessful"
    }).send(req, res);
  };
}
