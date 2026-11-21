// libs
import { JsonController, Post, Req, Res } from "routing-controllers";
// types
import type { Request, Response } from "express";
import type { LoginService } from "./services/login";
import type { SessionService } from "@/modules/session/services";
// common
import { RateLimit, Respond, ValidBody } from "@/common/routing";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";
// others
import { RequestContext } from "@/utils/request-context";
import {
  LoginBodyDto,
  MagicLinkSendBodyDto,
  MagicLinkVerifyBodyDto,
  OtpSendBodyDto,
  OtpVerifyBodyDto
} from "./dtos/requests";

@JsonController("/auth/login")
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
  private async startSession(req: Request, res: Response): Promise<void> {
    const identity = RequestContext.getUser();
    if (!identity) return;

    await this.sessionService.start({
      authId: identity.authId,
      userId: identity.sub,
      roles: identity.roles,
      req,
      res
    });
  }

  @Post("/")
  @RateLimit("loginByIp")
  @Respond({ message: "login:success.loginSuccessful" })
  async login(
    @ValidBody(LoginBodyDto) body: LoginBodyDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const data = await this.service.passwordLogin(body, req);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    await this.startSession(req, res);

    return responseData;
  }

  @Post("/otp/send")
  @RateLimit("loginOtpByIp", "loginOtpByEmail")
  @Respond({ message: "login:success.otpSent" })
  sendOtp(
    @ValidBody(OtpSendBodyDto) body: OtpSendBodyDto,
    @Req() req: Request
  ) {
    return this.service.sendOtp(body, req);
  }

  @Post("/otp/verify")
  @RateLimit("loginByIp")
  @Respond({ message: "login:success.loginSuccessful" })
  async verifyOtp(
    @ValidBody(OtpVerifyBodyDto) body: OtpVerifyBodyDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const data = await this.service.verifyOtp(body, req);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    await this.startSession(req, res);

    return responseData;
  }

  @Post("/magic-link/send")
  @RateLimit("magicLinkByIp", "magicLinkByEmail")
  @Respond({ message: "login:success.magicLinkSent" })
  sendMagicLink(
    @ValidBody(MagicLinkSendBodyDto) body: MagicLinkSendBodyDto,
    @Req() req: Request
  ) {
    return this.service.sendMagicLink(body, req);
  }

  @Post("/magic-link/verify")
  @RateLimit("loginByIp")
  @Respond({ message: "login:success.loginSuccessful" })
  async verifyMagicLink(
    @ValidBody(MagicLinkVerifyBodyDto) body: MagicLinkVerifyBodyDto,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const data = await this.service.verifyMagicLink(body, req);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    await this.startSession(req, res);

    return responseData;
  }
}
