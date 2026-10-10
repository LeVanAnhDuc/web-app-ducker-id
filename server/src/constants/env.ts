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

const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_PORT: process.env.APP_PORT,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  CORS_ORIGINS: process.env.CORS_ORIGINS.split(",").map((origin) =>
    origin.trim()
  ),
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  ALLOW_CROSS_ORIGIN_COOKIES: process.env.ALLOW_CROSS_ORIGIN_COOKIES,
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),

  DB_URL: process.env.DB_URL,
  DB_NAME: process.env.DB_NAME,

  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_USERNAME: process.env.REDIS_USERNAME,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ID_SECRET: process.env.JWT_ID_SECRET,

  // OIDC provider. OIDC_ISSUER phải là origin mà TRÌNH DUYỆT nhìn thấy
  // (client Next.js rewrite /oauth/* và /.well-known/* về đây), không phải
  // origin nội bộ của Express — nếu lệch, `iss` trong token sẽ không khớp
  // discovery document và app vệ tinh từ chối token.
  OIDC_ISSUER: process.env.OIDC_ISSUER || "http://localhost:3000",
  OAUTH_PRIVATE_KEY: process.env.OAUTH_PRIVATE_KEY,
  OAUTH_PUBLIC_KEY: process.env.OAUTH_PUBLIC_KEY,
  OAUTH_KEY_ID: process.env.OAUTH_KEY_ID,

  USERNAME_EMAIL: process.env.USERNAME_EMAIL,
  PASSWORD_EMAIL: process.env.PASSWORD_EMAIL
};

export default ENV;
