// types
import type { PageMeta } from "@/common/pagination";
import type {
  AdminResetPasswordResult,
  AdminUsersFilter,
  CreateUserData,
  SetUserActiveResult,
  UpdateProfileData,
  UserDocument,
  UserRecord,
  UserWithAuth
} from "@/modules/user/types";
import type { AdminUsersQueryDto } from "./dtos/requests";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import type { UserRepository } from "./repository/user.repository";
// common
import { toDto } from "@/common/dto";
import { resolvePaging, toPageMeta } from "@/common/pagination";
import { ForbiddenError, NotFoundError } from "@/exceptions";
// dtos
import { AdminUserDto, MyProfileDto, PublicProfileDto } from "./dtos";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
import {
  NOTIFICATION_LINKS,
  NOTIFICATION_TYPES,
  PASSWORD_CHANGE_ACTORS
} from "@/modules/notification/constants";
// others
import ENV from "@/constants/env";
import { ERROR_CODES } from "@/constants/error-code";
import { EmailType } from "@/types/services/email";
import { Logger } from "@/libs/logger";
import { RequestContext } from "@/utils/request-context";
import { hashValue } from "@/utils/crypto/bcrypt";
import { generateTempPassword } from "@/utils/crypto/temp-password";

export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly authService: AuthenticationService,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly notificationDispatcher: NotificationDispatcher
  ) {}

  async getMyProfile(): Promise<MyProfileDto> {
    const userId = RequestContext.requireUserId();
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new NotFoundError({
        key: "user:errors.notFound",
        code: ERROR_CODES.USER_NOT_FOUND
      });
    }

    return toDto(MyProfileDto, user);
  }

  async updateMyProfile(
    data: Partial<UpdateProfileData>
  ): Promise<MyProfileDto> {
    const userId = RequestContext.requireUserId();
    const user = await this.userRepo.updateById(userId, data);

    if (!user) {
      throw new NotFoundError({
        key: "user:errors.notFound",
        code: ERROR_CODES.USER_NOT_FOUND
      });
    }

    return toDto(MyProfileDto, user);
  }

  async getPublicProfile(userId: string): Promise<PublicProfileDto> {
    const user = await this.userRepo.findPublicById(userId);

    if (!user) {
      throw new NotFoundError({
        key: "user:errors.notFound",
        code: ERROR_CODES.USER_NOT_FOUND
      });
    }

    return toDto(PublicProfileDto, user);
  }

  async createProfile(data: CreateUserData): Promise<UserRecord> {
    return this.userRepo.createProfile(data);
  }

  async emailExists(email: string): Promise<boolean> {
    return await this.userRepo.emailExists(email);
  }

  async findByEmailWithAuth(email: string): Promise<UserWithAuth | null> {
    return await this.userRepo.findByEmailWithAuth(email);
  }

  async findByAuthId(authId: string): Promise<{
    _id: UserDocument["_id"];
    email: string;
    fullName: string;
    avatar?: string | null;
  } | null> {
    return await this.userRepo.findByAuthId(authId);
  }

  async getAdminUsers(
    query: AdminUsersQueryDto
  ): Promise<{ items: AdminUserDto[]; meta: PageMeta }> {
    const { page, limit, skip, sort } = resolvePaging(query);
    const { search, role, status } = query;

    const filter: AdminUsersFilter = {
      ...(search ? { search } : {}),
      ...(role ? { role } : {}),
      ...(status ? { isActive: status === "active" } : {})
    };

    const { data, total } = await this.userRepo.findAdminUsers(filter, {
      skip,
      limit,
      sort
    });

    return {
      items: toDto(AdminUserDto, data),
      meta: toPageMeta(total, page, limit)
    };
  }

  async setUserActive(
    id: string,
    isActive: boolean
  ): Promise<SetUserActiveResult> {
    const target = await this.userRepo.findAuthIdById(id);
    if (!target) {
      throw new NotFoundError({
        key: "user:errors.notFound",
        code: ERROR_CODES.USER_NOT_FOUND
      });
    }

    if (!isActive && target.authId === RequestContext.requireAuthId()) {
      throw new ForbiddenError({
        key: "user:errors.cannotLockSelf",
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
            key: "user:errors.cannotLockLastAdmin",
            code: ERROR_CODES.ADMIN_CANNOT_LOCK_LAST_ADMIN
          });
        }
      }
    }

    await this.authService.setActive(target.authId, isActive);
    return { _id: id, isActive };
  }

  async adminResetPassword(id: string): Promise<AdminResetPasswordResult> {
    const target = await this.userRepo.findAuthIdById(id);
    if (!target) {
      throw new NotFoundError({
        key: "user:errors.notFound",
        code: ERROR_CODES.USER_NOT_FOUND
      });
    }

    if (target.authId === RequestContext.requireAuthId()) {
      throw new ForbiddenError({
        key: "user:errors.cannotResetSelf",
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
        loginUrl: ENV.app.clientUrl || "http://localhost:3000/login"
      }
    });

    this.notificationDispatcher.notify({
      userId: id,
      type: NOTIFICATION_TYPES.PASSWORD_CHANGED,
      params: { actor: PASSWORD_CHANGE_ACTORS.ADMIN },
      link: NOTIFICATION_LINKS.PROFILE
    });

    Logger.info("Password reset by admin", {
      userId: id,
      authId: target.authId
    });

    return { _id: id, email: target.email };
  }
}
