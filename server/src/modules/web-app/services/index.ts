// types
import type { PaginatedResult } from "@/common/pagination";
import type {
  AdminAppsQueryDto,
  CreateAppBodyDto,
  UpdateAppBodyDto,
  UserAppsQueryDto
} from "../dtos/requests";
import type { AdminAppCreatedDto, AdminAppDto, UserAppDto } from "../dtos";
import type { CategoryRepository } from "@/modules/category/repository/category.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { FavoriteRepository } from "@/modules/favorite/repository/favorite.repository";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import type { WebAppRepository } from "../repository/web-app.repository";
// others
import { createApp } from "./create-app";
import { listApps } from "./list-apps";
import { listUserApps } from "./list-user-apps";
import { updateApp } from "./update-app";

export class WebAppService {
  constructor(
    private readonly webAppRepo: WebAppRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly favoriteRepo: FavoriteRepository,
    private readonly accessPolicy: AccessPolicy,
    private readonly notificationDispatcher: NotificationDispatcher
  ) {}

  listApps(query: AdminAppsQueryDto): Promise<{ items: AdminAppDto[] }> {
    return listApps(this.webAppRepo, query);
  }

  listUserApps(
    query: UserAppsQueryDto,
    role?: string
  ): Promise<PaginatedResult<UserAppDto>> {
    return listUserApps(
      {
        webAppRepo: this.webAppRepo,
        favoriteRepo: this.favoriteRepo,
        accessPolicy: this.accessPolicy
      },
      query,
      role
    );
  }

  createApp(body: CreateAppBodyDto): Promise<AdminAppCreatedDto> {
    return createApp(
      {
        webAppRepo: this.webAppRepo,
        categoryRepo: this.categoryRepo,
        notificationDispatcher: this.notificationDispatcher
      },
      body
    );
  }

  updateApp(id: string, body: UpdateAppBodyDto): Promise<AdminAppDto> {
    return updateApp(
      {
        webAppRepo: this.webAppRepo,
        categoryRepo: this.categoryRepo,
        notificationDispatcher: this.notificationDispatcher
      },
      id,
      body
    );
  }
}
