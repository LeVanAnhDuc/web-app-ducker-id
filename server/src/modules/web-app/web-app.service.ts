// types
import type {
  AdminAppsQuery,
  AdminAppCreateBody,
  AdminAppUpdateBody,
  WebAppUpdateInput,
  UserAppsQuery,
  PaginatedResult
} from "./types";
import type {
  WebAppRepository,
  WebAppCategoryRepository
} from "./repositories";
import type { FavoriteRepository } from "@/modules/favorite/favorite.repository";
import type {
  AdminAppDto,
  AdminCategoryDto,
  AdminAppCreatedDto,
  UserAppDto,
  UserCategoryDto
} from "./dtos";
// dtos
import {
  toAdminAppDto,
  toAdminCategoryDto,
  toAdminAppCreatedDto,
  toUserAppDto,
  toUserCategoryDto
} from "./dtos";
// others
import {
  buildWebAppFilter,
  toInternalStatus,
  generateClientId,
  generateClientSecret
} from "./helpers";
import { WEB_APP_DEFAULT_SCOPES, WEB_APP_STATUS_PUBLIC } from "./constants";
import { PAGINATION } from "@/common/pagination";
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
import { ConflictRequestError, NotFoundError } from "@/common/exceptions";
import { ERROR_CODES } from "@/constants/error-code";
import { hashValue } from "@/utils/crypto/bcrypt";
import { RequestContext } from "@/utils/request-context";

export class WebAppService {
  constructor(
    private readonly webAppRepo: WebAppRepository,
    private readonly categoryRepo: WebAppCategoryRepository,
    private readonly favoriteRepo: FavoriteRepository
  ) {}

  async listApps(query: AdminAppsQuery): Promise<{ items: AdminAppDto[] }> {
    const filter = buildWebAppFilter(query);
    const docs = await this.webAppRepo.findAll(filter);
    return { items: docs.map(toAdminAppDto) };
  }

  async listUserApps(
    query: UserAppsQuery,
    role?: string
  ): Promise<PaginatedResult<UserAppDto>> {
    const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = PAGINATION;
    const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const filter = buildWebAppFilter({
      search: query.search,
      status: WEB_APP_STATUS_PUBLIC.ACTIVE,
      categoryId: query.categoryId
    });

    // Role-scoped visibility: admins see the full active catalog; everyone else
    // (non-admins, and any unauthenticated edge case) sees only apps whose
    // requiredRoles include the USER role. Matching a scalar against the array
    // field returns documents whose requiredRoles array contains that role.
    if (role !== AUTHENTICATION_ROLES.ADMIN) {
      filter.requiredRoles = AUTHENTICATION_ROLES.USER;
    }

    const [docs, total] = await Promise.all([
      this.webAppRepo.findActivePaginated(filter, {
        skip: (page - 1) * limit,
        limit
      }),
      this.webAppRepo.countActive(filter)
    ]);

    const userId = RequestContext.getUserId();
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
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }

  async listCategories(): Promise<AdminCategoryDto[]> {
    const docs = await this.categoryRepo.findAll();
    return docs.map(toAdminCategoryDto);
  }

  async listUserCategories(): Promise<UserCategoryDto[]> {
    const docs = await this.categoryRepo.findAll();
    return docs.map(toUserCategoryDto);
  }

  async createApp(body: AdminAppCreateBody): Promise<AdminAppCreatedDto> {
    const nameTaken = await this.webAppRepo.existsByName(body.name);
    if (nameTaken) {
      throw new ConflictRequestError({
        i18nMessage: (t) => t("webApp:errors.nameExists"),
        code: ERROR_CODES.WEB_APP_NAME_EXISTS
      });
    }

    const categoryExists = await this.categoryRepo.existsById(body.categoryId);
    if (!categoryExists) {
      throw new NotFoundError({
        i18nMessage: (t) => t("webApp:errors.categoryNotFound"),
        code: ERROR_CODES.WEB_APP_CATEGORY_NOT_FOUND
      });
    }

    const clientId = generateClientId();
    const clientSecret = generateClientSecret();

    const doc = await this.webAppRepo.create({
      name: body.name,
      displayName: body.displayName,
      description: body.description?.trim() ? body.description.trim() : null,
      iconUrl: body.iconUrl?.trim() ? body.iconUrl.trim() : null,
      homeUrl: body.homeUrl,
      categoryId: body.categoryId,
      status: toInternalStatus(body.status),
      requiredRoles: body.requiredRoles,
      redirectUris: body.redirectUris,
      clientId,
      clientSecretHash: hashValue(clientSecret),
      scopes: [...WEB_APP_DEFAULT_SCOPES]
    });

    return toAdminAppCreatedDto(doc, clientSecret);
  }

  async updateApp(id: string, body: AdminAppUpdateBody): Promise<AdminAppDto> {
    const existing = await this.webAppRepo.findById(id);
    if (!existing) {
      throw new NotFoundError({
        i18nMessage: (t) => t("webApp:errors.notFound"),
        code: ERROR_CODES.WEB_APP_NOT_FOUND
      });
    }

    if (body.name !== undefined && body.name !== existing.name) {
      const taken = await this.webAppRepo.existsByNameExcludingId(
        body.name,
        id
      );
      if (taken) {
        throw new ConflictRequestError({
          i18nMessage: (t) => t("webApp:errors.nameExists"),
          code: ERROR_CODES.WEB_APP_NAME_EXISTS
        });
      }
    }

    if (body.categoryId !== undefined) {
      const categoryExists = await this.categoryRepo.existsById(
        body.categoryId
      );
      if (!categoryExists) {
        throw new NotFoundError({
          i18nMessage: (t) => t("webApp:errors.categoryNotFound"),
          code: ERROR_CODES.WEB_APP_CATEGORY_NOT_FOUND
        });
      }
    }

    const updateInput: WebAppUpdateInput = {};
    if (body.name !== undefined) updateInput.name = body.name;
    if (body.displayName !== undefined)
      updateInput.displayName = body.displayName;
    if (body.description !== undefined)
      updateInput.description = body.description.trim()
        ? body.description.trim()
        : null;
    if (body.iconUrl !== undefined)
      updateInput.iconUrl = body.iconUrl.trim() ? body.iconUrl.trim() : null;
    if (body.homeUrl !== undefined) updateInput.homeUrl = body.homeUrl;
    if (body.categoryId !== undefined) updateInput.categoryId = body.categoryId;
    if (body.status !== undefined)
      updateInput.status = toInternalStatus(body.status);
    if (body.requiredRoles !== undefined)
      updateInput.requiredRoles = body.requiredRoles;
    if (body.redirectUris !== undefined)
      updateInput.redirectUris = body.redirectUris;

    const updated = await this.webAppRepo.updateById(id, updateInput);
    if (!updated) {
      throw new NotFoundError({
        i18nMessage: (t) => t("webApp:errors.notFound"),
        code: ERROR_CODES.WEB_APP_NOT_FOUND
      });
    }

    return toAdminAppDto(updated);
  }
}
