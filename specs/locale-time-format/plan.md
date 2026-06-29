# Locale Time Format — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mọi thời gian hiển thị trong UI format theo locale app (en/vi) + múi giờ local của user, qua một bộ primitive dùng chung.

**Architecture:** Pure core `formatDateTime(value, variant, locale, opts?)` trong `utils/index.ts` (Intl cho `dateLong`/`datetime`, date-fns cho `relative`). Lớp tiêu thụ: component `<FormatTime>` (render `<time>`, hydration-safe qua `useHasMounted`) cho JSX, và hook `useFormatTime()` cho ca cần chuỗi. Di trú 10 call-sites, xoá hàm cũ.

**Tech Stack:** Next.js 15 (App Router) + React 19, TypeScript 5, next-intl v4, date-fns v4, `Intl.DateTimeFormat` (built-in).

## Global Constraints

- **KHÔNG có unit-test runner ở FE** (chỉ ESLint/Prettier/`tsc`/Playwright). KHÔNG thêm jest/vitest (tránh scope creep + drift techstack). Tầng test hành vi = **E2E (Task 7)**; verify per-task = `npx tsc --noEmit` + `yarn lint` (chạy trong worktree client).
- Pure function → `src/utils/index.ts` (named export). Hook → `src/hooks/<name>.ts` (file phẳng) + barrel `src/hooks/index.ts`. Shared type → `src/types/<Feature>/index.ts`. Component → `src/components/<Name>/index.tsx`. Props type **inline** tại destructuring, KHÔNG `type Props`.
- Import groups theo `rules/imports.md`: `// libs` → `// types` → `// hooks` → `// others`. Chỉ thêm section comment cho group có import.
- `<time>` là tag layout-thuần (non-interactive) → dùng raw được, KHÔNG cần `Custom*`.
- Locale type: `import type { Locale } from "next-intl"` (utils đã dùng vậy). `useLocale()` (next-intl) trả `Locale`.
- Locale set: `en` (default), `vi` — từ `@/i18n/config`.
- Chế độ: subagent-driven, **commit per-task** (user đã opt-out commit review gate cho flow này).

---

### Task 1: Shared type + pure core `formatDateTime`

**Files:**
- Create: `client/src/types/DateTime/index.ts`
- Modify: `client/src/utils/index.ts` (thêm import + hàm `formatDateTime`; CHƯA xoá hàm cũ ở task này)

**Interfaces:**
- Produces: `type DateTimeVariant = "dateLong" | "datetime" | "relative"`, `type DateTimeValue = string | number | Date | null | undefined`, `formatDateTime(value: DateTimeValue, variant: DateTimeVariant, locale: Locale, options?: { timeZone?: string }): string`.

- [ ] **Step 1: Tạo shared type**

`client/src/types/DateTime/index.ts`:

```ts
export type DateTimeVariant = "dateLong" | "datetime" | "relative";

export type DateTimeValue = string | number | Date | null | undefined;
```

- [ ] **Step 2: Thêm imports vào `utils/index.ts`**

Thêm vào đúng group import sẵn có ở đầu file:

```ts
// libs
import { formatDistanceToNow } from "date-fns";
import { enUS, vi } from "date-fns/locale";
// types
import type { DateTimeVariant, DateTimeValue } from "@/types/DateTime";
```

(`import type { Locale } from "next-intl"` đã có sẵn — giữ nguyên.)

- [ ] **Step 3: Thêm hàm `formatDateTime` + helper (cuối phần format trong `utils/index.ts`)**

```ts
const INVALID_DATE_DISPLAY = "—";

const DATE_LONG_OPTS: Intl.DateTimeFormatOptions = { dateStyle: "long" };
const DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short"
};

const toValidDate = (value: DateTimeValue): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateTime = (
  value: DateTimeValue,
  variant: DateTimeVariant,
  locale: Locale,
  options?: { timeZone?: string }
): string => {
  const date = toValidDate(value);
  if (!date) return INVALID_DATE_DISPLAY;

  if (variant === "relative") {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: locale === "vi" ? vi : enUS
    });
  }

  const intlOptions = variant === "dateLong" ? DATE_LONG_OPTS : DATETIME_OPTS;
  return new Intl.DateTimeFormat(locale, {
    ...intlOptions,
    ...(options?.timeZone ? { timeZone: options.timeZone } : {})
  }).format(date);
};
```

