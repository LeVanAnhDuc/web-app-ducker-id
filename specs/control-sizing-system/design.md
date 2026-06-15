# Design — Unified Control Sizing System (Input + Button)

> Output của `superpowers:brainstorming`. Đầu vào cho `superpowers:writing-plans`.
> Feature: `control-sizing-system` · Branch: `refactor/control-sizing-system`
> Repos đụng tới: `client/` (code + `client/.claude/rules`), `.claude/` (design system `uiux/`), `docs/` (spec).

## 1. Bối cảnh & Vấn đề

Button trong dự án chưa đồng nhất: cùng nhiệm vụ nhưng khác size, khác vai trò lại cùng size → phân cấp thị giác mờ. Khảo sát `client/src` cho thấy nguyên nhân gốc **không phải** "button random" mà là **thiếu hệ thống chiều cao control có tên**:

1. **Thang size button bị trùng chiều cao**: `button.tsx` định nghĩa `default` = `h-10` (40px) và `lg` = `h-10` (40px) — **cùng chiều cao**, chỉ khác padding ngang. Thực chất chỉ có 2 chiều cao thật (36/40) dù có 3 tên. `CustomButton` lại mặc định `size="lg"` → gần như mọi button render 40px + chữ 16px bất kể vai trò.
2. **`h-12` (48px) là chiều cao thật của control trong form** nhưng bị hardcode rải rác qua `className="h-12"`. Lý do: `CustomInput` và `CustomSelectTrigger` đặt `h-12`, nên button trong form bị kéo theo `h-12` để khớp. Đây là quy tắc ngầm hợp lý nhưng **vô hình với hệ thống** → form mới dễ quên.
   - Anchor đã xác minh (grep `h-12` trên button): `views/Logins/Login/components/NextButton`, `views/Logins/LoginPassword/mains/PasswordStepForm`, `views/Signups/SignupInfo/components/SubmitButton`, `views/ForgotPasswords/ForgotPasswordReset/mains/ForgotPasswordResetForm`, `components/ResendButton`, `views/Logins/Login/mains/SocialAuthenButtons`.
3. **Chưa có mapping vai trò → size** → dialog confirm, toolbar, table-row, card CTA mỗi nơi tự đoán (lẫn `lg`/`sm`/`icon-sm`).
4. **48px là chiều cao "đậm"** cho một app dashboard/admin desktop. Quyết định của user: thiết kế lại chiều cao control chuẩn cho cả web về mức lý tưởng, thay vì để button bị dẫn dắt bởi input 48px.

### Hiện trạng cụ thể đã xác minh

`client/src/components/ui/button.tsx` (shadcn, immutable):

| size | height | padding-x |
| --- | --- | --- |
| `sm` | h-9 (36px) | px-3 |
| `default` | h-10 (40px) | px-4 |
| `lg` | **h-10 (40px)** | px-6 |
| `icon-sm` | size-9 (36²) | — |
| `icon` / `icon-lg` | size-10 (40²) | — |

`client/src/dataSources/Common/index.ts` → `BUTTON_SIZE_TEXT_CLASSES`: `sm→text-xs`, `default→text-sm`, `lg→text-base`, icon→`""`.
`client/src/components/CustomButton/index.tsx`: default `size="lg"`, áp text class qua `BUTTON_SIZE_TEXT_CLASSES`.
`CustomInput` = `h-12 rounded-lg px-4`; `CustomSelectTrigger` = `!h-12 w-full`; OTP slot (`OtpInputGroup`) = `h-14 w-12 text-xl`; `ui/input.tsx` (shadcn) = `h-9`.

## 2. Phạm vi

**Đã chọn: Rule + sửa size system + refactor toàn bộ** (input + button).

Bao gồm:
- Thiết kế lại thang chiều cao control thống nhất (input + button dùng chung).
- Sửa lớp `Custom*` + `dataSources/Common` để encode thang mới (KHÔNG sửa `ui/*` shadcn — giữ re-syncable theo `client/.claude/rules/components.md`).
- Refactor toàn bộ button + input hiện có cho khớp thang + áp cây quyết định vai trò → size; thêm `aria-label` còn thiếu cho icon button.
- Tài liệu hoá rule vào design system (`.claude/uiux/`) + `client/.claude/rules/components.md`.

**Ngoài phạm vi (cố ý):**
- Chuẩn hoá variant dialog (default vs destructive) — đó là vấn đề màu/semantic, không phải size.
- Tạo component abstraction mới (`FormSubmitButton`, `DialogActions`) — có thể làm follow-up riêng.
- Thay đổi behavior/logic/API — feature này thuần cosmetic (đổi class chiều cao/cỡ chữ).

## 3. Quyết định thiết kế

### 3.1 Thang chiều cao control thống nhất (input & button dùng chung 3 tier)

