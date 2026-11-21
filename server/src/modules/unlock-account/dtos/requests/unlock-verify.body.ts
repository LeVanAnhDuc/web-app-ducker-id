// libs
import { IsDefined, IsNotEmpty, IsString, MinLength } from "class-validator";
// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsAppEmail } from "@/validators/decorators";

export class UnlockVerifyBodyDto {
  @ApiProperty({ example: "user@example.com" })
  @IsAppEmail()
  email!: string;

  @ApiProperty({
    description: "The temporary password emailed by /auth/unlock/request"
  })
  @MinLength(12, { message: "unlockAccount:validation.tempPasswordTooShort" })
  @IsNotEmpty({ message: "unlockAccount:validation.tempPasswordRequired" })
  @IsString({ message: "unlockAccount:validation.tempPasswordRequired" })
  @IsDefined({ message: "unlockAccount:validation.tempPasswordRequired" })
  tempPassword!: string;
}
