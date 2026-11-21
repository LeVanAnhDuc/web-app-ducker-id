// types
import type { UpdateProfileData } from "@/modules/user/types";
import type { UserRepository } from "../repository/user.repository";
// common
import { toDto } from "@/common/dto";
import { NotFoundError } from "@/exceptions";
// dtos
import { MyProfileDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";

export const updateMyProfile = async (
  userRepo: UserRepository,
  data: Partial<UpdateProfileData>
): Promise<MyProfileDto> => {
  const userId = RequestContext.requireUserId();
  const user = await userRepo.updateById(userId, data);

  if (!user) {
    throw new NotFoundError({
      key: "user:errors.notFound",
      code: ERROR_CODES.USER_NOT_FOUND
    });
  }

  return toDto(MyProfileDto, user);
};
