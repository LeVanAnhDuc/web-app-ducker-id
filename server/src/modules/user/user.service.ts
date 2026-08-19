// types
import type {
  CreateUserData,
  UserDocument,
  UserRecord,
  UpdateProfileData,
  UserWithAuth,
  AdminUsersQuery,
  AdminUsersFilter,
  AdminUserListMeta,
  SetUserActiveResult,
  AdminResetPasswordResult
} from "@/modules/user/types";
import type { ClientSession } from "mongoose";
import type { UserRepository } from "./user.repository";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { MyProfileDto, PublicProfileDto, AdminUserDto } from "./dtos";
// common
import { ForbiddenError, NotFoundError } from "@/common/exceptions";
import { PAGINATION } from "@/common/pagination";
import { resolveSortDirection } from "@/common/sort";
// validators
import { validateEmail, validateObjectId } from "@/validators/utils";
// dtos
import { toMyProfileDto, toPublicProfileDto, toAdminUserDto } from "./dtos";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
// others
import ENV from "@/constants/env";
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";
import { RequestContext } from "@/utils/request-context";
import { hashValue } from "@/utils/crypto/bcrypt";
import { generateTempPassword } from "@/utils/crypto/temp-password";
import { EmailType } from "@/types/services/email";

export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authService: AuthenticationService,
    private readonly emailDispatcher: EmailDispatcher
  ) {}

  async getMyProfile(): Promise<MyProfileDto> {
    const userId = RequestContext.requireUserId();
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new NotFoundError({
        i18nMessage: (t) => t("user:errors.notFound"),
        code: ERROR_CODES.USER_NOT_FOUND
      });
    }

    return toMyProfileDto(user, user.avatar ?? null);
  }

  async updateMyProfile(
    data: Partial<UpdateProfileData>
  ): Promise<MyProfileDto> {
    const userId = RequestContext.requireUserId();
    const user = await this.userRepo.updateById(userId, data);

    if (!user) {
      throw new NotFoundError({
        i18nMessage: (t) => t("user:errors.notFound"),
        code: ERROR_CODES.USER_NOT_FOUND
      });
    }

    return toMyProfileDto(user, user.avatar ?? null);
  }

  async getPublicProfile(userId: string): Promise<PublicProfileDto> {
    const user = await this.userRepo.findPublicById(userId);

    if (!user) {
      throw new NotFoundError({
        i18nMessage: (t) => t("user:errors.notFound"),
        code: ERROR_CODES.USER_NOT_FOUND
      });
    }

    return toPublicProfileDto(user, user.avatar ?? null);
  }

  async createProfile(
    data: CreateUserData,
    session?: ClientSession
  ): Promise<UserRecord> {
    return this.userRepo.createProfile(data, session);
  }

  async emailExists(email: string): Promise<boolean> {
    validateEmail(email);

    try {
      return await this.userRepo.emailExists(email);
    } catch (error) {
      Logger.error("Failed to check email existence", { email, error });
      throw error;
    }
  }

  async findByEmailWithAuth(email: string): Promise<UserWithAuth | null> {
    validateEmail(email);

    try {
      return await this.userRepo.findByEmailWithAuth(email);
    } catch (error) {
      Logger.error("Failed to find auth by email", { email, error });
      throw error;
    }
  }

  async findByAuthId(authId: string): Promise<{
    _id: UserDocument["_id"];
    email: string;
    fullName: string;
    avatar?: string | null;
  } | null> {
    validateObjectId(authId, "authId");

    try {
      return await this.userRepo.findByAuthId(authId);
    } catch (error) {
      Logger.error("Failed to find user by auth ID", { authId, error });
      throw error;
    }
  }

  async getAdminUsers(
    query: AdminUsersQuery
  ): Promise<{ items: AdminUserDto[]; meta: AdminUserListMeta }> {
    const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = PAGINATION;
    const {
      page = DEFAULT_PAGE,
      limit: rawLimit = DEFAULT_LIMIT,
      sortBy = "createdAt",
      sortOrder: rawSortOrder,
      search,
      role,
      status
    } = query;

    const limit = Math.min(rawLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const sortOrder = resolveSortDirection(rawSortOrder);

    const filter: AdminUsersFilter = {
      ...(search ? { search } : {}),
      ...(role ? { role } : {}),
      ...(status ? { isActive: status === "active" } : {})
    };

    const { data, total } = await this.userRepo.findAdminUsers(filter, {
      skip,
      limit,
      sort: { [sortBy]: sortOrder }
    });

    return {
      items: data.map(toAdminUserDto),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async setUserActive(
    id: string,
    isActive: boolean
  ): Promise<SetUserActiveResult> {
    validateObjectId(id, "id");

    const target = await this.userRepo.findAuthIdById(id);
    if (!target) {
      throw new NotFoundError({
        i18nMessage: (t) => t("user:errors.notFound"),
        code: ERROR_CODES.USER_NOT_FOUND
      });
    }

    if (!isActive && target.authId === RequestContext.requireAuthId()) {
      throw new ForbiddenError({
        i18nMessage: (t) => t("user:errors.cannotLockSelf"),
        code: ERROR_CODES.ADMIN_CANNOT_LOCK_SELF
      });
    }

    if (!isActive) {
      const targetAuth = await this.authService.findById(target.authId);

      if (
        targetAuth?.roles === AUTHENTICATION_ROLES.ADMIN &&
        targetAuth.isActive
      ) {
        const activeAdmins = await this.authService.countActiveAdmins();
        if (activeAdmins <= 1) {
          throw new ForbiddenError({
            i18nMessage: (t) => t("user:errors.cannotLockLastAdmin"),
            code: ERROR_CODES.ADMIN_CANNOT_LOCK_LAST_ADMIN
          });
        }
      }
    }

    await this.authService.setActive(target.authId, isActive);
    return { _id: id, isActive };
  }

  async adminResetPassword(id: string): Promise<AdminResetPasswordResult> {
    validateObjectId(id, "id");

    const target = await this.userRepo.findAuthIdById(id);
    if (!target) {
      throw new NotFoundError({
        i18nMessage: (t) => t("user:errors.notFound"),
        code: ERROR_CODES.USER_NOT_FOUND
      });
    }

    if (target.authId === RequestContext.requireAuthId()) {
      throw new ForbiddenError({
        i18nMessage: (t) => t("user:errors.cannotResetSelf"),
        code: ERROR_CODES.ADMIN_CANNOT_RESET_SELF
      });
    }

    const tempPassword = generateTempPassword();
    const hashed = await hashValue(tempPassword);

    await this.authService.adminResetPassword(target.authId, hashed);

    this.emailDispatcher.send(EmailType.ADMIN_RESET_PASSWORD, {
      email: target.email,
      data: {
        tempPassword,
        loginUrl: ENV.CLIENT_URL || "http://localhost:3000/login"
      }
    });

    Logger.info("Password reset by admin", {
      userId: id,
      authId: target.authId
    });

    return { _id: id, email: target.email };
  }
}
