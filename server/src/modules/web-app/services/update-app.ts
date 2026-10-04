// types
import type { AdminAppUpdateBody, WebAppUpdateInput } from "../types";
import type { AdminAppDto } from "../dtos";
import type { WebAppServiceDeps } from "./deps";
// common
import { ConflictRequestError, NotFoundError } from "@/common/exceptions";
// dtos
import { toAdminAppDto } from "../dtos";
// others
import { assertCategoriesExist } from "./shared/assert-categories-exist";
import { toInternalStatus } from "../helpers";
import { ERROR_CODES } from "@/constants/error-code";

export const updateApp = async (
  deps: WebAppServiceDeps,
  id: string,
  body: AdminAppUpdateBody
): Promise<AdminAppDto> => {
  const existing = await deps.webAppRepo.findById(id);
  if (!existing) {
    throw new NotFoundError({
      i18nMessage: (t) => t("webApp:errors.notFound"),
      code: ERROR_CODES.WEB_APP_NOT_FOUND
    });
  }

  if (body.name !== undefined && body.name !== existing.name) {
    const taken = await deps.webAppRepo.existsByNameExcludingId(body.name, id);
    if (taken) {
      throw new ConflictRequestError({
        i18nMessage: (t) => t("webApp:errors.nameExists"),
        code: ERROR_CODES.WEB_APP_NAME_EXISTS
      });
    }
  }

  if (body.categoryIds !== undefined) {
    await assertCategoriesExist(deps, body.categoryIds);
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
  if (body.categoryIds !== undefined)
    updateInput.categoryIds = body.categoryIds;
  if (body.status !== undefined)
    updateInput.status = toInternalStatus(body.status);
  if (body.requiredRoles !== undefined)
    updateInput.requiredRoles = body.requiredRoles;
  if (body.redirectUris !== undefined)
    updateInput.redirectUris = body.redirectUris;
  if (body.postLogoutRedirectUris !== undefined)
    updateInput.postLogoutRedirectUris = body.postLogoutRedirectUris;
  if (body.tokenEndpointAuthMethod !== undefined)
    updateInput.tokenEndpointAuthMethod = body.tokenEndpointAuthMethod;
  if (body.scopes !== undefined) updateInput.scopes = body.scopes;

  const updated = await deps.webAppRepo.updateById(id, updateInput);
  if (!updated) {
    throw new NotFoundError({
      i18nMessage: (t) => t("webApp:errors.notFound"),
      code: ERROR_CODES.WEB_APP_NOT_FOUND
    });
  }

  return toAdminAppDto(updated);
};
