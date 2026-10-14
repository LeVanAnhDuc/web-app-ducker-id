# pages/

**Trả lời câu hỏi:** trên màn hình này, phần tử nằm ở đâu và người dùng làm được gì?

```
pages/
├── base.page.ts            BasePage: component có ở mọi màn hình (header, toast…)
└── <area>/<name>.page.ts   vd auth/login.page.ts → class LoginPage extends BasePage
```

`<area>` theo nhóm route của client (`client/src/app/[locale]/(public|private)/…` → `auth`, `admin`, `account`…).

## Quy tắc

- Một class mỗi trang: `<Name>Page` trong `kebab-case.page.ts`, kế thừa `BasePage`, constructor nhận `Page`.
- Locator là **method trả `Locator`** (lazy): `emailInput() { return this.page.getByLabel("Email"); }`.
- Hành động người dùng là method: `goto()`, `submitEmail(email)`. `goto()` dùng đường dẫn tương đối (baseURL đã đặt).
  Trang tiếng Việt: `/vi/...` (next-intl `as-needed`).
- **Không assertion nghiệp vụ** (`expect` kiểm kết quả thuộc về spec). Được chờ trạng thái sẵn sàng của chính nó:
  heading hiện trong `goto()`, `waitForURL` / `waitForResponse` sau submit.
- Selector ưu tiên `getByRole` / `getByLabel` / `getByText`, tên lấy từ `copy` khi có. Không dùng CSS class của
  shadcn/Tailwind; `data-slot` / `data-testid` chỉ khi markup không cho gì tốt hơn.
- Dialog/sheet chỉ thuộc một trang → class con trong cùng file. Dùng ở nhiều trang → `components/`.
- Page object mới → thêm fixture vào `fixtures/pages.fixture.ts`. Role thứ hai → `new XxxPage(adminPage)` trong spec.

**Import được:** `components/`, `data/`, `@playwright/test`. Không import `api/`, `fixtures/`, `tests/`.
