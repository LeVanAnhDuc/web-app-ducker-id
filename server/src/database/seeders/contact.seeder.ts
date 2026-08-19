// models
import ContactModel from "@/models/contact";
import UserModel from "@/models/user";
// others
import { Logger } from "@/libs/logger";
import {
  TEST_CONTACTS,
  MY_CONTACTS_SEED_OWNER_EMAIL,
  MY_CONTACTS_SEED_SUBJECTS
} from "./data/contacts";

export const seedContacts = async (): Promise<void> => {
  Logger.info("Starting contact seeding...");

  let createdCount = 0;
  let skippedCount = 0;

  for (const testContact of TEST_CONTACTS) {
    const email = testContact.email ?? undefined;

    const existingContact = await ContactModel.findOne({
      subject: testContact.subject,
      email: email ?? null
    });

    if (existingContact) {
      Logger.warn(
        `Contact already exists: "${testContact.subject}", skipping...`
      );
      skippedCount++;
      continue;
    }

    await ContactModel.create({
      email,
      subject: testContact.subject,
      priority: testContact.priority,
      message: testContact.message,
      status: testContact.status
    });

    Logger.info(`Created contact: "${testContact.subject}"`);
    createdCount++;
  }

  Logger.info(
    `Contact seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`
  );

  await attachMyContactsOwner();
};

// MyContacts feature (§A4): attach userId of the seed regular user to a
// handful of sample contacts (covering ≥2 statuses) so MyContacts list/detail
// + E2E have owned data to work with. Idempotent — re-running just re-sets
// the same userId, never creates/duplicates documents.
const attachMyContactsOwner = async (): Promise<void> => {
  const owner = await UserModel.findOne({
    email: MY_CONTACTS_SEED_OWNER_EMAIL
  });

  if (!owner) {
    Logger.warn(
      `MyContacts seed owner not found: ${MY_CONTACTS_SEED_OWNER_EMAIL}, skipping owner attach...`
    );
    return;
  }

  const result = await ContactModel.updateMany(
    { subject: { $in: MY_CONTACTS_SEED_SUBJECTS } },
    { $set: { userId: owner._id } }
  );

  Logger.info(
    `Attached MyContacts owner (${MY_CONTACTS_SEED_OWNER_EMAIL}) to ${result.modifiedCount} sample contacts`
  );
};

export const clearContacts = async (): Promise<void> => {
  Logger.info("Clearing seeded contacts...");

  const testSubjects = TEST_CONTACTS.map((c) => c.subject);

  const result = await ContactModel.deleteMany({
    subject: { $in: testSubjects }
  });

  Logger.info(`Cleared ${result.deletedCount} test contacts`);
};
