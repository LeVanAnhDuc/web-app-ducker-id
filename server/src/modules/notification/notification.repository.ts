// libs
import { Types } from "mongoose";
// types
import type { FilterQuery } from "mongoose";
import type {
  NotificationDocument,
  NotificationFilter
} from "@/modules/notification/types";
import type { PaginationOptions } from "@/types/common";
// models
import NotificationModel from "@/models/notification";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";

export type NotificationRepository = {
  findByUser(
    filter: NotificationFilter,
    options: PaginationOptions
  ): Promise<{ data: NotificationDocument[]; total: number }>;
  countUnread(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<NotificationDocument | null>;
  markAllRead(userId: string): Promise<number>;
};

export class MongoNotificationRepository implements NotificationRepository {
  async findByUser(
    filter: NotificationFilter,
    options: PaginationOptions
  ): Promise<{ data: NotificationDocument[]; total: number }> {
    return asyncDatabaseHandler("findByUser", async () => {
      const mongoFilter = this.toMongoFilter(filter);
      const [data, total] = await Promise.all([
        NotificationModel.find(mongoFilter)
          .skip(options.skip)
          .limit(options.limit)
          .sort(options.sort)
          .lean()
          .exec(),
        NotificationModel.countDocuments(mongoFilter).exec()
      ]);

      return { data: data as unknown as NotificationDocument[], total };
    });
  }

  async countUnread(userId: string): Promise<number> {
    return asyncDatabaseHandler("countUnread", async () =>
      NotificationModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false
      }).exec()
    );
  }

  async markRead(
    id: string,
    userId: string
  ): Promise<NotificationDocument | null> {
    return asyncDatabaseHandler("markRead", async () => {
      const doc = await NotificationModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: { isRead: true, readAt: new Date() } },
        { new: true }
      )
        .lean()
        .exec();

      return (doc as unknown as NotificationDocument) ?? null;
    });
  }

  async markAllRead(userId: string): Promise<number> {
    return asyncDatabaseHandler("markAllRead", async () => {
      const res = await NotificationModel.updateMany(
        { userId: new Types.ObjectId(userId), isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      ).exec();

      return res.modifiedCount;
    });
  }

  private toMongoFilter(
    filter: NotificationFilter
  ): FilterQuery<NotificationDocument> {
    const mongo: FilterQuery<NotificationDocument> = {
      userId: new Types.ObjectId(filter.userId)
    };

    if (filter.isRead !== undefined) mongo.isRead = filter.isRead;

    return mongo;
  }
}
