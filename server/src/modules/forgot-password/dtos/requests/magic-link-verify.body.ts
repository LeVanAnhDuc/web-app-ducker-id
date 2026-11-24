// libs
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  Length,
  Matches
} from "class-validator";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { FORGOT_PASSWORD_MAGIC_LINK_CONFIG } from "@/modules/forgot-password/constants";
// validators
import { IsAppEmail } from "@/validators/decorators";

const TOKEN_LENGTH = FORGOT_PASSWORD_MAGIC_LINK_CONFIG.TOKEN_LENGTH * 2;

export class ForgotPasswordMagicLinkVerifyBodyDto {
  @ApiProperty({ example: "user@example.com" })
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
