// types
import type { Request, Response } from "express";
import type { SessionService } from "@/modules/session/services";
// others
import { Logger } from "@/libs/logger";
import { RequestContext } from "@/utils/request-context";

export class LogoutService {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * Huỷ phiên IdP thật, không chỉ ghi log. Sau khi phiên bị xoá,
   * /oauth/authorize?prompt=none sẽ trả `login_required` — đó là cách việc
   * đăng xuất lan sang app vệ tinh mà không cần back-channel logout.
   */
  async logout(req: Request, res: Response): Promise<void> {
    const userId = RequestContext.requireUserId();

    await this.sessionService.end(req, res);

    Logger.info("Logout successful", { userId });
  }
}
