// types
import type { OrphanApp } from "../types";

export interface DeleteImpactDto {
  /** Every app referencing the category, active or not. */
  total: number;
  /** Apps that would be left with no category — each needs a target. */
  orphaned: OrphanApp[];
}

export const toDeleteImpactDto = (
  total: number,
  orphaned: OrphanApp[]
): DeleteImpactDto => ({ total, orphaned });