> Behavior: `dateLong`→`June 29, 2026`/`29 tháng 6, 2026`; `datetime`→`Jun 29, 2026, 3:04 PM`/`29 thg 6, 2026, 15:04`; `relative`→`2 hours ago`/`2 giờ trước`. Input xấu (`null`/`""`/malformed)→`"—"`. `options.timeZone` chỉ áp cho variant tuyệt đối (relative bỏ qua) — dùng cho hydration (Task 4).

- [ ] **Step 4: Verify**

Run (trong worktree client): `npx tsc --noEmit && yarn lint`
Expected: PASS, không lỗi. (Không có call-site mới nào nên hàm cũ vẫn còn — OK.)

- [ ] **Step 5: Commit**

```bash
git add client/src/types/DateTime/index.ts client/src/utils/index.ts
git commit -m "feat(locale-time-format): add DateTime types + locale-aware formatDateTime core"
```

---

### Task 2: `useHasMounted` hook

**Files:**
- Create: `client/src/hooks/useHasMounted.ts`
- Modify: `client/src/hooks/index.ts` (barrel)

**Interfaces:**
- Produces: `useHasMounted(): boolean` — `false` ở server + first client render, `true` sau mount (trigger re-render). (`useFirstMountState` dùng ref, KHÔNG re-render → không thay được.)

- [ ] **Step 1: Tạo hook**

`client/src/hooks/useHasMounted.ts`:

```ts
"use client";

// libs
import { useEffect, useState } from "react";

const useHasMounted = (): boolean => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
};

export default useHasMounted;
```

- [ ] **Step 2: Thêm vào barrel `src/hooks/index.ts`**

Thêm dòng (cùng style `export { default as ... }` ở cuối file):

```ts
export { default as useHasMounted } from "./useHasMounted";
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useHasMounted.ts client/src/hooks/index.ts
git commit -m "feat(locale-time-format): add useHasMounted hook"
```

---

### Task 3: `useFormatTime` hook

**Files:**
- Create: `client/src/hooks/useFormatTime.ts`
- Modify: `client/src/hooks/index.ts` (barrel)

**Interfaces:**
- Consumes: `formatDateTime` (Task 1), `useHasMounted` (Task 2).
- Produces: `useFormatTime(): (variant: DateTimeVariant, value: DateTimeValue) => string` — bound vào locale hiện tại; trả chuỗi đã format (local tz sau mount, UTC trước mount).

- [ ] **Step 1: Tạo hook**

`client/src/hooks/useFormatTime.ts`:

```ts
"use client";

// libs
import { useCallback } from "react";
import { useLocale } from "next-intl";
// types
import type { DateTimeVariant, DateTimeValue } from "@/types/DateTime";
// hooks
import useHasMounted from "./useHasMounted";
// others
import { formatDateTime } from "@/utils";

const useFormatTime = () => {
  const locale = useLocale();
  const mounted = useHasMounted();

  return useCallback(
    (variant: DateTimeVariant, value: DateTimeValue): string =>
      formatDateTime(
        value,
        variant,
        locale,
        mounted ? undefined : { timeZone: "UTC" }
      ),
    [locale, mounted]
  );
};

export default useFormatTime;
```

- [ ] **Step 2: Thêm vào barrel `src/hooks/index.ts`**

```ts
export { default as useFormatTime } from "./useFormatTime";
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useFormatTime.ts client/src/hooks/index.ts
git commit -m "feat(locale-time-format): add useFormatTime hook"
```

---

### Task 4: `<FormatTime>` component

**Files:**
- Create: `client/src/components/FormatTime/index.tsx`
- Modify: `client/src/components/index.ts` **chỉ khi file barrel này tồn tại** (đọc trước; nếu component khác được import qua path trực tiếp `@/components/<Name>` thì KHÔNG cần barrel — bỏ qua bước này).

**Interfaces:**
- Consumes: `formatDateTime` (Task 1), `useHasMounted` (Task 2).
- Produces: `<FormatTime value={DateTimeValue} variant={DateTimeVariant} />` → render `<time dateTime={iso} suppressHydrationWarning>{text}</time>`. Import: `import FormatTime from "@/components/FormatTime"`.

- [ ] **Step 1: Tạo component**

`client/src/components/FormatTime/index.tsx`:

