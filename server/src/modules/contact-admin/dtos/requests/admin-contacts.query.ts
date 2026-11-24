// libs
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
// types
import type { ContactPriority } from "@/modules/contact-admin/types";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { CONTACT_PRIORITIES } from "@/modules/contact-admin/constants";
// validators
import {
  IsIsoDateString,
  IsOnOrAfter,
  OneOf,
  ToIsoDateString,
  Trim
} from "@/validators/decorators";
// others
import { MyContactsQueryDto } from "./my-contacts.query";

const PRIORITY_VALUES = Object.values(CONTACT_PRIORITIES);

export class AdminContactsQueryDto extends MyContactsQueryDto {
  @ApiProperty({
    example: "high",
    description: "Only requests with this priority"
  })
  @OneOf(PRIORITY_VALUES, "validation:priority.invalid")
  priority?: ContactPriority;

  @ApiProperty({
    example: "user@example",
    description: "Partial match on the sender email"
  })
  // A partial match, not an address: no email rules, only a non-blank string.
  // Joi had no key for either failure, so both take `email.invalid`.
  @IsNotEmpty({ message: "validation:email.invalid" })
  @IsString({ message: "validation:email.invalid" })
  @IsOptional()
  @Trim()
  email?: string;

  // Both bounds are normalised to `toISOString()` form, as Joi's isoDate() did.
  @ApiProperty({
    example: "2026-10-01",
    description: "Requests on or after this ISO 8601 date"
  })
  @IsIsoDateString({ message: "validation:fromDate.invalid" })
  @IsNotEmpty({ message: "validation:fromDate.invalid" })
  @IsString({ message: "validation:fromDate.invalid" })
  @IsOptional()
  @ToIsoDateString()
  fromDate?: string;

  // The range check belongs to the object, so it is reported as field "".
  @IsOnOrAfter("fromDate", {
    message: "validation:dateRange.invalid",
    context: { root: true }
  })
  @ApiProperty({
    example: "2026-10-31",
    description: "Requests on or before this ISO 8601 date"
  })
  @IsIsoDateString({ message: "validation:toDate.invalid" })
  @IsNotEmpty({ message: "validation:toDate.invalid" })
  @IsString({ message: "validation:toDate.invalid" })
  @IsOptional()
  @ToIsoDateString()
  toDate?: string;
}
