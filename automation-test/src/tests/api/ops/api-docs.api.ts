import { test, expect } from "@/fixtures";
import type { APIResponse } from "@playwright/test";

// Swagger UI and the OpenAPI document — server/src/libs/swagger/. Served on
// the API origin only: every call goes through the `ops` fixture.

test.use({ role: "guest" });

type OpenApi = {
  openapi: string;
  info: { title: string; version: string };
  servers?: { url: string }[];
  paths: Record<
    string,
    Record<string, { responses?: Record<string, unknown> }>
  >;
};

const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "patch",
  "options",
  "head",
  "trace"
];

async function spec(res: APIResponse): Promise<OpenApi> {
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/json");
  return (await res.json()) as OpenApi;
}

test(
  "Swagger UI is served at /api-docs",
  { tag: "@TC-OPS-004" },
  async ({ ops }) => {
    const res = await ops.swaggerUi();
    expect(res.status()).toBe(200);
    expect(res.url()).toMatch(/\/api-docs\/$/);
    expect(res.headers()["content-type"]).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("swagger-ui-bundle.js");
    expect(html).toContain('id="swagger-ui"');

    const init = await ops.swaggerInit();
    expect(init.status()).toBe(200);
    expect(await init.text()).toContain("SwaggerUIBundle");
  }
);

test(
  "/api-docs.json is a valid OpenAPI 3 document",
  { tag: "@TC-OPS-005" },
  async ({ ops }) => {
    const doc = await spec(await ops.openApi());
    expect(doc.openapi).toMatch(/^3\.\d+\.\d+$/);
    expect(doc.info.title.length).toBeGreaterThan(0);
    expect(typeof doc.info.version).toBe("string");
    expect(doc.servers?.length ?? 0).toBeGreaterThan(0);

    const paths = Object.entries(doc.paths);
    expect(paths.length).toBeGreaterThan(10);
    for (const [path, item] of paths) {
      const ops = Object.keys(item).filter((k) => HTTP_METHODS.includes(k));
      expect(ops.length, `${path} has no operation`).toBeGreaterThan(0);
      for (const op of ops) {
        expect(
          item[op].responses,
          `${op.toUpperCase()} ${path} has no responses`
        ).toBeTruthy();
      }
    }

    // Every local $ref must resolve inside the document.
    const refs = new Set<string>();
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) {
          if (k === "$ref" && typeof v === "string") refs.add(v);
          else walk(v);
        }
      }
    };
    walk(doc);
    const unresolved = [...refs].filter((ref) => {
      if (!ref.startsWith("#/")) return false;
      let cur: unknown = doc;
      for (const part of ref.slice(2).split("/")) {
        const key = part.replace(/~1/g, "/").replace(/~0/g, "~");
        cur = (cur as Record<string, unknown> | undefined)?.[key];
      }
      return cur === undefined;
    });
    expect(unresolved, "unresolved $ref").toEqual([]);
  }
);

test(
  "The OpenAPI document covers every mounted API module",
  { tag: "@TC-OPS-006" },
  async ({ ops }) => {
    // openapi.ts never registers login-history, favorite, admin contacts or unlock — their routes are missing from /api-docs.
    // BUG: defects/ops.md#bug-ops-01
    test.fail();
    const documented = Object.keys((await spec(await ops.openApi())).paths);
    const modules = [
      "/auth/login",
      "/users/me",
      "/admin/apps",
      "/admin/categories",
      "/users/me/recent-apps",
      "/login-history",
      "/admin/login-history",
      "/notifications",
      "/users/me/favorites",
      "/admin/contacts",
      "/auth/unlock"
    ];
    const missing = modules.filter(
      (prefix) =>
        !documented.some((p) => p === prefix || p.startsWith(`${prefix}/`))
    );
    expect(missing).toEqual([]);
  }
);