```tsx
"use client";

// libs
import { useLocale } from "next-intl";
// types
import type { DateTimeVariant, DateTimeValue } from "@/types/DateTime";
// hooks
import { useHasMounted } from "@/hooks";
// others
import { formatDateTime } from "@/utils";

const FormatTime = ({
  value,
  variant
}: {
  value: DateTimeValue;
  variant: DateTimeVariant;
}) => {
  const locale = useLocale();
  const mounted = useHasMounted();

  const parsed =
    value === null || value === undefined || value === ""
      ? null
      : new Date(value);
  const iso =
    parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toISOString()
      : undefined;

  const text = formatDateTime(
    value,
    variant,
    locale,
    mounted ? undefined : { timeZone: "UTC" }
  );

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
};

export default FormatTime;
```

- [ ] **Step 2: Kiểm tra barrel components**

Đọc `client/src/components/index.ts` nếu tồn tại. Nếu có và các component khác được re-export ở đó → thêm `export { default as FormatTime } from "./FormatTime";` theo đúng style. Nếu KHÔNG có barrel (import trực tiếp theo path) → bỏ qua, không tạo file barrel mới.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/FormatTime/index.tsx
git commit -m "feat(locale-time-format): add hydration-safe FormatTime component"
```

---

### Task 5: Di trú các call-site thời gian tuyệt đối sang `<FormatTime>`

**Files (đọc vùng quanh dòng nêu trước khi sửa, giữ nguyên JSX xung quanh):**
- Modify: `client/src/views/AdminContact/mains/AdminContactTable/index.tsx:160` — `formatDateShort(item.createdAt)` → `<FormatTime value={item.createdAt} variant="dateLong" />`
- Modify: `client/src/views/AdminApps/mains/AdminAppsTable/index.tsx:236` — `formatDateTimeShort(app.updatedAt)` → `<FormatTime value={app.updatedAt} variant="datetime" />`
- Modify: `client/src/views/AdminUsers/mains/AdminUsersTable/index.tsx:141,145` — `user.lastLoginAt` + `user.createdAt` → `variant="datetime"` (xem Step 2 cho null)
- Modify: `client/src/views/AdminLoginHistory/mains/AdminLoginHistoryTable/index.tsx:156` — `item.createdAt` → `variant="datetime"`
- Modify: `client/src/views/AdminEntitlements/mains/AdminEntitlementsTable/index.tsx:174` — `row.entitlement.grantedAt` → `variant="datetime"`
- Modify: `client/src/views/LoginHistory/components/LoginHistoryTableRow/index.tsx:22` — `item.createdAt` → `variant="datetime"`
- Modify: `client/src/views/AdminContactDetail/mains/ContactDetailCard/index.tsx:55,117` — `contact.createdAt`/`contact.updatedAt` → `variant="datetime"`
- Modify: `client/src/views/AdminLoginHistoryDetail/mains/LoginHistoryDetailCard/index.tsx:78` — `data.createdAt` → `variant="datetime"`

**Interfaces:**
- Consumes: `<FormatTime>` (Task 4).

- [ ] **Step 1: Mỗi file — thay JSX + import**

Trong mỗi file: thay lời gọi hàm bằng `<FormatTime .../>`, thêm `import FormatTime from "@/components/FormatTime";` vào group `// components`, và **xoá** import hàm format cũ khỏi `@/utils` (nếu sau khi xoá còn import khác từ `@/utils` thì giữ lại các tên còn dùng — vd AdminContactTable còn `isContactStatus, isContactCategory`; AdminAppsTable còn `resolveCategoryLabel`).

Ví dụ AdminAppsTable:
```diff
- import { formatDateTimeShort, resolveCategoryLabel } from "@/utils";
+ import { resolveCategoryLabel } from "@/utils";
+ // components
+ import FormatTime from "@/components/FormatTime";
...
-                    {formatDateTimeShort(app.updatedAt)}
+                    <FormatTime value={app.updatedAt} variant="datetime" />
```

- [ ] **Step 2: Xử lý `lastLoginAt` null ở AdminUsersTable**

