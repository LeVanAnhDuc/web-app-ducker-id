// types
import type { PaginatedResult } from "@/common/pagination";
import type {
  AdminAppsQueryDto,
  CreateAppBodyDto,
  UpdateAppBodyDto,
  UserAppsQueryDto
} from "../dtos/requests";
import type { AdminAppCreatedDto, UserAppDto } from "../dtos";
import type { CategoryRepository } from "@/modules/category/repository/category.repository";
import type { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import type { FavoriteRepository } from "@/modules/favorite/repository/favorite.repository";
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import type { WebAppRepository } from "../repository/web-app.repository";
// common
import { toDto } from "@/common/dto";
import { ConflictRequestError } from "@/exceptions";
// dtos
import { AdminAppDto, toAdminAppCreatedDto, toUserAppDto } from "../dtos";
// others
import { announceApp } from "./shared/announce-app";
import { assertCategoriesExist } from "./shared/assert-categories-exist";
import { updateApp } from "./update-app";
import {
  buildWebAppFilter,
  toInternalStatus,
  generateClientId,
  generateClientSecret
} from "../helpers";
import {
  TOKEN_ENDPOINT_AUTH_METHODS,
  WEB_APP_DEFAULT_SCOPES,
  WEB_APP_STATUS_PUBLIC
} from "../constants";
import { ERROR_CODES } from "@/constants/error-code";
import { resolvePaging, toPageMeta } from "@/common/pagination";
import { buildAccessFilter } from "@/modules/entitlement/entitlement.helper";
import { hashValue } from "@/utils/crypto/bcrypt";
import { RequestContext } from "@/utils/request-context";

export class WebAppService {
  constructor(
    private readonly webAppRepo: WebAppRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly favoriteRepo: FavoriteRepository,
    private readonly accessPolicy: AccessPolicy,
    private readonly notificationDispatcher: NotificationDispatcher
  ) {}

  async listApps(query: AdminAppsQueryDto): Promise<{ items: AdminAppDto[] }> {
    const filter = buildWebAppFilter(query);
    const docs = await this.webAppRepo.findAll(filter);
    return { items: toDto(AdminAppDto, docs) };
  }

  async listUserApps(
    query: UserAppsQueryDto,
    role?: string
  ): Promise<PaginatedResult<UserAppDto>> {
    // Không dùng `sort` của resolvePaging: findActivePaginated chỉ nhận
    // skip/limit, thứ tự do pipeline aggregate của repository quyết định.
    const { page, limit, skip } = resolvePaging(query);
    const filter = buildWebAppFilter({
      search: query.search,
      status: WEB_APP_STATUS_PUBLIC.ACTIVE,
      categoryId: query.categoryId
    });

    // Access = role default + the user's overrides. The clauses go into `$and`
    // because `buildWebAppFilter` already put the search into `$or`.
    const userId = RequestContext.getUserId();
    const scope = await this.accessPolicy.resolveScope(userId, role);
    const accessClauses = buildAccessFilter(scope);
    if (accessClauses.length > 0) filter.$and = accessClauses;

    const [docs, total] = await Promise.all([
      this.webAppRepo.findActivePaginated(filter, { skip, limit }),
      this.webAppRepo.countActive(filter)
    ]);

    const favoriteIds = userId
      ? await this.favoriteRepo.findFavoritedAppIds(
          userId,
          docs.map((d) => d._id.toString())
        )
      : new Set<string>();

    return {
      items: docs.map((d) =>
        toUserAppDto(d, favoriteIds.has(d._id.toString()))
      ),
      meta: toPageMeta(total, page, limit)
    };
  }

  async createApp(body: CreateAppBodyDto): Promise<AdminAppCreatedDto> {
    const nameTaken = await this.webAppRepo.existsByName(body.name);
    if (nameTaken) {
      throw new ConflictRequestError({
        key: "webApp:errors.nameExists",
        code: ERROR_CODES.WEB_APP_NAME_EXISTS
      });
    }

    await assertCategoriesExist(this.categoryRepo, body.categoryIds);

    const clientId = generateClientId();

    // Public client không có secret — nhét secret vào bundle trình duyệt là
    // công khai nó, và tệ hơn là tạo ảo giác đã xác thực client. PKCE + khớp
    // redirect_uri tuyệt đối là thứ gánh vai trò bảo vệ ở nhánh này.
    const authMethod =
      body.tokenEndpointAuthMethod ??
      TOKEN_ENDPOINT_AUTH_METHODS.CLIENT_SECRET_BASIC;
    const isPublicClient = authMethod === TOKEN_ENDPOINT_AUTH_METHODS.NONE;
    const clientSecret = isPublicClient ? null : generateClientSecret();

    const doc = await this.webAppRepo.create({
      name: body.name,
      displayName: body.displayName,
      description: body.description?.trim() ? body.description.trim() : null,
      iconUrl: body.iconUrl?.trim() ? body.iconUrl.trim() : null,
      homeUrl: body.homeUrl,
      categoryIds: body.categoryIds,
      status: toInternalStatus(body.status),
      requiredRoles: body.requiredRoles,
      redirectUris: body.redirectUris,
      postLogoutRedirectUris: body.postLogoutRedirectUris ?? [],
      clientId,
      clientSecretHash: clientSecret ? hashValue(clientSecret) : null,
      tokenEndpointAuthMethod: authMethod,
      scopes: [...WEB_APP_DEFAULT_SCOPES]
    });

    await announceApp(
      {
        webAppRepo: this.webAppRepo,
        notificationDispatcher: this.notificationDispatcher
      },
      doc
    );

    return toAdminAppCreatedDto(doc, clientSecret);
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
