// others
import type AUTHENTICATION_ROLES from "@/constants/roles";
import type GENDER from "@/constants/gender";

export type GenderEnum = (typeof GENDER)[keyof typeof GENDER];

export type MyProfileResponse = {
  _id: string;
  fullName: string;
  phone: string | null;
  avatar: string | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: GenderEnum | null;
  email: string;
  createdAt: string;
};

export type PublicProfileResponse = {
  _id: string;
  fullName: string;
  avatar: string | null;
  gender: GenderEnum | null;
};

export type UpdateProfileData = {
  fullName?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: GenderEnum;
};

export type AuthenticationRole =
  (typeof AUTHENTICATION_ROLES)[keyof typeof AUTHENTICATION_ROLES];

export interface DecodedIdToken {
  sub: string;
  name: string;
  email: string;
  picture?: string | null;
  mustChangePassword?: boolean;
}

export interface DecodedAccessToken {
  sub: string;
  authId: string;
  roles: AuthenticationRole;
}
