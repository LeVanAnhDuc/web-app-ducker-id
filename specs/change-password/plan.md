# Change Password — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠️ Correction [2026-06-03] — FE nằm ở Account Settings, KHÔNG phải Security.** Các Task FE-4/FE-5/FE-6 bên dưới ghi path `views/Security/...` là **SAI** (kế thừa design cũ). Thực tế: card `views/AccountSettings/mains/ChangePasswordCard` **đã tồn tại sẵn** (mock) → wire vào BE API; hook đặt ở `views/AccountSettings/hooks/useChangePassword.ts`; i18n dùng namespace `accountSettings.changePassword` (đã có sẵn). KHÔNG đụng `views/Security`. Đọc các bước FE với thay thế `Security → AccountSettings` và "Create → wire/normalize existing".

**Goal:** Cho user đã đăng nhập đổi mật khẩu của chính mình từ **Account Settings** page; giữ phiên thiết bị hiện tại (cấp token mới), kick thiết bị khác, gửi email cảnh báo.

**Architecture:** BE module `change-password/` độc lập sau `authGuard` → verify current password → chặn same-password → `updatePassword` (set `passwordChangedAt`) → cấp token pair mới (mirror login) → fire-and-forget email alert. FE wire card có sẵn `AccountSettings/mains/ChangePasswordCard`, hook `useChangePassword` (`AccountSettings/hooks/`) cập nhật auth store với token mới. Thiết bị khác bị `PasswordNotChangedGuard` (sẵn có ở `/auth/token/refresh`) từ chối.

**Tech Stack:** BE — Node/Express + TypeScript, Joi, bcrypt, JWT, Redis rate-limit, React-Email + queue. FE — Next.js 15 / React 19, React Hook Form + Zod, TanStack Query, Zustand, next-intl, shadcn/ui.

> Spec nguồn: `docs/specs/change-password/design.md`.

---

## Decisions / Deviations từ design doc (đọc trước khi code)

1. **Response shape mirror login, KHÔNG phải `{accessToken,user}`.** Login trả `LoginTokenResponse = { accessToken, idToken, expiresIn }` (refreshToken nằm trong httpOnly cookie). Change-password trả **đúng shape đó** + set refresh cookie. FE lưu qua `useAuthStore.setTokens`. (Cập nhật §9 API Contract Sync của design.)
2. **KHÔNG ghi `login_histories`.** Design §2.6 nhắc audit qua `LoginHistoryService`, nhưng `recordSuccessfulLogin` sẽ tạo entry "login" giả trong Login Activity của user → sai ngữ nghĩa. Thay bằng `Logger.info` (structured log) + email alert là tín hiệu bảo mật user-facing. → **Cần user xác nhận deviation này.**
3. **Thêm `EmailType.PASSWORD_CHANGED`** (template + i18n) để giao email alert đã chốt.

---

## File Structure

### Backend (`server/src/`)
| File | Trách nhiệm | Create/Modify |
|---|---|---|
| `constants/error-code.ts` | 2 error code mới | Modify |
| `constants/redis/rate-limit/index.ts` | block `CHANGE_PASSWORD` | Modify |
| `middlewares/common/rate-limiter.middleware.ts` | `changePasswordByIpAndUser` | Modify |
| `validators/schemas/change-password.ts` | Joi schema | Create |
| `types/services/email.ts` | `PASSWORD_CHANGED` type + data | Modify |
| `services/email/templates/password-changed.tsx` | template | Create |
| `services/email/email.service.ts` | render + subject case | Modify |
| `services/email/email.helper.ts` (+ locales) | strings `passwordChanged` | Modify |
| `modules/change-password/types/index.ts` | request type | Create |
| `modules/change-password/guards/wrong-current-password.guard.ts` | verify current | Create |
| `modules/change-password/guards/same-password.guard.ts` | chặn new===current | Create |
| `modules/change-password/guards/index.ts` | barrel | Create |
| `modules/change-password/change-password.service.ts` | orchestrate | Create |
| `modules/change-password/change-password.controller.ts` | HTTP handler | Create |
| `modules/change-password/change-password.routes.ts` | route | Create |
| `modules/change-password/change-password.module.ts` | factory | Create |
| `modules/change-password/swagger/{paths,schemas,index}.ts` | API docs | Create |
| `loaders/modules.loader.ts` | register module | Modify |
| `libs/swagger/openapi.ts` | register swagger | Modify |
| `i18n/locales/{en,vi}/...changePassword` | messages | Modify |

### Frontend (`client/src/`)
| File | Trách nhiệm | Create/Modify |
|---|---|---|
| `constants/endpoints.ts` | `AUTH_CHANGE_PASSWORD` | Modify |
| `constants/fieldNames/ChangePassword.ts` + index | field names | Create + Modify |
| `types/ChangePassword.ts` | request/form types | Create |
| `requests/changePassword.ts` | PATCH request | Create |
| `forms/ChangePassword/{validations,data,index}.ts` | RHF + Zod | Create |
| `views/AccountSettings/hooks/useChangePassword.ts` | mutation hook | Create |
| `views/AccountSettings/mains/ChangePasswordCard/index.tsx` | card + form (đã có sẵn, mock) | Wire/Modify |
| `views/AccountSettings/index.tsx` | mount card (đã mount sẵn) | — |
| `locales/{en,vi}/common.json` | `validation.currentPassword.required` | Modify |

> **Naming consistency** (dùng xuyên suốt): BE route `PATCH /api/v1/auth/change-password`; service method `changePassword`; guards `WrongCurrentPasswordGuard.assert(currentPassword, storedHash)` + `SamePasswordGuard.assert(currentPassword, newPassword)`; FE request `changePassword(payload)`; hook `useChangePassword`; fields `currentPassword` / `newPassword` / `confirmPassword`.

---

# PART A — Backend

> Convention: đọc `server/.claude/CLAUDE.md` + skills `standard-typescript`, `module-struct`, `standard-restful-api`, `standard-jwt`, `standard-mongodb` trước khi code. Chỉ chạm `server/src/**`. Test runner: `yarn test` (jest) trong `server/`.

### Task BE-1: Error codes

**Files:** Modify `server/src/constants/error-code.ts`

