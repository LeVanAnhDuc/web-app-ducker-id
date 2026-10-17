// types
import type { Request, Response } from "express";
import type { SessionService } from "@/modules/session/services";
import type { TokenService } from "@/modules/token/services";
// modules
import { REFRESH_TOKEN } from "@/modules/token/constants";
// others
import { Logger } from "@/libs/logger";
import { RequestContext } from "@/utils/request-context";

export class LogoutService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService
  ) {}

  /**
   * Huỷ phiên IdP thật, không chỉ ghi log. Sau khi phiên bị xoá,
   * /oauth/authorize?prompt=none sẽ trả `login_required` — đó là cách việc
   * đăng xuất lan sang app vệ tinh mà không cần back-channel logout.
   *
   * Refresh token của request cũng bị thu hồi: xoá cookie thôi thì một bản
   * sao lấy trước khi logout vẫn đổi ra access token mới (BUG-AUTH-01).
   */
  async logout(req: Request, res: Response): Promise<void> {
    const userId = RequestContext.requireUserId();

    await this.tokenService.revokeRefreshToken(
      (req.cookies as Record<string, string> | undefined)?.[REFRESH_TOKEN]
    );
    await this.sessionService.end(req, res);

    Logger.info("Logout successful", { userId });
  }
}
