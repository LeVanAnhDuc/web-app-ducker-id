// libs
import { Get, JsonController, Patch } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { UserService } from "./services";
// common
import { ApiErrors } from "@/common/openapi";
import {
  Auth,
  RateLimit,
  Respond,
  ValidBody,
  ValidParams
} from "@/common/routing";
// others
import { MyProfileDto, PublicProfileDto } from "./dtos";
import { PublicProfileParamsDto, UpdateProfileBodyDto } from "./dtos/requests";

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
  getPublicProfile(
    @ValidParams(PublicProfileParamsDto) params: PublicProfileParamsDto
  ) {
    return this.service.getPublicProfile(params.id);
  }
}
