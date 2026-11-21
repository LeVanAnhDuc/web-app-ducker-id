// libs
import { Get, JsonController, Patch } from "routing-controllers";
// types
import type { EntitlementAdminService } from "./services/entitlement-admin";
// common
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
import {
  EntitlementMatrixQueryDto,
  UpdateEntitlementsBodyDto
} from "./dtos/requests";

@JsonController("/admin/entitlements")
@Auth()
@Admin()
export class EntitlementAdminController {
  constructor(private readonly service: EntitlementAdminService) {}

  @Get("/")
  @Respond({ message: "entitlement:success.get" })
  getMatrix(
    @RequestParam(EntitlementMatrixQueryDto) query: EntitlementMatrixQueryDto
  ) {
    return this.service.getMatrix(query.userIds);
  }

  @Patch("/")
  @RateLimit("entitlementMutationByIpAndUser")
  @Respond({ message: "entitlement:success.update" })
  updateMatrix(
    @ValidBody(UpdateEntitlementsBodyDto) body: UpdateEntitlementsBodyDto
  ) {
    return this.service.updateMatrix(
      body.changes,
      RequestContext.requireUserId()
    );
  }
}
