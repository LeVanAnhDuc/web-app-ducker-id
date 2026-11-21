// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsAppEmail } from "@/validators/decorators";

export class CheckEmailParamsDto {
  @ApiProperty({
    example: "user@example.com",
    description: "Email address to check"
  })
  @IsAppEmail()
  email!: string;
}
