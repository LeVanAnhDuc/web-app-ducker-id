// types
import type { PublicUserRecord } from "@/modules/user/types";

export interface PublicProfileDto {
  _id: string;
  fullName: string;
  avatar: string | null;
  gender: string | null;
}

export const toPublicProfileDto = (
  user: PublicUserRecord,
  avatarUrl: string | null
): PublicProfileDto => ({
  _id: String(user._id),
  fullName: user.fullName,
  avatar: avatarUrl,
  gender: user.gender ?? null
});
