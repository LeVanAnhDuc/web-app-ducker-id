# config/

**Trả lời câu hỏi:** test đang chạy với URL nào, API prefix nào, Redis/Mongo nào, bằng tài khoản nào?

| File            | Nội dung                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `env.ts`        | Tra key theo lớp: `process.env` → `automation-test/.env` → `client/.env(.local)` / `server/.env` → `.env.example` của chúng. `resolveEnv` (chỉ `dev`), `requireVar` |
| `urls.ts`       | `webUrl` (baseURL), `apiUrl` (origin Express), `apiPrefix` — từ client `NEXT_PUBLIC_SITE_URL` / `API_SERVER_URL` / `NEXT_PUBLIC_API_PREFIX`, `.worktree-state.json` |
| `accounts.ts`   | Tài khoản seed `USER` / `ADMIN`, parse từ `server/src/database/seeders/data/users.ts` (override `E2E_USER_*`)                                                       |
| `datastores.ts` | `REDIS_URL`, `MONGO_URL`, `MONGO_DB_NAME` — từ server `REDIS_URL` / `DB_URL` / `DB_NAME`                                                                            |
| `auth-state.ts` | Đường dẫn `.auth/{user,admin}.json` setup ghi và fixture role đọc                                                                                                   |
| `env-guard.ts`  | `buildGrepInvert`: lọc `@e2e-full` ngoài `pnpm test:full`                                                                                                           |
| `*.test.ts`     | Unit test, chạy bằng `pnpm test:unit`                                                                                                                               |

**Được đặt ở đây:** mọi thứ phụ thuộc môi trường hoặc file `.env`. Giá trị app đã khai (URL, prefix, datastore, tài
khoản seed) **đọc từ client/server**, không khai lại. `automation-test/.env` chỉ override cho stack e2e.
**Không đặt ở đây:** tiện ích không phụ thuộc môi trường (→ `utils/`), hằng số dữ liệu test (→ `data/`).

**Import được:** chỉ file trong `config/` (đường dẫn tương đối `./env`). `playwright.config.ts` import file ở đây nên
chúng phải là hàm/hằng thuần, không dùng fixture.

`server/.env` trỏ vào dữ liệu thật: luôn override `DB_NAME` (vd `ducker-id-e2e`). **Không ghi secret vào file nào ngoài `.env`.**
