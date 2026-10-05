// types
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
// commons
import { NotFoundError } from "@/common/exceptions";
// modules
import { isAppVisibleTo } from "@/modules/web-app/helpers";
// others
import { ERROR_CODES } from "@/constants/error-code";

export class AppFavoritableGuard {
  constructor(
    private readonly webAppRepo: WebAppRepository,
    private readonly accessPolicy: AccessPolicy
  ) {}

  async assert(appId: string, userId: string, role?: string): Promise<void> {
    const [app, scope] = await Promise.all([
      this.webAppRepo.findById(appId),
      this.accessPolicy.resolveScope(userId, role)
    ]);

    if (!isAppVisibleTo(app, scope)) {
      throw new NotFoundError({
        i18nMessage: (t) => t("favorite:errors.appNotFound"),
        code: ERROR_CODES.FAVORITE_APP_NOT_FOUND
      });
    }
  }
}
