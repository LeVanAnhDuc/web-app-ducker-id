// models
import NotificationModel from "@/models/notification";
import UserModel from "@/models/user";
// others
import {
  buildSeedNotifications,
  TARGET_NOTIFICATION_EMAILS
} from "./data/notifications";
import { Logger } from "@/libs/logger";

export const seedNotifications = async (): Promise<void> => {
  Logger.info("Starting notification seeding...");
  for (const email of TARGET_NOTIFICATION_EMAILS) {
    const user = await UserModel.findOne({ email });
    if (!user) {
      Logger.warn(
        `Seed target user ${email} not found; skipping notifications.`
      );
      continue;
    }
    const existing = await NotificationModel.countDocuments({
      userId: user._id
    });
    if (existing > 0) {
      Logger.warn(`Notifications already exist for ${email}; skipping.`);
      continue;
    }
    const now = Date.now();
    const docs = buildSeedNotifications().map((n) => ({
      userId: user._id,
      type: n.type,
      title: n.title,
      message: n.message,
      meta: null,
      isRead: n.isRead,
      readAt: n.isRead ? new Date(now - n.ageMs) : null,
      createdAt: new Date(now - n.ageMs)
    }));
    await NotificationModel.insertMany(docs);
    Logger.info(`Created ${docs.length} notifications for ${email}`);
  }
};

export const clearNotifications = async (): Promise<void> => {
  Logger.info("Clearing seeded notifications...");
  for (const email of TARGET_NOTIFICATION_EMAILS) {
    const user = await UserModel.findOne({ email });
    if (!user) continue;
    const res = await NotificationModel.deleteMany({ userId: user._id });
    Logger.info(`Cleared ${res.deletedCount} notifications for ${email}`);
  }
};
