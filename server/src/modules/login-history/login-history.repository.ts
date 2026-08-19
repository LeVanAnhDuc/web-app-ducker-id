// libs
import { Types } from "mongoose";
// types
import type { FilterQuery } from "mongoose";
import type {
  CreateLoginHistoryData,
  LoginHistoryDocument,
  LoginHistoryFilter,
  LoginStatsAggregationResult,
  LoginStatsRange
} from "@/modules/login-history/types";
import type { PaginationOptions } from "@/types/common";
// models
import LoginHistoryModel from "@/models/login-history";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";
import { escapeRegex } from "@/utils/string/escape-regex";

export type LoginHistoryRepository = {
  create(data: CreateLoginHistoryData): Promise<LoginHistoryDocument>;
  findByUser(
    filter: LoginHistoryFilter,
    options: PaginationOptions
  ): Promise<{ data: LoginHistoryDocument[]; total: number }>;
  findAll(
    filter: LoginHistoryFilter,
    options: PaginationOptions
  ): Promise<{ data: LoginHistoryDocument[]; total: number }>;
  aggregateMyStats(
    range: LoginStatsRange
  ): Promise<LoginStatsAggregationResult>;
  findById(id: string): Promise<LoginHistoryDocument | null>;
};

export class MongoLoginHistoryRepository implements LoginHistoryRepository {
  async create(data: CreateLoginHistoryData): Promise<LoginHistoryDocument> {
    return asyncDatabaseHandler("create", async () => {
      const doc = await LoginHistoryModel.create(data);
      return doc as unknown as LoginHistoryDocument;
    });
  }

  async findById(id: string): Promise<LoginHistoryDocument | null> {
    return asyncDatabaseHandler("findById", async () => {
      const doc = await LoginHistoryModel.findById(id).lean().exec();
      return doc as unknown as LoginHistoryDocument | null;
    });
  }

  async findByUser(
    filter: LoginHistoryFilter,
    options: PaginationOptions
  ): Promise<{ data: LoginHistoryDocument[]; total: number }> {
    return asyncDatabaseHandler("findByUser", async () => {
      const mongoFilter = this.toMongoFilter(filter);
      const [data, total] = await Promise.all([
        LoginHistoryModel.find(mongoFilter)
          .skip(options.skip)
          .limit(options.limit)
          .sort(options.sort)
          .lean()
          .exec(),
        LoginHistoryModel.countDocuments(mongoFilter).exec()
      ]);

      return { data: data as unknown as LoginHistoryDocument[], total };
    });
  }

  async findAll(
    filter: LoginHistoryFilter,
    options: PaginationOptions
  ): Promise<{ data: LoginHistoryDocument[]; total: number }> {
    return asyncDatabaseHandler("findAll", async () => {
      const mongoFilter = this.toMongoFilter(filter);
      const [data, total] = await Promise.all([
        LoginHistoryModel.find(mongoFilter)
          .skip(options.skip)
          .limit(options.limit)
          .sort(options.sort)
          .lean()
          .exec(),
        LoginHistoryModel.countDocuments(mongoFilter).exec()
      ]);

      return { data: data as unknown as LoginHistoryDocument[], total };
    });
  }

  async aggregateMyStats(
    range: LoginStatsRange
  ): Promise<LoginStatsAggregationResult> {
    return asyncDatabaseHandler("aggregateMyStats", async () => {
      const [result] =
        await LoginHistoryModel.aggregate<LoginStatsAggregationResult>([
          {
            $match: {
              userId: new Types.ObjectId(range.userId),
              createdAt: { $gte: range.from, $lte: range.to }
            }
          },
          {
            $facet: {
              total: [{ $count: "count" }],
              byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
              byMethod: [{ $group: { _id: "$method", count: { $sum: 1 } } }],
              byDevice: [{ $group: { _id: "$deviceType", count: { $sum: 1 } } }]
            }
          }
        ]).exec();

      return (
        result ?? {
          total: [],
          byStatus: [],
          byMethod: [],
          byDevice: []
        }
      );
    });
  }

  private toMongoFilter(
    filter: LoginHistoryFilter
  ): FilterQuery<LoginHistoryDocument> {
    const mongo: FilterQuery<LoginHistoryDocument> = {};

    if (filter.userId) mongo.userId = new Types.ObjectId(filter.userId);
    if (filter.status) mongo.status = filter.status;
    if (filter.method) mongo.method = filter.method;
    if (filter.deviceType) mongo.deviceType = filter.deviceType;
    if (filter.clientType) mongo.clientType = filter.clientType;
    if (filter.country)
      mongo.country = { $regex: escapeRegex(filter.country), $options: "i" };
    if (filter.city)
      mongo.city = { $regex: escapeRegex(filter.city), $options: "i" };
    if (filter.os) mongo.os = { $regex: escapeRegex(filter.os), $options: "i" };
    if (filter.browser)
      mongo.browser = { $regex: escapeRegex(filter.browser), $options: "i" };
    if (filter.ip) mongo.ip = { $regex: escapeRegex(filter.ip), $options: "i" };
    if (filter.fromDate || filter.toDate) {
      mongo.createdAt = {};
      if (filter.fromDate) mongo.createdAt.$gte = filter.fromDate;
      if (filter.toDate) mongo.createdAt.$lte = filter.toDate;
    }

    return mongo;
  }
}
