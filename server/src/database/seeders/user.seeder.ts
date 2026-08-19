// models
import AuthenticationModel from "@/models/authentication";
import UserModel from "@/models/user";
// others
import { hashValue } from "@/utils/crypto/bcrypt";
import { TEST_USERS } from "./data/users";
import { Logger } from "@/libs/logger";

export const seedUsers = async (): Promise<void> => {
  Logger.info("Starting user seeding...");

  let createdCount = 0;
  let skippedCount = 0;

  for (const testUser of TEST_USERS) {
    const existingUser = await UserModel.findOne({
      email: testUser.user.email
    });

    if (existingUser) {
      Logger.warn(`User already exists: ${testUser.user.email}, skipping...`);
      skippedCount++;
      continue;
    }

    const hashedPassword = hashValue(testUser.authentication.password);

    const authentication = await AuthenticationModel.create({
      password: hashedPassword,
      roles: testUser.authentication.roles,
      verifiedEmail: testUser.authentication.verifiedEmail,
      isActive: testUser.authentication.isActive
    });

    await UserModel.create({
      authId: authentication._id,
      email: testUser.user.email,
      fullName: testUser.user.fullName,
      gender: testUser.user.gender,
      dateOfBirth: testUser.user.dateOfBirth
    });

    Logger.info(`Created user: ${testUser.user.email}`);
    createdCount++;
  }

  Logger.info(
    `User seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`
  );
};

export const clearUsers = async (): Promise<void> => {
  Logger.info("Clearing all users...");

  const testEmails = TEST_USERS.map((u) => u.user.email);

  const users = await UserModel.find({ email: { $in: testEmails } });
  const authIds = users.map((u) => u.authId);

  await UserModel.deleteMany({ email: { $in: testEmails } });
  await AuthenticationModel.deleteMany({ _id: { $in: authIds } });

  Logger.info(`Cleared ${users.length} test users`);
};
