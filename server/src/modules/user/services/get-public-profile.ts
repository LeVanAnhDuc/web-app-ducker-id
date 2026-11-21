// types
import type { UserServiceDeps } from "./deps";
// common
import { toDto } from "@/common/dto";
import { NotFoundError } from "@/exceptions";
// dtos
import { PublicProfileDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const getPublicProfile = async (
  deps: UserServiceDeps,
  userId: string
): Promise<PublicProfileDto> => {
  const user = await deps.userRepo.findPublicById(userId);

  if (!user) {
    throw new NotFoundError({
      key: "user:errors.notFound",
      code: ERROR_CODES.USER_NOT_FOUND
    });
  }

  return toDto(PublicProfileDto, user);
};
