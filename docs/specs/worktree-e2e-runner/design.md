# Design — Worktree E2E Runner (`worktree:up` / `worktree:down`)

> **Status:** approved design (brainstorming output) — đầu vào cho `superpowers:writing-plans`.
> **Branch:** `feat/worktree-e2e-runner` (repos: `docs/`, `.claude/`, `client/`).

## 1. Vấn đề

Khi chạy E2E cho một feature trong git worktree, source không chạy được trọn vẹn:

1. **Thiếu env** — `server/.env` và `client/.env.local` bị gitignore (`server/.gitignore: .env`, `client/.gitignore: .env*`) nên worktree mới checkout ra **không có** env → BE login 500 (Redis/DB về default thay vì cloud), FE proxy sai.
2. **Đụng port giữa các cửa sổ** — main checkout đã giữ BE `:5000` / FE `:3000`. Worktree chạy `yarn dev` mặc định sẽ đụng port của main hoặc của worktree-window khác đang mở song song.
3. **Cleanup env thủ công, dễ quên** — sau khi chạy xong phải xóa env copy, tuyệt đối không commit lên.

Mục tiêu: **một câu lệnh** dựng worktree chạy được độc lập (port riêng, không đụng cửa sổ khác), và **một câu lệnh** dọn sạch (tắt server + xóa env copy).

## 2. Phạm vi (scope)

**Trong scope:** cấp port không-đụng per-worktree + copy/patch/cleanup env + start/stop BE & FE + làm worktree chạy được (node_modules) + playwright auto-target đúng port.

**Ngoài scope (known limitation — ghi rõ trong doc):**

- **Shared cloud DB/Redis** — mọi worktree-window + main dùng chung cloud Mongo & Redis (env copy nguyên si DB_URL/REDIS_URL). Chạy E2E **song song** nhiều cửa sổ có thể contaminate data/session (vd suite change-password revoke refresh token làm session cửa sổ khác rớt — xem `reference_e2e_suite_session_contamination`). Không cô lập DB/Redis trong design này.
- **Cookie không scope theo port** — cookie `localhost` không phân biệt port, nên 2 FE window thật trên 2 port vẫn share refresh cookie (chỉ ảnh hưởng manual browser; Playwright dùng context cô lập nên gate E2E không bị).

## 3. Thành phần

### 3.1 Orchestrator script

- **Vị trí:** `.claude/scripts/worktree.mjs` — version-controlled trong repo `.claude` (claude-architecture), đúng tầng orchestration monorepo (cùng tầng với rule worktree §6 của CLAUDE.md).
- **Zero dependency:** chỉ dùng `node:net`, `node:fs`, `node:child_process`, `node:path` (không cần `yarn install` để chạy chính nó).
- **Invocation** (chạy từ monorepo root `D:\Learn\web-app-store-server-client`):
  ```bash
  node .claude/scripts/worktree.mjs up   <feature>
  node .claude/scripts/worktree.mjs down <feature>
  ```
- **Discovery:** từ `<feature>`, script tìm `server/.worktrees/<feature>/` và `client/.worktrees/<feature>/`. Chỉ start side nào **có worktree tương ứng** (xem §3.7 combos).

### 3.2 Cấp port — free-port scan

Lúc `up`, script probe (bind socket thật) để tìm cặp port **đang rảnh thật sự** — bắt được cả process ngoài dự án đang giữ port, không chỉ các window của ta:

- **Server**: scan từ `5100` tăng dần (step 2).
- **Client**: scan từ `3100` tăng dần (step 2).
- Tránh port của main (BE `:5000`, FE `:3000`).
- Cặp port + PID ghi vào file state gitignored (§3.6) → `down`, và `yarn e2e` standalone, đọc lại được.

> Đánh đổi đã chấp nhận: port **có thể đổi** giữa các lần `up` (không deterministic). Bù lại: **đảm bảo tuyệt đối không đụng** bất kỳ process nào đang giữ port.

### 3.3 Env — copy từ main → patch → xóa

`up` copy env của **main checkout** vào worktree rồi patch **chỉ các key gắn với port**; mọi key khác (cloud DB/Redis, JWT, email) copy nguyên si.

