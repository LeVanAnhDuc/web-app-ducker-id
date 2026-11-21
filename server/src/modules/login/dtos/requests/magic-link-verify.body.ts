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
import { MAGIC_LINK_CONFIG } from "@/modules/login/constants";
// validators
import { IsAppEmail } from "@/validators/decorators";

const TOKEN_LENGTH = MAGIC_LINK_CONFIG.TOKEN_LENGTH * 2;

export class MagicLinkVerifyBodyDto {
  @ApiProperty({ example: "user@example.com" })
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
