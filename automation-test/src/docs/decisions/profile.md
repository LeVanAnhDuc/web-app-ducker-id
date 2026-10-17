# PROFILE — quyết định

## Nguồn

Đọc ngày 2026-10-10.

Client:

- `client/src/views/Profile/**` (ProfileCard, PersonalInfoForm và các component trường của nó,
  ProfileFormSyncEffect)
- `client/src/components/CustomDateInput`
- rule zod trong `client/src/forms/UpdatePersonalInfo/validations.ts`
- `mapProfileToFormValues` / `getDateOfBirthBounds` trong `client/src/utils`
- copy trong `client/src/locales/{en,vi}/{account,common,dashboard}.json`

Server:

- `server/src/modules/user/**` (`GET/PATCH /users/me`, `MyProfileDto`)
- rule Joi trong `server/src/validators/schemas/user.ts` (`updateProfileSchema`) và `base.ts` (biên ngày sinh
  khi sign-up)

Bổ sung ngày 2026-10-14 (`/write-tests profile`, chạy tự động — user không có mặt):

- `README.md` → `## Features` ("Your profile") và mục "Not built yet" (stat badge, Danger Zone, avatar)
- `docs/project-goals.md` §G3 và bảng §6.1 (`GET/PATCH /users/me`, `POST /users/me/avatar`, `GET /users/:id` ✅)
- `docs/unfinished-features.md` §3 (stat badge mock)
- `server/src/modules/user/user.routes.ts`, `dtos/public-profile.dto.ts`, `services/get-public-profile.ts`,
  `services/update-my-profile.ts`
- `server/src/middlewares/common/rate-limiter.middleware.ts` (`updateProfileByIp`),
  `server/src/constants/redis/rate-limit/index.ts` (`USER.UPDATE_PROFILE`), `server/src/middlewares/pipes/validation.pipe.ts`
- `server/src/validators/constants.ts` (`SAFE_FULLNAME_PATTERN`), `server/src/i18n/locales/{en,vi}/{user,common}.json`
- `client/src/components/FormFieldMessage`, `client/src/libs/query-client.ts`,
  `client/src/views/Profile/ghosts/ProfileFormSyncEffect`

Test case của `REQ-PROFILE-01` … `REQ-PROFILE-02` (trước đây ở `docs/requirements.md`). Chuyển từ
`docs/specs/profile-account-merge/e2e.md` (dòng 1, 2, 8, 9, F1, F2 → TC-PROFILE-001 … -006) và
`docs/specs/account-settings-cleanup/e2e.md` (#1, #2, #9, F1, F2 → gộp vào TC-PROFILE-001 / -003 / -004 và
TC-PROFILE-007). `docs/specs/profile-trim/` chỉ đổi những section nào phải vắng mặt — phần đó thuộc
TC-PROFILE-001.

## Quyết định chốt

Không có quyết định qua hỏi đáp; các mục dưới suy ra từ header cũ, kỳ vọng còn lại lấy từ code và README tại
thời điểm viết.

- **Q1** Một ngày sinh đã được sign-up chấp nhận thì hồ sơ có phải chấp nhận lại không? → Có: sign-up và hồ sơ
  phải dùng chung một khoảng tuổi. Hiện sign-up cho 120 năm còn hồ sơ chỉ 100 năm, nên TC-PROFILE-017 và
  TC-PROFILE-040 được đánh dấu `test.fail` (BUG-PROFILE-01). → REQ-PROFILE-02
- **Q2** Rule từng trường chứng minh ở tầng nào? → Biên và tổ hợp input ở tầng `api` (TC-PROFILE-033 … -037);
  tầng `e2e` kiểm thông báo của form và luồng lưu. → REQ-PROFILE-02

- **Q3** (tự quyết 2026-10-14, cần user duyệt): `GET /users/:id` (công khai, không cần token) có phải hành vi mong
  muốn không, và được lộ những trường nào? → Có: `docs/project-goals.md` §6.1 ghi endpoint là "✅ có"; chỉ được trả
  đúng `PublicProfileDto` (`_id`, `fullName`, `avatar`, `gender`) — mọi trường liên lạc / định danh khác là rò dữ liệu.
  → REQ-PROFILE-03 (TC-PROFILE-041, -042)
- **Q4** (tự quyết 2026-10-14, cần user duyệt): giới hạn 10 PATCH / 15 phút / IP chỉ thấy trong code — mong muốn hay
  vô tình? → Mong muốn: là kiểm soát chống lạm dụng có cấu hình riêng (`USER.UPDATE_PROFILE`) và message riêng
  (`user:errors.rateLimitExceeded`). → REQ-PROFILE-04 (TC-PROFILE-043)
