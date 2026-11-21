// others
import { IsUserId } from "./object-id";

export class PublicProfileParamsDto {
  @IsUserId()
  id!: string;
}
