// libs
import { IsDefined, IsIn, IsString } from "class-validator";
// types
import type { ContactStatus } from "@/modules/contact-admin/types";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { CONTACT_STATUSES } from "@/modules/contact-admin/constants";

const STATUS_VALUES = Object.values(CONTACT_STATUSES);

export class UpdateContactStatusBodyDto {
  @ApiProperty({
    example: "processing",
    description: "The status to move the request to"
  })
  @IsIn(STATUS_VALUES, { message: "contactAdmin:errors.statusInvalid" })
  @IsString({ message: "contactAdmin:errors.statusInvalid" })
  // Joi checks `.valid()` before its empty and type checks, so `""` and
  // `null` are an unknown status rather than a missing one.
  @IsDefined({
    message: ({ value }) =>
      value === null
        ? "contactAdmin:errors.statusInvalid"
        : "contactAdmin:errors.statusRequired"
  })
  status!: ContactStatus;
}
