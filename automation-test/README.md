# web-app-ducker-id-automation-test

Bộ regression E2E Playwright cho **Ducker ID**: test UI trên trình duyệt thật và test API qua HTTP, cả hai chạy với stack
thật (client Next.js, API Express, MongoDB, Redis) trên một database seed riêng. Chỉ chạy **khi bạn gọi** — không gắn
vào CI hay commit. Unit test của server nằm cạnh code (`cd server && pnpm test`).

Quy ước đầy đủ (cấu trúc, phân lớp, tag, format, luật cứng): `CLAUDE.md`. Mỗi thư mục trong `src/` có `README.md` riêng.

## Bắt đầu

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
cp .env.example .env          # chỉ override: cổng 3600/5600, DB_NAME=ducker-id-e2e
pnpm test:unit                # config đọc được từ client + server
pnpm test:smoke               # cần stack e2e đang chạy — src/docs/test-plan.md §1
```

URL, API prefix, Redis, MongoDB và tài khoản seed **không khai ở đây**: suite đọc từ `client/.env(.local)`,
`server/.env` (hoặc `.env.example` của chúng) và seeder `server/src/database/seeders/data/users.ts`.

Viết test cho một module: mở Claude Code trong thư mục này rồi gõ `/write-tests <module>`.

## Bố cục

```
src/docs/       requirements/<module>.md (REQ-*), decisions/<module>.md, traceability-matrix.md (sinh tự động),
                test-strategy, test-plan, test-design-techniques, test-data, runs/
src/test-cases/ <module>.md (TC-*)
src/defects/    <module>.md (BUG-*, đang mở / đã sửa)
src/config/ utils/ data/ api/ components/ pages/ fixtures/    code test, phân lớp theo CLAUDE.md
src/tests/      e2e/<module>/*.e2e.ts · api/<module>/*.api.ts · setup/ · seed.spec.ts
```

## Viết một test

```ts
import { test, expect } from "@/fixtures";

test.use({ role: "guest" });

test(
  "a wrong password and an unknown email get the same answer",
  { tag: ["@TC-AUTH-027"] },
  async ({ newApi }) => {
    const api = await newApi();
    const res = await api.auth.login("nobody@e2e.example.com", "Wrong@1234");
    expect(res.status()).toBe(401);
  }
);
```

Mỗi test gắn mã test case nó chứng minh; `pnpm coverage:check` kiểm REQ ↔ TC ↔ spec ↔ bug và `@smoke` ⇔ P0.

| Lệnh                               | Chạy gì                        |
| ---------------------------------- | ------------------------------ |
| `pnpm test`                        | session → e2e + api → teardown |
| `pnpm test:smoke`                  | chỉ `@smoke` (mọi case P0)     |
| `pnpm test:e2e` / `pnpm test:api`  | một tầng                       |
| `pnpm test src/tests/e2e/<module>` | một module                     |
| `pnpm test -g "@TC-AUTH-014"`      | một test case                  |
| `pnpm test:unit`                   | unit test `config/`, `utils/`  |
| `pnpm coverage:check [--write]`    | truy vết, sinh lại matrix      |
| `pnpm typecheck` / `pnpm report`   | TypeScript / HTML report       |
