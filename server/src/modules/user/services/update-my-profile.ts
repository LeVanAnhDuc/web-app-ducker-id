// types
import type { UpdateProfileData } from "@/modules/user/types";
import type { MyProfileDto } from "../dtos";
import type { UserServiceDeps } from "./deps";
// common
import { NotFoundError } from "@/common/exceptions";
// dtos
import { toMyProfileDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";

export const updateMyProfile = async (
  deps: UserServiceDeps,
  data: Partial<UpdateProfileData>
): Promise<MyProfileDto> => {
  const userId = RequestContext.requireUserId();
  const user = await deps.userRepo.updateById(userId, data);

  if (!user) {
    throw new NotFoundError({
      i18nMessage: (t) => t("user:errors.notFound"),
      code: ERROR_CODES.USER_NOT_FOUND
    });
  }

  return toMyProfileDto(user, user.avatar ?? null);
};
