# fixtures/

**Trả lời câu hỏi:** test **nhận sẵn** những gì khi bắt đầu?

Fixture là công thức Playwright tự gọi khi test ghi tên nó trong `async ({ ... })`: chuẩn bị trước test, đưa giá trị
qua `use(...)`, dọn dẹp sau test (code sau `await use(...)`). `.extend` chỉ ghi thêm công thức; giá trị chỉ được tạo
khi test xin, mỗi test một bản.

```
@playwright/test ─.extend─► core ─.extend─► sessions ─┬─.extend─► accounts ─┐
                                                      └─.extend─► api ──────┼─ mergeTests ─► index.ts ─► spec
                                 ─.extend─► pages ──────────────────────────┘
```

| File                  | Đưa cho test                                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `core.fixture.ts`     | `env` (scope worker), `urls`, `keepRateLimits` (option), xoá rate-limit counter trước mỗi test (`auto`)                                   |
| `sessions.fixture.ts` | `role` (option: `user` / `admin` / `guest`) → `storageState`; `userPage` / `adminPage` / `guestPage`; `userApi` / `adminApi` / `guestApi` |
| `accounts.fixture.ts` | `account` — thông tin đăng nhập của role đã khai (chỉ đọc)                                                                                |
| `api.fixture.ts`      | `api` (client REST trên `request` của test), `newApi()` (phiên ẩn danh mới, tự dispose), `ops` (endpoint vận hành trên API origin)        |
| `pages.fixture.ts`    | page object, mỗi trang một fixture                                                                                                        |
| `index.ts`            | gộp tất cả bằng `mergeTests`, export `test`, `expect`                                                                                     |

## Quy tắc

- Một file một mối quan tâm, tên `<concern>.fixture.ts`, kế thừa fixture nó thật sự cần. Xong thì thêm vào
  `mergeTests` trong `index.ts`.
- Spec import `test`, `expect` từ `@/fixtures`, không import file fixture lẻ.
- Fixture mở tài nguyên (request context, page phụ) **phải dọn** sau `use(...)`. Dọn lỗi thì nuốt lỗi
  (`.catch(() => undefined)`), đừng để teardown che kết quả test.
- Test cần chọn biến thể lúc chạy → fixture đưa ra **hàm** (factory), vd `newApi()`.
- Giá trị không đổi suốt lượt chạy → `{ scope: "worker" }`.
- `storageState` là built-in duy nhất được override (role quyết định nó). Không override `page`, `request`…
- Fixture chỉ **một file spec** dùng thì khai báo cục bộ trong spec (`test.extend` đầu file), không đưa vào đây.
- Phiên mở trong `beforeAll` (fixture theo test không dùng được) → `apiAs()` từ `@/api/session`, tự dispose trong `afterAll`.