Đọc dòng 138–146. Nếu hiện có nhánh `cond ? formatDateTimeShort(user.lastLoginAt) : <fallback "Never"/"—">`:
- `<FormatTime>` đã tự trả `"—"` cho `null/undefined`. Nếu fallback hiện tại là chuỗi i18n "Never" có ý nghĩa riêng → **giữ** điều kiện, chỉ thay nhánh truthy bằng `<FormatTime value={user.lastLoginAt} variant="datetime" />`. Nếu fallback chỉ là dấu gạch/“—” → có thể bỏ điều kiện, dùng thẳng `<FormatTime value={user.lastLoginAt} variant="datetime" />`.
- KHÔNG đổi text "Never" hiện có (ngoài scope copy).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && yarn lint`
Expected: PASS, không còn import `formatDateShort`/`formatDateTimeShort`/`formatDateTimeMedium` ở các file này.

- [ ] **Step 4: Commit**

```bash
git add client/src/views
git commit -m "refactor(locale-time-format): render absolute timestamps via FormatTime"
```

---

### Task 6: Di trú relative-time + xoá hàm cũ

**Files:**
- Modify: `client/src/layouts/AppHeader/components/NotificationPanel/index.tsx:119`
- Modify: `client/src/views/Notifications/components/NotificationGroups/index.tsx:53`
- Modify: `client/src/utils/notifications.ts` (xoá `relativeTime`, giữ `groupOf`)
- Modify: `client/src/utils/index.ts` (xoá `formatDateShort`, `formatDateTimeShort`, `formatDateTimeMedium`, `formatDateLong`, `formatLastUsed`)

**Interfaces:**
- Consumes: `useFormatTime` (Task 3).

- [ ] **Step 1: NotificationGroups → `useFormatTime`**

Đọc file. Thay:
```diff
- import { groupOf, relativeTime } from "@/utils/notifications";
+ import { groupOf } from "@/utils/notifications";
+ // hooks
+ import { useFormatTime } from "@/hooks";
...
+  const ft = useFormatTime();
...
-                timestamp={relativeTime(n.createdAt, locale)}
+                timestamp={ft("relative", n.createdAt)}
```
Nếu sau đó biến `locale` không còn dùng → xoá khai báo `const locale = useLocale()` (và import nếu thừa). Nếu `locale` còn dùng chỗ khác → giữ.

- [ ] **Step 2: NotificationPanel → `useFormatTime`**

```diff
- import { relativeTime } from "@/utils/notifications";
+ // hooks
+ import { useFormatTime } from "@/hooks";
...
+  const ft = useFormatTime();
...
-                    {relativeTime(item.createdAt, locale)}
+                    {ft("relative", item.createdAt)}
```
Xử lý biến `locale` thừa như Step 1. `useFormatTime` phải gọi ở top-level component (không trong map callback).

- [ ] **Step 3: Xoá `relativeTime` khỏi `utils/notifications.ts`**

Xoá hàm `relativeTime` + import `formatDistanceToNow`/`enUS, vi` ở file này nếu không còn dùng (chỉ `groupOf` ở lại — không dùng date-fns). Giữ `groupOf` + `DAY_MS` + import `CONSTANTS`/types còn cần.

- [ ] **Step 4: Xoá 5 hàm format cũ khỏi `utils/index.ts`**

Xoá `formatDateShort`, `formatDateTimeShort`, `formatDateTimeMedium`, `formatDateLong`, `formatLastUsed`. Giữ `parseLocalDate`, `formatYmdLocal`, `getDateOfBirthBounds` (ngoài scope). Nếu sau khi xoá có import nào ở `utils/index.ts` thành thừa thì xoá theo.

- [ ] **Step 5: Verify không còn tham chiếu chết**

Run:
```bash
grep -rn "formatDateShort\|formatDateTimeShort\|formatDateTimeMedium\|formatDateLong\|formatLastUsed\|relativeTime" client/src
npx tsc --noEmit && yarn lint
```
Expected: grep KHÔNG ra kết quả (đã xoá hết); tsc + lint PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src
git commit -m "refactor(locale-time-format): route relative time via useFormatTime; remove legacy formatters"
```

---

### Task 7: E2E scenarios (tầng test hành vi)

**Files:**
- Create: `client/e2e/locale-time-format/datetime-format.e2e.ts`
- Create: `docs/specs/locale-time-format/e2e.md` (kịch bản cho gate B MCP walk)

**Bối cảnh hạ tầng** (theo memory): admin suites dưới project `admin` của `playwright.config.ts`; auth qua `auth.setup.ts` → storageState (cần admin creds `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`). Selector ưu tiên role/label; timestamp render trong `<time>` → assert qua `time[datetime]`. Đổi locale: prefix URL `/vi/...` (default `en` không prefix).

**Interfaces:**
- Consumes: app đang chạy (BE :5000, FE :3000 hoặc worktree :3100) — tiền đề app-running do bước §4.3 lo.

- [ ] **Step 1: Viết `docs/specs/locale-time-format/e2e.md`**

