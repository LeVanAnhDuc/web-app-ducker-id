import fs from "node:fs";
import path from "node:path";
import {
  clientVar,
  requireVar,
  serverVar,
  suiteVar,
  type EnvName
} from "./env";

export interface SiteUrls {
  /** The client the browser opens — Playwright's baseURL. */
  webUrl: string;
  /** The Express origin, for endpoints the client does not proxy (/health, /api-docs, /admin/queues). */
  apiUrl: string;
  /** Path the client's axios instance prefixes every API call with (client NEXT_PUBLIC_API_PREFIX). */
  apiPrefix: string;
}

const trim = (url: string) => url.replace(/\/+$/, "");

/**
 * The port a feature worktree's client was started on, from the nearest
 * `.worktree-state.json` (written by `.claude/scripts/worktree.mjs`), keyed by
 * the folder name of the current directory.
 */
export function worktreeClientUrl(cwd = process.cwd()): string | undefined {
  const feature = path.basename(cwd);
  let dir = cwd;
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
        /* fall through */
      }
      return undefined;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}

/**
 * webUrl: E2E_BASE_URL → .worktree-state.json → client NEXT_PUBLIC_SITE_URL
 * apiUrl: E2E_API_URL → client API_SERVER_URL → server APP_PORT on localhost
 * apiPrefix: client NEXT_PUBLIC_API_PREFIX
 */
export function getUrls(_env: EnvName = "dev"): SiteUrls {
  const port = serverVar("APP_PORT");
  return {
    webUrl: trim(
      requireVar(
        "E2E_BASE_URL / client NEXT_PUBLIC_SITE_URL",
        suiteVar("E2E_BASE_URL") ??
          worktreeClientUrl() ??
          clientVar("NEXT_PUBLIC_SITE_URL")
      )
    ),
    apiUrl: trim(
      requireVar(
        "E2E_API_URL / client API_SERVER_URL",
        suiteVar("E2E_API_URL") ??
          clientVar("API_SERVER_URL") ??
          (port ? `http://localhost:${port}` : undefined)
      )
    ),
    apiPrefix: trim(
      requireVar(
        "client NEXT_PUBLIC_API_PREFIX",
        clientVar("NEXT_PUBLIC_API_PREFIX")
      )
    )
  };
}

const urls = getUrls();

/** Client origin — Playwright's baseURL. */
export const BASE_URL: string = urls.webUrl;
/** Express origin, for operator endpoints the client does not proxy. */
export const API_URL: string = urls.apiUrl;
/** `/api/v1` unless the client says otherwise. */
export const API_PREFIX: string = urls.apiPrefix;
/** Origins the API answers CORS for (server CORS_ORIGINS, comma-separated); may be empty. */
export const CORS_ORIGINS: string[] = (serverVar("CORS_ORIGINS") ?? "")
  .split(",")
  .map((origin) => trim(origin.trim()))
  .filter(Boolean);