- [ ] **Step 1:** Trong object `ERROR_CODES`, ngay sau group `// ── Forgot Password ──` (sau dòng `FORGOT_PASSWORD_INVALID_RESET_TOKEN`), thêm group mới:

```ts
  // ── Change Password ──
  CHANGE_PASSWORD_WRONG_CURRENT: "CHANGE_PASSWORD_WRONG_CURRENT",
  CHANGE_PASSWORD_SAME_AS_CURRENT: "CHANGE_PASSWORD_SAME_AS_CURRENT",
```

- [ ] **Step 2:** Verify build: `cd server && yarn tsc` → Expected: no new errors.
- [ ] **Step 3:** Commit: `git add server/src/constants/error-code.ts && git commit -m "feat(change-password): BE add error codes"`

---

### Task BE-2: Rate-limit config + middleware

**Files:** Modify `server/src/constants/redis/rate-limit/index.ts`, `server/src/middlewares/common/rate-limiter.middleware.ts`

- [ ] **Step 1:** Trong `RATE_LIMIT_CONFIG`, thêm key `CHANGE_PASSWORD` (cùng cấp với `FORGOT_PASSWORD`):

```ts
  CHANGE_PASSWORD: {
    PER_IP_USER: {
      KEY: "rate-limit:change-password:ip-user:",
      MAX_REQUESTS: 5,
      WINDOW_SECONDS: 900
    }
  },
```

- [ ] **Step 2:** Trong `rate-limiter.middleware.ts`: import `RequestContext`:

```ts
import { RequestContext } from "@/utils/request-context";
```

- [ ] **Step 3:** Khai báo property mới (cạnh các `public readonly ...ByIp`):

```ts
  public readonly changePasswordByIpAndUser: RateLimitRequestHandler;
```

- [ ] **Step 4:** Trong constructor, thêm (sau `this.forgotPasswordResetByIp = ...`). Key gồm IP + userId (chạy sau `authGuard` nên RequestContext đã có user):

```ts
    this.changePasswordByIpAndUser = rateLimit({
      windowMs:
        RATE_LIMIT_CONFIG.CHANGE_PASSWORD.PER_IP_USER.WINDOW_SECONDS * 1000,
      max: RATE_LIMIT_CONFIG.CHANGE_PASSWORD.PER_IP_USER.MAX_REQUESTS,
      store: this.createRedisStore(
        RATE_LIMIT_CONFIG.CHANGE_PASSWORD.PER_IP_USER.KEY
      ),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) =>
        `${req.ip ?? "unknown"}:${RequestContext.getUserId() ?? "anon"}`,
      handler: this.createRateLimitExceededHandler(
        "changePassword:errors.rateLimitExceeded"
      )
    });
```

- [ ] **Step 5:** `cd server && yarn tsc`. Expected: pass (i18n key `changePassword:errors.rateLimitExceeded` sẽ thêm ở Task BE-3).
- [ ] **Step 6:** Commit: `git add server/src/constants/redis/rate-limit/index.ts server/src/middlewares/common/rate-limiter.middleware.ts && git commit -m "feat(change-password): BE rate-limit per IP+user"`

---

### Task BE-3: i18n messages

**Files:** Modify BE locale files. Tìm file namespace forgot-password để biết vị trí: `cd server && ls src/i18n/locales/en src/i18n/locales/vi`. Tạo namespace `changePassword` song song với `forgotPassword` (cùng cấu trúc file/registration — mở `forgotPassword.json` (hoặc tương đương) làm mẫu và copy cách register vào `src/i18n/locales/{en,vi}/index.ts`).

- [ ] **Step 1:** Tạo `changePassword` namespace cho **en** với nội dung:

```json
{
  "success": { "passwordChanged": "Password changed successfully" },
  "errors": {
    "wrongCurrentPassword": "Current password is incorrect",
    "sameAsCurrent": "New password must be different from current password",
    "rateLimitExceeded": "Too many attempts. Please try again later."
  }
}
```

- [ ] **Step 2:** Tạo namespace `changePassword` cho **vi**:

```json
{
  "success": { "passwordChanged": "Đổi mật khẩu thành công" },
  "errors": {
    "wrongCurrentPassword": "Mật khẩu hiện tại không đúng",
    "sameAsCurrent": "Mật khẩu mới phải khác mật khẩu hiện tại",
    "rateLimitExceeded": "Quá nhiều lần thử. Vui lòng thử lại sau."
  }
}
```

- [ ] **Step 3:** Register `changePassword` namespace vào `src/i18n/locales/en/index.ts` và `vi/index.ts` (mirror cách `forgotPassword` được import + thêm vào resources object).
- [ ] **Step 4:** `cd server && yarn tsc`. Expected: pass (type `I18n.Key` regenerate nếu cần — chạy script gen nếu dự án có; nếu không, key string vẫn hợp lệ).
- [ ] **Step 5:** Commit: `git add server/src/i18n && git commit -m "feat(change-password): BE i18n messages"`

---

### Task BE-4: Validator schema

**Files:** Create `server/src/validators/schemas/change-password.ts`

- [ ] **Step 1:** Tạo file (reuse `passwordSchema`; `confirmPassword` ref `newPassword`):

```ts
// libs
import Joi from "joi";
// others
import { passwordSchema } from "./base";

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "changePassword:validation.currentPasswordRequired",
    "any.required": "changePassword:validation.currentPasswordRequired"
  }),
  newPassword: passwordSchema.required(),
  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref("newPassword"))
    .messages({
      "any.only": "changePassword:validation.confirmMismatch",
      "string.empty": "changePassword:validation.confirmRequired",
      "any.required": "changePassword:validation.confirmRequired"
    })
});
```

- [ ] **Step 2:** Thêm các key `validation.*` vào i18n `changePassword` (cả en + vi) — `currentPasswordRequired`, `confirmMismatch`, `confirmRequired`. (en ví dụ: "Current password is required" / "Passwords do not match" / "Please confirm your password".)
- [ ] **Step 3:** `cd server && yarn tsc`. Expected: pass.
- [ ] **Step 4:** Commit: `git add server/src/validators/schemas/change-password.ts server/src/i18n && git commit -m "feat(change-password): BE validator schema"`

---

### Task BE-5: Request type

**Files:** Create `server/src/modules/change-password/types/index.ts`

- [ ] **Step 1:**

