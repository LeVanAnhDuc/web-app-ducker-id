// common
import { ApiProperty } from "@/common/openapi";

/** An app whose only category is the one being deleted. Plain data. */
export class OrphanAppDto {
  @ApiProperty({
    type: "string",
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB _id of the app"
  })
  _id!: string;

  @ApiProperty({ type: "string", example: "Shorten Link" })
  displayName!: string;
}

/** Plain data: `toDeleteImpactDto` builds an object literal typed as this class. */
export class DeleteImpactDto {
  @ApiProperty({
    type: "integer",
    example: 4,
    description: "Every app referencing the category, active or not"
  })
  total!: number;

  @ApiProperty({
    type: [OrphanAppDto],
    description: "Apps that would be left with no category; each needs a target"
  })
  orphaned!: OrphanAppDto[];
}

export const toDeleteImpactDto = (
  total: number,
  orphaned: OrphanAppDto[]
): DeleteImpactDto => ({ total, orphaned });
