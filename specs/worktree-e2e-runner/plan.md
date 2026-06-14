# Worktree E2E Runner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một orchestrator `node .claude/scripts/worktree.mjs <up|down> <feature>` dựng/dọn một feature worktree để chạy E2E độc lập — cấp port không-đụng, copy/patch/xóa env tạm, start/stop BE+FE.

**Architecture:** Zero-dep Node ESM script ở `.claude/scripts/`, tách thành các lib thuần (`ports`, `env`, `state`, `worktree`, `process`) + CLI entry wiring. Pure functions TDD bằng `node --test`; phần spawn/health/kill verify bằng manual smoke. Thêm 1 thay đổi config FE (`playwright.config.ts`) để `yarn e2e` tự target port worktree.

**Tech Stack:** Node ≥18 built-ins (`node:net`, `node:http`, `node:fs`, `node:child_process`, `node:test`); Playwright config (TS).

**Commit policy (CLAUDE.md §7, Review-ON mặc định):** Mỗi task **chỉ `git add` (stage), KHÔNG commit per-task**. Sau khi viết xong toàn bộ → main loop trình diff tổng → user review 1 lần → commit (per-repo: `.claude/` + `client/`). Các step "Stage" bên dưới phản ánh điều này; **Task 9** là review-gate + commit cuối.

**Repos đụng:** `.claude/` (script + tests), `client/` (playwright.config.ts). `docs/` (spec/plan — worktree đã tạo). `server/` KHÔNG đụng (script chỉ đọc/patch env worktree server lúc runtime).

**Đường dẫn khi implement:** code `.claude` nằm trong worktree `.claude/.worktrees/worktree-e2e-runner/scripts/...`; code client trong `client/.worktrees/worktree-e2e-runner/...`. Chạy test: `cd .claude/.worktrees/worktree-e2e-runner/scripts && node --test`.

**Out of scope (known limitation — xem design §2):** shared cloud Mongo/Redis; cookie không scope theo port. Không xử lý ở đây.

---

### Task 0: Isolation — tạo worktree `.claude` + `client`

**Files:** không sửa code; chỉ tạo worktree + verify ignore.

- [ ] **Step 1: Verify `.worktrees` được ignore ở `.claude` và `client`**

```bash
cd /d/Learn/web-app-store-server-client
git -C .claude check-ignore -q .worktrees && echo ".claude OK" || echo ".claude NEEDS ignore"
git -C client check-ignore -q .worktrees && echo "client OK" || echo "client NEEDS ignore"
```

- [ ] **Step 2: Nếu repo nào báo NEEDS ignore → thêm `.worktrees/` vào `.gitignore` repo đó rồi commit**

```bash
# chỉ chạy cho repo thiếu, ví dụ .claude:
printf '\n.worktrees/\n' >> .claude/.gitignore
git -C .claude add .gitignore && git -C .claude commit -m "chore: ignore .worktrees"
```

- [ ] **Step 3: Tạo worktree từ `origin/main` mới nhất (cùng branch `feat/worktree-e2e-runner`)**

```bash
git -C .claude fetch origin && git -C .claude worktree add .worktrees/worktree-e2e-runner -b feat/worktree-e2e-runner origin/main
git -C client fetch origin && git -C client worktree add .worktrees/worktree-e2e-runner -b feat/worktree-e2e-runner origin/main
```

Expected: cả 2 báo `Preparing worktree (new branch 'feat/worktree-e2e-runner')`.

- [ ] **Step 4: Tạo thư mục scripts**

```bash
mkdir -p .claude/.worktrees/worktree-e2e-runner/scripts/lib
```

---

### Task 1: `lib/env.mjs` — patch env transform (pure, TDD)