```ts
// types
import type { Request } from "express";

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type ChangePasswordRequest = Request<
  Record<string, never>,
  unknown,
  ChangePasswordBody
>;
```

- [ ] **Step 2:** `cd server && yarn tsc`. Expected: pass.
- [ ] **Step 3:** Commit: `git add server/src/modules/change-password/types && git commit -m "feat(change-password): BE request type"`

---

### Task BE-6: PASSWORD_CHANGED email type + template

**Files:** Modify `server/src/types/services/email.ts`, `server/src/services/email/email.service.ts`, `server/src/services/email/email.helper.ts` (+ email locale strings); Create `server/src/services/email/templates/password-changed.tsx`

- [ ] **Step 1:** Trong `types/services/email.ts`: thêm enum value, data interface, và map entry:

```ts
// trong enum EmailType:
  PASSWORD_CHANGED = "PASSWORD_CHANGED"

// thêm interface:
export interface PasswordChangedData {
  changedAt: string;
  ipAddress: string;
}

// trong EmailDataMap:
  [EmailType.PASSWORD_CHANGED]: PasswordChangedData;
```

- [ ] **Step 2:** Tạo template `templates/password-changed.tsx` (mirror `forgot-password-otp.tsx`, dùng `EmailLayout` + `InfoBox`):

```tsx
// libs
import { Text } from "@react-email/components";
// types
import type { PasswordChangedData } from "@/types/services/email";
// others
import { getEmailT } from "../email.helper";
import { EmailLayout } from "./components/email-layout";
import { InfoBox } from "./components/info-box";

export const PasswordChangedEmail = (
  { changedAt, ipAddress }: PasswordChangedData,
  locale?: I18n.Locale
) => {
  const strings = getEmailT(locale);
  const { passwordChanged: s, common } = strings;

  return (
    <EmailLayout title={s.title} footerText={common.footer}>
      <Text style={paragraphStyle}>{s.greeting}</Text>
      <Text style={paragraphStyle}>
        {s.body} {changedAt} (IP: {ipAddress}).
      </Text>
      <InfoBox variant="danger">{s.warning}</InfoBox>
      <Text style={automatedStyle}>{common.automated}</Text>
    </EmailLayout>
  );
};

const paragraphStyle: React.CSSProperties = {
  margin: "0 0 15px 0",
  fontSize: "16px"
};

const automatedStyle: React.CSSProperties = {
  margin: "20px 0 0 0",
  fontSize: "13px",
  color: "#888888"
};
```

- [ ] **Step 3:** Thêm strings `passwordChanged` vào email i18n (`email.helper.ts` / email locale resource — mở `getEmailT` để biết nguồn strings, thêm `passwordChanged: { title, greeting, body, warning }` cho cả en + vi). en ví dụ: `title: "Your password was changed"`, `greeting: "Hello,"`, `body: "Your account password was changed at"`, `warning: "If you did not make this change, contact support immediately."`.
- [ ] **Step 4:** Trong `email.service.ts`: import template + data type, thêm `case` vào `renderTemplate` và `getSubject`:

```ts
// imports
import type { PasswordChangedData } from "@/types/services/email";
import { PasswordChangedEmail } from "./templates/password-changed";

// trong renderTemplate switch:
      case EmailType.PASSWORD_CHANGED:
        return render(
          PasswordChangedEmail(options.data as PasswordChangedData, locale)
        );

// trong getSubject switch:
      case EmailType.PASSWORD_CHANGED:
        return strings.passwordChanged.title;
```

- [ ] **Step 5:** `cd server && yarn tsc`. Expected: pass (exhaustive switch + EmailDataMap khớp).
- [ ] **Step 6:** Commit: `git add server/src/types/services/email.ts server/src/services/email && git commit -m "feat(change-password): BE password-changed email type + template"`

---

### Task BE-7: Guards (TDD)

**Files:** Create `guards/wrong-current-password.guard.ts`, `guards/same-password.guard.ts`, `guards/index.ts`, `guards/*.spec.ts` trong `server/src/modules/change-password/`

- [ ] **Step 1: Failing test** — `guards/wrong-current-password.guard.spec.ts`:

```ts
// modules
import { WrongCurrentPasswordGuard } from "./wrong-current-password.guard";
import { BadRequestError } from "@/common/exceptions";
import { isValidHashedValue } from "@/utils/crypto/bcrypt";

jest.mock("@/utils/crypto/bcrypt");
const mockedIsValid = isValidHashedValue as jest.MockedFunction<
  typeof isValidHashedValue
>;

describe("WrongCurrentPasswordGuard", () => {
  const guard = new WrongCurrentPasswordGuard();

  it("throws BadRequestError when current password does not match", () => {
    mockedIsValid.mockReturnValue(false);
    expect(() => guard.assert("wrong", "hash")).toThrow(BadRequestError);
  });

  it("passes when current password matches", () => {
    mockedIsValid.mockReturnValue(true);
    expect(() => guard.assert("right", "hash")).not.toThrow();
  });
});
```

- [ ] **Step 2:** Run → `cd server && yarn test wrong-current-password` → Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `guards/wrong-current-password.guard.ts`:

```ts
// common
import { BadRequestError } from "@/common/exceptions";
// others
import { isValidHashedValue } from "@/utils/crypto/bcrypt";
import { ERROR_CODES } from "@/constants/error-code";

export class WrongCurrentPasswordGuard {
  assert(currentPassword: string, storedHash: string): void {
    if (isValidHashedValue(currentPassword, storedHash)) return;
    throw new BadRequestError({
      i18nMessage: (t) => t("changePassword:errors.wrongCurrentPassword"),
      code: ERROR_CODES.CHANGE_PASSWORD_WRONG_CURRENT
    });
  }
}
```

- [ ] **Step 4:** Run → Expected: PASS.
- [ ] **Step 5: Failing test** — `guards/same-password.guard.spec.ts`:

```ts
import { SamePasswordGuard } from "./same-password.guard";
import { BadRequestError } from "@/common/exceptions";

describe("SamePasswordGuard", () => {
  const guard = new SamePasswordGuard();

  it("throws when new equals current", () => {
    expect(() => guard.assert("samePass1!", "samePass1!")).toThrow(
      BadRequestError
    );
  });

  it("passes when new differs from current", () => {
    expect(() => guard.assert("oldPass1!", "newPass1!")).not.toThrow();
  });
});
```

