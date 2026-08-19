// types
import type {
  MyProfileResponse,
  PublicProfileResponse,
  UpdateProfileData
} from "@/types/User";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";
import { generatePath } from "@/utils";

const { END_POINTS } = CONSTANTS;

export const getMyProfile = async (): Promise<MyProfileResponse> => {
  const response = await axiosInstance.get<ResponsePattern<MyProfileResponse>>(
    END_POINTS.USERS_ME
  );
  return response.data.data;
};

export const updateMyProfile = async (
  data: UpdateProfileData
): Promise<MyProfileResponse> => {
  const response = await axiosInstance.patch<
    ResponsePattern<MyProfileResponse>
  >(END_POINTS.USERS_ME, data);
  return response.data.data;
};

export const getPublicProfile = async (
  id: string
): Promise<PublicProfileResponse> => {
  const response = await axiosInstance.get<
    ResponsePattern<PublicProfileResponse>
  >(generatePath(END_POINTS.USER_BY_ID, { id }));
  return response.data.data;
};