**Files:**
- Create: `.claude/.worktrees/worktree-e2e-runner/scripts/lib/env.mjs`
- Test: `.claude/.worktrees/worktree-e2e-runner/scripts/lib/env.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// lib/env.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { setEnvVar, ensureCorsOrigin, patchServerEnv, patchClientEnv } from "./env.mjs";

test("setEnvVar replaces existing key (tolerates spaces around =)", () => {
  assert.equal(setEnvVar("APP_PORT =3000\nFOO=1", "APP_PORT", "5102"), "APP_PORT=5102\nFOO=1");
});

test("setEnvVar appends when key missing", () => {
  assert.equal(setEnvVar("FOO=1\n", "BAR", "2"), "FOO=1\nBAR=2\n");
});

test("ensureCorsOrigin appends origin once, no-op when present", () => {
  const a = ensureCorsOrigin("CORS_ORIGINS=http://localhost:3000", "http://localhost:3100");
  assert.equal(a, "CORS_ORIGINS=http://localhost:3000,http://localhost:3100");
  assert.equal(ensureCorsOrigin(a, "http://localhost:3100"), a);
});

test("patchServerEnv sets APP_PORT, CLIENT_URL, CORS", () => {
  const out = patchServerEnv("APP_PORT =5000\nCLIENT_URL=http://localhost:3000\nCORS_ORIGINS=http://localhost:3000", { serverPort: 5102, clientPort: 3100 });
  assert.match(out, /^APP_PORT=5102$/m);
  assert.match(out, /^CLIENT_URL=http:\/\/localhost:3100$/m);
  assert.match(out, /^CORS_ORIGINS=http:\/\/localhost:3000,http:\/\/localhost:3100$/m);
});

test("patchClientEnv sets API_SERVER_URL", () => {
  assert.match(patchClientEnv("API_SERVER_URL=http://localhost:5000", { serverPort: 5102 }), /^API_SERVER_URL=http:\/\/localhost:5102$/m);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd .claude/.worktrees/worktree-e2e-runner/scripts && node --test lib/env.test.mjs`
Expected: FAIL — `Cannot find module './env.mjs'`.

- [ ] **Step 3: Write implementation**

```js
// lib/env.mjs
export function setEnvVar(content, key, value) {
  const re = new RegExp(`^(\\s*${key}\\s*=).*$`, "m");
  if (re.test(content)) return content.replace(re, `${key}=${value}`);
  const sep = content.length === 0 || content.endsWith("\n") ? "" : "\n";
  return `${content}${sep}${key}=${value}\n`;
}

export function ensureCorsOrigin(content, origin) {
  const re = /^(\s*CORS_ORIGINS\s*=)(.*)$/m;
  const m = content.match(re);
  if (!m) return setEnvVar(content, "CORS_ORIGINS", origin);
  const items = m[2].trim() ? m[2].trim().split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (items.includes(origin)) return content;
  items.push(origin);
  return content.replace(re, `CORS_ORIGINS=${items.join(",")}`);
}

export function patchServerEnv(content, { serverPort, clientPort }) {
  let out = setEnvVar(content, "APP_PORT", String(serverPort));
  out = setEnvVar(out, "CLIENT_URL", `http://localhost:${clientPort}`);
  return ensureCorsOrigin(out, `http://localhost:${clientPort}`);
}

export function patchClientEnv(content, { serverPort }) {
  return setEnvVar(content, "API_SERVER_URL", `http://localhost:${serverPort}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/env.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Stage**

```bash
git -C .claude add .worktrees/worktree-e2e-runner/scripts/lib/env.mjs .worktrees/worktree-e2e-runner/scripts/lib/env.test.mjs
```

---

### Task 2: `lib/ports.mjs` — free-port scan (TDD)

**Files:**
- Create: `.claude/.worktrees/worktree-e2e-runner/scripts/lib/ports.mjs`
- Test: `.claude/.worktrees/worktree-e2e-runner/scripts/lib/ports.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// lib/ports.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { isPortFree, findFreePort } from "./ports.mjs";

function occupy(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}

test("isPortFree true for free, false for occupied", async () => {
  const free = await findFreePort(54000);
  assert.equal(await isPortFree(free), true);
  const srv = await occupy(free);
  assert.equal(await isPortFree(free), false);
  srv.close();
});

test("findFreePort skips an occupied start port", async () => {
  const start = 54010;
  const srv = await occupy(start);
  const got = await findFreePort(start, 2);
  assert.notEqual(got, start);
  assert.equal(await isPortFree(got), true);
  srv.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/ports.test.mjs`
Expected: FAIL — `Cannot find module './ports.mjs'`.

- [ ] **Step 3: Write implementation**

```js
// lib/ports.mjs
import net from "node:net";

export function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "127.0.0.1");
  });
}

