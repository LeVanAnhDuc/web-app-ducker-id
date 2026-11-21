// others
import { IsUserId } from "./object-id";

export class AdminUserIdParamsDto {
  @IsUserId()
  id!: string;
}
