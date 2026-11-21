// types
import type { UserRepository } from "../repository/user.repository";
// common
import { toDto } from "@/common/dto";
import { NotFoundError } from "@/exceptions";
// dtos
import { PublicProfileDto } from "../dtos";
// others
import { ERROR_CODES } from "@/constants/error-code";

export const getPublicProfile = async (
  userRepo: UserRepository,
  userId: string
): Promise<PublicProfileDto> => {
  const user = await userRepo.findPublicById(userId);

  if (!user) {
    throw new NotFoundError({
      key: "user:errors.notFound",
      code: ERROR_CODES.USER_NOT_FOUND
    });
  }

  return toDto(PublicProfileDto, user);
};
