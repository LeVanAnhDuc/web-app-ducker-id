// types
import type {
  UserDocument,
  CreateUserData,
  UserRecord,
  UpdateProfileData,
  PublicUserRecord,
  UserWithAuth,
  AdminUserAggregateRow,
  AdminUsersFilter
} from "@/modules/user/types";
import type { AuthenticationDocument } from "@/modules/authentication/types";
import type { PaginationOptions } from "@/types/common";
import type { ClientSession } from "mongoose";
// models
import UserModel from "@/models/user";
// others
import { asyncDatabaseHandler } from "@/utils/async-handler";
import { escapeRegex } from "@/utils/string/escape-regex";

export type UserRepository = {
  createProfile(
    data: CreateUserData,
    session?: ClientSession
  ): Promise<UserRecord>;
  findById(userId: string): Promise<UserDocument | null>;
  findByAuthId(authId: string): Promise<{
    _id: UserDocument["_id"];
    email: string;
    fullName: string;
    avatar?: string | null;
  } | null>;
  updateById(
    userId: string,
    data: Partial<UpdateProfileData>
  ): Promise<UserDocument | null>;
  findPublicById(userId: string): Promise<PublicUserRecord | null>;
  emailExists(email: string): Promise<boolean>;
  findByEmailWithAuth(email: string): Promise<UserWithAuth | null>;
  findAdminUsers(
    filter: AdminUsersFilter,
    options: PaginationOptions
  ): Promise<{ data: AdminUserAggregateRow[]; total: number }>;
  findAuthIdById(
    userId: string
  ): Promise<{ authId: string; email: string } | null>;
};

export class MongoUserRepository implements UserRepository {
  async createProfile(
    data: CreateUserData,
    session?: ClientSession
  ): Promise<UserRecord> {
    return asyncDatabaseHandler("createProfile", async () => {
      const [user] = await UserModel.create(
        [
          {
            authId: data.authId,
            email: data.email,
            fullName: data.fullName,
            gender: data.gender,
            dateOfBirth: data.dateOfBirth
          }
        ],
        { session }
      );

      return { _id: user._id, email: user.email, fullName: user.fullName };
    });
  }

  async findById(userId: string): Promise<UserDocument | null> {
    return asyncDatabaseHandler("findById", () =>
      UserModel.findById(userId)
        .select(
          "email fullName phone avatar address dateOfBirth gender createdAt"
        )
        .lean<UserDocument>()
        .exec()
    );
  }

  async findByAuthId(authId: string): Promise<{
    _id: UserDocument["_id"];
    email: string;
    fullName: string;
    avatar?: string | null;
  } | null> {
    return asyncDatabaseHandler("findByAuthId", () =>
      UserModel.findOne({ authId })
        .select("_id email fullName avatar")
        .lean<{
          _id: UserDocument["_id"];
          email: string;
          fullName: string;
          avatar?: string | null;
        }>()
        .exec()
    );
  }

  async updateById(
    userId: string,
    data: Partial<UpdateProfileData>
  ): Promise<UserDocument | null> {
    return asyncDatabaseHandler("updateById", () =>
      UserModel.findByIdAndUpdate(userId, { $set: data }, { new: true })
        .select(
          "email fullName phone avatar address dateOfBirth gender createdAt"
        )
        .lean<UserDocument>()
        .exec()
    );
  }

  async findPublicById(userId: string): Promise<PublicUserRecord | null> {
    return asyncDatabaseHandler("findPublicById", () =>
      UserModel.findById(userId)
        .select("fullName avatar gender")
        .lean<PublicUserRecord>()
        .exec()
    );
  }

  async emailExists(email: string): Promise<boolean> {
    return asyncDatabaseHandler(
      "emailExists",
      async () => !!(await UserModel.exists({ email }))
    );
  }

  async findByEmailWithAuth(email: string): Promise<UserWithAuth | null> {
    return asyncDatabaseHandler("findByEmailWithAuth", async () => {
      type Joined = UserDocument & { auth: AuthenticationDocument };

      const [result] = await UserModel.aggregate<Joined>([
        { $match: { email } },
        {
          $lookup: {
            from: "auths",
            localField: "authId",
            foreignField: "_id",
            as: "auth"
          }
        },
        { $unwind: "$auth" },
        { $limit: 1 }
      ]).exec();

      if (!result) return null;

      const { auth, ...user } = result;
      return { user: user as UserDocument, auth };
    });
  }

  async findAdminUsers(
    filter: AdminUsersFilter,
    options: PaginationOptions
  ): Promise<{ data: AdminUserAggregateRow[]; total: number }> {
    return asyncDatabaseHandler("findAdminUsers", async () => {
      const match: Record<string, unknown> = {};
      if (filter.search) {
        const rx = new RegExp(escapeRegex(filter.search), "i");
        match.$or = [{ fullName: rx }, { email: rx }];
      }
      if (filter.role) match["auth.roles"] = filter.role;
      if (typeof filter.isActive === "boolean") {
        match["auth.isActive"] = filter.isActive;
      }

      const [result] = await UserModel.aggregate<{
        data: AdminUserAggregateRow[];
        total: { count: number }[];
      }>([
        {
          $lookup: {
            from: "auths",
            localField: "authId",
            foreignField: "_id",
            as: "auth"
          }
        },
        { $unwind: "$auth" },
        { $match: match },
        {
          $lookup: {
            from: "login_histories",
            let: { authId: "$authId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$authId"] },
                      { $eq: ["$status", "success"] }
                    ]
                  }
                }
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              { $project: { _id: 0, createdAt: 1 } }
            ],
            as: "lastLogin"
          }
        },
        {
          $project: {
            _id: 1,
            fullName: 1,
            email: 1,
            avatar: 1,
            createdAt: 1,
            role: "$auth.roles",
            isActive: "$auth.isActive",
            lastLoginAt: {
              $ifNull: [{ $arrayElemAt: ["$lastLogin.createdAt", 0] }, null]
            }
          }
        },
        {
          $facet: {
            data: [
              { $sort: options.sort },
              { $skip: options.skip },
              { $limit: options.limit }
            ],
            total: [{ $count: "count" }]
          }
        }
      ]).exec();

      return {
        data: result?.data ?? [],
        total: result?.total[0]?.count ?? 0
      };
    });
  }

  async findAuthIdById(
    userId: string
  ): Promise<{ authId: string; email: string } | null> {
    return asyncDatabaseHandler("findAuthIdById", async () => {
      const doc = await UserModel.findById(userId)
        .select("authId email")
        .lean<{ authId: { toString(): string }; email: string }>()
        .exec();
      return doc ? { authId: doc.authId.toString(), email: doc.email } : null;
    });
  }
}
