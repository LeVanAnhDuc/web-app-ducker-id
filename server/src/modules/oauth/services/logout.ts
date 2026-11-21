// types
import type { OAuthQuery } from "../types";
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { SessionService } from "@/modules/session/services";
// others
import { buildRedirectUrl } from "../helpers";

/**
 * RP-initiated logout. Không có back-channel logout vì app vệ tinh tĩnh
 * (GitHub Pages) không có endpoint server để nhận webhook — access token TTL
 * 15 phút là thứ giới hạn bán kính ảnh hưởng thay cho nó.
 *
 * Trả về URL để redirect, hoặc null; controller xoá cookie `sid`.
 */
export const logout = async (
  deps: {
    webAppRepo: WebAppRepository;
    sessionService: SessionService;
  },
  query: OAuthQuery,
  sid: string | null
): Promise<string | null> => {
  await deps.sessionService.end(sid);

  const target = query.post_logout_redirect_uri;
  if (!target || !query.client_id) return null;

  const client = await deps.webAppRepo.findByClientId(query.client_id);

  if (!client || !client.postLogoutRedirectUris.includes(target)) {
    return null;
  }

  return buildRedirectUrl(target, { state: query.state });
};
