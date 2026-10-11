// types
import type { WebAppDocument } from "../../types";
import type { WebAppServiceDeps } from "../deps";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";
import {
  NOTIFICATION_LINKS,
  NOTIFICATION_TYPES
} from "@/modules/notification/constants";
// others
import { Logger } from "@/libs/logger";
import { WEB_APP_STATUSES } from "../../constants";

/**
 * Tells everyone who can see the app that it is now in their launcher —
 * once per app. `createApp` and `updateApp` call it when an app becomes
 * active; `markAnnounced` makes the second activation a no-op.
 *
 * Never throws: the admin's save already succeeded.
 */
export const announceApp = async (
  deps: WebAppServiceDeps,
  app: WebAppDocument
): Promise<void> => {
  if (app.status !== WEB_APP_STATUSES.ACTIVE) return;

  const appId = app._id.toString();

  try {
    const isFirst = await deps.webAppRepo.markAnnounced(appId);
    if (!isFirst) return;

    // Same audience `listUserApps` shows the app to: its required roles, and
    // admins, who see the whole catalog.
    const roles = [
      ...new Set([...app.requiredRoles, AUTHENTICATION_ROLES.ADMIN])
    ];

    deps.notificationDispatcher.broadcast({
      roles,
      type: NOTIFICATION_TYPES.APP_AVAILABLE,
      params: { appName: app.displayName },
      link: `${NOTIFICATION_LINKS.APPS}?search=${encodeURIComponent(app.displayName)}`,
      dedupeKey: `app:${appId}`
    });
  } catch (error) {
    Logger.error("Failed to announce app", { appId, error });
  }
};
