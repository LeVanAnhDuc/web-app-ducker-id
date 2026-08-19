// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

export const logoutUser = async (): Promise<void> => {
  await axiosInstance.post(CONSTANTS.END_POINTS.AUTH_LOGOUT);
};
