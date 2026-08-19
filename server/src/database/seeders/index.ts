// database
import instanceMongoDB from "@/database/mongodb";
// others
import { Logger } from "@/libs/logger";
import { seedUsers, clearUsers } from "./user.seeder";
import { seedContacts, clearContacts } from "./contact.seeder";
import { seedWebApps, clearWebApps } from "./web-app.seeder";
import { seedNotifications, clearNotifications } from "./notification.seeder";

const runSeeders = async (): Promise<void> => {
  try {
    Logger.info("Connecting to MongoDB...");
    await instanceMongoDB.connect();

    const args = process.argv.slice(2);
    const shouldClear = args.includes("--clear");

    if (shouldClear) {
      Logger.info("Clear flag detected, removing existing test data...");
      await clearUsers();
      await clearContacts();
      await clearWebApps();
      await clearNotifications();
    }

    Logger.info("Running seeders...");
    await seedUsers();
    await seedNotifications();
    await seedContacts();
    await seedWebApps();

    Logger.info("All seeders completed successfully!");
  } catch (error) {
    Logger.error("Seeder failed", error);
    process.exit(1);
  } finally {
    await instanceMongoDB.disconnect();
    process.exit(0);
  }
};

runSeeders();
