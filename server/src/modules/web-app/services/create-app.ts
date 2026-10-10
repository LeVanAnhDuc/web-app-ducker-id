// types
import type { AdminAppCreateBody } from "../types";
import type { AdminAppCreatedDto } from "../dtos";
import type { WebAppServiceDeps } from "./deps";
// common
import { ConflictRequestError } from "@/common/exceptions";
// dtos
import { toAdminAppCreatedDto } from "../dtos";
// others
import { assertCategoriesExist } from "./shared/assert-categories-exist";
import {
  toInternalStatus,
  generateClientId,
  generateClientSecret
} from "../helpers";
import {
  TOKEN_ENDPOINT_AUTH_METHODS,
  WEB_APP_DEFAULT_SCOPES
} from "../constants";
import { ERROR_CODES } from "@/constants/error-code";
import { hashValue } from "@/utils/crypto/bcrypt";

export const createApp = async (
  deps: WebAppServiceDeps,
  body: AdminAppCreateBody
): Promise<AdminAppCreatedDto> => {
  const nameTaken = await deps.webAppRepo.existsByName(body.name);
  if (nameTaken) {
    throw new ConflictRequestError({
      i18nMessage: (t) => t("webApp:errors.nameExists"),
      code: ERROR_CODES.WEB_APP_NAME_EXISTS
    });
  }

  await assertCategoriesExist(deps, body.categoryIds);

  const clientId = generateClientId();

  // Public client không có secret — nhét secret vào bundle trình duyệt là
  // công khai nó, và tệ hơn là tạo ảo giác đã xác thực client. PKCE + khớp
  // redirect_uri tuyệt đối là thứ gánh vai trò bảo vệ ở nhánh này.
  const authMethod =
    body.tokenEndpointAuthMethod ??
    TOKEN_ENDPOINT_AUTH_METHODS.CLIENT_SECRET_BASIC;
  const isPublicClient = authMethod === TOKEN_ENDPOINT_AUTH_METHODS.NONE;
  const clientSecret = isPublicClient ? null : generateClientSecret();

  const doc = await deps.webAppRepo.create({
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
    scopes: body.scopes ?? [...WEB_APP_DEFAULT_SCOPES]
  });

  return toAdminAppCreatedDto(doc, clientSecret);
};
