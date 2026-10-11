// libs
import { Types } from "mongoose";
// types
import type { FilterQuery } from "mongoose";
import type {
  CreateLoginHistoryData,
  LoginHistoryDocument,
  LoginHistoryFilter,
  LoginStatsAggregationResult,
  LoginStatsRange,
  SignInTraits
} from "@/modules/login-history/types";
import type { PaginationOptions } from "@/types/common";
import type { LoginHistoryRepository } from "../login-history.repository";
// models
import LoginHistoryModel from "@/models/login-history";
// modules
import {
  LOGIN_METHODS,
  LOGIN_SOURCES,
  LOGIN_STATUSES
} from "@/modules/login-history/constants";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";
import { escapeRegex } from "@/utils/string/escape-regex";

const WEB_APP_POPULATE = { path: "webAppId", select: "displayName iconUrl" };

export class MongoLoginHistoryRepository implements LoginHistoryRepository {
  async create(data: CreateLoginHistoryData): Promise<LoginHistoryDocument> {
    return asyncDatabaseHandler("create", async () => {
      const doc = await LoginHistoryModel.create(data);
      return doc as unknown as LoginHistoryDocument;
    });
  }

  async findSignInTraits(userId: string, since: Date): Promise<SignInTraits> {
    return asyncDatabaseHandler("findSignInTraits", async () => {
      const [row] = await LoginHistoryModel.aggregate<{
        devices: string[];
        countries: string[];
      }>([
        {
          $match: {
            userId: new Types.ObjectId(userId),
            status: LOGIN_STATUSES.SUCCESS,
            source: LOGIN_SOURCES.IDP,
            createdAt: { $gte: since }
          }
        },
        {
          $group: {
            _id: null,
            devices: {
              $addToSet: {
                $concat: ["$browser", "|", "$os", "|", "$deviceType"]
              }
            },
            countries: { $addToSet: "$country" }
          }
        }
      ]).exec();

      return row
        ? { hasHistory: true, devices: row.devices, countries: row.countries }
        : { hasHistory: false, devices: [], countries: [] };
    });
  }

  async findById(id: string): Promise<LoginHistoryDocument | null> {
    return asyncDatabaseHandler("findById", async () => {
      const doc = await LoginHistoryModel.findById(id)
        .populate(WEB_APP_POPULATE)
        .lean()
        .exec();
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
          .populate(WEB_APP_POPULATE)
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
          .populate(WEB_APP_POPULATE)
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
      // Stats count logins; a silent SSO into an app is not one. The filter
      // sits inside each facet rather than in the root $match so that byApp,
      // which wants exactly those rows, can still reach them.
      const excludeSso = { $match: { method: { $ne: LOGIN_METHODS.SSO } } };
      const countStatus = (status: string) => ({
        $sum: { $cond: [{ $eq: ["$status", status] }, 1, 0] }
      });

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
              total: [excludeSso, { $count: "count" }],
              byStatus: [
                excludeSso,
                { $group: { _id: "$status", count: { $sum: 1 } } }
              ],
              byMethod: [
                excludeSso,
                { $group: { _id: "$method", count: { $sum: 1 } } }
              ],
              byDevice: [
                excludeSso,
                { $group: { _id: "$deviceType", count: { $sum: 1 } } }
              ],
              // Keyed by the local calendar day, not by UTC: a login at 00:30
              // in Hanoi belongs to that day, not to the one before it.
              byDay: [
                excludeSso,
                {
                  $group: {
                    _id: {
                      $dateToString: {
                        date: "$createdAt",
                        format: "%Y-%m-%d",
                        timezone: range.timezone
                      }
                    },
                    total: { $sum: 1 },
                    successful: countStatus(LOGIN_STATUSES.SUCCESS),
                    failed: countStatus(LOGIN_STATUSES.FAILED)
                  }
                },
                { $sort: { _id: 1 } }
              ],
              // The mirror image: only the SSO rows, which is what "signed in
              // to which app" means. clientName is the snapshot taken at
              // sign-in, so a renamed or deleted app still reads correctly.
              byApp: [
                {
                  $match: {
                    method: LOGIN_METHODS.SSO,
                    webAppId: { $ne: null }
                  }
                },
                {
                  $group: {
                    _id: { webAppId: "$webAppId", clientName: "$clientName" },
                    count: { $sum: 1 }
                  }
                },
                { $sort: { count: -1, "_id.clientName": 1 } },
                { $limit: range.topAppsLimit }
              ],
              anomalies: [{ $match: { isAnomaly: true } }, { $count: "count" }]
            }
          }
        ]).exec();

      return (
        result ?? {
          total: [],
          byStatus: [],
          byMethod: [],
          byDevice: [],
          byDay: [],
          byApp: [],
          anomalies: []
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
    // Rows older than the source/interactive fields count as IdP and
    // interactive, so match on "not the other value" instead of equality.
    if (filter.source === LOGIN_SOURCES.IDP)
      mongo.source = { $ne: LOGIN_SOURCES.OAUTH };
    if (filter.source === LOGIN_SOURCES.OAUTH)
      mongo.source = LOGIN_SOURCES.OAUTH;
    if (filter.webAppId) mongo.webAppId = new Types.ObjectId(filter.webAppId);
    if (filter.interactive === true) mongo.interactive = { $ne: false };
    if (filter.interactive === false) mongo.interactive = false;
    if (filter.fromDate || filter.toDate) {
      mongo.createdAt = {};
      if (filter.fromDate) mongo.createdAt.$gte = filter.fromDate;
      if (filter.toDate) mongo.createdAt.$lte = filter.toDate;
    }

    return mongo;
  }
}
