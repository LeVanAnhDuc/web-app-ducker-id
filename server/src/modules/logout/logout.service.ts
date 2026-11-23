// types
import type { SessionService } from "@/modules/session/session.service";
import type { TokenService } from "@/modules/token/token.service";
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
   *
   * Hai giá trị đọc từ cookie do controller truyền vào; controller cũng là
   * nơi xoá cả hai cookie.
   */
  async logout(
    refreshToken: string | undefined,
    sid: string | null
  ): Promise<void> {
    const userId = RequestContext.requireUserId();

    await this.tokenService.revokeRefreshToken(refreshToken);
    await this.sessionService.end(sid);

    Logger.info("Logout successful", { userId });
  }
}
