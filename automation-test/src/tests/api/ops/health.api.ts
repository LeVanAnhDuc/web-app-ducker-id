import { test, expect } from "@/fixtures";
import type { ErrorBody } from "@/api/response";
import { serverLiteral, serverMessage } from "@/data/copy";

// /health/{all,mongodb,redis} — server/src/loaders/health.loader.ts. Mounted
// on the API origin only (the client does not proxy it): every call goes
// through the `ops` fixture.

test.use({ role: "guest" });

type Health = {
  message: string;
  path: string;
  data: {
    mongodb?: { status: string };
    redis?: { status: string; latency_ms: number | null };
  };
};

test(
  "The aggregate health check reports MongoDB and Redis up",
  { tag: ["@TC-OPS-001", "@smoke"] },
  async ({ ops }) => {
    const res = await ops.healthAll();
    expect(res.status()).toBe(200);
    const body = (await res.json()) as Health;
    expect(body.message).toBe(serverLiteral.health.all);
    expect(body.path).toBe("/health/all");
    expect(body.data.mongodb).toEqual({ status: "up" });
    expect(body.data.redis?.status).toBe("up");
    const latency = body.data.redis?.latency_ms;
    if (latency !== null) expect(latency).toBeGreaterThanOrEqual(0);
  }
);

test(
  "Each datastore has its own health probe",
  { tag: "@TC-OPS-002" },
  async ({ ops }) => {
    const mongo = await ops.healthMongo();
    expect(mongo.status()).toBe(200);
    const m = (await mongo.json()) as Health;
    expect(m.message).toBe(serverLiteral.health.mongodb);
    expect(m.data).toEqual({ mongodb: { status: "up" } });

    const redis = await ops.healthRedis();
    expect(redis.status()).toBe(200);
    const r = (await redis.json()) as Health;
    expect(r.message).toBe(serverLiteral.health.redis);
    expect(Object.keys(r.data)).toEqual(["redis"]);
    expect(r.data.redis?.status).toBe("up");
    expect(r.data.redis).toHaveProperty("latency_ms");
  }
);

test(
  "/health itself is not a probe",
  { tag: "@TC-OPS-003" },
  async ({ ops }) => {
    for (const path of ["/health", "/health/unknown"]) {
      const res = await ops.get(path, { "Accept-Language": "en" });
      expect(res.status(), path).toBe(404);
      const body = (await res.json()) as ErrorBody;
      expect(body).toMatchObject({
        code: "NOT_FOUND",
        message: serverMessage.common.errors.notFound,
        path
      });
    }
  }
);
