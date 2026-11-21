// common
import { ConfigError } from "@/exceptions";
// others
import { loadEnv } from "./load-env";

const SECRET = "s".repeat(32);

const DEV: Record<string, string> = {
  CORS_ORIGINS: "http://localhost:3000",
  DB_URL: "mongodb://localhost:27017",
  DB_NAME: "ducker-id",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: SECRET,
  JWT_REFRESH_SECRET: SECRET,
  JWT_ID_SECRET: SECRET
};

const PROD: Record<string, string> = {
  ...DEV,
  NODE_ENV: "production",
  CLIENT_URL: "https://id.example.com",
  OIDC_ISSUER: "https://id.example.com",
  OAUTH_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----x",
  OAUTH_PUBLIC_KEY: "-----BEGIN PUBLIC KEY-----x",
  USERNAME_EMAIL: "noreply@example.com",
  PASSWORD_EMAIL: "app-password"
};

/** The ConfigError message, or "" when the source loads. */
const errorOf = (source: Record<string, string>): string => {
  try {
    loadEnv(source);
    return "";
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return (error as Error).message;
  }
};

describe("loadEnv", () => {
  describe("a valid development source", () => {
    it("builds the nested config with defaults", () => {
      const { env, warnings } = loadEnv(DEV);

      expect(env).toEqual({
        nodeEnv: "development",
        app: {
          port: 3000,
          clientUrl: "http://localhost:3000",
          corsOrigins: ["http://localhost:3000"],
          logLevel: "info",
          allowCrossOriginCookies: false,
          trustProxy: "loopback"
        },
        db: {
          url: "mongodb://localhost:27017",
          name: "ducker-id",
          pool: { max: 10, min: 2 },
          timeout: { serverSelectionMs: 5000, socketMs: 45000 }
        },
        redis: {
          url: "redis://localhost:6379",
          timeout: { connectMs: 10000 },
          reconnect: { maxAttempts: 10, baseDelayMs: 100, maxDelayMs: 2000 }
        },
        jwt: {
          accessSecret: SECRET,
          refreshSecret: SECRET,
          idSecret: SECRET
        },
        oidc: {
          issuer: "http://localhost:3000",
          privateKey: undefined,
          publicKey: undefined,
          keyId: undefined
        },
        email: { username: undefined, password: undefined }
      });
      expect(warnings).toEqual([]);
    });

    it("reads numbers, keeps a deliberate 0 and splits the origin list", () => {
      const { env } = loadEnv({
        ...DEV,
        APP_PORT: "5000",
        DB_MIN_POOL_SIZE: "0",
        CORS_ORIGINS: " http://a.test , http://b.test ,"
      });

      expect(env.app.port).toBe(5000);
      expect(env.db.pool.min).toBe(0);
      expect(env.app.corsOrigins).toEqual(["http://a.test", "http://b.test"]);
    });

    it("reads booleans case-insensitively", () => {
      expect(
        loadEnv({ ...DEV, ALLOW_CROSS_ORIGIN_COOKIES: "TRUE" }).env.app
          .allowCrossOriginCookies
      ).toBe(true);
    });

    it.each([
      ["1", 1],
      ["true", true],
      ["false", false],
      ["10.0.0.0/8", "10.0.0.0/8"]
    ])("reads TRUST_PROXY=%s", (raw, expected) => {
      expect(loadEnv({ ...DEV, TRUST_PROXY: raw }).env.app.trustProxy).toBe(
        expected
      );
    });

    it("warns instead of failing on a short secret", () => {
      const { warnings } = loadEnv({ ...DEV, JWT_ACCESS_SECRET: "short" });

      expect(warnings).toEqual([expect.stringContaining("JWT_ACCESS_SECRET")]);
    });
  });

  describe("refusing a bad source", () => {
    it("names every missing required variable at once", () => {
      const message = errorOf({});

      for (const name of [
        "CORS_ORIGINS",
        "DB_URL",
        "DB_NAME",
        "REDIS_URL",
        "JWT_ACCESS_SECRET",
        "JWT_REFRESH_SECRET",
        "JWT_ID_SECRET"
      ]) {
        expect(message).toContain(name);
      }
    });

    it.each([
      ["APP_PORT", "50O0"],
      ["DB_MAX_POOL_SIZE", "ten"],
      ["ALLOW_CROSS_ORIGIN_COOKIES", "1"],
      ["NODE_ENV", "prod"],
      ["LOG_LEVEL", "verbos"],
      ["OIDC_ISSUER", "localhost:3000"],
      ["CLIENT_URL", "id.example.com"],
      ["DB_URL", "localhost:27017"],
      ["REDIS_URL", "localhost:6379"],
      ["CORS_ORIGINS", " , "]
    ])("refuses %s=%s rather than falling back", (name, raw) => {
      expect(errorOf({ ...DEV, [name]: raw })).toContain(name);
    });

    it("refuses half an OIDC key pair", () => {
      expect(
        errorOf({ ...DEV, OAUTH_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----x" })
      ).toContain("OAUTH_PUBLIC_KEY");
    });
  });

  describe("production", () => {
    it("loads a complete production source without warnings", () => {
      const { env, warnings } = loadEnv(PROD);

      expect(env.nodeEnv).toBe("production");
      expect(env.oidc.issuer).toBe("https://id.example.com");
      expect(warnings).toEqual([]);
    });

    it("refuses a secret under 32 characters", () => {
      expect(errorOf({ ...PROD, JWT_REFRESH_SECRET: "short" })).toContain(
        "JWT_REFRESH_SECRET"
      );
    });

    it.each([
      "CLIENT_URL",
      "OIDC_ISSUER",
      "OAUTH_PRIVATE_KEY",
      "OAUTH_PUBLIC_KEY",
      "USERNAME_EMAIL",
      "PASSWORD_EMAIL"
    ])("requires %s instead of a localhost default", (name) => {
      const source = { ...PROD };
      delete source[name];

      expect(errorOf(source)).toContain(name);
    });
  });
});
