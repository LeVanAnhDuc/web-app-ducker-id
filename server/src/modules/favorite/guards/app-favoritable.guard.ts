// types
import type { WebAppRepository } from "@/modules/web-app/repositories";
// commons
import { NotFoundError } from "@/common/exceptions";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
import { WEB_APP_STATUSES } from "@/modules/web-app/constants";
// others
import { ERROR_CODES } from "@/constants/error-code";

export class AppFavoritableGuard {
  constructor(private readonly webAppRepo: WebAppRepository) {}

  async assert(appId: string, role?: string): Promise<void> {
    const app = await this.webAppRepo.findById(appId);
    const visible =
      app !== null &&
      app.status === WEB_APP_STATUSES.ACTIVE &&
      (role === AUTHENTICATION_ROLES.ADMIN ||
        app.requiredRoles.includes(AUTHENTICATION_ROLES.USER));

    if (!visible) {
      throw new NotFoundError({
        i18nMessage: (t) => t("favorite:errors.appNotFound"),
        code: ERROR_CODES.FAVORITE_APP_NOT_FOUND
      });
    }
  }
}
