// types
import type { mongo } from "mongoose";
import type { LegacyCategory } from "./transforms/category-management";
// others
import {
  findCaseInsensitiveDuplicates,
  migrateCategories
} from "./transforms/category-management";

/**
 * Moves data to the shape of feature `category-management`: a category gets a
 * slug and a bilingual `name`, and an app's single `categoryId` becomes an
 * ordered `categoryIds` array.
 *
 * Only documents still in the old shape are touched, so a second run changes
 * nothing. Indexes are named here rather than synced from the current models,
 * so the migration means the same thing however the models change later.
 */
const CATEGORY_COLLATION = { locale: "en", strength: 2 };

const dropIndexIfExists = async (
  collection: mongo.Collection,
  name: string
) => {
  if (await collection.indexExists(name)) await collection.dropIndex(name);
};

export const up = async (db: mongo.Db): Promise<void> => {
  const categories = db.collection("web_app_categories");
  const apps = db.collection("web_apps");

  const legacy = (await categories
    .find({ displayName: { $exists: true } })
    .toArray()) as unknown as LegacyCategory[];
  const current = await categories.countDocuments({
    displayName: { $exists: false }
  });
  if (legacy.length > 0 && current > 0) {
    throw new Error(
      "web_app_categories mixes old and new shapes — migrate from a consistent backup"
    );
  }

  // Checked before any write: the new case-insensitive unique index would
  // otherwise fail halfway through
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

  await apps.updateMany({ categoryId: { $exists: true } }, [
    { $set: { categoryIds: ["$categoryId"] } },
    { $unset: "categoryId" }
  ]);

  await dropIndexIfExists(categories, "name_1");
  await dropIndexIfExists(categories, "sortOrder_1_name_1");
  await categories.createIndex({ slug: 1 }, { unique: true });
  await categories.createIndex(
    { "name.en": 1 },
    { unique: true, collation: CATEGORY_COLLATION }
  );
  await categories.createIndex({ sortOrder: 1, _id: 1 });

  await dropIndexIfExists(apps, "categoryId_1_sortOrder_1");
  await apps.createIndex({ categoryIds: 1, sortOrder: 1 });
};

/**
 * Puts categories and apps back in the shape the release before
 * `category-management` reads, so that release can be redeployed.
 *
 * Lossy, and safe on half-migrated data:
 * - `displayName` comes back from `name.en`, and `name` from `slug`. The slug
 *   was re-derived from the English name on the way up, so it may differ
 *   from the original (`tools` came back as `internal-tools`);
 * - the Vietnamese name and the dropped `icon` are not recoverable (icon
 *   comes back as null);
 * - an app keeps only its primary category, `categoryIds[0]`.
 */
export const down = async (db: mongo.Db): Promise<void> => {
  const categories = db.collection("web_app_categories");
  const apps = db.collection("web_apps");

  // Old documents have no name.en, so the new unique index must go first
  await dropIndexIfExists(categories, "name.en_1");
  await dropIndexIfExists(categories, "slug_1");
  await dropIndexIfExists(categories, "sortOrder_1__id_1");

  await categories.updateMany(
    { displayName: { $exists: false }, slug: { $exists: true } },
    [
      { $set: { displayName: "$name.en", name: "$slug", icon: null } },
      { $unset: "slug" }
    ]
  );

  await dropIndexIfExists(apps, "categoryIds_1_sortOrder_1");
  await apps.updateMany({ categoryIds: { $exists: true } }, [
    { $set: { categoryId: { $arrayElemAt: ["$categoryIds", 0] } } },
    { $unset: "categoryIds" }
  ]);

  await categories.createIndex({ name: 1 }, { unique: true });
  await categories.createIndex({ sortOrder: 1, name: 1 });
  await apps.createIndex({ categoryId: 1, sortOrder: 1 });
};
