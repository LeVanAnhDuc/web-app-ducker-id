import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";
import {
  BASE_URL,
  ADMIN_EMAIL as EMAIL,
  ADMIN_PASSWORD as PASSWORD
} from "./env";

type AppDto = {
  _id: string;
  name: string;
  displayName: string;
  status: "active" | "inactive";
};

async function adminToken(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post("/api/v1/auth/login", {
    data: { email: EMAIL, password: PASSWORD }
  });
  const body = (await res.json()) as { data?: { accessToken?: string } };
  const token = body?.data?.accessToken;
  if (!token) throw new Error("adminApps helper: admin login failed");
  return token;
}

export async function restoreApp(
  appName: string,
  displayName: string,
  status: "active" | "inactive"
): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE_URL });
  try {
    const token = await adminToken(ctx);
    const auth = { Authorization: `Bearer ${token}` };
    const listRes = await ctx.get("/api/v1/admin/apps", { headers: auth });
    const list = (await listRes.json()) as { data?: { items?: AppDto[] } };
    const app = list?.data?.items?.find((a) => a.name === appName);
    if (!app) throw new Error(`restoreApp: app "${appName}" not found`);
    const res = await ctx.patch(`/api/v1/admin/apps/${app._id}`, {
      headers: auth,
      data: { displayName, status }
    });
    if (!res.ok())
      throw new Error(`restoreApp: revert failed (${res.status()})`);
  } finally {
    await ctx.dispose();
  }
}
