// libs
import { Types } from "mongoose";
// types
import type { ClientSession, FilterQuery } from "mongoose";
import type {
  WebAppDocument,
  WebAppCreateInput,
  WebAppUpdateInput,
  WebAppWithCategories
} from "../../types";
import type {
  CategoryReassignment,
  OrphanApp,
  WebAppCategoryDocument
} from "@/modules/category/types";
import type { WebAppRepository } from "../web-app.repository";
// models
import WebAppModel from "@/models/web-app";
// common
import { ConflictRequestError } from "@/common/exceptions";
// modules
import { buildWebAppFilter } from "../../helpers";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";
import { isDuplicateKeyError, getDuplicatedField } from "@/utils/mongo-errors";
import { ERROR_CODES } from "@/constants/error-code";

const onlyCategory = (categoryId: string) => ({
  categoryIds: { $size: 1, $all: [new Types.ObjectId(categoryId)] }
});

export class MongoWebAppRepository implements WebAppRepository {
  async findAll(
    filter: FilterQuery<WebAppDocument>
  ): Promise<WebAppDocument[]> {
    return asyncDatabaseHandler("findAll", () =>
      WebAppModel.find(filter)
        .sort({ sortOrder: 1, displayName: 1 })
        .lean<WebAppDocument[]>()
        .exec()
    );
  }

  async findActivePaginated(
    filter: FilterQuery<WebAppDocument>,
    { skip, limit }: { skip: number; limit: number }
  ): Promise<WebAppWithCategories[]> {
    return asyncDatabaseHandler("findActivePaginated", () =>
      WebAppModel.find(filter)
        .sort({ sortOrder: 1, displayName: 1 })
        .skip(skip)
        .limit(limit)
        .populate<{ categories: WebAppCategoryDocument[] }>({
          path: "categories",
          select: "slug name"
        })
        .lean<WebAppWithCategories[]>()
        .exec()
    );
  }

  async findActiveByIds(
    ids: string[],
    filter: { role?: string; search?: string; categoryId?: string }
  ): Promise<WebAppWithCategories[]> {
    return asyncDatabaseHandler("findActiveByIds", () => {
      const mongoFilter = buildWebAppFilter({
        search: filter.search,
        status: "active",
        categoryId: filter.categoryId
      });
      mongoFilter._id = { $in: ids.map((id) => new Types.ObjectId(id)) };
      if (filter.role !== AUTHENTICATION_ROLES.ADMIN) {
        mongoFilter.requiredRoles = AUTHENTICATION_ROLES.USER;
      }
      return WebAppModel.find(mongoFilter)
        .populate<{ categories: WebAppCategoryDocument[] }>({
          path: "categories",
          select: "slug name"
        })
        .lean<WebAppWithCategories[]>()
        .exec();
    });
  }

  async countActive(filter: FilterQuery<WebAppDocument>): Promise<number> {
    return asyncDatabaseHandler("countActive", () =>
      WebAppModel.countDocuments(filter).exec()
    );
  }

  async existsByName(name: string): Promise<boolean> {
    return asyncDatabaseHandler("existsByName", async () => {
      const found = await WebAppModel.exists({ name });
      return found !== null;
    });
  }

  async findById(id: string): Promise<WebAppDocument | null> {
    return asyncDatabaseHandler("findById", () =>
      WebAppModel.findById(id).lean<WebAppDocument>().exec()
    );
  }

  async findByClientId(clientId: string): Promise<WebAppDocument | null> {
    return asyncDatabaseHandler("findByClientId", () =>
      WebAppModel.findOne({ clientId }).lean<WebAppDocument>().exec()
    );
  }

  async existsByNameExcludingId(
    name: string,
    excludeId: string
  ): Promise<boolean> {
    return asyncDatabaseHandler("existsByNameExcludingId", async () => {
      const found = await WebAppModel.exists({ name, _id: { $ne: excludeId } });
      return found !== null;
    });
  }

  async create(data: WebAppCreateInput): Promise<WebAppDocument> {
    return asyncDatabaseHandler("create", async () => {
      try {
        const doc = await WebAppModel.create(data);
        return doc.toObject<WebAppDocument>();
      } catch (err) {
        if (isDuplicateKeyError(err) && getDuplicatedField(err) === "name") {
          throw new ConflictRequestError({
            i18nMessage: (t) => t("webApp:errors.nameExists"),
            code: ERROR_CODES.WEB_APP_NAME_EXISTS
          });
        }
        throw err;
      }
    });
  }

  async markAnnounced(id: string): Promise<boolean> {
    return asyncDatabaseHandler("markAnnounced", async () => {
      const res = await WebAppModel.updateOne(
        { _id: id, announcedAt: null },
        { $set: { announcedAt: new Date() } }
      ).exec();
      return res.modifiedCount === 1;
    });
  }

  async updateById(
    id: string,
    data: WebAppUpdateInput
  ): Promise<WebAppDocument | null> {
    return asyncDatabaseHandler("updateById", async () => {
      try {
        return await WebAppModel.findByIdAndUpdate(id, data, {
          new: true,
          runValidators: true
        })
          .lean<WebAppDocument>()
          .exec();
      } catch (err) {
        if (isDuplicateKeyError(err) && getDuplicatedField(err) === "name") {
          throw new ConflictRequestError({
            i18nMessage: (t) => t("webApp:errors.nameExists"),
            code: ERROR_CODES.WEB_APP_NAME_EXISTS
          });
        }
        throw err;
      }
    });
  }

  async countByCategory(categoryId: string): Promise<number> {
    return asyncDatabaseHandler("countByCategory", () =>
      WebAppModel.countDocuments({
        categoryIds: new Types.ObjectId(categoryId)
      }).exec()
    );
  }

  async findOrphansOf(
    categoryId: string,
    session?: ClientSession
  ): Promise<OrphanApp[]> {
    return asyncDatabaseHandler("findOrphansOf", async () => {
      const docs = await WebAppModel.find(onlyCategory(categoryId))
        .sort({ displayName: 1 })
        .select("displayName")
        .session(session ?? null)
        .lean<Pick<WebAppDocument, "_id" | "displayName">[]>()
        .exec();
      return docs.map((doc) => ({
        _id: doc._id.toString(),
        displayName: doc.displayName
      }));
    });
  }

  async reassignOrphans(
    categoryId: string,
    reassignments: CategoryReassignment[],
    session: ClientSession
  ): Promise<void> {
    if (reassignments.length === 0) return;
    return asyncDatabaseHandler("reassignOrphans", async () => {
      await WebAppModel.bulkWrite(
        reassignments.map(({ appId, categoryId: targetId }) => ({
          updateOne: {
            filter: {
              _id: new Types.ObjectId(appId),
              ...onlyCategory(categoryId)
            },
            update: {
              $set: { categoryIds: [new Types.ObjectId(targetId)] }
            }
          }
        })),
        { session }
      );
    });
  }

  async pullCategory(
    categoryId: string,
    session: ClientSession
  ): Promise<void> {
    return asyncDatabaseHandler("pullCategory", async () => {
      const id = new Types.ObjectId(categoryId);
      await WebAppModel.updateMany(
        { categoryIds: id },
        { $pull: { categoryIds: id } },
        { session }
      ).exec();
    });
  }
}
