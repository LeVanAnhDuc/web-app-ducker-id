// libs
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  Length,
  Matches
} from "class-validator";
// modules
import { FORGOT_PASSWORD_MAGIC_LINK_CONFIG } from "@/modules/forgot-password/constants";
// validators
import { IsAppEmail } from "@/validators/decorators";

const TOKEN_LENGTH = FORGOT_PASSWORD_MAGIC_LINK_CONFIG.TOKEN_LENGTH * 2;

export class ForgotPasswordMagicLinkVerifyBodyDto {
  @IsAppEmail()
  email!: string;

  @Matches(/^[a-f0-9]+$/, { message: "forgotPassword:validation.tokenInvalid" })
  @Length(TOKEN_LENGTH, TOKEN_LENGTH, {
    message: "forgotPassword:validation.tokenInvalid"
  })
  @IsNotEmpty({ message: "forgotPassword:validation.tokenRequired" })
  @IsString({ message: "forgotPassword:validation.tokenInvalid" })
  @IsDefined({ message: "forgotPassword:validation.tokenRequired" })
  token!: string;
}
