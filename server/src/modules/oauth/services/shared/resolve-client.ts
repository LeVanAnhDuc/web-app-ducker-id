// types
import type { WebAppDocument } from "@/modules/web-app/types";
import type { OAuthServiceDeps } from "../deps";
// common
import { OAuthError } from "@/common/exceptions";
import { STATUS_CODES } from "@/common/http";
// modules
import { WEB_APP_STATUSES } from "@/modules/web-app/constants";
// others
import { OAUTH_ERRORS } from "../../constants";

/**
 * Bước 1 và 2 tách riêng khỏi phần còn lại vì cho tới khi client_id và
 * redirect_uri được xác thực thì KHÔNG được redirect lỗi về đâu cả — làm vậy
 * là biến IdP thành open redirector. Hai lỗi này trả JSON.
 *
 * Dùng chung bởi `authorize` và `exchangeToken` nên sống ở `shared/`, không
 * phải helper: nó đọc Mongo.
 */
export const resolveClient = async (
  deps: OAuthServiceDeps,
  clientId?: string
): Promise<WebAppDocument> => {
  if (!clientId) {
    throw new OAuthError({
      error: OAUTH_ERRORS.INVALID_REQUEST,
      description: "client_id is required"
    });
  }

  const client = await deps.webAppRepo.findByClientId(clientId);

  if (!client || client.status !== WEB_APP_STATUSES.ACTIVE) {
    throw new OAuthError({
      error: OAUTH_ERRORS.INVALID_CLIENT,
      description: "Unknown or inactive client",
      status: STATUS_CODES.UNAUTHORIZED
    });
  }

  return client;
};
