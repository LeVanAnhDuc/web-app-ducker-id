// types
import type { UserAccess } from "../types";
// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `toEntitlementMatrixDto` builds object literals typed as these classes. */
export class UserAccessDto {
  @ApiProperty({
    type: "string",
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB _id of the user"
  })
  userId!: string;

  @ApiProperty({
    items: { type: "string", example: "507f1f77bcf86cd799439012" },
    description:
      "Apps the user can open: effective access over the whole catalog, the role default with overrides applied"
  })
  grantedAppIds!: string[];

  @ApiProperty({
    items: { type: "string", example: "507f1f77bcf86cd799439013" },
    description:
      "Apps whose access differs from the role default (the cells that are exceptions); the role default of a cell is granted XOR overridden"
  })
  overriddenAppIds!: string[];
}

/** GET and PATCH answer the same shape, so the client resets from either. */
export class EntitlementMatrixDto {
  @ApiProperty({ type: [UserAccessDto], description: "One row per user" })
  users!: UserAccessDto[];
}

export const toEntitlementMatrixDto = (
  rows: UserAccess[]
): EntitlementMatrixDto => ({
  users: rows.map((row) => ({
    userId: row.userId,
    grantedAppIds: [...row.grantedAppIds],
    overriddenAppIds: [...row.overriddenAppIds]
  }))
});
