// libs
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  Length,
  Matches
} from "class-validator";
// modules
import { FORGOT_PASSWORD_RESET_TOKEN_CONFIG } from "@/modules/forgot-password/constants";
// validators
import { IsAppEmail, IsAppPassword } from "@/validators/decorators";

const TOKEN_LENGTH = FORGOT_PASSWORD_RESET_TOKEN_CONFIG.TOKEN_LENGTH * 2;

export class ResetPasswordBodyDto {
  @IsAppEmail()
  email!: string;

  @Matches(/^[a-f0-9]+$/, {
    message: "forgotPassword:validation.resetTokenInvalid"
  })
  @Length(TOKEN_LENGTH, TOKEN_LENGTH, {
    message: "forgotPassword:validation.resetTokenInvalid"
  })
  @IsNotEmpty({ message: "forgotPassword:validation.resetTokenRequired" })
  @IsString({ message: "forgotPassword:validation.resetTokenInvalid" })
  @IsDefined({ message: "forgotPassword:validation.resetTokenRequired" })
  resetToken!: string;

  @IsAppPassword()
  newPassword!: string;
}
