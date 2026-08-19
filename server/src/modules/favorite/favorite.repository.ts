// libs
import { Types } from "mongoose";
// types
import type { UserFavoriteDocument } from "@/modules/favorite/types";
// models
import UserFavoriteModel from "@/models/user-favorite";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";

export type FavoriteRepository = {
  add(userId: string, webAppId: string): Promise<void>;
  remove(userId: string, webAppId: string): Promise<void>;
  findWebAppIdsByUser(userId: string): Promise<string[]>;
  findFavoritedAppIds(
    userId: string,
    webAppIds: string[]
  ): Promise<Set<string>>;
};

export class MongoFavoriteRepository implements FavoriteRepository {
  async add(userId: string, webAppId: string): Promise<void> {
    return asyncDatabaseHandler("favorite.add", async () => {
      await UserFavoriteModel.updateOne(
        {
          userId: new Types.ObjectId(userId),
          webAppId: new Types.ObjectId(webAppId)
        },
        { $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      ).exec();
    });
  }

  async remove(userId: string, webAppId: string): Promise<void> {
    return asyncDatabaseHandler("favorite.remove", async () => {
      await UserFavoriteModel.deleteOne({
        userId: new Types.ObjectId(userId),
        webAppId: new Types.ObjectId(webAppId)
      }).exec();
    });
  }

  async findWebAppIdsByUser(userId: string): Promise<string[]> {
    return asyncDatabaseHandler("favorite.findWebAppIdsByUser", async () => {
      const docs = await UserFavoriteModel.find({
        userId: new Types.ObjectId(userId)
      })
        .sort({ createdAt: -1 })
        .select("webAppId")
        .lean<Pick<UserFavoriteDocument, "webAppId">[]>()
        .exec();
      return docs.map((d) => d.webAppId.toString());
    });
  }

  async findFavoritedAppIds(
    userId: string,
    webAppIds: string[]
  ): Promise<Set<string>> {
    return asyncDatabaseHandler("favorite.findFavoritedAppIds", async () => {
      if (webAppIds.length === 0) return new Set<string>();
      const docs = await UserFavoriteModel.find({
        userId: new Types.ObjectId(userId),
        webAppId: { $in: webAppIds.map((id) => new Types.ObjectId(id)) }
      })
        .select("webAppId")
        .lean<Pick<UserFavoriteDocument, "webAppId">[]>()
        .exec();
      return new Set(docs.map((d) => d.webAppId.toString()));
    });
  }
}
