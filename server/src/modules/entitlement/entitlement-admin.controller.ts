// libs
import { Get, JsonController, Patch } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { EntitlementAdminService } from "./services/entitlement-admin";
// common
import { ApiErrors } from "@/common/openapi";
import {
  Admin,
  Auth,
  RateLimit,
  RequestParam,
  Respond,
  ValidBody
} from "@/common/routing";
// others
import { RequestContext } from "@/utils/request-context";
import { EntitlementMatrixDto } from "./dtos";
import {
  EntitlementMatrixQueryDto,
  UpdateEntitlementsBodyDto
} from "./dtos/requests";

@JsonController("/admin/entitlements")
@Auth()
@Admin()
@OpenAPI({ tags: ["Entitlements Admin"] })
export class EntitlementAdminController {
  constructor(private readonly service: EntitlementAdminService) {}

  @Get("/")
  @OpenAPI({
    summary: "Get app access for users",
    description:
      "Effective access of each user to every app in the catalog. With no override a user gets an app when their role is in its `requiredRoles` (an admin gets every app); an override grants beyond the role or revokes despite it."
  })
  @ApiErrors(404)
  @Respond({ message: "entitlement:success.get", type: EntitlementMatrixDto })
  getMatrix(
    @RequestParam(EntitlementMatrixQueryDto) query: EntitlementMatrixQueryDto
  ) {
    return this.service.getMatrix(query.userIds);
  }

  @Patch("/")
  @OpenAPI({
    summary: "Change app access for users",
    description:
      "Each change states the access the admin wants. The server stores an override only when that differs from the role default, and removes the override when it does not. Every id is checked before anything is written; one unknown user or app fails the whole batch with 404. Idempotent."
  })
  @ApiErrors(404)
  @RateLimit("entitlementMutationByIpAndUser")
  @Respond({
    message: "entitlement:success.update",
    type: EntitlementMatrixDto
  })
  updateMatrix(
    @ValidBody(UpdateEntitlementsBodyDto) body: UpdateEntitlementsBodyDto
  ) {
    return this.service.updateMatrix(
      body.changes,
      RequestContext.requireUserId()
    );
  }
}
