// types
import type {
  AdminUsersQueryParams,
  PaginatedAdminUsersResponse,
  SetAdminUserActiveResult,
  ResetAdminUserPasswordResult
} from "@/types/AdminUsers";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";
import { generatePath } from "@/utils";

const { END_POINTS } = CONSTANTS;

export const getAdminUsers = async (
  params: AdminUsersQueryParams = {}
): Promise<PaginatedAdminUsersResponse> => {
  const response = await axiosInstance.get<
    ResponsePattern<PaginatedAdminUsersResponse>
  >(END_POINTS.ADMIN_USERS, { params });
  return response.data.data;
};

export const lockAdminUser = async (
  id: string
): Promise<SetAdminUserActiveResult> => {
  const response = await axiosInstance.patch<
    ResponsePattern<SetAdminUserActiveResult>
  >(generatePath(END_POINTS.ADMIN_USER_LOCK, { id }));
  return response.data.data;
};

export const unlockAdminUser = async (
  id: string
): Promise<SetAdminUserActiveResult> => {
  const response = await axiosInstance.patch<
    ResponsePattern<SetAdminUserActiveResult>
  >(generatePath(END_POINTS.ADMIN_USER_UNLOCK, { id }));
  return response.data.data;
};

export const resetAdminUserPassword = async (
  id: string
): Promise<ResetAdminUserPasswordResult> => {
  const response = await axiosInstance.post<
    ResponsePattern<ResetAdminUserPasswordResult>
  >(generatePath(END_POINTS.ADMIN_USER_RESET_PASSWORD, { id }));
  return response.data.data;
};
