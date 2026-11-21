// common
import { Expose, ExposeId, ExposeOrNull } from "@/common/dto";
import { ApiProperty } from "@/common/openapi";
// modules
import { GENDERS } from "@/modules/user/constants";

/** Source: a user record (`PublicUserRecord`). What another user may see. */
export class PublicProfileDto {
  @ApiProperty({ example: "64f1b2c3d4e5f6a7b8c9d0e1" })
  @ExposeId()
  _id!: string;

  @ApiProperty({ example: "Nguyen Van A" })
  @Expose()
  fullName!: string;

  @ApiProperty({ example: "http://localhost:3000/uploads/avatars/uuid.jpg" })
  @ExposeOrNull()
  avatar!: string | null;

  @ApiProperty({
    type: "string",
    enum: Object.values(GENDERS),
    nullable: true,
    example: GENDERS.FEMALE
  })
  @ExposeOrNull()
  gender!: string | null;
}