export async function findFreePort(start, step = 2, max = start + 400) {
  for (let p = start; p <= max; p += step) {
    if (await isPortFree(p)) return p;
  }
  throw new Error(`No free port in range ${start}..${max}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/ports.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Stage**

```bash
git -C .claude add .worktrees/worktree-e2e-runner/scripts/lib/ports.mjs .worktrees/worktree-e2e-runner/scripts/lib/ports.test.mjs
```

---

### Task 3: `lib/state.mjs` — state file read/write (TDD)

**Files:**
- Create: `.claude/.worktrees/worktree-e2e-runner/scripts/lib/state.mjs`
- Test: `.claude/.worktrees/worktree-e2e-runner/scripts/lib/state.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// lib/state.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readState, setFeature, getFeature, removeFeature } from "./state.mjs";

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wt-state-"));
}

test("readState returns {} when file missing", () => {
  assert.deepEqual(readState(tmpRoot()), {});
});

test("set/get/remove feature roundtrip", () => {
  const root = tmpRoot();
  setFeature(root, "feat-x", { serverPort: 5102, clientPort: 3100, serverPid: 11, clientPid: 12 });
  assert.deepEqual(getFeature(root, "feat-x"), { serverPort: 5102, clientPort: 3100, serverPid: 11, clientPid: 12 });
  const removed = removeFeature(root, "feat-x");
  assert.equal(removed.serverPort, 5102);
  assert.equal(getFeature(root, "feat-x"), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/state.test.mjs`
Expected: FAIL — `Cannot find module './state.mjs'`.

- [ ] **Step 3: Write implementation**

```js
// lib/state.mjs
import fs from "node:fs";
import path from "node:path";

const FILE = ".worktree-state.json";
export const statePath = (root) => path.join(root, FILE);

export function readState(root) {
  try {
    return JSON.parse(fs.readFileSync(statePath(root), "utf8"));
  } catch {
    return {};
  }
}

export function writeState(root, state) {
  fs.writeFileSync(statePath(root), `${JSON.stringify(state, null, 2)}\n`);
}

export function getFeature(root, feature) {
  return readState(root)[feature] ?? null;
}

export function setFeature(root, feature, data) {
  const s = readState(root);
  s[feature] = data;
  writeState(root, s);
}

export function removeFeature(root, feature) {
  const s = readState(root);
  const removed = s[feature] ?? null;
  delete s[feature];
  writeState(root, s);
  return removed;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/state.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Stage**

```bash
git -C .claude add .worktrees/worktree-e2e-runner/scripts/lib/state.mjs .worktrees/worktree-e2e-runner/scripts/lib/state.test.mjs
```

---

### Task 4: `lib/worktree.mjs` — discovery + node_modules junction

**Files:**
- Create: `.claude/.worktrees/worktree-e2e-runner/scripts/lib/worktree.mjs`
- Test: `.claude/.worktrees/worktree-e2e-runner/scripts/lib/worktree.test.mjs`

- [ ] **Step 1: Write the failing test (discovery + junction no-op branch are the testable parts)**

```js
// lib/worktree.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveWorktrees, ensureNodeModules } from "./worktree.mjs";

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wt-disc-"));
}

test("resolveWorktrees finds only sides that exist", () => {
  const root = tmpRoot();
  fs.mkdirSync(path.join(root, "client", ".worktrees", "feat-x"), { recursive: true });
  const r = resolveWorktrees(root, "feat-x");
  assert.equal(r.client, path.join(root, "client", ".worktrees", "feat-x"));
  assert.equal(r.server, undefined);
});

test("ensureNodeModules returns false when node_modules already present", () => {
  const root = tmpRoot();
  const wt = path.join(root, "wt");
  fs.mkdirSync(path.join(wt, "node_modules"), { recursive: true });
  assert.equal(ensureNodeModules(wt, path.join(root, "main")), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/worktree.test.mjs`
Expected: FAIL — `Cannot find module './worktree.mjs'`.

- [ ] **Step 3: Write implementation**

```js
// lib/worktree.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function resolveWorktrees(root, feature) {
  const out = {};
  for (const side of ["server", "client"]) {
    const p = path.join(root, side, ".worktrees", feature);
    if (fs.existsSync(p)) out[side] = p;
  }
  return out;
}

// Returns true if a junction/symlink was created, false if node_modules already existed.
export function ensureNodeModules(worktreePath, mainRepoPath) {
  const target = path.join(worktreePath, "node_modules");
  if (fs.existsSync(target)) return false;
  const source = path.join(mainRepoPath, "node_modules");
  if (process.platform === "win32") {
    execFileSync("cmd", ["/c", "mklink", "/J", target, source], { stdio: "ignore" });
  } else {
    fs.symlinkSync(source, target, "dir");
  }
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/worktree.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Stage**

```bash
git -C .claude add .worktrees/worktree-e2e-runner/scripts/lib/worktree.mjs .worktrees/worktree-e2e-runner/scripts/lib/worktree.test.mjs
```

---

### Task 5: `lib/process.mjs` — spawn detached / health probe / kill tree

**Files:**
- Create: `.claude/.worktrees/worktree-e2e-runner/scripts/lib/process.mjs`
- Test: `.claude/.worktrees/worktree-e2e-runner/scripts/lib/process.test.mjs`

> Spawn/kill phụ thuộc OS → verify chính ở manual smoke (Task 8). Unit test chỉ chốt 2 contract an toàn: `killTree(undefined)` no-op, và `waitForHttp` resolve khi có server thật.

- [ ] **Step 1: Write the failing test**

```js
// lib/process.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { waitForHttp, killTree } from "./process.mjs";

test("killTree(undefined) is a no-op (no throw)", () => {
  assert.doesNotThrow(() => killTree(undefined));
});

test("waitForHttp resolves once a server responds", async () => {
  const srv = http.createServer((_req, res) => res.end("ok"));
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const port = srv.address().port;
  await waitForHttp(port, 5000);
  srv.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/process.test.mjs`
Expected: FAIL — `Cannot find module './process.mjs'`.

- [ ] **Step 3: Write implementation**

```js
// lib/process.mjs
import { spawn, execFileSync } from "node:child_process";
import http from "node:http";

export function startProcess(command, args, cwd, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: "ignore",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });
  child.unref();
  return child.pid;
}

export function waitForHttp(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 2000 }, (res) => {
        res.resume();
        resolve();
      });
      const retry = () => {
        req.destroy();
        if (Date.now() > deadline) reject(new Error(`port ${port} not ready in ${timeoutMs}ms`));
        else setTimeout(tick, 500);
      };
      req.on("error", retry);
      req.on("timeout", retry);
    };
    tick();
  });
}

