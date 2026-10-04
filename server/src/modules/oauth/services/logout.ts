// types
import type { Request, Response } from "express";
import type { OAuthServiceDeps } from "./deps";
// others
import { buildRedirectUrl } from "../helpers";

/**
 * RP-initiated logout. Không có back-channel logout vì app vệ tinh tĩnh
 * (GitHub Pages) không có endpoint server để nhận webhook — access token TTL
 * 15 phút là thứ giới hạn bán kính ảnh hưởng thay cho nó.
 */
export const logout = async (
  deps: OAuthServiceDeps,
  req: Request,
  res: Response
): Promise<string | null> => {
  const query = req.query as Record<string, string | undefined>;
  await deps.sessionService.end(req, res);

  const target = query.post_logout_redirect_uri;
  if (!target || !query.client_id) return null;

  const client = await deps.webAppRepo.findByClientId(query.client_id);

  if (!client || !client.postLogoutRedirectUris.includes(target)) {
    return null;
  }

  return buildRedirectUrl(target, { state: query.state });
};
