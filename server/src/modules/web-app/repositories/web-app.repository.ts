// libs
import { Types } from "mongoose";
// types
import type { FilterQuery } from "mongoose";
import type {
  WebAppDocument,
  WebAppCreateInput,
  WebAppUpdateInput,
  WebAppWithCategory,
  WebAppCategoryDocument
} from "../types";
// models
import WebAppModel from "@/models/web-app";
// common
import { ConflictRequestError } from "@/common/exceptions";
// modules
import { buildWebAppFilter } from "../helpers";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";
import { isDuplicateKeyError, getDuplicatedField } from "@/utils/mongo-errors";
import { ERROR_CODES } from "@/constants/error-code";

export type WebAppRepository = {
  findAll(filter: FilterQuery<WebAppDocument>): Promise<WebAppDocument[]>;
  findById(id: string): Promise<WebAppDocument | null>;
  existsByName(name: string): Promise<boolean>;
  existsByNameExcludingId(name: string, excludeId: string): Promise<boolean>;
  create(data: WebAppCreateInput): Promise<WebAppDocument>;
  updateById(
    id: string,
    data: WebAppUpdateInput
  ): Promise<WebAppDocument | null>;
  findActivePaginated(
    filter: FilterQuery<WebAppDocument>,
    options: { skip: number; limit: number }
  ): Promise<WebAppWithCategory[]>;
  findActiveByIds(
    ids: string[],
    filter: { role?: string; search?: string; categoryId?: string }
  ): Promise<WebAppWithCategory[]>;
  countActive(filter: FilterQuery<WebAppDocument>): Promise<number>;
};

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
  ): Promise<WebAppWithCategory[]> {
    return asyncDatabaseHandler("findActivePaginated", () =>
      WebAppModel.find(filter)
        .sort({ sortOrder: 1, displayName: 1 })
        .skip(skip)
        .limit(limit)
        .populate<{ category: WebAppCategoryDocument | null }>({
          path: "category",
          select: "displayName name"
        })
        .lean<WebAppWithCategory[]>()
        .exec()
    );
  }

  async findActiveByIds(
    ids: string[],
    filter: { role?: string; search?: string; categoryId?: string }
  ): Promise<WebAppWithCategory[]> {
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
        .populate<{ category: WebAppCategoryDocument | null }>({
          path: "category",
          select: "displayName"
        })
        .lean<WebAppWithCategory[]>()
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
}
