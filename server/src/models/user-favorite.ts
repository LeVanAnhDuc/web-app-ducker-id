// libs
import { Schema, model, type Model } from "mongoose";
// types
import type { UserFavoriteDocument } from "@/modules/favorite/types";
// others
import { MODEL_NAMES } from "@/constants/models";

const { USER_FAVORITE, USER, WEB_APP } = MODEL_NAMES;

const UserFavoriteSchema = new Schema<UserFavoriteDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: USER,
      required: [true, "User ID is required"]
    },
    webAppId: {
      type: Schema.Types.ObjectId,
      ref: WEB_APP,
      required: [true, "Web app ID is required"]
    }
  },
  {
    collection: "user_favorites",
    timestamps: { createdAt: true, updatedAt: false }
  }
);

UserFavoriteSchema.index({ userId: 1, webAppId: 1 }, { unique: true });
UserFavoriteSchema.index({ userId: 1, createdAt: -1 });

UserFavoriteSchema.virtual("webApp", {
  ref: WEB_APP,
  localField: "webAppId",
  foreignField: "_id",
  justOne: true
});

const UserFavoriteModel: Model<UserFavoriteDocument> =
  model<UserFavoriteDocument>(USER_FAVORITE, UserFavoriteSchema);

export default UserFavoriteModel;