| tier | chiều cao | cỡ chữ | dùng cho |
| --- | --- | --- | --- |
| **compact** | 36px (`h-9`) | `text-xs` (12px) | vùng dày: table row, toolbar/filter, chip |
| **standard** | 40px (`h-10`) | `text-sm` (14px) | **form + hầu hết UI — MẶC ĐỊNH** (input = button = 40px) |
| **large** | 48px (`h-12`) | `text-base` (16px) | hiếm: hero CTA / primary cực nổi bật |

Nguyên tắc cốt lõi: **chiều cao button bám theo ngữ cảnh nó đứng cạnh** (cùng form input 40px → button 40px).

### 3.2 Button — map vào thang + đổi default

- `sm` = compact (36px / 12px)
- `default` = standard (40px / 14px) — **default MỚI của `CustomButton`** (đổi từ `lg`)
- `lg` = large (48px / 16px)
- `icon-sm` / `icon` / `icon-lg` = 36² / 40² / 48²
- `ui/button.tsx` **giữ nguyên**; chiều cao + text của mỗi size đặt ở **lớp CustomButton** (mở rộng `BUTTON_SIZE_TEXT_CLASSES` thành map `{height + text}` per size).

> Lý do giữ `ui/button.tsx`: `client/.claude/rules/components.md` quy định `ui/*` là shadcn nguyên bản, immutable, re-sync upstream. Height override cho `lg` (h-10→h-12) đặt ở Custom layer — đúng cơ chế hiện `h-12` đang hoạt động (className thắng buttonVariants qua tailwind-merge).

### 3.3 Input — kéo từ 48px về thang chung

| Component | Hiện | Mới |
| --- | --- | --- |
| `CustomInput` | h-12 (48) | **h-10 (40)** standard |
| `CustomSelectTrigger` | !h-12 | **!h-10 (40)** |
| `CustomDateInput` trigger | — | khớp 40 + icon-sm |
| `PasswordInput` / `SearchInput` | wrap CustomInput | tự về 40 (xác minh khi refactor) |
| Toolbar filter/search input | `!h-12` / `h-12` | **40 standard** (giữ đơn giản; chỉ dùng compact 36 nếu thật sự cần dày) |
| OTP slot (`OtpInputGroup`) | h-14 w-12 (56) | **48px** (control đặc biệt gõ số — giữ lớn, không về 40) |
| `ui/input.tsx` | h-9 shadcn | **giữ nguyên** (CustomInput override) |

### 3.4 Cây quyết định vai trò → size (button — forcing function, áp theo thứ tự)

1. **Trong form (input 40px) HOẶC primary submit full-width của form/auth** → **`default` (40px)**.
   *(auth submit giờ về 40px, KHÔNG còn 48px; social auth buttons cũng 40px để khớp form)*
2. **Vùng dày — table row, toolbar, chip, action phụ trong list/card** → **`sm` (36px)**.
3. **Còn lại — dialog confirm/cancel, card CTA chính, action chính ở page header** → **`default` (40px)**.
4. **Icon-only** → pair theo tier vùng (`sm`→`icon-sm`, `default`→`icon`, `lg`→`icon-lg`) + **bắt buộc `aria-label`**.
5. **`large`/`lg` (48px)** chỉ dùng cho hero CTA / primary cực nổi bật hiếm hoi.

Giữ §5.1 design-guide: **mỗi section chỉ 1 primary action**. Size **độc lập với variant** (màu vẫn theo §5.2 design-guide).

### 3.5 Quy tắc cỡ chữ

Cỡ chữ **đi kèm size, không set rời**: `sm`=12px, `default`=14px, `lg`=16px (trong map ở Custom layer). **Cấm hardcode `text-*` hoặc `h-*` lên control** để "ép" cỡ — muốn khác thì đổi size.

## 4. Thay đổi code (component layer)

1. **`client/src/dataSources/Common/index.ts`** — mở rộng `BUTTON_SIZE_TEXT_CLASSES` (đổi tên về ý nghĩa `{height + text}`) thành map đầy đủ per size: `sm: "h-9 text-xs"`, `default: "h-10 text-sm"`, `lg: "h-12 text-base"`, `icon-sm: "size-9"`, `icon: "size-10"`, `icon-lg: "size-12"`.
2. **`client/src/components/CustomButton/index.tsx`** — đổi default `size` `lg` → `default`; áp map ở (1) (đã sẵn cơ chế cn merge).
3. **`client/src/components/CustomInput/index.tsx`** — `h-12` → `h-10`.
4. **`client/src/components/CustomSelectTrigger/index.tsx`** — `!h-12` → `!h-10`.
5. **`client/src/components/CustomDateInput`, `PasswordInput`, `SearchInput`** — verify kế thừa 40px; chỉnh chỗ nào còn ép h-12 / icon-sm khớp.
6. **`client/src/components/OtpInputGroup/index.tsx`** — `h-14 w-12` → 48px (`h-12 w-12` hoặc tương đương), giữ readable.
7. **`ui/button.tsx`, `ui/input.tsx`** — KHÔNG sửa.

## 5. Phạm vi refactor (usage layer)

Đổi default `CustomButton` `lg`→`default` khiến mọi usage **không khai báo size** tụt chữ 16→14px (chiều cao giữ 40px). Refactor duyệt **từng view**, áp cây quyết định §3.4:

