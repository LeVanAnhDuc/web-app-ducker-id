import type { APIResponse } from "@playwright/test";
import type { ApiClient } from "@/api";
import type {
  NotificationItem,
  NotificationListQuery,
  NotificationPage,
  NotificationsClient
} from "@/api/notifications.client";
import { dataOf, sessionOf } from "@/api/response";
import { createAccount, type Account } from "@/utils/accounts";
import {
  insertNotifications,
  type SeedNotification
} from "@/utils/notifications";

// Shared by the notifications API specs: a signed-in client for a throwaway
// account whose inbox holds exactly the rows the test seeded.

export type NewApi = (headers?: Record<string, string>) => Promise<ApiClient>;
export type { NotificationItem };

/** The authorised client (`api.as(session)`) of a fresh sign-in. */
export async function signedIn(
  newApi: NewApi,
  email: string,
  password: string
): Promise<ReturnType<ApiClient["as"]>> {
  const api = await newApi();
  return api.as(await sessionOf(await api.auth.login(email, password)));
}

export interface Owner {
  account: Account;
  /** Ids of the seeded rows, in the order given. */
  ids: string[];
  notifications: NotificationsClient;
}

/** A throwaway account holding `items`, signed in. */
export async function owner(
  newApi: NewApi,
  tag: string,
  items: SeedNotification[]
): Promise<Owner> {
  const account = await createAccount({ tag });
  const ids = await insertNotifications(account.email, items);
  const authed = await signedIn(newApi, account.email, account.password);
  return { account, ids, notifications: authed.notifications };
}

/** `data` of a 200 list response; throws with the body otherwise. */
export async function pageOf(res: APIResponse): Promise<NotificationPage> {
  if (res.status() !== 200)
    throw new Error(`list → ${res.status()} ${await res.text()}`);
  return dataOf<NotificationPage>(res);
}

export async function list(
  client: NotificationsClient,
  query: NotificationListQuery = {}
): Promise<NotificationPage> {
  return pageOf(await client.list(query));
}

export async function unreadCount(
  client: NotificationsClient
): Promise<number> {
  const res = await client.unreadCount();
  if (res.status() !== 200)
    throw new Error(`unread-count → ${res.status()} ${await res.text()}`);
  return (await dataOf<{ count: number }>(res)).count;
}
