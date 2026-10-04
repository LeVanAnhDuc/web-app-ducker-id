// libs
import { Types } from "mongoose";
// types
import type { ClientSession } from "mongoose";
import type {
  CategoryCreateInput,
  CategoryUpdateInput,
  CategoryWithAppCount,
  WebAppCategoryDocument
} from "../../types";
import type { CategoryRepository } from "../category.repository";
// models
import WebAppCategoryModel from "@/models/web-app-category";
import WebAppModel from "@/models/web-app";
// common
import { ConflictRequestError } from "@/common/exceptions";
// modules
import { CATEGORY_NAME_COLLATION } from "../../constants";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";
import { escapeRegex } from "@/utils/string/escape-regex";
import { isDuplicateKeyError, getDuplicatedField } from "@/utils/mongo-errors";
import { ERROR_CODES } from "@/constants/error-code";

const DISPLAY_ORDER = { sortOrder: 1, _id: 1 } as const;

const rethrowNameTaken = (err: unknown): never => {
  if (isDuplicateKeyError(err) && getDuplicatedField(err) === "name.en") {
    throw new ConflictRequestError({
      i18nMessage: (t) => t("category:errors.nameTaken"),
      code: ERROR_CODES.CATEGORY_NAME_TAKEN
    });
  }
  throw err;
};

export class MongoCategoryRepository implements CategoryRepository {
  async findAll(session?: ClientSession): Promise<WebAppCategoryDocument[]> {
    return asyncDatabaseHandler("findAll", () =>
      WebAppCategoryModel.find()
        .sort(DISPLAY_ORDER)
        .session(session ?? null)
        .lean<WebAppCategoryDocument[]>()
        .exec()
    );
  }

  async findAllWithAppCount(): Promise<CategoryWithAppCount[]> {
    return asyncDatabaseHandler("findAllWithAppCount", () =>
      WebAppCategoryModel.aggregate<CategoryWithAppCount>([
        { $sort: DISPLAY_ORDER },
        {
          $lookup: {
            from: WebAppModel.collection.collectionName,
            localField: "_id",
            foreignField: "categoryIds",
            pipeline: [{ $project: { _id: 1 } }],
            as: "apps"
          }
        },
        { $addFields: { appCount: { $size: "$apps" } } },
        { $project: { apps: 0 } }
      ]).exec()
    );
  }

  async findById(
    id: string,
    session?: ClientSession
  ): Promise<WebAppCategoryDocument | null> {
    return asyncDatabaseHandler("findById", () =>
      WebAppCategoryModel.findById(id)
        .session(session ?? null)
        .lean<WebAppCategoryDocument>()
        .exec()
    );
  }

  async existsByNameEn(nameEn: string, excludeId?: string): Promise<boolean> {
    return asyncDatabaseHandler("existsByNameEn", async () => {
      const found = await WebAppCategoryModel.findOne({
        "name.en": nameEn,
        ...(excludeId && { _id: { $ne: new Types.ObjectId(excludeId) } })
      })
        .collation(CATEGORY_NAME_COLLATION)
        .select("_id")
        .lean()
        .exec();
      return found !== null;
    });
  }

  async findSlugFamily(base: string, excludeId?: string): Promise<string[]> {
    return asyncDatabaseHandler("findSlugFamily", async () => {
      const docs = await WebAppCategoryModel.find({
        slug: { $regex: `^${escapeRegex(base)}(-\\d+)?$` },
        ...(excludeId && { _id: { $ne: new Types.ObjectId(excludeId) } })
      })
        .select("slug")
        .lean<Pick<WebAppCategoryDocument, "slug">[]>()
        .exec();
      return docs.map((doc) => doc.slug);
    });
  }

  async findMaxSortOrder(): Promise<number> {
    return asyncDatabaseHandler("findMaxSortOrder", async () => {
      const last = await WebAppCategoryModel.findOne()
        .sort({ sortOrder: -1 })
        .select("sortOrder")
        .lean<Pick<WebAppCategoryDocument, "sortOrder">>()
        .exec();
      return last?.sortOrder ?? -1;
    });
  }

  async countByIds(ids: string[], session?: ClientSession): Promise<number> {
    return asyncDatabaseHandler("countByIds", () =>
      WebAppCategoryModel.countDocuments({
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) }
      })
        .session(session ?? null)
        .exec()
    );
  }

  async create(data: CategoryCreateInput): Promise<WebAppCategoryDocument> {
    return asyncDatabaseHandler("create", async () => {
      try {
        const doc = await WebAppCategoryModel.create(data);
        return doc.toObject<WebAppCategoryDocument>();
      } catch (err) {
        return rethrowNameTaken(err);
      }
    });
  }

  async updateById(
    id: string,
    data: CategoryUpdateInput
  ): Promise<WebAppCategoryDocument | null> {
    return asyncDatabaseHandler("updateById", async () => {
      try {
        return await WebAppCategoryModel.findByIdAndUpdate(
          id,
          { $set: data },
          { new: true, runValidators: true }
        )
          .lean<WebAppCategoryDocument>()
          .exec();
      } catch (err) {
        return rethrowNameTaken(err);
      }
    });
  }

  async setSortOrders(
    orderedIds: string[],
    session: ClientSession
  ): Promise<void> {
    return asyncDatabaseHandler("setSortOrders", async () => {
      await WebAppCategoryModel.bulkWrite(
        orderedIds.map((id, index) => ({
          updateOne: {
            filter: { _id: new Types.ObjectId(id) },
            update: { $set: { sortOrder: index } }
          }
        })),
        { session }
      );
    });
  }

  async deleteById(id: string, session: ClientSession): Promise<boolean> {
    return asyncDatabaseHandler("deleteById", async () => {
      const result = await WebAppCategoryModel.deleteOne(
        { _id: new Types.ObjectId(id) },
        { session }
      ).exec();
      return result.deletedCount === 1;
    });
  }
}
