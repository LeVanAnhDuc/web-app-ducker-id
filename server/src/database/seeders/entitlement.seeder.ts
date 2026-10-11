// models
import EntitlementModel from "@/models/entitlement";
import UserModel from "@/models/user";
import WebAppModel from "@/models/web-app";
// others
import {
  ENTITLEMENT_OVERRIDES,
  ENTITLEMENT_SEED_ACTOR
} from "./data/entitlements";
import { Logger } from "@/libs/logger";

/** Upserts by (user, app), so running it twice leaves one override per pair. */
export const seedEntitlements = async (): Promise<void> => {
  Logger.info("Starting entitlement seeding...");

  const actor = await UserModel.findOne({ email: ENTITLEMENT_SEED_ACTOR });
  if (!actor) {
    Logger.warn(`Seed actor ${ENTITLEMENT_SEED_ACTOR} not found, skipping...`);
    return;
  }

  let upserted = 0;
  for (const override of ENTITLEMENT_OVERRIDES) {
    const [user, app] = await Promise.all([
      UserModel.findOne({ email: override.email }),
      WebAppModel.findOne({ name: override.appName })
    ]);

    if (!user || !app) {
      Logger.warn(
        `User ${override.email} or app ${override.appName} not found, skipping...`
      );
      continue;
    }

    await EntitlementModel.updateOne(
      { userId: user._id, webAppId: app._id },
      { $set: { effect: override.effect, updatedBy: actor._id } },
      { upsert: true }
    );
    upserted++;
  }

  Logger.info(`Entitlement seeding completed. Upserted: ${upserted}`);
};

export const clearEntitlements = async (): Promise<void> => {
  Logger.info("Clearing seeded entitlements...");

  const emails = [...new Set(ENTITLEMENT_OVERRIDES.map((o) => o.email))];
  const users = await UserModel.find({ email: { $in: emails } }).select("_id");
  const result = await EntitlementModel.deleteMany({
    userId: { $in: users.map((user) => user._id) }
  });

  Logger.info(`Cleared ${result.deletedCount} entitlements`);
};
