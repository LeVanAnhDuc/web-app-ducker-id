// common
import { ApiProperty } from "@/common/openapi";
// modules
import { UserAppDto } from "@/modules/web-app/dtos";

/** `data` of `GET /users/me/favorites`: the caller's pins, not paged. */
export class FavoriteListDto {
  @ApiProperty({ type: [UserAppDto] })
  items!: UserAppDto[];
}
