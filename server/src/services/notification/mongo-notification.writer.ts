// libs
import { Types } from "mongoose";
// types
import type { AuthenticationRole } from "@/modules/authentication/types";
import type { CreateNotificationData } from "@/modules/notification/types";
import type {
  NotificationWriter,
  RecipientPage
} from "@/types/services/notification";
// models
import AuthenticationModel from "@/models/authentication";
import NotificationModel from "@/models/notification";
import UserModel from "@/models/user";
// others
import { isDuplicateKeyError } from "@/utils/mongo-errors";

const toDoc = (data: CreateNotificationData) => ({
  ...data,
  userId: new Types.ObjectId(data.userId),
  dedupeKey: data.dedupeKey ?? null
});

// A retried fan-out re-inserts the batch it died in; the unique
// (userId, dedupeKey) index rejects the copies and everything else lands.
const isOnlyDuplicates = (error: unknown): boolean => {
  const writeErrors = (error as { writeErrors?: { code?: number }[] })
    ?.writeErrors;
  if (Array.isArray(writeErrors) && writeErrors.length > 0) {
    return writeErrors.every((e) => e.code === 11000);
  }
  return isDuplicateKeyError(error);
};

export class MongoNotificationWriter implements NotificationWriter {
  async insertOne(data: CreateNotificationData): Promise<void> {
    await NotificationModel.create(toDoc(data));
  }

  async insertMany(data: CreateNotificationData[]): Promise<void> {
    try {
      await NotificationModel.insertMany(data.map(toDoc), { ordered: false });
    } catch (error) {
      if (!isOnlyDuplicates(error)) throw error;
    }
  }

  async findUserIdByAuthId(authId: string): Promise<string | null> {
    const user = await UserModel.findOne({ authId: new Types.ObjectId(authId) })
      .select("_id")
      .lean()
      .exec();
    return user ? user._id.toString() : null;
  }

  async findRecipients(
    roles: AuthenticationRole[],
    afterAuthId: string | null,
    limit: number
  ): Promise<RecipientPage> {
    const auths = await AuthenticationModel.find({
      roles: { $in: roles },
      isActive: true,
      ...(afterAuthId ? { _id: { $gt: new Types.ObjectId(afterAuthId) } } : {})
    })
      .sort({ _id: 1 })
      .limit(limit)
      .select("_id")
      .lean()
      .exec();

    if (auths.length === 0) return { userIds: [], lastAuthId: null };

    const users = await UserModel.find({
      authId: { $in: auths.map((a) => a._id) }
    })
      .select("_id")
      .lean()
      .exec();

    return {
      userIds: users.map((u) => u._id.toString()),
      lastAuthId:
        auths.length === limit ? auths[auths.length - 1]._id.toString() : null
    };
  }
}
