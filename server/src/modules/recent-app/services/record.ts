// types
import type { RecentAppServiceDeps } from "./deps";
// constants
import { RECENT_APP_CONFIG } from "../constants";

/**
 * Server-side write for a user already authorised for the app (the OIDC
 * authorize step), so there is no visibility check here.
 */
export const record = (
  deps: RecentAppServiceDeps,
  userId: string,
  webAppId: string
): Promise<void> =>
  deps.recentAppRepo.record(
    userId,
    webAppId,
    new Date(),
    RECENT_APP_CONFIG.DEDUPE_WINDOW_MS
  );
