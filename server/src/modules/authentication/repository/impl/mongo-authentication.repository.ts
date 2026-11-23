// types
import type {
  AuthenticationDocument,
  AuthenticationRecord,
  CreateAuthenticationData
} from "@/modules/authentication/types";
import type { ClientSession } from "mongoose";
import type { AuthenticationRepository } from "../authentication.repository";
// models
import AuthenticationModel from "@/models/authentication";
// common
import { Repository } from "@/common/stereotypes";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";

@Repository()
export class MongoAuthenticationRepository implements AuthenticationRepository {
  async findById(authId: string): Promise<AuthenticationDocument | null> {
    return AuthenticationModel.findById(authId)
      .lean<AuthenticationDocument>()
      .exec();
  }

  async create(
    data: CreateAuthenticationData,
    session?: ClientSession
  ): Promise<AuthenticationRecord> {
    const [authentication] = await AuthenticationModel.create(
      [
        {
          password: data.hashedPassword,
          verifiedEmail: true,
          roles: AUTHENTICATION_ROLES.USER,
          isActive: true
        }
      ],
      { session }
    );

    return {
      _id: authentication._id,
      roles: authentication.roles
    };
  }

  async requirePasswordChange(authId: string): Promise<void> {
    await AuthenticationModel.findByIdAndUpdate(authId, {
      mustChangePassword: true
    }).exec();
  }

  async updatePassword(
    authId: string,
    hashedPassword: string,
    session?: ClientSession
  ): Promise<number> {
    // Bump tokenVersion so every prior refresh token (older version) is
    // revoked; return it so the caller stamps the fresh tokens with it.
    const updated = await AuthenticationModel.findByIdAndUpdate(
      authId,
      {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        $inc: { tokenVersion: 1 }
      },
      { new: true, session }
    )
      .lean<AuthenticationDocument>()
      .exec();

    return updated?.tokenVersion ?? 0;
  }

  async adminResetPassword(
    authId: string,
    hashedPassword: string
  ): Promise<void> {
    await AuthenticationModel.findByIdAndUpdate(authId, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      mustChangePassword: true,
      $inc: { tokenVersion: 1 }
    }).exec();
  }

  async setActive(authId: string, isActive: boolean): Promise<void> {
    await AuthenticationModel.findByIdAndUpdate(authId, {
      $set: { isActive }
    }).exec();
  }

  async countActiveAdmins(): Promise<number> {
    return AuthenticationModel.countDocuments({
      roles: AUTHENTICATION_ROLES.ADMIN,
      isActive: true
    }).exec();
  }
}
