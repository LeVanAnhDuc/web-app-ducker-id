// database
import instanceMongoDB from "@/database/mongodb";
// models
import WebAppCategoryModel from "@/models/web-app-category";
import WebAppModel from "@/models/web-app";
// others
import { Logger } from "@/libs/logger";
import {
  findCaseInsensitiveDuplicates,
  migrateCategories,
  type LegacyCategory
} from "./category-management.transform";

/**
 * Moves data to the shape of feature `category-management`:
 *
 * - `web_app_categories`: `name` (slug) + `displayName` + `icon` →
 *   `slug` + `name: { en, vi }`, sortOrder renumbered 0..n-1.
 * - `web_apps`: `categoryId` → `categoryIds: [categoryId]`.
 * - Indexes are synced to the new schemas, which drops `name_1`,
 *   `sortOrder_1_name_1` and `categoryId_1_sortOrder_1`.
 *
 * Writes go through the native driver: the old fields are no longer in the
 * schemas and Mongoose strict mode would silently drop the `$unset`.
 *
 * Idempotent — only documents still in the old shape are touched, so a second
 * run reports zero changes. Stops before writing if two English names differ
 * only by case, since the new unique index would then fail halfway.
 */
const migrate = async (): Promise<void> => {
  try {
    Logger.info("Connecting to MongoDB...");
    await instanceMongoDB.connect();

    const categories = WebAppCategoryModel.collection;
    const legacy = (await categories
      .find({ displayName: { $exists: true } })
      .toArray()) as unknown as LegacyCategory[];
    const current = await categories
      .find({ displayName: { $exists: false } })
      .project<{ name: { en: string } }>({ "name.en": 1 })
      .toArray();

    if (legacy.length > 0 && current.length > 0) {
      throw new Error(
        "web_app_categories mixes old and new shapes — migrate from a consistent backup"
      );
    }

    const migrated = migrateCategories(legacy);
    const duplicates = findCaseInsensitiveDuplicates(
      migrated.map((c) => c.name.en)
    );
    if (duplicates.length > 0) {
      throw new Error(
        `English names differ only by case, rename one of each first: ${duplicates.join(", ")}`
      );
    }

    for (const category of migrated) {
      await categories.updateOne(
        { _id: category._id as never },
        {
          $set: {
            slug: category.slug,
            name: category.name,
            sortOrder: category.sortOrder
          },
          $unset: { displayName: "", icon: "" }
        }
      );
    }
    Logger.info("Migrated categories", { modified: migrated.length });

    const apps = await WebAppModel.collection.updateMany(
      { categoryId: { $exists: true } },
      [{ $set: { categoryIds: ["$categoryId"] } }, { $unset: "categoryId" }]
    );
    Logger.info("Migrated web apps", {
      matched: apps.matchedCount,
      modified: apps.modifiedCount
    });

    const droppedCategoryIndexes = await WebAppCategoryModel.syncIndexes();
    const droppedAppIndexes = await WebAppModel.syncIndexes();
    Logger.info("Synced indexes", {
      categoriesDropped: droppedCategoryIndexes,
      appsDropped: droppedAppIndexes
    });
  } catch (error) {
    Logger.error("Migration category-management failed", error);
    await instanceMongoDB.disconnect();
    process.exit(1);
  }

  await instanceMongoDB.disconnect();
  process.exit(0);
};

migrate();
