// libs
import { IsDefined, IsNotEmpty, IsString, MinLength } from "class-validator";
// validators
import { IsAppEmail } from "@/validators/decorators";

export class UnlockVerifyBodyDto {
  @IsAppEmail()
  email!: string;

  @MinLength(12, { message: "unlockAccount:validation.tempPasswordTooShort" })
  @IsNotEmpty({ message: "unlockAccount:validation.tempPasswordRequired" })
  @IsString({ message: "unlockAccount:validation.tempPasswordRequired" })
  @IsDefined({ message: "unlockAccount:validation.tempPasswordRequired" })
  tempPassword!: string;
}
