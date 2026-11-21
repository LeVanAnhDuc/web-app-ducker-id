// libs
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
// types
import type { ContactPriority } from "@/modules/contact-admin/types";
// modules
import { CONTACT_PRIORITIES } from "@/modules/contact-admin/constants";
// validators
import {
  IsIsoDateString,
  IsOnOrAfter,
  ToIsoDateString,
  Trim
} from "@/validators/decorators";
// others
import { MyContactsQueryDto } from "./my-contacts.query";

const PRIORITY_VALUES = Object.values(CONTACT_PRIORITIES);

export class AdminContactsQueryDto extends MyContactsQueryDto {
  @IsIn(PRIORITY_VALUES, { message: "validation:priority.invalid" })
  @IsString({ message: "validation:priority.invalid" })
  @IsOptional()
  priority?: ContactPriority;

  // A partial match, not an address: no email rules, only a non-blank string.
  // Joi had no key for either failure, so both take `email.invalid`.
  @IsNotEmpty({ message: "validation:email.invalid" })
  @IsString({ message: "validation:email.invalid" })
  @IsOptional()
  @Trim()
  email?: string;

  // Both bounds are normalised to `toISOString()` form, as Joi's isoDate() did.
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
  @IsIsoDateString({ message: "validation:toDate.invalid" })
  @IsNotEmpty({ message: "validation:toDate.invalid" })
  @IsString({ message: "validation:toDate.invalid" })
  @IsOptional()
  @ToIsoDateString()
  toDate?: string;
}
