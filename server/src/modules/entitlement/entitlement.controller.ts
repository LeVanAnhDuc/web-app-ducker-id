// types
import type { EntitlementAdminService } from "./services/entitlement-admin";
import type {
  EntitlementMatrixRequest,
  UpdateEntitlementsRequest
} from "./types";
// others
import { RequestContext } from "@/utils/request-context";

export class EntitlementController {
  constructor(private readonly service: EntitlementAdminService) {}

  getMatrix = async (req: EntitlementMatrixRequest) =>
    this.service.getMatrix(req.query.userIds);

  updateMatrix = async (req: UpdateEntitlementsRequest) =>
    this.service.updateMatrix(req.body.changes, RequestContext.requireUserId());
}
