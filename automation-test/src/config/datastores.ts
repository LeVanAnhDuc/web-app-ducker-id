import { requireVar, serverVar } from "./env";

// The suite writes to the server's own datastores: it plants one-time codes and
// clears rate-limit counters in Redis, and deletes throwaway accounts in Mongo.
// Each value is the server's (server/.env), unless automation-test/.env
// overrides it — which it must for DB_NAME: server/.env points at real data,
// the e2e stack runs on `ducker-id-e2e`.

/** server REDIS_URL */
export const REDIS_URL: string = requireVar(
  "REDIS_URL",
  serverVar("REDIS_URL")
);

/** server DB_URL */
export const MONGO_URL: string = requireVar("DB_URL", serverVar("DB_URL"));

/** server DB_NAME — override to the e2e database in automation-test/.env. */
export const MONGO_DB_NAME: string = requireVar(
  "DB_NAME",
  serverVar("DB_NAME")
);