- [ ] **Step 6:** Run → `yarn test same-password` → Expected: FAIL.
- [ ] **Step 7: Implement** `guards/same-password.guard.ts`:

```ts
// common
import { BadRequestError } from "@/common/exceptions";
// others
import { ERROR_CODES } from "@/constants/error-code";

export class SamePasswordGuard {
  assert(currentPassword: string, newPassword: string): void {
    if (currentPassword !== newPassword) return;
    throw new BadRequestError({
      i18nMessage: (t) => t("changePassword:errors.sameAsCurrent"),
      code: ERROR_CODES.CHANGE_PASSWORD_SAME_AS_CURRENT
    });
  }
}
```

- [ ] **Step 8:** Run → Expected: PASS.
- [ ] **Step 9:** Create `guards/index.ts`:

```ts
export { WrongCurrentPasswordGuard } from "./wrong-current-password.guard";
export { SamePasswordGuard } from "./same-password.guard";
```

- [ ] **Step 10:** Commit: `git add server/src/modules/change-password/guards && git commit -m "feat(change-password): BE guards + tests"`

---

### Task BE-8: Service (TDD)

**Files:** Create `change-password.service.ts`, `change-password.service.spec.ts`

- [ ] **Step 1: Failing test** — `change-password.service.spec.ts`. Mock helpers + RequestContext:

```ts
jest.mock("@/modules/authentication/helpers");
jest.mock("@/utils/crypto/bcrypt");
jest.mock("@/utils/request-context", () => ({
  RequestContext: { requireAuthId: jest.fn() }
}));

// types
import type { Request } from "express";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
// modules
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
import { hashValue } from "@/utils/crypto/bcrypt";
import { RequestContext } from "@/utils/request-context";
import { EmailType } from "@/types/services/email";
import { BadRequestError } from "@/common/exceptions";
import { WrongCurrentPasswordGuard, SamePasswordGuard } from "./guards";
import { ChangePasswordService } from "./change-password.service";

const mockedGenTokens = generateAuthTokensResponse as jest.MockedFunction<
  typeof generateAuthTokensResponse
>;
const mockedHash = hashValue as jest.MockedFunction<typeof hashValue>;
const mockedRequireAuthId = RequestContext.requireAuthId as jest.MockedFunction<
  typeof RequestContext.requireAuthId
>;

const buildReq = () =>
  ({
    body: {
      currentPassword: "OldPass1!",
      newPassword: "NewPass1!",
      confirmPassword: "NewPass1!"
    },
    ip: "1.2.3.4"
  }) as unknown as Request;

const makeService = () => {
  const authService = {
    findById: jest.fn(),
    updatePassword: jest.fn()
  } as unknown as jest.Mocked<AuthenticationService>;
  const userService = {
    findByAuthId: jest.fn()
  } as unknown as jest.Mocked<UserService>;
  const emailDispatcher = {
    send: jest.fn()
  } as unknown as jest.Mocked<EmailDispatcher>;
  const service = new ChangePasswordService(
    authService,
    userService,
    emailDispatcher,
    new WrongCurrentPasswordGuard(),
    new SamePasswordGuard()
  );
  return { service, authService, userService, emailDispatcher };
};

const AUTH = {
  _id: { toString: () => "auth1" },
  password: "storedHash",
  roles: "user"
};
const USER = {
  _id: { toString: () => "user1" },
  email: "u@e.vn",
  fullName: "U",
  avatar: null
};

describe("ChangePasswordService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireAuthId.mockReturnValue("auth1");
    mockedHash.mockReturnValue("newHash");
    mockedGenTokens.mockReturnValue({
      accessToken: "a",
      refreshToken: "r",
      idToken: "i",
      expiresIn: 3600
    });
  });

  it("throws when current password is wrong", async () => {
    const { service, authService } = makeService();
    authService.findById.mockResolvedValue({
      ...AUTH,
      password: "$2b$10$differenthash"
    } as never);
    await expect(service.changePassword(buildReq())).rejects.toThrow(
      BadRequestError
    );
  });

  it("updates password, issues new tokens AFTER update, sends alert", async () => {
    const { service, authService, userService, emailDispatcher } =
      makeService();
    // make WrongCurrentPasswordGuard pass: mock bcrypt via guard? guard uses isValidHashedValue (real). Use a hash that matches:
    jest
      .spyOn(WrongCurrentPasswordGuard.prototype, "assert")
      .mockImplementation(() => undefined);
    authService.findById.mockResolvedValue(AUTH as never);
    userService.findByAuthId.mockResolvedValue(USER as never);

    const result = await service.changePassword(buildReq());

    expect(authService.updatePassword).toHaveBeenCalledWith(
      "auth1",
      "newHash"
    );
    // tokens generated with user+auth identity
    expect(mockedGenTokens).toHaveBeenCalledWith({
      userId: "user1",
      authId: "auth1",
      email: "u@e.vn",
      roles: "user",
      fullName: "U",
      avatar: null
    });
    expect(emailDispatcher.send).toHaveBeenCalledWith(
      EmailType.PASSWORD_CHANGED,
      expect.objectContaining({ email: "u@e.vn" })
    );
    expect(result).toEqual({
      accessToken: "a",
      refreshToken: "r",
      idToken: "i",
      expiresIn: 3600
    });
  });
});
```

- [ ] **Step 2:** Run → `cd server && yarn test change-password.service` → Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `change-password.service.ts`:

