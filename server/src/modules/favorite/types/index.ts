// types
import type { Request } from "express";
import type { Schema } from "mongoose";
import type {
  FavoriteAppIdParamsDto,
  ListFavoritesQueryDto
} from "../dtos/requests";
// constants
import type { FAVORITE_SORTS } from "../constants";

export interface UserFavoriteDocument {
  _id: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  webAppId: Schema.Types.ObjectId;
  createdAt: Date;
}

export type FavoriteSort = (typeof FAVORITE_SORTS)[keyof typeof FAVORITE_SORTS];

// The index signature keeps the handlers assignable to Express's own, whose
// query and params are string dictionaries.
export interface FavoriteAppIdRequest extends Omit<Request, "params"> {
  params: FavoriteAppIdParamsDto & Record<string, string>;
}

export interface ListFavoritesRequest extends Omit<Request, "query"> {
  query: ListFavoritesQueryDto & Request["query"];
}