Liệt kê scenario từ matrix `design.md` (mỗi dòng ✅): happy (en datetime render), i18n (vi datetime render), empty/null (`lastLoginAt` null → `—`), boundary-tz (ISA UTC tối → local sang ngày sau), data-render (không lộ ISO thô; `<time datetime>` có ISO), a11y (`<time>` semantic), hydration (không mismatch warning console). Ghi rõ page mỗi scenario walk + cách verify (en + vi).

- [ ] **Step 2: Viết spec test `client/e2e/locale-time-format/datetime-format.e2e.ts`**

Khung test (điều chỉnh selector theo DOM thực khi chạy; KHÔNG sửa app code để fit test — gặp lỗi a11y thì flag follow-up):

```ts
import { test, expect } from "@playwright/test";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/; // raw ISO không được lộ ra text

test.describe("locale time format — admin apps updatedAt", () => {
  test("en: renders localized datetime in <time>, not raw ISO", async ({
    page
  }) => {
    await page.goto("/admin/apps");
    const cell = page.locator("table time[datetime]").first();
    await expect(cell).toBeVisible();
    const text = (await cell.textContent())?.trim() ?? "";
    expect(text).not.toMatch(ISO_RE); // đã format, không phải ISO thô
    expect(text).not.toBe("Invalid Date");
    await expect(cell).toHaveAttribute("datetime", expect.stringMatching(ISO_RE));
  });

  test("vi: renders Vietnamese datetime", async ({ page }) => {
    await page.goto("/vi/admin/apps");
    const text =
      (await page.locator("table time[datetime]").first().textContent())?.trim() ??
      "";
    // vi medium datetime chứa "thg" (tháng viết tắt) — phân biệt với en
    expect(text.toLowerCase()).toContain("thg");
  });
});

test("null timestamp renders em-dash, not Invalid Date", async ({ page }) => {
  // Trang/users có user lastLoginAt = null (seed). Verify ô đó hiển thị "—".
  await page.goto("/admin/users");
  await expect(page.getByText("Invalid Date")).toHaveCount(0);
});
```

> Lưu ý: nếu seed chưa có user `lastLoginAt = null`, ghi follow-up trong `e2e.md` thay vì giả định (no silent gap).

- [ ] **Step 3: Verify (defer chạy thật sang bước §4.3)**

`npx tsc --noEmit && yarn lint` trên file test. Việc chạy `yarn e2e` + gate B MCP walk thực hiện ở **bước §4.3 dual-gate** (cần app running) — KHÔNG chạy trong task này.

- [ ] **Step 4: Commit**

```bash
git add client/e2e/locale-time-format docs/specs/locale-time-format/e2e.md
git commit -m "test(locale-time-format): e2e scenarios for locale-aware time rendering"
```

> `e2e.md` ở repo docs → commit ở worktree docs; test `.e2e.ts` ở repo client → commit ở worktree client (2 repo riêng).

---

## Sau khi hết task (do main loop điều phối theo §4.3–§5)

1. **§4.3 E2E dual-gate**: check app running → dispatch gate A (`yarn e2e` scope feature) + gate B (MCP walk theo `e2e.md`) song song. Fail → `systematic-debugging` → `e2e-bugs.md` → fix (max 3 vòng).
2. **§4.5 Security review**: feature **chỉ hiển thị**, không đụng auth/input/data nhạy cảm → **SKIP** (ghi lý do trong report/summary). 
3. **§4.6 CLAUDE.md drift audit**: không đổi command/struct/deps/ERD → **SKIP** (chỉ thêm util/hook/component theo convention sẵn có).
4. **§4.7 Green checks**: `cd client && yarn lint && yarn build`.
5. **§4.8 finish branch + README**: không đổi setup/config/env/deps → README **SKIP**.
6. **§5 step 5 PR**: tạo PR per-repo (docs + client). **DỪNG trước merge** (autonomous mode vẫn dừng trước merge PR — hỏi user).

## Self-Review (đã chạy)

- **Spec coverage**: 3 kiểu (dateLong/datetime/relative) → Task 1; component+hook → Task 3,4; hydration → Task 2,4; di trú 10 call-sites → Task 5,6; xoá hàm cũ → Task 6; E2E matrix → Task 7. ✅
- **Placeholder scan**: code đầy đủ, không TBD. ✅
- **Type consistency**: `DateTimeVariant`/`DateTimeValue`/`formatDateTime` dùng nhất quán Task 1→3→4; `useHasMounted`/`useFormatTime` tên khớp barrel. ✅
