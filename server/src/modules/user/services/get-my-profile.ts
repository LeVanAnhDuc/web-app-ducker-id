// types
import type { UserServiceDeps } from "./deps";
// common
import { toDto } from "@/common/dto";
import { NotFoundError } from "@/exceptions";
// dtos
import { MyProfileDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";
import { RequestContext } from "@/utils/request-context";

export const getMyProfile = async (
  deps: UserServiceDeps
): Promise<MyProfileDto> => {
  const userId = RequestContext.requireUserId();
  const user = await deps.userRepo.findById(userId);

  if (!user) {
    throw new NotFoundError({
      key: "user:errors.notFound",
      code: ERROR_CODES.USER_NOT_FOUND
    });
  }

  return toDto(MyProfileDto, user);
};
