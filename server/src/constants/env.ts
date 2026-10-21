// libs
import * as dotenv from "dotenv";

dotenv.config();

const parseTrustProxy = (raw?: string): boolean | number | string => {
  const value = (raw ?? "loopback").trim();
  if (value === "true") return true;
  if (value === "false") return false;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && value !== "") return asNumber;
  return value;
};

// `Number(raw) || fallback` would turn a deliberate 0 (e.g. DB_MIN_POOL_SIZE) into the fallback.
const parseNumber = (raw: string | undefined, fallback: number): number => {
  const value = Number(raw);
  return raw?.trim() && !Number.isNaN(value) ? value : fallback;
};

// Grouped like a Spring application.yml: one branch per concern, read as
// `config.db.pool.max`. The .env variable names stay flat and unchanged.
const ENV = {
  nodeEnv: process.env.NODE_ENV || "development",

  app: {
    port: process.env.APP_PORT,
    clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
    corsOrigins: process.env.CORS_ORIGINS.split(",").map((origin) =>
      origin.trim()
    ),
    logLevel: process.env.LOG_LEVEL || "info",
    allowCrossOriginCookies: process.env.ALLOW_CROSS_ORIGIN_COOKIES,
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY)
  },

  db: {
    url: process.env.DB_URL,
    name: process.env.DB_NAME,
    pool: {
      max: parseNumber(process.env.DB_MAX_POOL_SIZE, 10),
      min: parseNumber(process.env.DB_MIN_POOL_SIZE, 2)
    },
    timeout: {
      serverSelectionMs: parseNumber(
        process.env.DB_SERVER_SELECTION_TIMEOUT_MS,
        5000
      ),
      socketMs: parseNumber(process.env.DB_SOCKET_TIMEOUT_MS, 45000)
    }
  },

  redis: {
    url: process.env.REDIS_URL,
    timeout: {
      connectMs: parseNumber(process.env.REDIS_CONNECT_TIMEOUT_MS, 10000)
    },
    reconnect: {
      maxAttempts: parseNumber(process.env.REDIS_MAX_RECONNECT_ATTEMPTS, 10),
      baseDelayMs: parseNumber(process.env.REDIS_RECONNECT_BASE_DELAY_MS, 100),
      maxDelayMs: parseNumber(process.env.REDIS_RECONNECT_MAX_DELAY_MS, 2000)
    }
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    idSecret: process.env.JWT_ID_SECRET
  },

  // OIDC provider. `issuer` phải là origin mà TRÌNH DUYỆT nhìn thấy
  // (client Next.js rewrite /oauth/* và /.well-known/* về đây), không phải
  // origin nội bộ của Express — nếu lệch, `iss` trong token sẽ không khớp
  // discovery document và app vệ tinh từ chối token.
  oidc: {
    issuer: process.env.OIDC_ISSUER || "http://localhost:3000",
    privateKey: process.env.OAUTH_PRIVATE_KEY,
    publicKey: process.env.OAUTH_PUBLIC_KEY,
    keyId: process.env.OAUTH_KEY_ID
  },

  email: {
    username: process.env.USERNAME_EMAIL,
    password: process.env.PASSWORD_EMAIL
  }
};

export default ENV;
