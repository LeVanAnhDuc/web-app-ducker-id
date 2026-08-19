// libs
import { Types } from "mongoose";
// types
import type { FilterQuery } from "mongoose";
import type { ContactDocument, ContactStatus } from "./types";
import type { PaginationOptions } from "@/types/common";
// models
import ContactModel from "@/models/contact";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";

export type CreateContactInput = Omit<Partial<ContactDocument>, "userId"> & {
  userId?: string | null;
};

export type ContactRepository = {
  create(data: CreateContactInput): Promise<ContactDocument>;
  findAll(
    filter: FilterQuery<ContactDocument>,
    options: PaginationOptions
  ): Promise<{ data: ContactDocument[]; total: number }>;
  findById(id: string): Promise<ContactDocument | null>;
  updateStatus(
    id: string,
    status: ContactStatus
  ): Promise<ContactDocument | null>;
  findByUser(
    userId: string,
    filter: FilterQuery<ContactDocument>,
    options: PaginationOptions
  ): Promise<{ data: ContactDocument[]; total: number }>;
  findByIdForUser(id: string, userId: string): Promise<ContactDocument | null>;
};

export class MongoContactRepository implements ContactRepository {
  async create(data: CreateContactInput): Promise<ContactDocument> {
    return asyncDatabaseHandler("create", async () => {
      const doc = await ContactModel.create({
        ...data,
        userId: data.userId ? new Types.ObjectId(data.userId) : null
      });
      return doc as unknown as ContactDocument;
    });
  }

  async findAll(
    filter: FilterQuery<ContactDocument>,
    options: PaginationOptions
  ): Promise<{ data: ContactDocument[]; total: number }> {
    return asyncDatabaseHandler("findAll", async () => {
      const [data, total] = await Promise.all([
        ContactModel.find(filter)
          .skip(options.skip)
          .limit(options.limit)
          .sort(options.sort)
          .lean()
          .exec(),
        ContactModel.countDocuments(filter).exec()
      ]);

      return { data: data as unknown as ContactDocument[], total };
    });
  }

  async findById(id: string): Promise<ContactDocument | null> {
    return asyncDatabaseHandler("findById", () =>
      ContactModel.findById(id).lean<ContactDocument>().exec()
    );
  }

  async updateStatus(
    id: string,
    status: ContactStatus
  ): Promise<ContactDocument | null> {
    return asyncDatabaseHandler("updateStatus", () =>
      ContactModel.findByIdAndUpdate(id, { $set: { status } }, { new: true })
        .lean<ContactDocument>()
        .exec()
    );
  }

  async findByUser(
    userId: string,
    filter: FilterQuery<ContactDocument>,
    options: PaginationOptions
  ): Promise<{ data: ContactDocument[]; total: number }> {
    return asyncDatabaseHandler("findByUser", async () => {
      const scopedFilter: FilterQuery<ContactDocument> = {
        ...filter,
        userId: new Types.ObjectId(userId)
      };

      const [data, total] = await Promise.all([
        ContactModel.find(scopedFilter)
          .skip(options.skip)
          .limit(options.limit)
          .sort(options.sort)
          .lean()
          .exec(),
        ContactModel.countDocuments(scopedFilter).exec()
      ]);

      return { data: data as unknown as ContactDocument[], total };
    });
  }

  async findByIdForUser(
    id: string,
    userId: string
  ): Promise<ContactDocument | null> {
    return asyncDatabaseHandler("findByIdForUser", () =>
      ContactModel.findOne({ _id: id, userId: new Types.ObjectId(userId) })
        .lean<ContactDocument>()
        .exec()
    );
  }
}
