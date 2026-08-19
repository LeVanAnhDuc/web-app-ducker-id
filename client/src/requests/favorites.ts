// types
import type { FavoritesQueryParams, FavoritesResponse } from "@/types/Apps";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";
import { generatePath } from "@/utils";

const { END_POINTS } = CONSTANTS;

export const getFavorites = async (
  params?: FavoritesQueryParams
): Promise<FavoritesResponse> => {
  const response = await axiosInstance.get<ResponsePattern<FavoritesResponse>>(
    END_POINTS.FAVORITES,
    { params }
  );
  return response.data.data;
};

export const addFavorite = async (appId: string): Promise<void> => {
  await axiosInstance.post(
    generatePath(END_POINTS.FAVORITE_BY_APP_ID, { appId })
  );
};

export const removeFavorite = async (appId: string): Promise<void> => {
  await axiosInstance.delete(
    generatePath(END_POINTS.FAVORITE_BY_APP_ID, { appId })
  );
};
