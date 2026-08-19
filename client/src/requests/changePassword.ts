// types
import type { LoginTokenResponse } from "@/types/Login";
import type { ChangePasswordFormValues } from "@/types/ChangePassword";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

export const changePassword = async (
  payload: ChangePasswordFormValues
): Promise<LoginTokenResponse> => {
  const response = await axiosInstance.patch<
    ResponsePattern<LoginTokenResponse>
  >(END_POINTS.AUTH_CHANGE_PASSWORD, payload);
  return response.data.data;
};
