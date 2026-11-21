// types
import type { EntitlementChange } from "../../types";
import type { EntitlementMatrixDto } from "../../dtos";
import type { UserRepository } from "@/modules/user/repository/user.repository";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import type { EntitlementRepository } from "../../repository/entitlement.repository";
// others
import { getMatrix } from "./get-matrix";
import { updateMatrix } from "./update-matrix";

export class EntitlementAdminService {
  constructor(
    private readonly entitlementRepo: EntitlementRepository,
    private readonly userRepo: Pick<UserRepository, "findRolesByIds">,
    private readonly webAppRepo: Pick<
      WebAppRepository,
      "findAccessRules" | "findAll"
    >,
    private readonly notificationDispatcher: NotificationDispatcher
  ) {}

  getMatrix(userIds: string[]): Promise<EntitlementMatrixDto> {
    return getMatrix(
      {
        entitlementRepo: this.entitlementRepo,
        userRepo: this.userRepo,
        webAppRepo: this.webAppRepo
      },
      userIds
    );
  }

  updateMatrix(
    changes: EntitlementChange[],
    actorId: string
  ): Promise<EntitlementMatrixDto> {
    return updateMatrix(
      {
        entitlementRepo: this.entitlementRepo,
        userRepo: this.userRepo,
        webAppRepo: this.webAppRepo,
        notificationDispatcher: this.notificationDispatcher
      },
      changes,
      actorId
    );
  }
}