export function killTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGTERM");
    }
  } catch {
    /* already dead */
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/process.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Stage**

```bash
git -C .claude add .worktrees/worktree-e2e-runner/scripts/lib/process.mjs .worktrees/worktree-e2e-runner/scripts/lib/process.test.mjs
```

---

### Task 6: `worktree.mjs` — CLI orchestrator (wiring)

**Files:**
- Create: `.claude/.worktrees/worktree-e2e-runner/scripts/worktree.mjs`

> Glue thuần (gọi các lib đã test) — verify bằng manual smoke Task 8, không thêm unit test. Cẩn thận: `--root` override để smoke chạy được từ worktree (production tự suy root từ `import.meta.url`).

- [ ] **Step 1: Write implementation**

```js
// scripts/worktree.mjs
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { findFreePort } from "./lib/ports.mjs";
import { patchServerEnv, patchClientEnv } from "./lib/env.mjs";
import { setFeature, removeFeature } from "./lib/state.mjs";
import { resolveWorktrees, ensureNodeModules } from "./lib/worktree.mjs";
import { startProcess, waitForHttp, killTree } from "./lib/process.mjs";

const SERVER_PORT_START = 5100;
const CLIENT_PORT_START = 3100;

function parseArgs(argv) {
  const args = { _: [] };
  for (const a of argv) {
    if (a.startsWith("--root=")) args.root = a.slice("--root=".length);
    else args._.push(a);
  }
  return args;
}

// Production: script at <root>/.claude/scripts/worktree.mjs → root = ../.. (scripts → .claude → root)
function defaultRoot() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..");
}

function copyAndPatch(src, dest, patchFn) {
  const content = fs.readFileSync(src, "utf8");
  fs.writeFileSync(dest, patchFn(content));
}

async function up(root, feature) {
  const wt = resolveWorktrees(root, feature);
  if (!wt.server && !wt.client) throw new Error(`No worktree found for "${feature}" in server/ or client/`);

  const serverPort = wt.server ? await findFreePort(SERVER_PORT_START) : null;
  const clientPort = wt.client ? await findFreePort(CLIENT_PORT_START) : null;
  let serverPid = null;
  let clientPid = null;

  if (wt.server) {
    ensureNodeModules(wt.server, path.join(root, "server"));
    copyAndPatch(path.join(root, "server", ".env"), path.join(wt.server, ".env"),
      (c) => patchServerEnv(c, { serverPort, clientPort: clientPort ?? 3000 }));
    serverPid = startProcess("yarn", ["dev"], wt.server);
    console.log(`[server] starting on :${serverPort} (pid ${serverPid})`);
    await waitForHttp(serverPort);
    console.log(`[server] healthy on :${serverPort}`);
  }

  if (wt.client) {
    ensureNodeModules(wt.client, path.join(root, "client"));
    copyAndPatch(path.join(root, "client", ".env.local"), path.join(wt.client, ".env.local"),
      (c) => (wt.server ? patchClientEnv(c, { serverPort }) : c));
    // webpack (NOT --turbopack: crashes over node_modules junction)
    clientPid = startProcess("npx", ["--no-install", "next", "dev", "--port", String(clientPort)], wt.client);
    console.log(`[client] starting on :${clientPort} (pid ${clientPid})`);
    await waitForHttp(clientPort);
    console.log(`[client] healthy on :${clientPort}`);
  }

  setFeature(root, feature, { serverPort, clientPort, serverPid, clientPid });
  console.log(`\n✅ up "${feature}" — server :${serverPort ?? "-"}  client :${clientPort ?? "-"}`);
  if (clientPort) console.log(`   E2E: cd client/.worktrees/${feature} && yarn e2e  (auto-targets :${clientPort})`);
}

function down(root, feature) {
  const wt = resolveWorktrees(root, feature);
  const state = removeFeature(root, feature);
  if (state) {
    killTree(state.serverPid);
    killTree(state.clientPid);
    console.log(`[stop] killed pids ${state.serverPid ?? "-"}, ${state.clientPid ?? "-"}`);
  }
  // delete copied env (never commit)
  for (const [side, file] of [["server", ".env"], ["client", ".env.local"]]) {
    const p = wt[side] && path.join(wt[side], file);
    if (p && fs.existsSync(p)) {
      fs.rmSync(p);
      console.log(`[clean] removed ${side}/${file}`);
    }
  }
  console.log(`\n✅ down "${feature}" — env copy + state removed`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, feature] = args._;
  const root = args.root ? path.resolve(args.root) : defaultRoot();
  if (!cmd || !feature || !["up", "down"].includes(cmd)) {
    console.error("Usage: node .claude/scripts/worktree.mjs <up|down> <feature> [--root=<path>]");
    process.exit(1);
  }
  if (cmd === "up") await up(root, feature);
  else down(root, feature);
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke the arg-parser/usage path (no servers started)**

Run: `cd .claude/.worktrees/worktree-e2e-runner/scripts && node worktree.mjs`
Expected: prints Usage line, exit 1.

Run: `node worktree.mjs up nonexistent-feature --root=/d/Learn/web-app-store-server-client`
Expected: `✗ No worktree found for "nonexistent-feature" ...`, exit 1.

- [ ] **Step 3: Stage**

```bash
git -C .claude add .worktrees/worktree-e2e-runner/scripts/worktree.mjs
```

---

### Task 7: Patch `client/playwright.config.ts` — worktree-aware BASE_URL

**Files:**
- Modify: `client/.worktrees/worktree-e2e-runner/playwright.config.ts:1-3`

- [ ] **Step 1: Replace the BASE_URL constant with a resolver**

Thay 3 dòng đầu hiện tại:
```ts
import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
```
bằng:
```ts
import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function resolveBaseUrl(): string {
  if (process.env.E2E_BASE_URL) return process.env.E2E_BASE_URL;
  const feature = path.basename(process.cwd());
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const stateFile = path.join(dir, ".worktree-state.json");
    if (fs.existsSync(stateFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(stateFile, "utf8")) as Record<string, { clientPort?: number }>;
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

const BASE_URL = resolveBaseUrl();
```

Phần còn lại của file giữ nguyên (`use.baseURL = BASE_URL` đã có ở dòng `baseURL: BASE_URL`).

- [ ] **Step 2: Type-check + lint file đã sửa**

Run (trong client worktree):
```bash
cd client/.worktrees/worktree-e2e-runner
npx tsc --noEmit -p tsconfig.json 2>&1 | grep playwright.config || echo "tsc: no errors in playwright.config"
npx eslint playwright.config.ts
```
Expected: không có lỗi ở `playwright.config.ts`. (Repo-wide lint/tsc có thể nhiễu từ `.worktrees` — chỉ quan tâm file vừa sửa, xem `reference_worktrees_lint_noise`.)

- [ ] **Step 3: Stage**

```bash
git -C client add .worktrees/worktree-e2e-runner/playwright.config.ts
```

---

### Task 8: Manual smoke — `up → yarn e2e → down` trên worktree thật

**Files:** không sửa code; chạy verify thật (chốt phần spawn/health/kill/junction/env mà unit test không phủ).

> Tiền đề: feature dùng để smoke nên là feature đã có cả `server/.worktrees/<f>` và `client/.worktrees/<f>` + có suite E2E. Nếu chưa có, tạo worktree throwaway cho 1 feature E2E đã tồn tại (vd dùng chính `worktree-e2e-runner` chỉ có client → smoke nhánh client-only), hoặc smoke từng nhánh combos.

- [ ] **Step 1: Chạy `up`**

```bash
cd /d/Learn/web-app-store-server-client
node .claude/.worktrees/worktree-e2e-runner/scripts/worktree.mjs up <smoke-feature> --root=$(pwd)
```
Expected: in `[server] healthy on :51xx` (nếu có server wt), `[client] healthy on :31xx`, dòng `✅ up`. Kiểm tra `cat .worktree-state.json` có entry feature; `cat client/.worktrees/<smoke-feature>/.env.local` thấy `API_SERVER_URL=http://localhost:51xx` (nếu có server wt).

- [ ] **Step 2: Chạy E2E target port worktree**

```bash
cd client/.worktrees/<smoke-feature> && yarn e2e --project=chromium 2>&1 | tail -20
```
Expected: Playwright dùng `http://localhost:31xx` (không phải :3000); test chạy (pass/fail theo feature — điểm cần verify là nó nối đúng app worktree).

- [ ] **Step 3: Chạy `down`**

```bash
cd /d/Learn/web-app-store-server-client
node .claude/.worktrees/worktree-e2e-runner/scripts/worktree.mjs down <smoke-feature> --root=$(pwd)
```
Expected: `[stop] killed pids ...`, `[clean] removed ...`, `✅ down`.

- [ ] **Step 4: Verify cleanup**

```bash
test -f client/.worktrees/<smoke-feature>/.env.local && echo "FAIL: env still present" || echo "OK: client env removed"
node -e "console.log(require('./.worktree-state.json')['<smoke-feature>'] ?? 'OK: state entry removed')"
# port đã nhả:
node -e "const net=require('net');const s=net.createServer();s.on('error',()=>{console.log('FAIL: port busy')});s.listen(31XX,'127.0.0.1',()=>{console.log('OK: client port freed');s.close()})"
```
Expected: env removed, state entry removed, port freed. Không còn process `next`/`node` của worktree.

- [ ] **Step 5: (nếu smoke có start) Teardown đúng port mình bật** — đã do `down` lo; xác nhận `git -C client status` và `git -C server status` không thấy `.env`/`.env.local` (gitignored + đã xóa).

---

### Task 9: Commit gate (CLAUDE.md §7) + commit per-repo

> KHÔNG commit ở các task trên — chỉ stage. Tới đây toàn bộ code đã viết xong & test pass.

- [ ] **Step 1: Trình diff tổng cho user review**

```bash
git -C .claude --no-pager diff --staged --stat
git -C client --no-pager diff --staged --stat
```
Main loop trình diff đầy đủ (`.claude` script + tests, `client` playwright.config) → **đợi user duyệt**.

- [ ] **Step 2: Sau khi user duyệt — commit per-repo**

```bash
git -C .claude commit -m "feat(worktree-e2e-runner): add up/down orchestrator for isolated worktree E2E"
git -C client commit -m "feat(worktree-e2e-runner): make playwright BASE_URL worktree-aware via .worktree-state.json"
```

- [ ] **Step 3: (docs) plan.md đã commit ở bước writing-plans** — không cần lại.

---

## Self-Review (đã chạy)

- **Spec coverage:** §3.1 orchestrator→Task 6; §3.2 free-port→Task 2; §3.3 env copy/patch/delete→Task 1 (patch) + Task 6 (copy) + Task 6 `down` (delete); §3.4 lifecycle→Task 5+6; §3.5 node_modules junction→Task 4; §3.6 state file→Task 3; §3.7 combos→Task 6 (`wt.server`/`wt.client` guards); §3.8 playwright→Task 7. §5 verify→Task 8. Tất cả requirement có task.
- **Placeholder scan:** không có TBD/TODO; mọi step code có code đầy đủ.
- **Type consistency:** tên hàm khớp xuyên suốt — `findFreePort`, `patchServerEnv`/`patchClientEnv`, `readState`/`setFeature`/`getFeature`/`removeFeature`, `resolveWorktrees`/`ensureNodeModules`, `startProcess`/`waitForHttp`/`killTree`. State shape `{serverPort, clientPort, serverPid, clientPid}` nhất quán Task 3 ↔ Task 6 ↔ Task 8. `resolveWorktrees` trả `{server?, client?}` dùng đúng ở Task 6 (`wt.server`/`wt.client`) và `down`.
