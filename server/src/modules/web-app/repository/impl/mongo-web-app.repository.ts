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
import type { AccessScope, AppAccessRule } from "@/modules/entitlement/types";
import type { WebAppRepository } from "../web-app.repository";
// models
import WebAppModel from "@/models/web-app";
// common
import { Repository } from "@/common/stereotypes";
import { ConflictRequestError } from "@/exceptions";
// modules
import { buildWebAppFilter } from "../../helpers";
import { buildAccessFilter } from "@/modules/entitlement/entitlement.helper";
// others
import { isDuplicateKeyError, getDuplicatedField } from "@/utils/mongo-errors";
import { ERROR_CODES } from "@/constants/error-code";

const onlyCategory = (categoryId: string) => ({
  categoryIds: { $size: 1, $all: [new Types.ObjectId(categoryId)] }
});

@Repository()
export class MongoWebAppRepository implements WebAppRepository {
  async findAccessRules(ids?: string[]): Promise<AppAccessRule[]> {
    const filter: FilterQuery<WebAppDocument> = ids
      ? { _id: { $in: ids.map((id) => new Types.ObjectId(id)) } }
      : {};
    return WebAppModel.find(filter)
      .select("_id requiredRoles")
      .lean<AppAccessRule[]>()
      .exec();
  }

  async findAll(
    filter: FilterQuery<WebAppDocument>
  ): Promise<WebAppDocument[]> {
    return WebAppModel.find(filter)
      .sort({ sortOrder: 1, displayName: 1 })
      .lean<WebAppDocument[]>()
      .exec();
  }

  async findActivePaginated(
    filter: FilterQuery<WebAppDocument>,
    { skip, limit }: { skip: number; limit: number }
  ): Promise<WebAppWithCategories[]> {
    return WebAppModel.find(filter)
      .sort({ sortOrder: 1, displayName: 1 })
      .skip(skip)
      .limit(limit)
      .populate<{ categories: WebAppCategoryDocument[] }>({
        path: "categories",
        select: "slug name"
      })
      .lean<WebAppWithCategories[]>()
      .exec();
  }

  async findActiveByIds(
    ids: string[],
    filter: { access: AccessScope; search?: string; categoryId?: string }
  ): Promise<WebAppWithCategories[]> {
    const mongoFilter = buildWebAppFilter({
      search: filter.search,
      status: "active",
      categoryId: filter.categoryId
    });
    mongoFilter._id = { $in: ids.map((id) => new Types.ObjectId(id)) };
    const accessClauses = buildAccessFilter(filter.access);
    if (accessClauses.length > 0) mongoFilter.$and = accessClauses;
    return WebAppModel.find(mongoFilter)
      .populate<{ categories: WebAppCategoryDocument[] }>({
        path: "categories",
        select: "slug name"
      })
      .lean<WebAppWithCategories[]>()
      .exec();
  }

  async countActive(filter: FilterQuery<WebAppDocument>): Promise<number> {
    return WebAppModel.countDocuments(filter).exec();
  }

  async existsByName(name: string): Promise<boolean> {
    const found = await WebAppModel.exists({ name });
    return found !== null;
  }

  async findById(id: string): Promise<WebAppDocument | null> {
    return WebAppModel.findById(id).lean<WebAppDocument>().exec();
  }

  async findByClientId(clientId: string): Promise<WebAppDocument | null> {
    return WebAppModel.findOne({ clientId }).lean<WebAppDocument>().exec();
  }

  async existsByNameExcludingId(
    name: string,
    excludeId: string
  ): Promise<boolean> {
    const found = await WebAppModel.exists({ name, _id: { $ne: excludeId } });
    return found !== null;
  }

  async create(data: WebAppCreateInput): Promise<WebAppDocument> {
    try {
      const doc = await WebAppModel.create(data);
      return doc.toObject<WebAppDocument>();
    } catch (err) {
      if (isDuplicateKeyError(err) && getDuplicatedField(err) === "name") {
        throw new ConflictRequestError({
          key: "webApp:errors.nameExists",
          code: ERROR_CODES.WEB_APP_NAME_EXISTS
        });
      }
      throw err;
    }
  }

  async markAnnounced(id: string): Promise<boolean> {
    const res = await WebAppModel.updateOne(
      { _id: id, announcedAt: null },
      { $set: { announcedAt: new Date() } }
    ).exec();
    return res.modifiedCount === 1;
  }

  async updateById(
    id: string,
    data: WebAppUpdateInput
  ): Promise<WebAppDocument | null> {
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
          key: "webApp:errors.nameExists",
          code: ERROR_CODES.WEB_APP_NAME_EXISTS
        });
      }
      throw err;
    }
  }

  async countByCategory(categoryId: string): Promise<number> {
    return WebAppModel.countDocuments({
      categoryIds: new Types.ObjectId(categoryId)
    }).exec();
  }

  async findOrphansOf(
    categoryId: string,
    session?: ClientSession
  ): Promise<OrphanApp[]> {
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
  }

  async reassignOrphans(
    categoryId: string,
    reassignments: CategoryReassignment[],
    session: ClientSession
  ): Promise<void> {
    if (reassignments.length === 0) return;
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
  }

  async pullCategory(
    categoryId: string,
    session: ClientSession
  ): Promise<void> {
    const id = new Types.ObjectId(categoryId);
    await WebAppModel.updateMany(
      { categoryIds: id },
      { $pull: { categoryIds: id } },
      { session }
    ).exec();
  }
}
