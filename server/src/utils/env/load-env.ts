// libs
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
// common
import { ConfigError } from "@/exceptions";
// others
import { EnvVariables, MIN_SECRET_LENGTH } from "./env.schema";

const LOCAL_ORIGIN = "http://localhost:3000";

const SECRET_NAMES = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ID_SECRET"
] as const;

export interface AppEnv {
  nodeEnv: EnvVariables["NODE_ENV"];
  app: {
    port: number;
    clientUrl: string;
    corsOrigins: string[];
    logLevel: EnvVariables["LOG_LEVEL"];
    allowCrossOriginCookies: boolean;
    trustProxy: boolean | number | string;
  };
  db: {
    url: string;
    name: string;
    pool: { max: number; min: number };
    timeout: { serverSelectionMs: number; socketMs: number };
  };
  redis: {
    url: string;
    timeout: { connectMs: number };
    reconnect: { maxAttempts: number; baseDelayMs: number; maxDelayMs: number };
  };
  jwt: { accessSecret: string; refreshSecret: string; idSecret: string };
  oidc: {
    issuer: string;
    privateKey?: string;
    publicKey?: string;
    keyId?: string;
  };
  email: { username?: string; password?: string };
}

export interface LoadedEnv {
  env: AppEnv;
  /** Problems tolerated outside production; the caller logs them. */
  warnings: string[];
}

// A blank value (`KEY=` in .env) means "not set", as it always has here.
const dropBlank = (
  source: Record<string, string | undefined>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(source).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[1].trim() !== ""
    )
  );

const describe = (errors: ReturnType<typeof validateSync>): string[] =>
  errors.flatMap((error) => Object.values(error.constraints ?? {}));

/**
 * Validates the raw environment and shapes it into the nested config the app
 * reads. Throws one ConfigError naming every invalid variable. Pure, so it can
 * be tested without touching process.env; `@/constants/env` calls it once.
 */
export const loadEnv = (
  source: Record<string, string | undefined>
): LoadedEnv => {
  const vars = plainToInstance(EnvVariables, dropBlank(source), {
    exposeDefaultValues: true
  });
  // One message per variable: the first failing rule, as the request DTOs do.
  const problems = describe(validateSync(vars, { stopAtFirstError: true }));

  if (problems.length > 0) {
    throw new ConfigError(
      `Invalid environment configuration:\n  - ${problems.join("\n  - ")}`
    );
  }

  const warnings =
    vars.NODE_ENV === "production"
      ? []
      : SECRET_NAMES.filter(
          (name) => vars[name].length < MIN_SECRET_LENGTH
        ).map(
          (name) =>
            `${name} is shorter than ${MIN_SECRET_LENGTH} characters — refused in production`
        );

  return {
    warnings,
    env: {
      nodeEnv: vars.NODE_ENV,
      app: {
        port: vars.APP_PORT,
        clientUrl: vars.CLIENT_URL ?? LOCAL_ORIGIN,
        corsOrigins: vars.CORS_ORIGINS,
        logLevel: vars.LOG_LEVEL,
        allowCrossOriginCookies: vars.ALLOW_CROSS_ORIGIN_COOKIES,
        trustProxy: vars.TRUST_PROXY
      },
      db: {
        url: vars.DB_URL,
        name: vars.DB_NAME,
        pool: { max: vars.DB_MAX_POOL_SIZE, min: vars.DB_MIN_POOL_SIZE },
        timeout: {
          serverSelectionMs: vars.DB_SERVER_SELECTION_TIMEOUT_MS,
          socketMs: vars.DB_SOCKET_TIMEOUT_MS
        }
      },
      redis: {
        url: vars.REDIS_URL,
        timeout: { connectMs: vars.REDIS_CONNECT_TIMEOUT_MS },
        reconnect: {
          maxAttempts: vars.REDIS_MAX_RECONNECT_ATTEMPTS,
          baseDelayMs: vars.REDIS_RECONNECT_BASE_DELAY_MS,
          maxDelayMs: vars.REDIS_RECONNECT_MAX_DELAY_MS
        }
      },
      jwt: {
        accessSecret: vars.JWT_ACCESS_SECRET,
        refreshSecret: vars.JWT_REFRESH_SECRET,
        idSecret: vars.JWT_ID_SECRET
      },
      oidc: {
        issuer: vars.OIDC_ISSUER ?? LOCAL_ORIGIN,
        privateKey: vars.OAUTH_PRIVATE_KEY,
        publicKey: vars.OAUTH_PUBLIC_KEY,
        keyId: vars.OAUTH_KEY_ID
      },
      email: { username: vars.USERNAME_EMAIL, password: vars.PASSWORD_EMAIL }
    }
  };
};
