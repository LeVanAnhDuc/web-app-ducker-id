// types
import type {
  RecentAppsQueryParams,
  RecentAppsResponse,
  RecentAppsStats,
  RecentAppsStatsQueryParams
} from "@/types/RecentlyUsed";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";
import { generatePath } from "@/utils";

const { END_POINTS } = CONSTANTS;

export const getRecentApps = async (
  params?: RecentAppsQueryParams
): Promise<RecentAppsResponse> => {
  const response = await axiosInstance.get<ResponsePattern<RecentAppsResponse>>(
    END_POINTS.RECENT_APPS,
    { params }
  );
  return response.data.data;
};

export const getRecentAppsStats = async (
  params?: RecentAppsStatsQueryParams
): Promise<RecentAppsStats> => {
  const response = await axiosInstance.get<ResponsePattern<RecentAppsStats>>(
    END_POINTS.RECENT_APPS_STATS,
    { params }
  );
  return response.data.data;
};

export const recordRecentApp = async (appId: string): Promise<void> => {
  await axiosInstance.post(
    generatePath(END_POINTS.RECENT_APP_BY_APP_ID, { appId })
  );
};

export const hideRecentApp = async (appId: string): Promise<void> => {
  await axiosInstance.delete(
    generatePath(END_POINTS.RECENT_APP_BY_APP_ID, { appId })
  );
};

export const restoreRecentApp = async (appId: string): Promise<void> => {
  await axiosInstance.post(
    generatePath(END_POINTS.RECENT_APP_RESTORE, { appId })
  );
};

export const clearRecentApps = async (): Promise<void> => {
  await axiosInstance.delete(END_POINTS.RECENT_APPS);
};
