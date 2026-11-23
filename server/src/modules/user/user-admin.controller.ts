// libs
import { Get, JsonController, Patch, Post } from "routing-controllers";
// types
import type { UserService } from "./user.service";
// common
import {
  Admin,
  Auth,
  PathVariable,
  RateLimit,
  RequestParam,
  Respond
} from "@/common/routing";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import { AdminUsersQueryDto } from "./dtos/requests";

@JsonController("/admin/users")
@Auth()
@Admin()
export class UserAdminController {
  constructor(private readonly service: UserService) {}

  @Get("/")
  @Respond({ message: "user:success.getAdminUsers" })
  getAdminUsers(@RequestParam(AdminUsersQueryDto) query: AdminUsersQueryDto) {
    return this.service.getAdminUsers(query);
  }

  @Patch("/:id/lock")
  @RateLimit("adminUserMutationByIpAndUser")
  @Respond({ message: "user:success.lockUser" })
  lockUser(
    @PathVariable("id", IsRequiredObjectId("user:errors.invalidId")) id: string
  ) {
    return this.service.setUserActive(id, false);
  }

  @Patch("/:id/unlock")
  @RateLimit("adminUserMutationByIpAndUser")
  @Respond({ message: "user:success.unlockUser" })
  unlockUser(
    @PathVariable("id", IsRequiredObjectId("user:errors.invalidId")) id: string
  ) {
    return this.service.setUserActive(id, true);
  }

  @Post("/:id/reset-password")
  @RateLimit("adminUserMutationByIpAndUser")
  @Respond({ message: "user:success.resetPassword" })
  resetUserPassword(
    @PathVariable("id", IsRequiredObjectId("user:errors.invalidId")) id: string
  ) {
    return this.service.adminResetPassword(id);
  }
}
