// types
import type { WebAppCategoryDocument } from "../types";
// models
import WebAppCategoryModel from "@/models/web-app-category";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";

export type WebAppCategoryRepository = {
  findAll(): Promise<WebAppCategoryDocument[]>;
  existsById(id: string): Promise<boolean>;
};

export class MongoWebAppCategoryRepository implements WebAppCategoryRepository {
  async findAll(): Promise<WebAppCategoryDocument[]> {
    return asyncDatabaseHandler("findAll", () =>
      WebAppCategoryModel.find()
        .sort({ sortOrder: 1, name: 1 })
        .lean<WebAppCategoryDocument[]>()
        .exec()
    );
  }

  async existsById(id: string): Promise<boolean> {
    return asyncDatabaseHandler("existsById", async () => {
      const found = await WebAppCategoryModel.exists({ _id: id });
      return found !== null;
    });
  }
}
