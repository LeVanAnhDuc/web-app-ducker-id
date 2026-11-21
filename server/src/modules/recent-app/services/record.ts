// types
import type { RecentAppRepository } from "../repository/recent-app.repository";
// constants
import { RECENT_APP_CONFIG } from "../constants";

/**
 * Server-side write for a user already authorised for the app (the OIDC
 * authorize step), so there is no visibility check here.
 */
export const record = (
  recentAppRepo: RecentAppRepository,
  userId: string,
  webAppId: string
): Promise<void> =>
  recentAppRepo.record(
    userId,
    webAppId,
    new Date(),
    RECENT_APP_CONFIG.DEDUPE_WINDOW_MS
  );
