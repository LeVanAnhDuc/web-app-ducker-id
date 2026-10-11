// types
import type { Response } from "express";
import type { EntitlementAdminService } from "./services/entitlement-admin";
import type {
  EntitlementMatrixRequest,
  UpdateEntitlementsRequest
} from "./types";
// common
import { OkSuccess } from "@/common/responses";
// others
import { RequestContext } from "@/utils/request-context";

export class EntitlementController {
  constructor(private readonly service: EntitlementAdminService) {}

  getMatrix = async (
    req: EntitlementMatrixRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.getMatrix(req.query.userIds);
    new OkSuccess({ data, message: "entitlement:success.get" }).send(req, res);
  };

  updateMatrix = async (
    req: UpdateEntitlementsRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.updateMatrix(
      req.body.changes,
      RequestContext.requireUserId()
    );
    new OkSuccess({ data, message: "entitlement:success.update" }).send(
      req,
      res
    );
  };
}
