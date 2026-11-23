// libs
import { JsonController, Post, Res } from "routing-controllers";
// types
import type { Response } from "express";
import type { LoginService } from "./services/login";
import type { SessionService } from "@/modules/session/session.service";
// common
import { RateLimit, Respond, ValidBody } from "@/common/routing";
// modules
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS
} from "@/modules/session/constants";
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
  private async startSession(res: Response): Promise<void> {
    const identity = RequestContext.getUser();
    if (!identity) return;

    const session = await this.sessionService.start({
      authId: identity.authId,
      userId: identity.sub,
      roles: identity.roles
    });

    res.cookie(SESSION_COOKIE, session.sid, SESSION_COOKIE_OPTIONS);
  }

  @Post("/")
  @RateLimit("loginByIp")
  @Respond({ message: "login:success.loginSuccessful" })
  async login(
    @ValidBody(LoginBodyDto) body: LoginBodyDto,
    @Res() res: Response
  ) {
    const data = await this.service.passwordLogin(body);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    await this.startSession(res);

    return responseData;
  }

  @Post("/otp/send")
  @RateLimit("loginOtpByIp", "loginOtpByEmail")
  @Respond({ message: "login:success.otpSent" })
  sendOtp(@ValidBody(OtpSendBodyDto) body: OtpSendBodyDto) {
    return this.service.sendOtp(body);
  }

  @Post("/otp/verify")
  @RateLimit("loginByIp")
  @Respond({ message: "login:success.loginSuccessful" })
  async verifyOtp(
    @ValidBody(OtpVerifyBodyDto) body: OtpVerifyBodyDto,
    @Res() res: Response
  ) {
    const data = await this.service.verifyOtp(body);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    await this.startSession(res);

    return responseData;
  }

  @Post("/magic-link/send")
  @RateLimit("magicLinkByIp", "magicLinkByEmail")
  @Respond({ message: "login:success.magicLinkSent" })
  sendMagicLink(@ValidBody(MagicLinkSendBodyDto) body: MagicLinkSendBodyDto) {
    return this.service.sendMagicLink(body);
  }

  @Post("/magic-link/verify")
  @RateLimit("loginByIp")
  @Respond({ message: "login:success.loginSuccessful" })
  async verifyMagicLink(
    @ValidBody(MagicLinkVerifyBodyDto) body: MagicLinkVerifyBodyDto,
    @Res() res: Response
  ) {
    const data = await this.service.verifyMagicLink(body);
    const { refreshToken, ...responseData } = data;

    if (refreshToken) {
      res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
    }

    await this.startSession(res);

    return responseData;
  }
}
