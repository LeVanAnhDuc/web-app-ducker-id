// libs
import { Types } from "mongoose";
// types
import type { FilterQuery } from "mongoose";
import type { ContactDocument, ContactStatus } from "../../types";
import type {
  ContactRepository,
  CreateContactInput
} from "../contact-admin.repository";
import type { PaginationOptions } from "@/types/common";
// models
import ContactModel from "@/models/contact";
// common
import { Repository } from "@/common/stereotypes";

@Repository()
export class MongoContactRepository implements ContactRepository {
  async create(data: CreateContactInput): Promise<ContactDocument> {
    const doc = await ContactModel.create({
      ...data,
      userId: data.userId ? new Types.ObjectId(data.userId) : null
    });
    return doc as unknown as ContactDocument;
  }

  async findAll(
    filter: FilterQuery<ContactDocument>,
    options: PaginationOptions
  ): Promise<{ data: ContactDocument[]; total: number }> {
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
  }

  async findById(id: string): Promise<ContactDocument | null> {
    return ContactModel.findById(id).lean<ContactDocument>().exec();
  }

  async updateStatus(
    id: string,
    status: ContactStatus
  ): Promise<ContactDocument | null> {
    return ContactModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    )
      .lean<ContactDocument>()
      .exec();
  }

  async findByUser(
    userId: string,
    filter: FilterQuery<ContactDocument>,
    options: PaginationOptions
  ): Promise<{ data: ContactDocument[]; total: number }> {
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
  }

  async findByIdForUser(
    id: string,
    userId: string
  ): Promise<ContactDocument | null> {
    return ContactModel.findOne({ _id: id, userId: new Types.ObjectId(userId) })
      .lean<ContactDocument>()
      .exec();
  }
}