```ts
// types
import type { ChangePasswordRequest } from "./types";
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { AuthTokensResponse } from "@/modules/authentication/types";
import type { WrongCurrentPasswordGuard, SamePasswordGuard } from "./guards";
// common
import { UnauthorizedError } from "@/common/exceptions";
// modules
import { generateAuthTokensResponse } from "@/modules/authentication/helpers";
import { EmailType } from "@/types/services/email";
// others
import { RequestContext } from "@/utils/request-context";
import { hashValue } from "@/utils/crypto/bcrypt";
import { ERROR_CODES } from "@/constants/error-code";
import { Logger } from "@/libs/logger";

export class ChangePasswordService {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly userService: UserService,
    private readonly emailDispatcher: EmailDispatcher,
    private readonly wrongCurrentPasswordGuard: WrongCurrentPasswordGuard,
    private readonly samePasswordGuard: SamePasswordGuard
  ) {}

  async changePassword(
    req: ChangePasswordRequest
  ): Promise<AuthTokensResponse> {
    const authId = RequestContext.requireAuthId();
    const { currentPassword, newPassword } = req.body;

    const auth = await this.authService.findById(authId);
    if (!auth) {
      throw new UnauthorizedError({
        i18nMessage: (t) => t("common:errors.unauthorized"),
        code: ERROR_CODES.AUTH_INVALID_TOKEN
      });
    }

    this.wrongCurrentPasswordGuard.assert(currentPassword, auth.password);
    this.samePasswordGuard.assert(currentPassword, newPassword);

    const hashedPassword = hashValue(newPassword);
    await this.authService.updatePassword(authId, hashedPassword);

    const user = await this.userService.findByAuthId(authId);
    if (!user) {
      throw new UnauthorizedError({
        i18nMessage: (t) => t("common:errors.unauthorized"),
        code: ERROR_CODES.AUTH_INVALID_TOKEN
      });
    }

    // Tokens issued AFTER passwordChangedAt → current device survives; others rejected at /token/refresh.
    const tokens = generateAuthTokensResponse({
      userId: user._id.toString(),
      authId: auth._id.toString(),
      email: user.email,
      roles: auth.roles,
      fullName: user.fullName,
      avatar: user.avatar ?? null
    });

    // Fire-and-forget security alert (queued).
    this.emailDispatcher.send(EmailType.PASSWORD_CHANGED, {
      email: user.email,
      data: {
        changedAt: new Date().toISOString(),
        ipAddress: req.ip ?? "unknown"
      }
    });

    Logger.info("Password changed", { authId });

    return tokens;
  }
}
```

> ⚠️ Verify `UserService.findByAuthId` trả về object có `_id`, `email`, `fullName`, `avatar`. Đọc `server/src/modules/user/user.service.ts:120` để confirm shape; nếu khác, adapt mapping.

- [ ] **Step 4:** Run → Expected: PASS.
- [ ] **Step 5:** Commit: `git add server/src/modules/change-password/change-password.service.ts server/src/modules/change-password/change-password.service.spec.ts && git commit -m "feat(change-password): BE service + tests"`

---

### Task BE-9: Controller

**Files:** Create `change-password.controller.ts`

- [ ] **Step 1:** Implement (mirror `login.controller.ts`: strip refreshToken → cookie):

```ts
// types
import type { Response } from "express";
import type { ChangePasswordRequest } from "./types";
import type { ChangePasswordService } from "./change-password.service";
// common
import { OkSuccess } from "@/common/responses";
// modules
import {
  REFRESH_TOKEN,
  REFRESH_TOKEN_COOKIE_OPTIONS
} from "@/modules/token/constants";

export class ChangePasswordController {
  constructor(private readonly service: ChangePasswordService) {}

  changePassword = async (
    req: ChangePasswordRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.changePassword(req);
    const { refreshToken, ...responseData } = data;

    res.cookie(REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    new OkSuccess({
      data: responseData,
      message: "changePassword:success.passwordChanged"
    }).send(req, res);
  };
}
```

> `responseData = { accessToken, idToken, expiresIn }` — khớp FE `LoginTokenResponse`.

- [ ] **Step 2:** `cd server && yarn tsc`. Expected: pass.
- [ ] **Step 3:** Commit: `git add server/src/modules/change-password/change-password.controller.ts && git commit -m "feat(change-password): BE controller"`

---

### Task BE-10: Routes

**Files:** Create `change-password.routes.ts`

- [ ] **Step 1:**

```ts
// libs
import { Router } from "express";
// types
import type { RateLimiterMiddleware } from "@/middlewares";
import type { ChangePasswordController } from "./change-password.controller";
// validators
import { changePasswordSchema } from "@/validators/schemas/change-password";
// others
import { authGuard, bodyPipe } from "@/middlewares";
import { asyncHandler } from "@/utils/async-handler";

export const createChangePasswordRoutes = (
  controller: ChangePasswordController,
  rl: RateLimiterMiddleware
): Router => {
  const router = Router();

  router.patch(
    "/auth/change-password",
    authGuard,
    rl.changePasswordByIpAndUser,
    bodyPipe(changePasswordSchema),
    asyncHandler(controller.changePassword)
  );

  return router;
};
```

> Thứ tự: `authGuard` set RequestContext.user TRƯỚC `rl.changePasswordByIpAndUser` (keyGenerator đọc userId) và TRƯỚC controller (đọc authId).

- [ ] **Step 2:** `cd server && yarn tsc`. Expected: pass (`authGuard` export từ `@/middlewares` — đã confirm).
- [ ] **Step 3:** Commit: `git add server/src/modules/change-password/change-password.routes.ts && git commit -m "feat(change-password): BE routes"`

---

### Task BE-11: Module factory

**Files:** Create `change-password.module.ts`

- [ ] **Step 1:**

```ts
// types
import type { AuthenticationService } from "@/modules/authentication/authentication.service";
import type { UserService } from "@/modules/user/user.service";
import type { EmailDispatcher } from "@/services/email/email.dispatcher";
import type { RateLimiterMiddleware } from "@/middlewares";
// guards
import { WrongCurrentPasswordGuard, SamePasswordGuard } from "./guards";
// others
import { ChangePasswordService } from "./change-password.service";
import { ChangePasswordController } from "./change-password.controller";
import { createChangePasswordRoutes } from "./change-password.routes";

export const createChangePasswordModule = (
  authService: AuthenticationService,
  userService: UserService,
  emailDispatcher: EmailDispatcher,
  rateLimiter: RateLimiterMiddleware
) => {
  const wrongCurrentPasswordGuard = new WrongCurrentPasswordGuard();
  const samePasswordGuard = new SamePasswordGuard();

  const changePasswordService = new ChangePasswordService(
    authService,
    userService,
    emailDispatcher,
    wrongCurrentPasswordGuard,
    samePasswordGuard
  );
  const changePasswordController = new ChangePasswordController(
    changePasswordService
  );

  return {
    changePasswordRouter: createChangePasswordRoutes(
      changePasswordController,
      rateLimiter
    )
  };
};
```

