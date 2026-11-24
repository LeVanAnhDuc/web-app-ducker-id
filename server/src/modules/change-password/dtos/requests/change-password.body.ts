// libs
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsAppPassword, MatchesProperty } from "@/validators/decorators";

export class ChangePasswordBodyDto {
  // Compared with the stored hash only, so the strength policy is not applied.
  @IsNotEmpty({ message: "changePassword:validation.currentPasswordRequired" })
  @IsString({ message: "changePassword:validation.currentPasswordRequired" })
  @IsDefined({ message: "changePassword:validation.currentPasswordRequired" })
  currentPassword!: string;

  @IsAppPassword()
  newPassword!: string;

  // Joi checks `.valid(ref)` before the type and empty rules, so a present
  // value that differs — `""` and non-strings included — is a mismatch.
  @ApiProperty({ description: "Must equal `newPassword`" })
  @IsString({ message: "changePassword:validation.confirmMismatch" })
  @MatchesProperty("newPassword", {
    message: "changePassword:validation.confirmMismatch"
  })
  @IsDefined({
    message: ({ value }) =>
      value === null
        ? "changePassword:validation.confirmMismatch"
        : "changePassword:validation.confirmRequired"
  })
  confirmPassword!: string;
}
