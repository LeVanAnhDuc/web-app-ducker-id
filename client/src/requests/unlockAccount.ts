// types
import type { LoginTokenResponse } from "@/types/Login";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

export const requestUnlock = async (
  email: string
): Promise<{ success: boolean }> => {
  const response = await axiosInstance.post<
    ResponsePattern<{ success: boolean }>
  >(END_POINTS.AUTH_UNLOCK_REQUEST, { email });
  return response.data.data;
};

export const verifyUnlock = async (
  email: string,
  tempPassword: string
): Promise<LoginTokenResponse> => {
  const response = await axiosInstance.post<
    ResponsePattern<LoginTokenResponse>
  >(END_POINTS.AUTH_UNLOCK_VERIFY, { email, tempPassword });
  return response.data.data;
};
