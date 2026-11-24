// libs
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  ValidateNested
} from "class-validator";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { ENTITLEMENT_LIMITS } from "@/modules/entitlement/constants";
// validators
import { ArrayUniqueItems, IsRequiredObjectId } from "@/validators/decorators";

export class EntitlementChangeDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB _id of the user"
  })
  @IsRequiredObjectId("entitlement:validation.userId.invalid")
  userId!: string;

  @ApiProperty({
    example: "507f1f77bcf86cd799439012",
    description: "MongoDB _id of the app"
  })
  @IsRequiredObjectId("entitlement:validation.appId.invalid")
  appId!: string;

  @ApiProperty({
    example: true,
    description: "The access the admin wants this user to have"
  })
  // Strict, as Joi's `boolean().strict()`: the string "true" is refused.
  @IsBoolean({ message: "entitlement:validation.granted.invalid" })
  @IsDefined({ message: "entitlement:validation.granted.invalid" })
  granted!: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

// One change per user × app pair; a non-object item is left to the nested check.
const samePair = (a: unknown, b: unknown): boolean =>
  isObject(a) && isObject(b) && a.userId === b.userId && a.appId === b.appId;

export class UpdateEntitlementsBodyDto {
  @ApiProperty({
    description:
      "1-200 changes, one per user and app pair; each states the access wanted"
  })
  // Joi shipped English for an item that is not an object; the list's own
  // key is the nearest.
  @ValidateNested({
    each: true,
    message: "entitlement:validation.changes.required"
  })
  @ArrayUniqueItems(
    { message: "entitlement:validation.changes.duplicate" },
    samePair
  )
  @ArrayMaxSize(ENTITLEMENT_LIMITS.MAX_CHANGES, {
    message: "entitlement:validation.changes.tooMany"
  })
  @ArrayMinSize(1, { message: "entitlement:validation.changes.required" })
  @IsArray({ message: "entitlement:validation.changes.required" })
  @IsDefined({ message: "entitlement:validation.changes.required" })
  @Type(() => EntitlementChangeDto)
  changes!: EntitlementChangeDto[];
}
