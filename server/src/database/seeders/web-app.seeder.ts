// models
import WebAppModel from "@/models/web-app";
import WebAppCategoryModel from "@/models/web-app-category";
// others
import { hashValue } from "@/utils/crypto/bcrypt";
import { WEB_APP_CATEGORIES } from "./data/web-app-categories";
import { WEB_APPS } from "./data/web-apps";
import { Logger } from "@/libs/logger";

export const seedWebApps = async (): Promise<void> => {
  Logger.info("Starting web-app seeding...");

  const categoryIdBySlug = new Map<string, string>();

  for (const cat of WEB_APP_CATEGORIES) {
    const existing = await WebAppCategoryModel.findOne({ slug: cat.slug });

    if (existing) {
      categoryIdBySlug.set(cat.slug, existing._id.toString());
      Logger.warn(`Category already exists: ${cat.slug}, skipping...`);
      continue;
    }

    const created = await WebAppCategoryModel.create({
      slug: cat.slug,
      name: { en: cat.name.en, vi: cat.name.vi },
      sortOrder: cat.sortOrder
    });

    categoryIdBySlug.set(cat.slug, created._id.toString());
    Logger.info(`Created category: ${cat.slug}`);
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const app of WEB_APPS) {
    const existing = await WebAppModel.findOne({ name: app.name });

    if (existing) {
      Logger.warn(`Web app already exists: ${app.name}, skipping...`);
      skippedCount++;
      continue;
    }

    const categoryIds = app.categorySlugs.map((slug) =>
      categoryIdBySlug.get(slug)
    );

    if (categoryIds.some((id) => !id)) {
      Logger.warn(
        `Category not found for app ${app.name}: ${app.categorySlugs.join(", ")}, skipping...`
      );
      skippedCount++;
      continue;
    }

    await WebAppModel.create({
      categoryIds,
      name: app.name,
      displayName: app.displayName,
      description: app.description,
      iconUrl: app.iconUrl,
      homeUrl: app.homeUrl,
      clientId: app.clientId,
      clientSecretHash: app.clientSecret ? hashValue(app.clientSecret) : null,
      redirectUris: app.redirectUris,
      grantTypes: app.grantTypes,
      responseTypes: app.responseTypes,
      scopes: app.scopes,
      tokenEndpointAuthMethod: app.tokenEndpointAuthMethod,
      requiredRoles: app.requiredRoles,
      status: app.status,
      sortOrder: app.sortOrder
    });

    Logger.info(`Created web app: ${app.name}`);
    createdCount++;
  }

  Logger.info(
    `Web-app seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`
  );
};

export const clearWebApps = async (): Promise<void> => {
  Logger.info("Clearing seeded web apps...");

  const appNames = WEB_APPS.map((a) => a.name);
  const categorySlugs = WEB_APP_CATEGORIES.map((c) => c.slug);

  const appResult = await WebAppModel.deleteMany({ name: { $in: appNames } });
  const catResult = await WebAppCategoryModel.deleteMany({
    slug: { $in: categorySlugs }
  });

  Logger.info(
    `Cleared ${appResult.deletedCount} web apps and ${catResult.deletedCount} categories`
  );
};