- **Q5** (tự quyết 2026-10-14, cần user duyệt): họ tên chỉ toàn khoảng trắng (`"   "`) có được chấp nhận không? →
  Không: "có kiểm tra hợp lệ" của REQ-PROFILE-02 không thể cho lưu một tên trống; schema hiện không trim và pattern
  cho phép `\s` nên app đang nhận → BUG-PROFILE-05. → REQ-PROFILE-02 (TC-PROFILE-045)
- **Q6** (tự quyết 2026-10-14, cần user duyệt): First Name quá 50 ký tự (rule chỉ có ở client) phải hiện gì? → Một
  thông báo đọc được, như mọi trường khác; hiện là key thô "maxLength" — cùng nguyên nhân với "required" nên gộp vào
  BUG-PROFILE-04 thay vì mở bug mới. → REQ-PROFILE-02 (TC-PROFILE-049)
- **Q7** (tự quyết 2026-10-14, cần user duyệt): First Name có chữ số (client cho qua, server chặn) — toast chung
  "Validation failed" của server có chấp nhận được không? → Chấp nhận như hành vi hiện tại (không ghi bug): kỳ vọng
  là không lưu gì, giữ nguyên giá trị đã sửa và báo lỗi bằng message của server. → REQ-PROFILE-02 (TC-PROFILE-050)
- **Q8** (tự quyết 2026-10-14, cần user duyệt): `PATCH /users/me` với body rỗng `{}`? → 200, hồ sơ không đổi (mọi
  trường của schema đều tuỳ chọn). → REQ-PROFILE-02 (TC-PROFILE-046)
- **Q9** (tự quyết 2026-10-14, cần user duyệt): double-click "Save Changes" được gửi mấy request? → Đúng một
  (`useSubmitGuard` + nút disable khi đang lưu). → REQ-PROFILE-02 (TC-PROFILE-047)

## Tài khoản test

- Mọi thao tác sửa chạy trên tài khoản dùng một lần (`createAccount()`, hồ sơ được đưa về trạng thái biết trước
  bằng `PATCH /users/me` trước).
- Các lần đọc user seed chỉ đọc, không sửa.
- Case 101–120 tuổi dùng `createAccount({ dateOfBirth: isoDateFromToday(-110) })`.
- `GET /users/:id` (TC-PROFILE-041) đọc `_id` của user seed qua chính `GET /users/me` của nó — chỉ đọc.
- Test rate limit (TC-PROFILE-043) dùng `keepRateLimits` và xoá `rate-limit:*` trước và sau test, vì bucket theo IP
  dùng chung cho mọi PATCH của lượt chạy.

## Dữ kiện server

Rule đang được test:

| Trường            | Client (zod)                                              | Server (Joi)                               |
| ----------------- | --------------------------------------------------------- | ------------------------------------------ |
| First / last name | mỗi trường 1–50, ghép lại thành `fullName`                | `fullName` 2–100, chữ cái, dấu cách, `-'.` |
| Phone             | ≤ 20, `[\d\s()+-]`, được để trống                         | 1–20, cùng tập ký tự                       |
| Address           | ≤ 500, chữ cái/chữ số/dấu cách `,.-'/#`                   | giống client                               |
| Date of birth     | picker 13–120 năm trước; zod ≤ hôm nay và ≥ 100 năm trước | ISO, ≤ hôm nay, ≥ 100 năm trước            |
| Gender            | male · female · other · prefer_not_to_say                 | giống client                               |

Giới hạn PATCH hồ sơ là 10 / 15 phút mỗi IP (đếm trước `authGuard`); bộ đếm được xoá trước mỗi test và không test nào
gửi quá tám lần, trừ TC-PROFILE-043 là test kiểm chính giới hạn đó.

## Ngoài phạm vi

Các dòng của ma trận cũ không có case riêng:

- profile-account-merge dòng 4 / 10 / 11 được giao cho module password (TC-PASSWORD-001 … -018).
- Dòng 3 (AuthZ), 5, 6, 7 là N/A (một trang cấp user, không có danh sách).
- Mục DEFER cũ về `aria-label` của sidebar không còn ý nghĩa — nhãn nhóm đã được expose và mọi case nav đều tìm
  phần tử theo nhãn đó.
- account-settings-cleanup F3 (guard tham chiếu chết) là kiểm tra build/grep, không phải test.
- Ba stat badge trên ProfileCard (Apps / Teams / Plan) — còn đọc `@/mocks` (`docs/unfinished-features.md` §3,
  README "Not built yet").
- Nút "Delete Account" của Danger Zone — không có handler (README "Not built yet"); chỉ kiểm section có mặt (TC-PROFILE-001).
- Upload avatar (`POST /users/me/avatar` trong `project-goals.md`) — chưa có endpoint (README "Not built yet").
- Sửa cùng lúc ở hai tab — không requirement nào nói về xung đột (lần lưu sau thắng); không viết case.
- Token sau logout gọi `/users/me` — đã phủ ở module auth / admin-users, không lặp.

## Tech debt liên quan

_(không có)_
