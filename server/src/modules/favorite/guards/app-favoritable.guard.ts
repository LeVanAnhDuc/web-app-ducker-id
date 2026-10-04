// types
import type { WebAppRepository } from "@/modules/web-app/repositories/web-app.repository";
// commons
import { NotFoundError } from "@/common/exceptions";
// modules
import { isAppVisibleTo } from "@/modules/web-app/helpers";
// others
import { ERROR_CODES } from "@/constants/error-code";

export class AppFavoritableGuard {
  constructor(private readonly webAppRepo: WebAppRepository) {}

  async assert(appId: string, role?: string): Promise<void> {
    const app = await this.webAppRepo.findById(appId);

    if (!isAppVisibleTo(app, role)) {
      throw new NotFoundError({
        i18nMessage: (t) => t("favorite:errors.appNotFound"),
        code: ERROR_CODES.FAVORITE_APP_NOT_FOUND
      });
    }
  }
}
