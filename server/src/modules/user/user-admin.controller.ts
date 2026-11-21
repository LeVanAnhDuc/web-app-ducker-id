// libs
import { Get, JsonController, Patch, Post } from "routing-controllers";
// types
import type { UserService } from "./services";
// common
import {
  Admin,
  Auth,
  RateLimit,
  Respond,
  ValidParams,
  ValidQuery
} from "@/common/routing";
// others
import { AdminUserIdParamsDto, AdminUsersQueryDto } from "./dtos/requests";

@JsonController("/admin/users")
@Auth()
@Admin()
export class UserAdminController {
  constructor(private readonly service: UserService) {}

  @Get("/")
  @Respond({ message: "user:success.getAdminUsers" })
  getAdminUsers(@ValidQuery(AdminUsersQueryDto) query: AdminUsersQueryDto) {
    return this.service.getAdminUsers(query);
  }

  @Patch("/:id/lock")
  @RateLimit("adminUserMutationByIpAndUser")
  @Respond({ message: "user:success.lockUser" })
  lockUser(@ValidParams(AdminUserIdParamsDto) params: AdminUserIdParamsDto) {
    return this.service.setUserActive(params.id, false);
  }

  @Patch("/:id/unlock")
  @RateLimit("adminUserMutationByIpAndUser")
  @Respond({ message: "user:success.unlockUser" })
  unlockUser(@ValidParams(AdminUserIdParamsDto) params: AdminUserIdParamsDto) {
    return this.service.setUserActive(params.id, true);
  }

  @Post("/:id/reset-password")
  @RateLimit("adminUserMutationByIpAndUser")
  @Respond({ message: "user:success.resetPassword" })
  resetUserPassword(
    @ValidParams(AdminUserIdParamsDto) params: AdminUserIdParamsDto
  ) {
    return this.service.adminResetPassword(params.id);
  }
}