- **Xoá toàn bộ `className="h-12"` / `h-12` ép trên button** (6 anchor ở §1) → thay bằng `size="default"` (hoặc `lg` nếu thật sự là hero) + bỏ override.
- **Auth flow** (Login/Signup/ForgotPassword/OTP/SocialAuth): control (input + button) về 40px standard.
- **Admin tables/toolbars**: button row-action + toolbar → `sm` (36px); icon menu trigger → `icon-sm`.
- **Dialog**: confirm/cancel → `default` (40px).
- **Card CTA / page-header action**: theo cây quyết định.
- **Icon button thiếu `aria-label`** → bổ sung (vd `CustomDateInput` calendar trigger, `PasswordInput` toggle, `StringListField` remove…); aria string qua i18n (en + vi).

> Danh sách file đầy đủ sẽ do `writing-plans` enumerate bằng **grep audit tươi** (`<CustomButton`, `size=`, `className="h-12"`, `from "@/components/ui/button"`) tại thời điểm plan — KHÔNG bake danh sách có thể stale vào design này.

## 6. Tài liệu hoá (để tái sử dụng)

- **`.claude/uiux/frontend-reference.md`** (repo `.claude/`):
  - §5 Spacing — cập nhật bảng control height (Button default/sm/lg + Input).
  - §6 Button — bảng Sizes mới (height + text per size) + ghi default CustomButton = `default`.
  - §8 Input — `CustomInput` h-10, `CustomSelectTrigger` !h-10, OTP 48.
- **`.claude/uiux/design-guide.md`** (repo `.claude/`): thêm **§5.5 "Chọn size control đúng"** = cây quyết định §3.4 + thang §3.1.
- **`client/.claude/rules/components.md`** (repo `client/`): thêm subsection ngắn "Control sizing convention" trỏ về design system (thang 36/40/48 + cây quyết định + cấm hardcode h-*/text-* trên control).

## 7. Reuse / Contract notes

- **FE-only**: không đụng `server/`, không đổi API contract, không đổi type/DTO. Không có mapping BE↔FE cần kiểm.
- **Reuse**: dùng lại cơ chế `BUTTON_SIZE_TEXT_CLASSES` + cn/tailwind-merge có sẵn (mở rộng, không tạo mới). Không thêm dependency.
- **Không đổi schema/seed/env** → §5 step 3.1 / 3.2 N/A.

## 8. Ghi chú quy trình (cho writing-plans & các step sau)

- **E2E + `## E2E Scenario Matrix`: SKIP** — thay đổi thuần cosmetic (đổi class chiều cao/cỡ chữ control), KHÔNG thêm/đổi behavior user quan sát/tương tác được (không field/flow/validation/API mới). Đúng tiêu chí SKIP §4.3. → Không tạo `e2e.md`, không chạy dual-gate.
- **Pencil mock (step 1.5): SKIP** — không có layout/flow MỚI; chỉ resize control toàn cục. Thay vào đó: trong/sau refactor sẽ **chụp screenshot trang thật trước/sau** để user duyệt thị giác (auth, một admin table, một dialog).
- **Security review (4.5): SKIP** — không đụng auth logic / input-handling / data nhạy cảm / attack surface; thuần styling.
- **CLAUDE.md drift audit (4.6)**: chạm `client/.claude/rules` + `.claude/uiux` → audit `client/.claude/CLAUDE.md` (nhẹ; chủ yếu là cập nhật rule, không đổi command/struct/deps). Root `.claude/CLAUDE.md` không đổi methodology → không audit.
- **Green checks (4.7)**: FE → `cd client && yarn lint && yarn build` phải xanh.
- **README (4.8): SKIP** — không đổi setup/config/env/deps/cách chạy.
- **Worktree**: đã tạo `refactor/control-sizing-system` ở `client/`, `docs/`, `.claude/` (tách từ `origin/main`).
- **PR (step 5)**: per-repo — `client/` (code + rules), `.claude/` (uiux), `docs/` (spec). 3 PR riêng.
- **Lint trong worktree**: lưu ý `.worktrees/` gây nhiễu `yarn lint`/`tsc` repo-wide nếu chưa ignore; lint scope file đụng tới hoặc xử lý theo [[reference_worktrees_lint_noise]].

## 9. Tiêu chí hoàn thành

- Thang control 36/40/48 được encode ở Custom layer; `ui/*` không đổi.
- `CustomButton` default = `default`; không còn `className="h-12"`/`h-*`/`text-*` ép trên button/input bất kỳ.
- Input form = 40px (CustomInput, CustomSelectTrigger), OTP = 48px.
- Mọi button hiện có gán size đúng theo cây quyết định §3.4; icon button có `aria-label`.
- Design system (`frontend-reference.md` §5/§6/§8, `design-guide.md` §5.5) + `components.md` cập nhật khớp.
- `cd client && yarn lint && yarn build` xanh; screenshot trước/sau được user duyệt.
