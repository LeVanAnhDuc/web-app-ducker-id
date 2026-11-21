// types
import type { PaginatedResult } from "@/common/pagination";
import type {
  AdminAppsQueryDto,
  CreateAppBodyDto,
  UpdateAppBodyDto,
  UserAppsQueryDto
} from "../dtos/requests";
import type { AdminAppCreatedDto, AdminAppDto, UserAppDto } from "../dtos";
import type { WebAppServiceDeps } from "./deps";
// others
import { createApp } from "./create-app";
import { listApps } from "./list-apps";
import { listUserApps } from "./list-user-apps";
import { updateApp } from "./update-app";

export class WebAppService {
  constructor(private readonly deps: WebAppServiceDeps) {}

  listApps(query: AdminAppsQueryDto): Promise<{ items: AdminAppDto[] }> {
    return listApps(this.deps, query);
  }

  listUserApps(
    query: UserAppsQueryDto,
    role?: string
  ): Promise<PaginatedResult<UserAppDto>> {
    return listUserApps(this.deps, query, role);
  }

  createApp(body: CreateAppBodyDto): Promise<AdminAppCreatedDto> {
    return createApp(this.deps, body);
  }

  updateApp(id: string, body: UpdateAppBodyDto): Promise<AdminAppDto> {
    return updateApp(this.deps, id, body);
  }
}