| File (trong worktree)               | Copy từ              | Key được patch                                                                                                              |
| ----------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `server/.worktrees/<f>/.env`        | `server/.env`        | `APP_PORT` → `<serverPort>` · `CLIENT_URL` → `http://localhost:<clientPort>` · `CORS_ORIGINS` → đảm bảo chứa origin client   |
| `client/.worktrees/<f>/.env.local`  | `client/.env.local`  | `API_SERVER_URL` → `http://localhost:<serverPort>` **(chỉ patch nếu CÓ server worktree; không thì giữ giá trị main → proxy về main BE)** |

- **Port FE không nằm trong env** → truyền qua CLI `next dev --port <clientPort>`.
- **Cleanup 2 tầng:** (1) gitignore chặn commit (sẵn có); (2) `down` **xóa** `.env` / `.env.local` copy + file state.

### 3.4 Vòng đời process

- `up` spawn **detached** BE + FE, poll HTTP từng port đến khi server phản hồi (≤60s, coi mọi HTTP status < 600 là "đã sống"; không có health route riêng nên không phụ thuộc route cụ thể), ghi PID, in cặp port ra stdout, rồi **exit** — để server tiếp tục chạy nền cho agent chạy gate A (`yarn e2e`) + gate B (MCP walk).
- **FE chạy `next dev --port <p>` (webpack), KHÔNG `--turbopack`** — turbopack crash khi node_modules là junction tới main (xem `reference_worktree_node_modules_junction`). Script bypass package-script `dev` để gọi trực tiếp.
- `down` kill cây process theo PID (`taskkill /PID <pid> /T /F` trên win32), xóa env copy + file state, báo kết quả.

### 3.5 Tiền đề chạy được (auto-handle bởi `up`)

- **node_modules:** nếu worktree thiếu → tạo Windows junction tới `node_modules` của main (`mklink /J`, đúng practice hiện tại). Có sẵn thì bỏ qua. Đây là phần **duy nhất** vượt ngoài "port + env" — đưa vào vì không có nó worktree không chạy nổi.

### 3.6 File state

- `.worktree-state.json` tại **monorepo root**, gitignored, key theo `<feature>`:
  ```json
  { "<feature>": { "serverPort": 5102, "clientPort": 3100, "serverPid": 12345, "clientPid": 12346 } }
  ```
- Dùng cho: `down` (biết kill PID nào, xóa env nào) và playwright (§3.8).

### 3.7 Tổ hợp side (combos)

- **Cả 2 worktree** (cross-stack thường gặp) → start cả 2, wire vào nhau.
- **Chỉ client** → start FE, proxy về main BE (giữ `API_SERVER_URL` của main — main BE phải đang chạy).
- **Chỉ server** → start BE only.

### 3.8 Sửa `client/playwright.config.ts`

`BASE_URL` thành worktree-aware:

```
process.env.E2E_BASE_URL ?? (<clientPort> đọc từ .worktree-state.json theo feature) ?? "http://localhost:3000"
```

→ `yarn e2e` trong worktree tự target đúng port FE, không cần flag. (Thay đổi config FE nhỏ, commit; **không đổi behavior user-facing** → không cần E2E Scenario Matrix.)

## 4. Vì sao không cần E2E Scenario Matrix

Theo CLAUDE.md §4.3, E2E/matrix chỉ chạy khi thay đổi **behavior user thấy/tương tác được**. Đây là tooling/infra (script + 1 config dev) — không thêm/đổi màn hình, field, API contract FE tiêu thụ → **skip** matrix. Việc verify chính script nằm ở §5.

## 5. Cách verify chính script

- **Unit test** phần thuần (không I/O mạng/disk thật): hàm scan free-port, hàm transform patch-env (in → out), đọc/ghi state.
- **Manual smoke** một lần trên worktree thật: `up <feature>` → thấy cặp port + BE/FE healthy → `cd client/.worktrees/<feature> && yarn e2e` chạy được → `down <feature>` → env copy + state đã xóa, process đã tắt, port nhả ra.

## 6. Quyết định đã chốt (từ brainstorm)

1. **Shape:** orchestrator 1 cặp lệnh `up`/`down` (không phải composable scripts rời).
2. **Port:** free-port scan lúc up (không deterministic-hash) — ưu tiên đảm bảo không đụng.
3. **DB/Redis scope:** chỉ port + env; DB/Redis shared = known limitation, không cô lập.
4. **Home:** `.claude/scripts/worktree.mjs`, gọi qua `node .claude/scripts/worktree.mjs <up|down> <feature>`.
5. **node_modules junction:** giữ (auto-handle trong `up`).
6. **Patch `playwright.config.ts`:** chấp nhận.
