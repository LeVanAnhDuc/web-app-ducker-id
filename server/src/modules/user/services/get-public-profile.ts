// types
import type { PublicProfileDto } from "../dtos";
import type { UserServiceDeps } from "./deps";
// common
import { NotFoundError } from "@/common/exceptions";
// dtos
import { toPublicProfileDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const getPublicProfile = async (
  deps: UserServiceDeps,
  userId: string
): Promise<PublicProfileDto> => {
  const user = await deps.userRepo.findPublicById(userId);

  if (!user) {
    throw new NotFoundError({
      i18nMessage: (t) => t("user:errors.notFound"),
      code: ERROR_CODES.USER_NOT_FOUND
    });
  }

  return toPublicProfileDto(user, user.avatar ?? null);
};
