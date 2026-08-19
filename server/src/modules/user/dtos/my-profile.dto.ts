// types
import type { UserDocument } from "@/modules/user/types";

export interface MyProfileDto {
  _id: string;
  fullName: string;
  phone: string | null;
  avatar: string | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  email: string;
  createdAt: string;
}

export const toMyProfileDto = (
  user: UserDocument,
  avatarUrl: string | null
): MyProfileDto => ({
  _id: String(user._id),
  fullName: user.fullName,
  phone: user.phone ?? null,
  avatar: avatarUrl,
  address: user.address ?? null,
  dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
  gender: user.gender ?? null,
  email: user.email,
  createdAt: user.createdAt.toISOString()
});