- [ ] **Step 2:** `cd server && yarn tsc`. Expected: pass.
- [ ] **Step 3:** Commit: `git add server/src/modules/change-password/change-password.module.ts && git commit -m "feat(change-password): BE module factory"`

---

### Task BE-12: Register module in loader

**Files:** Modify `server/src/loaders/modules.loader.ts`

- [ ] **Step 1:** Import (cạnh các `createXxxModule`):

```ts
import { createChangePasswordModule } from "@/modules/change-password/change-password.module";
```

- [ ] **Step 2:** Thêm field vào interface `ModuleRoutes`:

```ts
  changePassword: Router;
```

- [ ] **Step 3:** Trong `loadModules`, sau block `createForgotPasswordModule`, thêm:

```ts
  const { changePasswordRouter } = createChangePasswordModule(
    authService,
    userService,
    emailDispatcher,
    rateLimiter
  );
```

- [ ] **Step 4:** Trong `mountRoutes`, thêm dòng dưới `v1Router.use(routes.forgotPassword);`:

```ts
  v1Router.use(routes.changePassword);
```

- [ ] **Step 5:** Trong object truyền cho `mountRoutes(app, {...})`, thêm:

```ts
    changePassword: changePasswordRouter,
```

- [ ] **Step 6:** `cd server && yarn tsc && yarn test`. Expected: build pass, all tests green.
- [ ] **Step 7:** Commit: `git add server/src/loaders/modules.loader.ts && git commit -m "feat(change-password): BE register module in loader"`

---

### Task BE-13: Swagger

**Files:** Create `swagger/schemas.ts`, `swagger/paths.ts`, `swagger/index.ts`; Modify `server/src/libs/swagger/openapi.ts`

- [ ] **Step 1:** `swagger/schemas.ts` (mirror forgot-password, dùng `joi-to-swagger`):

```ts
// libs
import j2s from "joi-to-swagger";
// types
import type { OpenAPIV3 } from "openapi-types";
// validators
import { changePasswordSchema } from "@/validators/schemas/change-password";

const { swagger: ChangePasswordRequestSchema } = j2s(changePasswordSchema);

const ChangePasswordResponseSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    accessToken: { type: "string" },
    idToken: { type: "string" },
    expiresIn: { type: "integer", example: 3600 }
  }
};

export const changePasswordSwaggerSchemas = {
  ChangePasswordRequest: ChangePasswordRequestSchema as OpenAPIV3.SchemaObject,
  ChangePasswordResponse: ChangePasswordResponseSchema
};
```

- [ ] **Step 2:** `swagger/paths.ts` — mở `modules/forgot-password/swagger/paths.ts` làm mẫu cho cấu trúc `OpenAPIV3.PathsObject`. Tạo path `/auth/change-password` method `patch`, `security: [{ bearerAuth: [] }]`, requestBody ref `ChangePasswordRequest`, responses 200 (ref `ChangePasswordResponse`), 400, 401, 422, 429. Export `changePasswordPaths`.
- [ ] **Step 3:** `swagger/index.ts`:

```ts
export { changePasswordPaths } from "./paths";
export { changePasswordSwaggerSchemas } from "./schemas";
```

- [ ] **Step 4:** Trong `libs/swagger/openapi.ts`: import + merge `changePasswordPaths` vào `paths` và `changePasswordSwaggerSchemas` vào `components.schemas` (mirror cách forgot-password được merge — grep `forgotPasswordPaths` trong file để thấy 2 điểm chèn).
- [ ] **Step 5:** `cd server && yarn tsc`. Expected: pass. (Optional: chạy server, mở `/api-docs`, xác nhận endpoint hiển thị.)
- [ ] **Step 6:** Commit: `git add server/src/modules/change-password/swagger server/src/libs/swagger/openapi.ts && git commit -m "feat(change-password): BE swagger docs"`

---

# PART B — Frontend

> Convention: đọc `client/.claude/CLAUDE.md` + skills `standard-react`, `standard-nextjs`, `standard-tailwind`, `standard-shadcn`, `standard-accessibility` trước khi code. Chỉ chạm `client/src/**`. Type check: `cd client && yarn tsc`.

### Task FE-1: Endpoint + field names

**Files:** Modify `client/src/constants/endpoints.ts`; Create `client/src/constants/fieldNames/ChangePassword.ts`; Modify `client/src/constants/fieldNames/index.ts`

- [ ] **Step 1:** Trong `endpoints.ts`, sau group Forgot Password, thêm:

```ts
  // Change Password
  AUTH_CHANGE_PASSWORD: "/auth/change-password",
```

- [ ] **Step 2:** Create `fieldNames/ChangePassword.ts` (mirror `fieldNames/ForgotPassword.ts`):

```ts
const CHANGE_PASSWORD_FIELD_NAMES = {
  CURRENT_PASSWORD: "currentPassword",
  NEW_PASSWORD: "newPassword",
  CONFIRM_PASSWORD: "confirmPassword"
} as const;

export default CHANGE_PASSWORD_FIELD_NAMES;
```

- [ ] **Step 3:** Trong `fieldNames/index.ts`: import + thêm vào object `FIELD_NAMES`:

```ts
import CHANGE_PASSWORD_FIELD_NAMES from "./ChangePassword";
// ... trong object:
  CHANGE_PASSWORD_FIELD_NAMES,
```

- [ ] **Step 4:** `cd client && yarn tsc`. Expected: pass.
- [ ] **Step 5:** Commit: `git add client/src/constants && git commit -m "feat(change-password): FE endpoint + field names"`

---

### Task FE-2: Types + validation schema + form props

**Files:** Create `client/src/forms/ChangePassword/validations.ts`, `data.ts`, `index.ts`; Create `client/src/types/ChangePassword.ts`

- [ ] **Step 1:** `forms/ChangePassword/validations.ts` (reuse `passwordSchema` từ `@/schemas`, refine confirm match):

```ts
// libs
import * as z from "zod";
// schemas
import { passwordSchema } from "@/schemas";
// constants
import CONSTANTS from "@/constants";

const { CURRENT_PASSWORD, NEW_PASSWORD, CONFIRM_PASSWORD } =
  CONSTANTS.FIELD_NAMES.CHANGE_PASSWORD_FIELD_NAMES;

export const changePasswordValidation = z
  .object({
    [CURRENT_PASSWORD]: z.string().min(1, "required"),
    [NEW_PASSWORD]: passwordSchema,
    [CONFIRM_PASSWORD]: z.string().min(1, "required")
  })
  .refine((data) => data[NEW_PASSWORD] === data[CONFIRM_PASSWORD], {
    message: "mismatch",
    path: [CONFIRM_PASSWORD]
  });
```

