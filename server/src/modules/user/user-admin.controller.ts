// libs
import { Get, JsonController, Patch, Post } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { UserService } from "./services";
// common
import { ApiErrors, ApiProperty, Paginated } from "@/common/openapi";
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
import {
  AdminResetPasswordResultDto,
  AdminUserDto,
  SetUserActiveResultDto
} from "./dtos";
import { AdminUsersQueryDto } from "./dtos/requests";

// Every failure of an id takes the one key; each still keeps its own
// constraint name so `reason` tells them apart.
const USER_ID = [
  IsRequiredObjectId("user:errors.invalidId"),
  ApiProperty({
    example: "64f1b2c3d4e5f6a7b8c9d0e1",
    description: "MongoDB ObjectId of the target user"
  })
];

@JsonController("/admin/users")
@Auth()
@Admin()
@OpenAPI({ tags: ["User Admin"] })
export class UserAdminController {
  constructor(private readonly service: UserService) {}

  @Get("/")
  @OpenAPI({
    summary: "List users (admin)",
    description:
      "List all registered users with optional filtering, search and pagination.\n\n**Filtering:** `search` (fullName or email), `role`, `status` (`active` | `locked`).\n\n**Sorting:** `sortBy` (`createdAt` | `fullName` | `lastLoginAt`, default `createdAt`) and `sortOrder` (default `desc`)."
  })
  @Respond({
    message: "user:success.getAdminUsers",
    type: Paginated(AdminUserDto)
  })
  getAdminUsers(@RequestParam(AdminUsersQueryDto) query: AdminUsersQueryDto) {
    return this.service.getAdminUsers(query);
  }

  @Patch("/:id/lock")
  @OpenAPI({
    summary: "Lock a user account (admin)",
    description:
      "Soft-lock a user account by setting `auth.isActive` to `false`. Blocks future login attempts and refresh token usage; does not affect any in-flight request.\n\n**Behavior:**\n- Idempotent: locking an already-locked account returns 200 with no error\n- An admin cannot lock their own account (403 `ADMIN_CANNOT_LOCK_SELF`)\n- Locking another admin's account is allowed, unless they are the last remaining active admin (403 `ADMIN_CANNOT_LOCK_LAST_ADMIN`)"
  })
  @ApiErrors(404)
  @RateLimit("adminUserMutationByIpAndUser")
  @Respond({
    message: "user:success.lockUser",
    type: SetUserActiveResultDto
  })
  lockUser(@PathVariable("id", ...USER_ID) id: string) {
    return this.service.setUserActive(id, false);
  }

  @Patch("/:id/unlock")
  @OpenAPI({
    summary: "Unlock a user account (admin)",
    description:
      "Re-activate a previously locked user account by setting `auth.isActive` to `true`.\n\n**Behavior:**\n- Idempotent: unlocking an already-active account returns 200 with no error\n- An admin may unlock their own account"
  })
  @ApiErrors(404)
  @RateLimit("adminUserMutationByIpAndUser")
  @Respond({
    message: "user:success.unlockUser",
    type: SetUserActiveResultDto
  })
  unlockUser(@PathVariable("id", ...USER_ID) id: string) {
    return this.service.setUserActive(id, true);
  }

  @Post("/:id/reset-password")
  @OpenAPI({
    summary: "Reset a user's password (admin)",
    description:
      "Admin-initiated password reset. Overwrites the target account's real password with a freshly generated temporary password, which is emailed to the user. Bumps `tokenVersion` (revokes all outstanding refresh tokens for that account) and sets `mustChangePassword` so the user must set a new password on their next login.\n\n**Behavior:**\n- The admin never sees the temporary password; it is only emailed to the target user\n- An admin cannot reset their own password here (403 `ADMIN_CANNOT_RESET_SELF`); use the regular change-password flow\n- Resetting another admin's password is allowed\n- The response returns only `{ _id, email }`"
  })
  @ApiErrors(404)
  @RateLimit("adminUserMutationByIpAndUser")
  @Respond({
    message: "user:success.resetPassword",
    type: AdminResetPasswordResultDto
  })
  resetUserPassword(@PathVariable("id", ...USER_ID) id: string) {
    return this.service.adminResetPassword(id);
  }
}
