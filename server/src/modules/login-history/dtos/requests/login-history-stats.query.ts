// libs
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
// modules
import { LOGIN_HISTORY_STATS_RANGES } from "@/modules/login-history/constants";
// validators
import { IsSupportedTimeZone, OneOf } from "@/validators/decorators";

// Long enough for any IANA name, short enough that a junk value never reaches
// the resolver.
const TIMEZONE_MAX_LENGTH = 64;

export class LoginHistoryStatsQueryDto {
  @OneOf(LOGIN_HISTORY_STATS_RANGES, "validation:range.invalid")
  range?: string;

  // One key for every failure, as Joi mapped each rule to it.
  @IsSupportedTimeZone({ message: "validation:timezone.invalid" })
  @MaxLength(TIMEZONE_MAX_LENGTH, { message: "validation:timezone.invalid" })
  @IsNotEmpty({ message: "validation:timezone.invalid" })
  @IsString({ message: "validation:timezone.invalid" })
  @IsOptional()
  tz?: string;
}
