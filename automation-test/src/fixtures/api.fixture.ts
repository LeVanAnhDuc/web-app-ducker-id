import { createApiClient, type ApiClient } from "@/api";
import { newContext } from "@/api/base.client";
import {
  createOpsClient,
  newOpsContext,
  type OpsClient
} from "@/api/ops.client";
import { test as sessions } from "./sessions.fixture";

export const test = sessions.extend<{
  /** API client on the test's own `request` (carries the role's cookies). */
  api: ApiClient;
  /**
   * A client with its own empty cookie jar — a second, anonymous session.
   * Sends `Accept-Language: en`: with no header the server answers in its
   * default locale, Vietnamese. Disposed after the test.
   */
  newApi: (headers?: Record<string, string>) => Promise<ApiClient>;
  /**
   * Operator endpoints on the API origin (/health/*, /api-docs*, /admin/queues),
   * which the client does not proxy. Its own cookie-less context, no API
   * prefix, no Accept-Language default. Disposed after the test.
   */
  ops: OpsClient;
}>({
  api: async ({ request }, use) => use(createApiClient(request)),
  newApi: async ({}, use) => {
    const opened: { dispose(): Promise<void> }[] = [];
    await use(async (headers = {}) => {
      const ctx = await newContext({ "Accept-Language": "en", ...headers });
      opened.push(ctx);
      return createApiClient(ctx);
    });
    await Promise.all(opened.map((c) => c.dispose().catch(() => undefined)));
  },
  ops: async ({}, use) => {
    const ctx = await newOpsContext();
    await use(createOpsClient(ctx));
    await ctx.dispose();
  }
});
