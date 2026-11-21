// types
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
