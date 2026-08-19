import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";

// Shared config for the notifications E2E suite.
import { BASE_URL, USER_EMAIL, USER_PASSWORD } from "./env";
export { BASE_URL, USER_EMAIL, USER_PASSWORD };

// Literal seed titles (BE seeder: server/src/database/seeders/data/notifications.ts).
// We assert these verbatim to prove the FE renders the stored string, not an
// i18n key or enum.
//
// IMPORTANT — pick titles the mutation tests never consume. The real seed pads
// to 26 rows by appending a UNIQUE "(#N)" suffix, with isRead = (N-1) % 2 === 0;
// each "(#N)" title is therefore globally unique AND deterministically read or
// unread. The serial mutation tests (mark-single, D9 persistence) permanently
// flip the NEWEST unread item (`.first()` = top of list) to read with no
// mark-unread API to revert (documented in the spec + afterAll). The bare
// titles (items 1-3, newest) get eaten by that drift across runs, so we anchor
// on OLD padded "(#N)" rows that sort to the bottom and are never clicked:
//   - "Unusual sign-in detected (#22)" → seeded UNREAD (item #22, even N-1).
//   - "Password changed" (bare item #4) → seeded READ; mutations only touch
//     UNREAD rows, so this read row is never flipped. Its exact match never
//     collides with the padded "Password changed (#11/#18/#25)" variants.
export const SEED_UNREAD_TITLE = "Unusual sign-in detected (#22)";
// A seed row that is seeded as read (4th item), used for read-tab assertions.
export const SEED_READ_TITLE = "Password changed";

interface UnreadCountResponse {
  data?: { count?: number };
}

// Fetch the caller's unread count straight from the API, for delta assertions
// in the mutation tests (badge math is more robust as a delta than an absolute).
// Logs in via password to get a fresh bearer token (the page storageState's
// cookie is not directly reusable from a bare request context).
export async function fetchUnreadCount(): Promise<number> {
  const ctx: APIRequestContext = await request.newContext({
    baseURL: BASE_URL
  });
  try {
    const login = await ctx.post("/api/v1/auth/login", {
      data: { email: USER_EMAIL, password: USER_PASSWORD }
    });
    if (!login.ok()) {
      throw new Error(`fetchUnreadCount: login failed (${login.status()})`);
    }
    const body = (await login.json()) as { data?: { accessToken?: string } };
    const token = body?.data?.accessToken;
    if (!token)
      throw new Error("fetchUnreadCount: no access token in response");

    const res = await ctx.get("/api/v1/notifications/unread-count", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok()) {
      throw new Error(`fetchUnreadCount: request failed (${res.status()})`);
    }
    const json = (await res.json()) as UnreadCountResponse;
    return json?.data?.count ?? 0;
  } finally {
    await ctx.dispose();
  }
}