- [ ] **Step 2:** `types/ChangePassword.ts`:

```ts
// libs
import type { z } from "zod";
// forms
import type { changePasswordValidation } from "@/forms/ChangePassword/validations";

export type ChangePasswordFormValues = z.infer<typeof changePasswordValidation>;

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
```

- [ ] **Step 3:** `forms/ChangePassword/data.ts`:

```ts
// types
import type { ChangePasswordFormValues } from "@/types/ChangePassword";
// constants
import CONSTANTS from "@/constants";

const { CURRENT_PASSWORD, NEW_PASSWORD, CONFIRM_PASSWORD } =
  CONSTANTS.FIELD_NAMES.CHANGE_PASSWORD_FIELD_NAMES;

export const initialChangePasswordFormData: ChangePasswordFormValues = {
  [CURRENT_PASSWORD]: "",
  [NEW_PASSWORD]: "",
  [CONFIRM_PASSWORD]: ""
};
```

- [ ] **Step 4:** `forms/ChangePassword/index.ts`:

```ts
// libs
import { zodResolver } from "@hookform/resolvers/zod";
// types
import type { UseFormProps } from "react-hook-form";
import type { ChangePasswordFormValues } from "@/types/ChangePassword";
// forms
import { initialChangePasswordFormData } from "./data";
import { changePasswordValidation } from "./validations";

export const changePasswordFormProps: UseFormProps<ChangePasswordFormValues> = {
  defaultValues: initialChangePasswordFormData,
  resolver: zodResolver(changePasswordValidation)
};
```

- [ ] **Step 5:** `cd client && yarn tsc`. Expected: pass.
- [ ] **Step 6:** Commit: `git add client/src/forms/ChangePassword client/src/types/ChangePassword.ts && git commit -m "feat(change-password): FE form schema + types"`

---

### Task FE-3: Request

**Files:** Create `client/src/requests/changePassword.ts`

- [ ] **Step 1:** (mirror `requests/login.ts`, trả `LoginTokenResponse` — reuse type từ `@/types/Login`):

```ts
// types
import type { LoginTokenResponse } from "@/types/Login";
import type { ChangePasswordPayload } from "@/types/ChangePassword";
// others
import axiosInstance from "@/libs/axios";
import CONSTANTS from "@/constants";

const { END_POINTS } = CONSTANTS;

export const changePassword = async (
  payload: ChangePasswordPayload
): Promise<LoginTokenResponse> => {
  const response = await axiosInstance.patch<
    ResponsePattern<LoginTokenResponse>
  >(END_POINTS.AUTH_CHANGE_PASSWORD, payload);
  return response.data.data;
};
```

- [ ] **Step 2:** `cd client && yarn tsc`. Expected: pass.
- [ ] **Step 3:** Commit: `git add client/src/requests/changePassword.ts && git commit -m "feat(change-password): FE request"`

---

### Task FE-4: useChangePassword hook (TDD)

**Files:** Create `client/src/views/Security/mains/ChangePasswordCard/hooks/useChangePassword.ts` (+ spec nếu dự án test FE hooks — kiểm tra `client/` có jest/testing-library; nếu không có harness test FE, bỏ Step 1-2 và verify bằng tsc + manual).

- [ ] **Step 1: Failing test** (nếu có harness) — `useChangePassword.spec.tsx`: render hook trong QueryClientProvider, mock `changePassword` request resolve tokens, assert `setTokens` được gọi với tokens và form reset callback chạy onSuccess. (Mirror test hook hiện có nếu tồn tại; tìm `*.spec.tsx` trong `client/src` để theo pattern.)
- [ ] **Step 2:** Run → Expected: FAIL.
- [ ] **Step 3: Implement** `useChangePassword.ts` (mirror `usePasswordLogin` + `useForgotPasswordReset`; mutation fire trong submit handler, KHÔNG effect):

```ts
"use client";

// libs
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
// types
import type { ChangePasswordPayload } from "@/types/ChangePassword";
// requests
import { changePassword } from "@/requests/changePassword";
// hooks
import { useAnnounce } from "@/hooks";
// stores
import { useAuthStore } from "@/stores";

export const useChangePassword = ({ onDone }: { onDone: () => void }) => {
  const setTokens = useAuthStore((state) => state.setTokens);
  const t = useTranslations("security.changePassword");
  const tAnnounce = useTranslations("security.changePassword.announce");
  const { announce } = useAnnounce();

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
    onMutate: () => {
      announce(tAnnounce("submitting"));
    },
    onSuccess: (tokens) => {
      // Keep current session alive with freshly issued tokens.
      setTokens(tokens);
      announce(tAnnounce("success"));
      toast.success(t("message.success"));
      onDone();
    },
    onError: () => {
      toast.error(t("message.error"));
    }
  });

  return { changePassword: mutate, isPending };
};
```

> `axiosInstance` interceptor (error filter) thường đã toast lỗi từ BE; nếu vậy, bỏ `toast.error` ở `onError` để tránh double-toast — kiểm tra `client/src/libs/axios` trước.

- [ ] **Step 4:** Run test (nếu có) → Expected: PASS. Else `cd client && yarn tsc`.
- [ ] **Step 5:** Commit: `git add client/src/views/Security/mains/ChangePasswordCard/hooks && git commit -m "feat(change-password): FE useChangePassword hook"`

---

### Task FE-5: ChangePasswordCard + form

**Files:** Create `client/src/views/Security/mains/ChangePasswordCard/index.tsx`

- [ ] **Step 1:** Implement (mirror `ApiKeysCard` cho Card shell + `ForgotPasswordResetForm` cho RHF form; dùng `PasswordInput`, `CustomButton`, `Card*`):

