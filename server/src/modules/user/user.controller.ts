// libs
import { Get, JsonController, Patch } from "routing-controllers";
// types
import type { UserService } from "./user.service";
// common
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
import { UpdateProfileBodyDto } from "./dtos/requests";

@JsonController("/users")
export class UserController {
  constructor(private readonly service: UserService) {}

  // Declared before the id route so the literal segment is not read as an id.
  @Get("/me")
  @Auth()
  @Respond({ message: "user:success.getProfile" })
  getMyProfile() {
    return this.service.getMyProfile();
  }

  @Patch("/me")
  @RateLimit("updateProfileByIp")
  @Auth()
  @Respond({ message: "user:success.updateProfile" })
  updateMyProfile(@ValidBody(UpdateProfileBodyDto) body: UpdateProfileBodyDto) {
    return this.service.updateMyProfile(body);
  }

  @Get("/:id")
  @Respond({ message: "user:success.getPublicProfile" })
  getPublicProfile(
    @PathVariable("id", IsRequiredObjectId("user:errors.invalidId")) id: string
  ) {
    return this.service.getPublicProfile(id);
  }
}
