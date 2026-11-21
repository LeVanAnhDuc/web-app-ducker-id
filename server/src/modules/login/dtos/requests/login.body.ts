// libs
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
// validators
import { IsAppEmail } from "@/validators/decorators";

export class LoginBodyDto {
  @IsAppEmail()
  email!: string;

  // Compared with the stored hash only: the strength policy would lock out
  // anyone whose password predates it.
  @IsNotEmpty({ message: "validation:password.required" })
  @IsString({ message: "validation:password.required" })
  @IsDefined({ message: "validation:password.required" })
  password!: string;
}
