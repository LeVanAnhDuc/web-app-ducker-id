// types
import type {
  LoginHistoryQueryParams,
  AdminLoginHistoryQueryParams,
  PaginatedLoginHistoryResponse,
  PaginatedAdminLoginHistoryResponse,
  LoginHistoryStats,
  LoginHistoryAdminDetailItem
} from "@/types/LoginHistory";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";
import { generatePath } from "@/utils";

const { END_POINTS } = CONSTANTS;

export const getMyLoginHistory = async (
  params?: LoginHistoryQueryParams
): Promise<PaginatedLoginHistoryResponse> => {
  const response = await axiosInstance.get<
    ResponsePattern<PaginatedLoginHistoryResponse>
  >(END_POINTS.LOGIN_HISTORY, { params });
  return response.data.data;
};

export const getMyLoginHistoryStats = async (): Promise<LoginHistoryStats> => {
  const response = await axiosInstance.get<ResponsePattern<LoginHistoryStats>>(
    END_POINTS.LOGIN_HISTORY_STATS
  );
  return response.data.data;
};

export const getAdminLoginHistory = async (
  params?: AdminLoginHistoryQueryParams
): Promise<PaginatedAdminLoginHistoryResponse> => {
  const response = await axiosInstance.get<
    ResponsePattern<PaginatedAdminLoginHistoryResponse>
  >(END_POINTS.ADMIN_LOGIN_HISTORY, { params });
  return response.data.data;
};

export const getAdminLoginHistoryDetail = async (
  id: string
): Promise<LoginHistoryAdminDetailItem> => {
  const response = await axiosInstance.get<
    ResponsePattern<LoginHistoryAdminDetailItem>
  >(generatePath(END_POINTS.ADMIN_LOGIN_HISTORY_BY_ID, { id }));
  return response.data.data;
};
