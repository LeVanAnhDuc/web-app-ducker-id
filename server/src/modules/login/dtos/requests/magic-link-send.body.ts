// validators
import { IsAppEmail } from "@/validators/decorators";

export class MagicLinkSendBodyDto {
  @IsAppEmail()
  email!: string;
}
