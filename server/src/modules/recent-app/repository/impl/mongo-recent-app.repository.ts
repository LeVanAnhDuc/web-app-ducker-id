// libs
import { Types } from "mongoose";
// types
import type { FilterQuery } from "mongoose";
import type { PaginationOptions } from "@/types/common";
import type {
  RecentAppUsage,
  UserAppUsageDocument
} from "@/modules/recent-app/types";
import type { RecentAppRepository } from "../recent-app.repository";
// models
import UserAppUsageModel from "@/models/user-app-usage";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";
import { isDuplicateKeyError } from "@/utils/mongo-errors";

const oid = (id: string) => new Types.ObjectId(id);

export class MongoRecentAppRepository implements RecentAppRepository {
  /**
   * One round trip for every case, via an update pipeline:
   * - no row yet → insert with useCount 1
   * - row soft-deleted → revive it and restart the count at 1
   * - row written inside the dedupe window → refresh lastUsedAt only
   * - otherwise → refresh lastUsedAt and increment useCount
   *
   * Two concurrent first writes race on the unique index; the loser retries
   * once, by which time the row exists and it takes the update path.
   */
  async record(
    userId: string,
    webAppId: string,
    now: Date,
    dedupeWindowMs: number
  ): Promise<void> {
    return asyncDatabaseHandler("recentApp.record", async () => {
      const isNew = { $eq: [{ $type: "$lastUsedAt" }, "missing"] };
      const isHidden = { $ne: [{ $ifNull: ["$hiddenAt", null] }, null] };
      const isDuplicate = {
        $gt: ["$lastUsedAt", new Date(now.getTime() - dedupeWindowMs)]
      };

      const upsert = () =>
        UserAppUsageModel.updateOne(
          { userId: oid(userId), webAppId: oid(webAppId) },
          [
            {
              $set: {
                useCount: {
                  $cond: [
                    { $or: [isNew, isHidden] },
                    1,
                    {
                      $cond: [
                        isDuplicate,
                        "$useCount",
                        { $add: ["$useCount", 1] }
                      ]
                    }
                  ]
                },
                lastUsedAt: now,
                hiddenAt: null,
                createdAt: { $ifNull: ["$createdAt", now] }
              }
            }
          ],
          { upsert: true }
        ).exec();

      try {
        await upsert();
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        await upsert();
      }
    });
  }

  async findVisibleWebAppIds(userId: string): Promise<string[]> {
    return asyncDatabaseHandler("recentApp.findVisibleWebAppIds", async () => {
      const docs = await UserAppUsageModel.find({
        userId: oid(userId),
        hiddenAt: null
      })
        .select("webAppId")
        .lean<Pick<UserAppUsageDocument, "webAppId">[]>()
        .exec();
      return docs.map((d) => d.webAppId.toString());
    });
  }

  async findPage(
    userId: string,
    webAppIds: string[],
    { skip, limit, sort }: PaginationOptions
  ): Promise<{ data: RecentAppUsage[]; total: number }> {
    return asyncDatabaseHandler("recentApp.findPage", async () => {
      if (webAppIds.length === 0) return { data: [], total: 0 };

      const filter: FilterQuery<UserAppUsageDocument> = {
        userId: oid(userId),
        hiddenAt: null,
        webAppId: { $in: webAppIds.map(oid) }
      };

      // _id breaks ties so two rows written in the same millisecond keep a
      // stable order across pages.
      const [docs, total] = await Promise.all([
        UserAppUsageModel.find(filter)
          .sort({ ...sort, _id: -1 })
          .skip(skip)
          .limit(limit)
          .select("webAppId lastUsedAt useCount")
          .lean<
            Pick<
              UserAppUsageDocument,
              "_id" | "webAppId" | "lastUsedAt" | "useCount"
            >[]
          >()
          .exec(),
        UserAppUsageModel.countDocuments(filter).exec()
      ]);

      return {
        data: docs.map((d) => ({
          id: d._id.toString(),
          webAppId: d.webAppId.toString(),
          lastUsedAt: d.lastUsedAt,
          useCount: d.useCount
        })),
        total
      };
    });
  }

  async hide(userId: string, webAppId: string, now: Date): Promise<void> {
    return asyncDatabaseHandler("recentApp.hide", async () => {
      await UserAppUsageModel.updateOne(
        { userId: oid(userId), webAppId: oid(webAppId), hiddenAt: null },
        { $set: { hiddenAt: now } }
      ).exec();
    });
  }

  async hideAll(userId: string, now: Date): Promise<void> {
    return asyncDatabaseHandler("recentApp.hideAll", async () => {
      await UserAppUsageModel.updateMany(
        { userId: oid(userId), hiddenAt: null },
        { $set: { hiddenAt: now } }
      ).exec();
    });
  }

  async restore(userId: string, webAppId: string): Promise<void> {
    return asyncDatabaseHandler("recentApp.restore", async () => {
      await UserAppUsageModel.updateOne(
        { userId: oid(userId), webAppId: oid(webAppId) },
        { $set: { hiddenAt: null } }
      ).exec();
    });
  }
}
