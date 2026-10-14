import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Where configuration comes from. The suite declares as little as it can: the
// client and the server already say which origin, API prefix, Redis and Mongo
// they use, so the values are read from their own files. A key is looked up in
// order, first hit wins:
//
//   1. process.env                  (a shell export, CI)
//   2. automation-test/.env         (overrides for the e2e stack — DB_NAME, ports)
//   3. client/.env.local, client/.env / server/.env of this checkout
//   4. the same files in the MAIN checkout, when this is a git worktree
//   5. client/.env.example / server/.env.example
//
// The real .env files are gitignored, so a feature worktree has none: step 4
// reads the main checkout's, which is where the real values live (Ducker ID's
// Redis is a cloud instance — .env.example's localhost would point nowhere).
// Step 5 is what a fresh clone has. Files are parsed, never loaded into
// process.env, so a server key cannot leak into anything that reads
// process.env directly.

export type EnvName = "dev";

const ENVS: readonly EnvName[] = ["dev"];

/** Ducker ID runs only locally (no stg / prd), so `dev` is the one value. */
export function resolveEnv(raw: string | undefined): EnvName {
  const value = (raw ?? "dev").trim().toLowerCase();
  if (!(ENVS as readonly string[]).includes(value)) {
    throw new Error(`Unknown ENV "${raw}". Use one of: ${ENVS.join(", ")}`);
  }
  return value as EnvName;
}

export type EnvSource = Record<string, string | undefined>;

/** automation-test/ */
export const SUITE_ROOT = path.resolve(__dirname, "..", "..");
/** The app repo (or worktree) root that holds client/ and server/. */
export const REPO_ROOT = path.resolve(SUITE_ROOT, "..");

/**
 * The main checkout's root when `repoRoot` is a linked git worktree (its
 * `.git` is a file "gitdir: <main>/.git/worktrees/<name>"), else undefined.
 */
export function mainCheckoutRoot(repoRoot: string): string | undefined {
  const dotGit = path.join(repoRoot, ".git");
  if (!fs.existsSync(dotGit) || fs.statSync(dotGit).isDirectory())
    return undefined;
  const m = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(dotGit, "utf8"));
  if (!m) return undefined;
  const gitDir = path.resolve(repoRoot, m[1].trim());
  const parts = gitDir.split(/[\\/]/);
  const i = parts.lastIndexOf("worktrees");
  if (i < 1 || parts[i - 1] !== ".git") return undefined;
  return parts.slice(0, i - 1).join(path.sep) || undefined;
}

export function parseEnvFile(file: string): EnvSource {
  return fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
}

/**
 * A side's variables, merged key by key. `dirs` are ordered strongest first
 * (this checkout, then the main checkout); within a dir, later files in `real`
 * win over earlier ones (`.env.local` over `.env`). The first dir's
 * `.env.example` is the weakest layer: it only fills keys no real file sets.
 */
export function sideEnv(dirs: string | string[], real: string[]): EnvSource {
  const list = Array.isArray(dirs) ? dirs : [dirs];
  const layers = [parseEnvFile(path.join(list[0], ".env.example"))];
  for (const dir of [...list].reverse())
    for (const file of real) layers.push(parseEnvFile(path.join(dir, file)));
  const merged: EnvSource = {};
  for (const layer of layers)
    for (const [key, value] of Object.entries(layer))
      if (value?.trim()) merged[key] = value;
  return merged;
}

/** First defined, non-blank value of `key` across `sources`. */
export function pick(key: string, sources: EnvSource[]): string | undefined {
  for (const source of sources) {
    const value = source[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

const suite = parseEnvFile(path.join(SUITE_ROOT, ".env"));
// Next.js gives .env.local precedence over .env — so does this.
const roots = [REPO_ROOT, mainCheckoutRoot(REPO_ROOT)].filter(
  (r): r is string => !!r
);
const client = sideEnv(
  roots.map((r) => path.join(r, "client")),
  [".env", ".env.local"]
);
const server = sideEnv(
  roots.map((r) => path.join(r, "server")),
  [".env"]
);

/** Suite-level keys: shell, then automation-test/.env. */
export function suiteVar(key: string): string | undefined {
  return pick(key, [process.env, suite]);
}

/** A key the client defines, unless the suite overrides it. */
export function clientVar(key: string): string | undefined {
  return pick(key, [process.env, suite, client]);
}

/** A key the server defines, unless the suite overrides it. */
export function serverVar(key: string): string | undefined {
  return pick(key, [process.env, suite, server]);
}

export function requireVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}: set it in automation-test/.env or in the client/server .env it comes from`
    );
  }
  return value;
}
