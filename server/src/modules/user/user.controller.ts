// libs
import { Get, JsonController, Patch } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { UserService } from "./services";
// common
import { ApiErrors, ApiProperty } from "@/common/openapi";
import {
  Auth,
  PathVariable,
  RateLimit,
  Respond,
  ValidBody
} from "@/common/routing";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import { MyProfileDto, PublicProfileDto } from "./dtos";
import { UpdateProfileBodyDto } from "./dtos/requests";

// Every failure of an id takes the one key; each still keeps its own
// constraint name so `reason` tells them apart.
const USER_ID = [
  IsRequiredObjectId("user:errors.invalidId"),
  ApiProperty({
    example: "64f1b2c3d4e5f6a7b8c9d0e1",
    description: "MongoDB ObjectId of the target user"
  })
];

@JsonController("/users")
@OpenAPI({ tags: ["User Profile"] })
export class UserController {
  constructor(private readonly service: UserService) {}

  // Declared before the id route so the literal segment is not read as an id.
  @Get("/me")
  @OpenAPI({
    summary: "Get my profile",
    description:
      "Get the full profile of the signed-in user: email, phone, address, date of birth, gender and the avatar (full URL). Unset fields are `null`."
  })
  @ApiErrors(404)
  @Auth()
  @Respond({ message: "user:success.getProfile", type: MyProfileDto })
  getMyProfile() {
    return this.service.getMyProfile();
  }

  @Patch("/me")
  @OpenAPI({
    summary: "Update my profile",
    description:
      "Partially update the profile of the signed-in user. All fields are optional.\n\n**Behavior:**\n- Only the fields provided in the request body are updated\n- `null` clears phone, address, date of birth and gender; the name cannot be cleared\n- Unknown fields are silently ignored (e.g. sending `email` has no effect)\n- Sending an empty body `{}` returns 200 with no changes"
  })
  @ApiErrors(404)
  @RateLimit("updateProfileByIp")
  @Auth()
  @Respond({ message: "user:success.updateProfile", type: MyProfileDto })
  updateMyProfile(@ValidBody(UpdateProfileBodyDto) body: UpdateProfileBodyDto) {
    return this.service.updateMyProfile(body);
  }

  @Get("/:id")
  @OpenAPI({
    summary: "Get public profile",
    description:
      "Get the public profile of any user by id. Does not require authentication.\n\n**Public fields only:** `_id`, `fullName`, `avatar` and `gender`. Email, phone, address and date of birth are never returned."
  })
  @ApiErrors(404)
  @Respond({
    message: "user:success.getPublicProfile",
    type: PublicProfileDto
  })
  getPublicProfile(@PathVariable("id", ...USER_ID) id: string) {
    return this.service.getPublicProfile(id);
  }
}
