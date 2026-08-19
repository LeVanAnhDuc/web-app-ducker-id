// types
import type { Request } from "express";
import type { Schema } from "mongoose";
// constants
import type { FAVORITE_SORTS } from "../constants";

export interface UserFavoriteDocument {
  _id: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  webAppId: Schema.Types.ObjectId;
  createdAt: Date;
}

export type FavoriteSort = (typeof FAVORITE_SORTS)[keyof typeof FAVORITE_SORTS];

export interface ListFavoritesQuery {
  search?: string;
  categoryId?: string;
  sort?: FavoriteSort;
}

export interface FavoriteAppIdParams {
  appId: string;
}

export interface FavoriteAppIdRequest extends Omit<Request, "params"> {
  params: { appId: string };
}

export interface ListFavoritesRequest extends Omit<Request, "query"> {
  query: ListFavoritesQuery;
}
