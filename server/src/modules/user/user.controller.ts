// libs
import { Get, JsonController, Patch } from "routing-controllers";
// types
import type { UserService } from "./services";
// common
import {
  Auth,
  RateLimit,
  Respond,
  ValidBody,
  ValidParams
} from "@/common/routing";
// others
import { PublicProfileParamsDto, UpdateProfileBodyDto } from "./dtos/requests";

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
    @ValidParams(PublicProfileParamsDto) params: PublicProfileParamsDto
  ) {
    return this.service.getPublicProfile(params.id);
  }
}
