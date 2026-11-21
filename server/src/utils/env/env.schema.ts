// libs
import { Transform } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  ValidateBy,
  ValidateIf
} from "class-validator";
// validators
import { ToBoolean, ToInt, Trim } from "@/validators/decorators";
// others
import { parseList, parseTrustProxy } from "./parse-env";

// Env values are read as written, one class property per variable. Unlike the
// request DTOs, messages are plain English for whoever runs the server — not
// i18n keys — and every failing variable is reported, not only the first.

export const NODE_ENVS = ["development", "production", "test"] as const;
export const LOG_LEVELS = [
  "error",
  "warn",
  "info",
  "http",
  "verbose",
  "debug",
  "silly"
] as const;

/** A secret shorter than this fails in production and warns elsewhere. */
export const MIN_SECRET_LENGTH = 32;

const HTTP_URL = {
  protocols: ["http", "https"],
  require_protocol: true,
  require_tld: false
};

const isProduction = (env: EnvVariables): boolean =>
  env.NODE_ENV === "production";

const Required = (): PropertyDecorator => (target, key) => {
  Trim()(target, key);
  IsNotEmpty({ message: "$property is required" })(target, key);
};

const Integer =
  (min: number, max?: number): PropertyDecorator =>
  (target, key) => {
    ToInt()(target, key);
    IsInt({ message: "$property must be a whole number" })(target, key);
    Min(min, { message: `$property must be at least ${min}` })(target, key);
    if (max !== undefined) {
      Max(max, { message: `$property must be at most ${max}` })(target, key);
    }
  };

/**
 * At least MIN_SECRET_LENGTH characters in production only. Not `ValidateIf`:
 * that skips every rule on the property, `Required` included.
 */
const Secret = (): PropertyDecorator =>
  ValidateBy({
    name: "minLengthInProduction",
    validator: {
      validate: (value: unknown, args): boolean =>
        !isProduction(args?.object as EnvVariables) ||
        (typeof value === "string" && value.length >= MIN_SECRET_LENGTH),
      defaultMessage: () =>
        `$property must be at least ${MIN_SECRET_LENGTH} characters in production`
    }
  });

/** Optional in development (a localhost default applies), required in production. */
const ProductionUrl = (): PropertyDecorator => (target, key) => {
  ValidateIf(
    (env: EnvVariables, value: unknown) =>
      isProduction(env) || value !== undefined
  )(target, key);
  IsUrl(HTTP_URL, {
    message: "$property must be an http(s) URL, e.g. https://id.example.com"
  })(target, key);
};

const RequiredInProduction = (): PropertyDecorator => (target, key) => {
  ValidateIf(isProduction)(target, key);
  IsNotEmpty({ message: "$property is required in production" })(target, key);
};

export class EnvVariables {
  @IsIn(NODE_ENVS, {
    message: `$property must be one of ${NODE_ENVS.join(", ")}`
  })
  NODE_ENV: (typeof NODE_ENVS)[number] = "development";

  @Integer(1, 65535)
  APP_PORT = 3000;

  @ProductionUrl()
  CLIENT_URL?: string;

  @ArrayNotEmpty({ message: "$property must list at least one origin" })
  @IsArray({ message: "$property is required" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? parseList(value) : value
  )
  CORS_ORIGINS!: string[];

  @IsIn(LOG_LEVELS, {
    message: `$property must be one of ${LOG_LEVELS.join(", ")}`
  })
  LOG_LEVEL: (typeof LOG_LEVELS)[number] = "info";

  @IsBoolean({ message: "$property must be true or false" })
  @ToBoolean()
  ALLOW_CROSS_ORIGIN_COOKIES = false;

  // Express's own syntax: true/false, a hop count, or a subnet list.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? parseTrustProxy(value) : value
  )
  TRUST_PROXY: boolean | number | string = "loopback";

  @Matches(/^mongodb(\+srv)?:\/\/\S+$/, {
    message: "$property must be a mongodb:// or mongodb+srv:// URL"
  })
  @Required()
  DB_URL!: string;

  @Required()
  DB_NAME!: string;

  @Integer(1)
  DB_MAX_POOL_SIZE = 10;

  @Integer(0)
  DB_MIN_POOL_SIZE = 2;

  @Integer(1)
  DB_SERVER_SELECTION_TIMEOUT_MS = 5000;

  @Integer(1)
  DB_SOCKET_TIMEOUT_MS = 45000;

  @Matches(/^rediss?:\/\/\S+$/, {
    message: "$property must be a redis:// or rediss:// URL"
  })
  @Required()
  REDIS_URL!: string;

  @Integer(1)
  REDIS_CONNECT_TIMEOUT_MS = 10000;

  @Integer(0)
  REDIS_MAX_RECONNECT_ATTEMPTS = 10;

  @Integer(0)
  REDIS_RECONNECT_BASE_DELAY_MS = 100;

  @Integer(0)
  REDIS_RECONNECT_MAX_DELAY_MS = 2000;

  @Secret()
  @Required()
  JWT_ACCESS_SECRET!: string;

  @Secret()
  @Required()
  JWT_REFRESH_SECRET!: string;

  @Secret()
  @Required()
  JWT_ID_SECRET!: string;

  // `iss` of every token. Must be the origin the browser sees (the Next.js
  // client rewrites /oauth/* and /.well-known/* here), not Express's own.
  @ProductionUrl()
  OIDC_ISSUER?: string;

  // Without the pair, libs/jwks signs with a key generated per process, and
  // every token stops verifying on restart — fine locally, never in
  // production. Half a pair is a mistake anywhere.
  @IsNotEmpty({
    message:
      "$property is required in production, and whenever OAUTH_PUBLIC_KEY is set"
  })
  @ValidateIf(
    (env: EnvVariables) =>
      isProduction(env) || env.OAUTH_PUBLIC_KEY !== undefined
  )
  OAUTH_PRIVATE_KEY?: string;

  @IsNotEmpty({
    message:
      "$property is required in production, and whenever OAUTH_PRIVATE_KEY is set"
  })
  @ValidateIf(
    (env: EnvVariables) =>
      isProduction(env) || env.OAUTH_PRIVATE_KEY !== undefined
  )
  OAUTH_PUBLIC_KEY?: string;

  @IsString()
  @ValidateIf((_env: EnvVariables, value: unknown) => value !== undefined)
  OAUTH_KEY_ID?: string;

  @RequiredInProduction()
  USERNAME_EMAIL?: string;

  @RequiredInProduction()
  PASSWORD_EMAIL?: string;
}
