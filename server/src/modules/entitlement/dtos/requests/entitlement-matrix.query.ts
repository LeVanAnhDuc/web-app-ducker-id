// libs
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined
} from "class-validator";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { ENTITLEMENT_LIMITS } from "@/modules/entitlement/constants";
// validators
import { ArrayUniqueItems, IsObjectId } from "@/validators/decorators";

/**
 * `?userIds=a,b` arrives as one string: split it, trim each id and drop blank
 * entries before validating. `?userIds=a&userIds=b` arrives as an array and
 * is taken as sent.
 */
const SplitCommaList = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === "string"
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : value
  );

export class EntitlementMatrixQueryDto {
  @ApiProperty({
    example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
    description:
      "1-50 user ids, no duplicates: comma-separated (?userIds=a,b) or repeated (?userIds=a&userIds=b)"
  })
  @ArrayUniqueItems({ message: "entitlement:validation.userIds.duplicate" })
  @ArrayMaxSize(ENTITLEMENT_LIMITS.MAX_USERS_PER_QUERY, {
    message: "entitlement:validation.userIds.tooMany"
  })
  @IsObjectId("entitlement:validation.userId.invalid", { each: true })
  // A list that splits to nothing (`""`, `","`) is a missing one.
  @ArrayMinSize(1, { message: "entitlement:validation.userIds.required" })
  @IsArray({ message: "entitlement:validation.userIds.required" })
  @IsDefined({ message: "entitlement:validation.userIds.required" })
  @SplitCommaList()
  userIds!: string[];
}
