// libs
import * as dotenv from "dotenv";
// others
import { loadEnv } from "@/utils/env/load-env";

dotenv.config();

// Validated once, at import: an invalid environment stops the process before
// anything connects. Rules live in utils/env/env.schema.ts.
const { env, warnings } = loadEnv(process.env);

/**
 * Problems tolerated outside production (short JWT secrets). Logged by
 * server.ts once the logger exists — the logger itself reads this config.
 */
export const ENV_WARNINGS: readonly string[] = warnings;

export default env;
