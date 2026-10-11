import { test, expect } from "@fixtures";
import type { APIRequestContext } from "@fixtures";
import { apiOriginContext } from "@helpers/ops";
import type { ErrorEnvelope } from "@helpers/ops";

// /health/{all,mongodb,redis} — server/src/loaders/health.loader.ts. Mounted
// on the API origin only (the client does not proxy it).

test.use({ role: "guest" });

let api: APIRequestContext;
test.beforeAll(async () => {
  api = await apiOriginContext();
});
test.afterAll(async () => {
  await api.dispose();
});

type Health = {
  message: string;
  path: string;
  data: {
    mongodb?: { status: string };
    redis?: { status: string; latency_ms: number | null };
  };
};

test(
  "the aggregate health check reports MongoDB and Redis up",
  { tag: ["@TC-OPS-001", "@smoke"] },
  async () => {
    const res = await api.get("/health/all");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as Health;
    expect(body.message).toBe("All services are healthy");
    expect(body.path).toBe("/health/all");
    expect(body.data.mongodb).toEqual({ status: "up" });
    expect(body.data.redis?.status).toBe("up");
    const latency = body.data.redis?.latency_ms;
    if (latency !== null) expect(latency).toBeGreaterThanOrEqual(0);
  }
);

test("each datastore has its own health probe", { tag: "@TC-OPS-002" }, async () => {
  const mongo = await api.get("/health/mongodb");
  expect(mongo.status()).toBe(200);
  const m = (await mongo.json()) as Health;
  expect(m.message).toBe("MongoDB is healthy");
  expect(m.data).toEqual({ mongodb: { status: "up" } });

  const redis = await api.get("/health/redis");
  expect(redis.status()).toBe(200);
  const r = (await redis.json()) as Health;
  expect(r.message).toBe("Redis is healthy");
  expect(Object.keys(r.data)).toEqual(["redis"]);
  expect(r.data.redis?.status).toBe("up");
  expect(r.data.redis).toHaveProperty("latency_ms");
});

test("/health itself is not a probe", { tag: "@TC-OPS-003" }, async () => {
  for (const path of ["/health", "/health/unknown"]) {
    const res = await api.get(path, { headers: { "Accept-Language": "en" } });
    expect(res.status(), path).toBe(404);
    const body = (await res.json()) as ErrorEnvelope;
    expect(body).toMatchObject({ code: "NOT_FOUND", message: "Not Found", path });
  }
});