```tsx
"use client";

// libs
import { FormProvider, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
// types
import type { ChangePasswordFormValues } from "@/types/ChangePassword";
// components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader
} from "@/components/ui/card";
import CustomButton from "@/components/CustomButton";
import PasswordInput from "@/components/PasswordInput";
// forms
import { changePasswordFormProps } from "@/forms/ChangePassword";
// hooks
import { useChangePassword } from "./hooks/useChangePassword";
// others
import CONSTANTS from "@/constants";

const { CURRENT_PASSWORD, NEW_PASSWORD, CONFIRM_PASSWORD } =
  CONSTANTS.FIELD_NAMES.CHANGE_PASSWORD_FIELD_NAMES;

const ChangePasswordCard = () => {
  const t = useTranslations("security.changePassword");
  const methods = useForm<ChangePasswordFormValues>({
    ...changePasswordFormProps
  });

  const { changePassword, isPending } = useChangePassword({
    onDone: () => methods.reset()
  });

  const onSubmit = (data: ChangePasswordFormValues) => {
    changePassword({
      currentPassword: data[CURRENT_PASSWORD],
      newPassword: data[NEW_PASSWORD],
      confirmPassword: data[CONFIRM_PASSWORD]
    });
  };

  return (
    <Card aria-labelledby="change-password-title">
      <CardHeader className="border-b">
        <h3
          id="change-password-title"
          className="text-foreground text-base leading-none font-semibold"
        >
          {t("title")}
        </h3>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <PasswordInput
              name={CURRENT_PASSWORD}
              label={t("form.currentLabel")}
              placeholder={t("form.currentPlaceholder")}
              autoComplete="current-password"
              disabled={isPending}
            />
            <PasswordInput
              name={NEW_PASSWORD}
              label={t("form.newLabel")}
              placeholder={t("form.newPlaceholder")}
              autoComplete="new-password"
              disabled={isPending}
            />
            <PasswordInput
              name={CONFIRM_PASSWORD}
              label={t("form.confirmLabel")}
              placeholder={t("form.confirmPlaceholder")}
              autoComplete="new-password"
              disabled={isPending}
            />
            <CustomButton type="submit" loading={isPending} disabled={isPending}>
              {t("form.submit")}
            </CustomButton>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;
```

> Confirm prop API của `PasswordInput` (`name/label/placeholder/disabled`) và `CustomButton` (`loading`) — đã thấy ở `ForgotPasswordResetForm`/`ApiKeysCard`. Nếu khác, adapt.

- [ ] **Step 2:** `cd client && yarn tsc`. Expected: pass.
- [ ] **Step 3:** Commit: `git add client/src/views/Security/mains/ChangePasswordCard/index.tsx && git commit -m "feat(change-password): FE ChangePasswordCard"`

---

### Task FE-6: Mount card + i18n

**Files:** Modify `client/src/views/Security/index.tsx`, `client/src/locales/en/security.json`, `client/src/locales/vi/security.json`

- [ ] **Step 1:** Trong `views/Security/index.tsx`: import + mount (đặt trên `ApiKeysCard`):

```tsx
import ChangePasswordCard from "./mains/ChangePasswordCard";
// ... trong JSX, sau <LoginActivityCard /> (hoặc vị trí hợp lý):
    <ChangePasswordCard />
```

- [ ] **Step 2:** Thêm group `changePassword` vào `locales/en/security.json` (đặt cùng cấp với `apiKeys`):

```json
"changePassword": {
  "title": "Change password",
  "description": "Update your account password. Other devices will be signed out.",
  "form": {
    "currentLabel": "Current password",
    "currentPlaceholder": "Enter current password",
    "newLabel": "New password",
    "newPlaceholder": "Enter new password",
    "confirmLabel": "Confirm new password",
    "confirmPlaceholder": "Re-enter new password",
    "submit": "Change password"
  },
  "message": {
    "success": "Password changed successfully",
    "error": "Could not change password"
  },
  "announce": {
    "submitting": "Changing password",
    "success": "Password changed"
  }
}
```

- [ ] **Step 3:** Thêm group `changePassword` tương ứng vào `locales/vi/security.json` (bản dịch tiếng Việt của các key trên).
- [ ] **Step 4:** `cd client && yarn tsc && yarn lint`. Expected: pass.
- [ ] **Step 5:** Commit: `git add client/src/views/Security/index.tsx client/src/locales && git commit -m "feat(change-password): FE mount card + i18n"`

---

# PART C — Verification

### Task V-1: End-to-end manual verify
- [ ] BE: `cd server && yarn test && yarn tsc` — all green.
- [ ] FE: `cd client && yarn tsc && yarn lint` — pass.
- [ ] Chạy app (BE + FE), login, vào Security → đổi mật khẩu:
  - [ ] Sai current password → toast lỗi, không đổi.
  - [ ] new === current → lỗi same-password.
  - [ ] confirm mismatch → lỗi FE (không gọi API).
  - [ ] Happy path → toast success, form reset, **vẫn đăng nhập** (gọi `/users/me` thành công với token mới).
  - [ ] Thiết bị khác (session cũ) → lần refresh kế bị logout (403 `AUTH_PASSWORD_CHANGED`).
  - [ ] Nhận email "password changed".
- [ ] Verify rate-limit: >5 lần trong 15ph → 429.

### Task V-2: Code review + security
- [ ] `superpowers:requesting-code-review` (review theo side: BE convention cho task BE, FE cho task FE).
- [ ] Dispatch `security-auditor` (feature đụng auth) → `docs/specs/change-password/security-report.md`.
- [ ] `superpowers:finishing-a-development-branch` → `tech-writer` (changelog + swagger).

---

## Self-Review (đã chạy)

- **Spec coverage:** US đổi mật khẩu (verify current, policy new, confirm match, same-password block, keep-current-session, kick-others, email alert, rate-limit) → đều có task. ✅
- **Placeholder scan:** Không có TBD/TODO; các điểm "mở analog để mirror" (i18n register, swagger paths, email strings) đều chỉ rõ file mẫu + nội dung cần thêm. ✅
- **Type consistency:** `changePassword` (service/controller/hook/request) đồng nhất; guards `assert(currentPassword, storedHash)` / `assert(currentPassword, newPassword)` khớp giữa BE-7 ↔ BE-8; response shape `{accessToken,idToken,expiresIn}` khớp BE-9 ↔ FE-3 ↔ FE-4 (`LoginTokenResponse`). ✅
- **Deviation flag:** (1) không ghi login_histories, (2) response mirror `LoginTokenResponse` thay vì `{accessToken,user}` — cần user xác nhận.
