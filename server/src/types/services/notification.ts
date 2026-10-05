// types
import type { AuthenticationRole } from "@/modules/authentication/types";
import type {
  CreateNotificationData,
  NotificationParams,
  NotificationType
} from "@/modules/notification/types";

export interface NotifyUserInput {
  userId: string;
  type: NotificationType;
  params?: NotificationParams;
  link?: string | null;
}

/** For callers that only hold the authentication id (login history does). */
export type NotifyAuthInput = Omit<NotifyUserInput, "userId"> & {
  authId: string;
};

export interface BroadcastInput {
  /** Every active account whose role is in this list receives one copy. */
  roles: AuthenticationRole[];
  type: NotificationType;
  params?: NotificationParams;
  link?: string | null;
  /**
   * Stable id of the event (`app:<id>`). Stored per recipient under a unique
   * index, so a retried fan-out job skips the users it already reached.
   */
  dedupeKey: string;
}

export type NotificationJobData =
  | ({ kind: "user" } & NotifyUserInput)
  | ({ kind: "auth" } & NotifyAuthInput)
  | ({ kind: "audience" } & BroadcastInput);

export interface RecipientPage {
  userIds: string[];
  /** `_id` of the last authentication scanned — the cursor for the next page. */
  lastAuthId: string | null;
}

/** Storage port of the delivery service; the Mongo adapter lives next to it. */
export interface NotificationWriter {
  insertOne(data: CreateNotificationData): Promise<void>;
  insertMany(data: CreateNotificationData[]): Promise<void>;
  findUserIdByAuthId(authId: string): Promise<string | null>;
  findRecipients(
    roles: AuthenticationRole[],
    afterAuthId: string | null,
    limit: number
  ): Promise<RecipientPage>;
}
