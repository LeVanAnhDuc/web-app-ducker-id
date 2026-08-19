// libs
import { jwtDecode } from "jwt-decode";
// types
import type { DecodedAccessToken, DecodedIdToken } from "@/types/User";
// stores
import { useAuthStore } from "@/stores";
// others
import { getInitials } from "@/utils";
import CONSTANTS from "@/constants";

const { USER } = CONSTANTS.AUTHENTICATION_ROLES;

const decode = <T>(token: string | undefined): T | null => {
  if (!token) return null;
  try {
    return jwtDecode<T>(token);
  } catch {
    return null;
  }
};

const useUserInfo = () => {
  const tokens = useAuthStore((state) => state.tokens);
  const idPayload = decode<DecodedIdToken>(tokens?.idToken);

  if (!idPayload) return null;

  const accessPayload = decode<DecodedAccessToken>(tokens?.accessToken);
  const fullName = idPayload.name ?? idPayload.email;

  return {
    email: idPayload.email,
    fullName,
    avatar: idPayload.picture ?? null,
    initials: getInitials(fullName),
    roles: accessPayload?.roles ?? USER,
    mustChangePassword: idPayload.mustChangePassword ?? false
  };
};

export default useUserInfo;
