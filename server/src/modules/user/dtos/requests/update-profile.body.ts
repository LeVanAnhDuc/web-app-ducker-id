// libs
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";
// types
import type { Gender } from "@/modules/user/types";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { GENDERS } from "@/modules/user/constants";
// validators
import {
  FULLNAME_VALIDATION,
  SAFE_ADDRESS_PATTERN,
  SAFE_FULLNAME_PATTERN
} from "@/validators/constants";
import {
  IsDateOfBirthNotTooOld,
  IsDateOfBirthNotTooYoung,
  IsIsoDateString,
  OneOf,
  ToIsoDateString,
  Trim,
  UnlessMissing
} from "@/validators/decorators";

const GENDER_VALUES = Object.values(GENDERS);
const PHONE_MAX_LENGTH = 20;
const PHONE_PATTERN = /^[\d\s()+-]+$/;
const ADDRESS_MAX_LENGTH = 500;

// A PATCH: every field is optional, and `null` on the four clearable fields
// means "remove it" — `@IsOptional()` lets `null` through untouched so the
// service can `$unset` it. Rules sit in reverse of the Joi chain because
// class-validator reports the bottom-most failing one.
export class UpdateProfileBodyDto {
  @ApiProperty({
    example: "Nguyen Van B",
    description:
      "Trimmed; letters, spaces, hyphens, apostrophes and dots only. Cannot be cleared"
  })
  @Matches(SAFE_FULLNAME_PATTERN, { message: "validation:fullName.invalid" })
  @MaxLength(FULLNAME_VALIDATION.MAX_LENGTH, {
    message: "validation:fullName.maxLength"
  })
  @MinLength(FULLNAME_VALIDATION.MIN_LENGTH, {
    message: "validation:fullName.minLength"
  })
  @IsNotEmpty({ message: "validation:fullName.required" })
  @IsString({ message: "validation:fullName.invalid" })
  // Unlike the other fields a name cannot be cleared, so `null` is checked.
  @UnlessMissing()
  @Trim()
  fullName?: string;

  @ApiProperty({
    example: "+84 912 345 678",
    description: "Cannot be an empty string; null clears it"
  })
  @Matches(PHONE_PATTERN, { message: "validation:phone.invalid" })
  @MaxLength(PHONE_MAX_LENGTH, { message: "validation:phone.invalid" })
  @IsNotEmpty({ message: "validation:phone.invalid" })
  @IsString({ message: "validation:phone.invalid" })
  @IsOptional()
  phone?: string | null;

  @ApiProperty({
    example: "456 Nguyen Hue, District 1, Ho Chi Minh City",
    description: "null clears it"
  })
  @Matches(SAFE_ADDRESS_PATTERN, { message: "validation:address.invalid" })
  @MaxLength(ADDRESS_MAX_LENGTH, { message: "validation:address.tooLong" })
  @IsNotEmpty({ message: "validation:address.invalid" })
  @IsString({ message: "validation:address.invalid" })
  @IsOptional()
  address?: string | null;

  // Stays an ISO string, unlike sign-up's Date: the service stores what Joi's
  // isoDate() produced. Same 13–120 range as sign-up, since the profile form
  // resends an accepted date on every save.
  @ApiProperty({
    example: "1995-06-15",
    description:
      "ISO 8601 date; age must be between 13 and 120 years, as at sign-up. null clears it"
  })
  @IsDateOfBirthNotTooOld({ message: "validation:dateOfBirth.tooOld" })
  @IsDateOfBirthNotTooYoung({ message: "validation:dateOfBirth.tooYoung" })
  @IsIsoDateString({ message: "validation:dateOfBirth.invalid" })
  @IsNotEmpty({ message: "validation:dateOfBirth.invalid" })
  @IsString({ message: "validation:dateOfBirth.invalid" })
  @IsOptional()
  @ToIsoDateString()
  dateOfBirth?: string | null;

  @ApiProperty({ example: "male", description: "null clears it" })
  @OneOf(GENDER_VALUES, "validation:gender.invalid")
  gender?: Gender | null;
}
