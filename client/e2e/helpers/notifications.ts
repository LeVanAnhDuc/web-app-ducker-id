import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";

// Shared config for the notifications E2E suite.
import { BASE_URL, USER_EMAIL, USER_PASSWORD } from "./env";
export { BASE_URL, USER_EMAIL, USER_PASSWORD };

// Seed anchors (server/src/database/seeders/data/notifications.ts). Rows 6-26
// are APP_AVAILABLE for "Seed App <N>", read when N is odd, so each renders a
// unique sentence. Anchors sit inside the first page (20 rows, newest first)
// of every tab. Each has ONE job, because there is no mark-unread API and a
// mutated row stays mutated until `pnpm seed:clear`:
//   - read-only assertions use #10 (unread) and #11 (read) — never clicked;
//   - "mark single" consumes #12, "persists after reload" consumes #14.
export const seedAppBody = (n: number) =>
  `Seed App ${n} is now in your launcher.`;
export const SEED_UNREAD_N = 10;
export const SEED_UNREAD_BODY = seedAppBody(SEED_UNREAD_N);
export const SEED_READ_BODY = seedAppBody(11);
export const SEED_MARK_SINGLE_BODY = seedAppBody(12);
export const SEED_PERSIST_BODY = seedAppBody(14);

// Every API login below uses this one User-Agent, so after the first call the
// device is known and these helpers stop producing LOGIN_ANOMALY rows of their
// own (which would skew unread-count deltas).
export const HELPER_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 E2E-Helper";

interface ApiEnvelope<T> {
  data?: T;
}

export async function apiLogin(
  ctx: APIRequestContext,
  userAgent = HELPER_USER_AGENT
): Promise<string> {
  const login = await ctx.post("/api/v1/auth/login", {
    data: { email: USER_EMAIL, password: USER_PASSWORD },
    headers: { "User-Agent": userAgent }
  });
  if (!login.ok()) throw new Error(`apiLogin failed (${login.status()})`);
  const body = (await login.json()) as ApiEnvelope<{ accessToken?: string }>;
  const token = body?.data?.accessToken;
  if (!token) throw new Error("apiLogin: no access token in response");
  return token;
}

export async function withApi<T>(
  fn: (ctx: APIRequestContext) => Promise<T>
): Promise<T> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    return await fn(ctx);
  } finally {
    await ctx.dispose();
  }
}

/** The caller's unread count straight from the API, for delta assertions. */
export async function fetchUnreadCount(): Promise<number> {
  return withApi(async (ctx) => {
    const token = await apiLogin(ctx);
    const res = await ctx.get("/api/v1/notifications/unread-count", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok()) throw new Error(`unread-count failed (${res.status()})`);
    const json = (await res.json()) as ApiEnvelope<{ count?: number }>;
    return json?.data?.count ?? 0;
  });
}

export interface ApiNotificationRow {
  id: string;
  type: string;
  params: Record<string, string | number>;
  createdAt: string;
}

export async function fetchNotifications(
  query = ""
): Promise<ApiNotificationRow[]> {
  return withApi(async (ctx) => {
    const token = await apiLogin(ctx);
    const res = await ctx.get(`/api/v1/notifications${query}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok()) throw new Error(`list failed (${res.status()})`);
    const json = (await res.json()) as ApiEnvelope<{
      items?: ApiNotificationRow[];
    }>;
    return json?.data?.items ?? [];
  });
}

/**
 * Makes the helper's own device known before a test measures deltas: the
 * first helper login of a fresh DB is itself an "unusual sign-in", delivered
 * through the queue a moment later.
 */
export async function warmUpHelperDevice(): Promise<void> {
  await fetchUnreadCount();
  await new Promise((resolve) => setTimeout(resolve, 2_000));
}

// Distinct browser/OS pairs for the real LOGIN_ANOMALY test. A pair already
// used by an earlier run is known and produces nothing, so the test walks the
// list until one yields a new notification.
export const ANOMALY_USER_AGENTS: { ua: string; browser: string }[] = [
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    browser: "Safari"
  },
  {
    ua: "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
    browser: "Firefox"
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
    browser: "Edge"
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
    browser: "Firefox"
  },
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/111.0.0.0",
    browser: "Opera"
  },
  {
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    browser: "Mobile Safari"
  },
  {
    ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    browser: "Chrome"
  },
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:126.0) Gecko/20100101 Firefox/126.0",
    browser: "Firefox"
  }
];
