// libs
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  Length,
  Matches
} from "class-validator";
// modules
import { MAGIC_LINK_CONFIG } from "@/modules/login/constants";
// validators
import { IsAppEmail } from "@/validators/decorators";

const TOKEN_LENGTH = MAGIC_LINK_CONFIG.TOKEN_LENGTH * 2;

export class MagicLinkVerifyBodyDto {
  @IsAppEmail()
  email!: string;

  @Matches(/^[a-f0-9]+$/, { message: "login:validation.tokenInvalid" })
  @Length(TOKEN_LENGTH, TOKEN_LENGTH, {
    message: "login:validation.tokenInvalid"
  })
  @IsNotEmpty({ message: "login:validation.tokenRequired" })
  @IsString({ message: "login:validation.tokenInvalid" })
  @IsDefined({ message: "login:validation.tokenRequired" })
  token!: string;
}
