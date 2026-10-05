// types
import type { EntitlementChange } from "../../types";
import type { EntitlementMatrixDto } from "../../dtos";
import type { EntitlementAdminServiceDeps } from "./deps";
// others
import { getMatrix } from "./get-matrix";
import { updateMatrix } from "./update-matrix";

export class EntitlementAdminService {
  constructor(private readonly deps: EntitlementAdminServiceDeps) {}

  getMatrix(userIds: string[]): Promise<EntitlementMatrixDto> {
    return getMatrix(this.deps, userIds);
  }

  updateMatrix(
    changes: EntitlementChange[],
    actorId: string
  ): Promise<EntitlementMatrixDto> {
    return updateMatrix(this.deps, changes, actorId);
  }
}
