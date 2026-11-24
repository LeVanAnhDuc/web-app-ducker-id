// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsAppEmail } from "@/validators/decorators";

export class UnlockRequestBodyDto {
  @ApiProperty({ example: "user@example.com" })
  @IsAppEmail()
  email!: string;
}
