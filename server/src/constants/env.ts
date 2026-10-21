// libs
import * as dotenv from "dotenv";
// others
import {
  parseBoolean,
  parseList,
  parseNumber,
  parseRequired,
  parseTrustProxy
} from "@/utils/env/parse-env";

dotenv.config();

const { env } = process;

const ENV = {
  nodeEnv: env.NODE_ENV || "development",

  app: {
    port: parseNumber(env.APP_PORT, 3000),
    clientUrl: env.CLIENT_URL || "http://localhost:3000",
    corsOrigins: parseList(parseRequired("CORS_ORIGINS", env.CORS_ORIGINS)),
    logLevel: env.LOG_LEVEL || "info",
    allowCrossOriginCookies: parseBoolean(env.ALLOW_CROSS_ORIGIN_COOKIES),
    trustProxy: parseTrustProxy(env.TRUST_PROXY)
  },

  db: {
    url: parseRequired("DB_URL", env.DB_URL),
    name: parseRequired("DB_NAME", env.DB_NAME),
    pool: {
      max: parseNumber(env.DB_MAX_POOL_SIZE, 10),
      min: parseNumber(env.DB_MIN_POOL_SIZE, 2)
    },
    timeout: {
      serverSelectionMs: parseNumber(env.DB_SERVER_SELECTION_TIMEOUT_MS, 5000),
      socketMs: parseNumber(env.DB_SOCKET_TIMEOUT_MS, 45000)
    }
  },

  redis: {
    url: parseRequired("REDIS_URL", env.REDIS_URL),
    timeout: {
      connectMs: parseNumber(env.REDIS_CONNECT_TIMEOUT_MS, 10000)
    },
    reconnect: {
      maxAttempts: parseNumber(env.REDIS_MAX_RECONNECT_ATTEMPTS, 10),
      baseDelayMs: parseNumber(env.REDIS_RECONNECT_BASE_DELAY_MS, 100),
      maxDelayMs: parseNumber(env.REDIS_RECONNECT_MAX_DELAY_MS, 2000)
    }
  },

  jwt: {
    accessSecret: parseRequired("JWT_ACCESS_SECRET", env.JWT_ACCESS_SECRET),
    refreshSecret: parseRequired("JWT_REFRESH_SECRET", env.JWT_REFRESH_SECRET),
    idSecret: parseRequired("JWT_ID_SECRET", env.JWT_ID_SECRET)
  },

  // OIDC provider. `issuer` phải là origin mà TRÌNH DUYỆT nhìn thấy
  // (client Next.js rewrite /oauth/* và /.well-known/* về đây), không phải
  // origin nội bộ của Express — nếu lệch, `iss` trong token sẽ không khớp
  // discovery document và app vệ tinh từ chối token.
  oidc: {
    issuer: env.OIDC_ISSUER || "http://localhost:3000",
    privateKey: env.OAUTH_PRIVATE_KEY,
    publicKey: env.OAUTH_PUBLIC_KEY,
    keyId: env.OAUTH_KEY_ID
  },

  email: {
    username: env.USERNAME_EMAIL,
    password: env.PASSWORD_EMAIL
  }
};

export default ENV;
