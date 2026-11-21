// libs
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf
} from "class-validator";
// types
import type { Gender } from "@/modules/user/types";
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
  ToIsoDateString,
  Trim
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
  @ValidateIf((_object, value) => value !== undefined)
  @Trim()
  fullName?: string;

  @Matches(PHONE_PATTERN, { message: "validation:phone.invalid" })
  @MaxLength(PHONE_MAX_LENGTH, { message: "validation:phone.invalid" })
  @IsNotEmpty({ message: "validation:phone.invalid" })
  @IsString({ message: "validation:phone.invalid" })
  @IsOptional()
  phone?: string | null;

  @Matches(SAFE_ADDRESS_PATTERN, { message: "validation:address.invalid" })
  @MaxLength(ADDRESS_MAX_LENGTH, { message: "validation:address.tooLong" })
  @IsNotEmpty({ message: "validation:address.invalid" })
  @IsString({ message: "validation:address.invalid" })
  @IsOptional()
  address?: string | null;

  // Stays an ISO string, unlike sign-up's Date: the service stores what Joi's
  // isoDate() produced. Same 13–120 range as sign-up, since the profile form
  // resends an accepted date on every save.
  @IsDateOfBirthNotTooOld({ message: "validation:dateOfBirth.tooOld" })
  @IsDateOfBirthNotTooYoung({ message: "validation:dateOfBirth.tooYoung" })
  @IsIsoDateString({ message: "validation:dateOfBirth.invalid" })
  @IsNotEmpty({ message: "validation:dateOfBirth.invalid" })
  @IsString({ message: "validation:dateOfBirth.invalid" })
  @IsOptional()
  @ToIsoDateString()
  dateOfBirth?: string | null;

  @IsIn(GENDER_VALUES, { message: "validation:gender.invalid" })
  @IsString({ message: "validation:gender.invalid" })
  @IsOptional()
  gender?: Gender | null;
}
