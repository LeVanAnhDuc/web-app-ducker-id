/**
 * Single source of truth for E2E environment configuration.
 *
 * All E2E files that need BASE_URL or default credentials should import from
 * here instead of re-reading `process.env` inline. This keeps the fallback
 * logic (env → .worktree-state.json → default port) in one place.
 *
 * `playwright.config.ts` also imports `resolveBaseUrl` so that the same
 * resolution logic is used both at config time and inside helpers/specs.
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Resolves the Playwright baseURL using the following priority:
 *   1. `E2E_BASE_URL` environment variable (explicit override)
 *   2. `.worktree-state.json` found by walking up from `cwd`
 *      (populated by `.claude/scripts/worktree.mjs` for per-feature ports)
 *   3. `http://localhost:3000` — standard Next.js dev server default
 */
export function resolveBaseUrl(): string {
  if (process.env.E2E_BASE_URL) return process.env.E2E_BASE_URL;

  const feature = path.basename(process.cwd());
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const stateFile = path.join(dir, ".worktree-state.json");
    if (fs.existsSync(stateFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(stateFile, "utf8")) as Record<
          string,
          { clientPort?: number }
        >;
        const port = state[feature]?.clientPort;
        if (port) return `http://localhost:${port}`;
      } catch {
        /* fall through to default */
      }
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return "http://localhost:3000";
}

/** Resolved base URL for the app under test. */
export const BASE_URL: string = resolveBaseUrl();

// ── Default credentials (read once at module load) ────────────────────────

/** Default e-mail for the seeded regular user (role: user). */
export const USER_EMAIL: string = process.env.E2E_USER_EMAIL ?? "user@test.com";

/** Default password for the seeded regular user. */
export const USER_PASSWORD: string =
  process.env.E2E_USER_PASSWORD ?? "User@123";

/** Default e-mail for the seeded admin user (role: admin). */
export const ADMIN_EMAIL: string =
  process.env.E2E_ADMIN_EMAIL ?? "admin@test.com";

/** Default password for the seeded admin user. */
export const ADMIN_PASSWORD: string =
  process.env.E2E_ADMIN_PASSWORD ?? "Admin@123";

// ── Auth storage state paths ──────────────────────────────────────────────

/** Playwright storageState file for the regular user session. */
export const USER_AUTH_FILE = "e2e/.auth/user.json";

/** Playwright storageState file for the admin session. */
export const ADMIN_AUTH_FILE = "e2e/.auth/admin.json";
