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
- [ ] `superpowers:finishing-a-development-branch` → `readme-maintainer` (CHỈ README, nếu đổi setup/config/deps). Swagger/API docs do developer làm khi implement (Task BE-13). Changelog không có owner agent.

---

## Self-Review (đã chạy)

- **Spec coverage:** US đổi mật khẩu (verify current, policy new, confirm match, same-password block, keep-current-session, kick-others, email alert, rate-limit) → đều có task. ✅
- **Placeholder scan:** Không có TBD/TODO; các điểm "mở analog để mirror" (i18n register, swagger paths, email strings) đều chỉ rõ file mẫu + nội dung cần thêm. ✅
- **Type consistency:** `changePassword` (service/controller/hook/request) đồng nhất; guards `assert(currentPassword, storedHash)` / `assert(currentPassword, newPassword)` khớp giữa BE-7 ↔ BE-8; response shape `{accessToken,idToken,expiresIn}` khớp BE-9 ↔ FE-3 ↔ FE-4 (`LoginTokenResponse`). ✅
- **Deviation flag:** (1) không ghi login_histories, (2) response mirror `LoginTokenResponse` thay vì `{accessToken,user}` — cần user xác nhận.

---

# PART D — E2E Backfill Plan

> **Backfill [2026-06-14]** — expand `## 10.5. E2E Scenario Matrix` (design.md) thành các E2E task TDD bite-sized. Nguồn sự thật về scenario + `[technique]` + giá trị cụ thể + cột `Gate` là matrix đó. Đây là **backfill mở rộng** suite hiện có ở `client/e2e/change-password/change-password.e2e.ts` (4 case `[EXISTS]`) — **KHÔNG rebuild**, chỉ ADD case mới + UPDATE case có expected đổi (reconcile cả 3 artifact: matrix ↔ e2e.md ↔ test file).
>
> **File đích test**: `client/e2e/change-password/change-password.e2e.ts` (extend) + helper mới nếu cần ở `client/e2e/helpers/`.
> **Selector thực tế** (xác nhận từ `views/AccountSettings/mains/ChangePasswordCard/index.tsx`): label `Current Password` / `New Password` / `Confirm New Password` (programmatically associated → `getByLabel(..., { exact: true })`); button Save có accessible name = `buttons.save` i18n (en `Update Password`); heading `getByRole("heading", { name: "Change Password" })`; inline error qua `aria-invalid="true"`; Save/Cancel `disabled` khi `!isDirty || isPending`; loading qua `loading={isPending}` (3 input `disabled={isPending}`); a11y announce qua `#announcer` (`aria-live="polite"`) với `announce.saving` + `announce.saved`.
>
> **Convention TDD (`superpowers:test-driven-development`)**: app đã implement xong → đây là test backfill, không phải red-first cho code mới. Mỗi task = 1 `test(...)`, chạy được ngay sau khi thêm; verify PASS thật trước khi tick. KHÔNG sửa app code trong test (gặp a11y/DOM/behavior bất ngờ → flag follow-up vào `e2e.md`).
>
> **Hằng số dùng chung (đã có ở đầu file test)**: `DEFAULT_PASSWORD = process.env.E2E_USER_PASSWORD ?? "User@123"`, `NEW_PASSWORD = "NewPass@123"`, `currentPassword/newPassword/confirmPassword` locator helpers, `test.describe.configure({ mode: "serial" })`, `afterAll → ensureDefaultPassword(NEW_PASSWORD)`.

## Bố cục test file sau backfill

Suite hiện tại 1 `describe` serial. Backfill chia thành **3 describe** trong cùng file để cô lập contamination (theo cột `Gate`):

1. `describe("Change Password — UI & validation (Gate A+B)")` — serial, dùng storageState mặc định, **không mutate password thật** (validation/empty/i18n/render/a11y/loading/error-mock). An toàn cho gate B đọc song song.
2. `describe("Change Password — happy path & boundary (Gate A only, mutating)")` — serial, **mutate password thật** → `afterAll ensureDefaultPassword`. Gate B chỉ verify read/render, KHÔNG chạy song song.
3. `describe("Change Password — session & security (Gate A only, isolated)")` — token-revoke (`[ST] invalid`), double-submit, rate-limit 429. **Phải chạy isolated** (không song song với bất kỳ read scenario nào chia session) vì revoke refresh token + tiêu rate-limit window — xem [[reference_e2e_suite_session_contamination]].

> **Quy tắc serial + revert**: mọi describe mutate đặt `mode: "serial"`; mọi mutate password thật phải revert ở `afterAll` qua `ensureDefaultPassword` (idempotent, chỉ thử `DEFAULT_PASSWORD` rồi `currentGuess`). Nếu describe 3 đổi sang mật khẩu khác `NEW_PASSWORD` → phải `afterAll` riêng đưa về `NEW_PASSWORD` trước khi `ensureDefaultPassword` chung chạy, hoặc revert trực tiếp về `DEFAULT_PASSWORD` trong chính describe đó.

---

## Group 1 — Happy path (matrix row 1) — Gate A+B

- [ ] **1a happy-path đổi mật khẩu [EXISTS]** — `current=User@123` + `new=NewPass@123` + `confirm=NewPass@123` → click Save → toast `Password updated successfully` + URL vẫn `/account-settings`. (Đã có, giữ nguyên ở describe 2.)
- [ ] **1b phiên sống sót sau đổi [NEW]** [ST valid] — sau happy-path, gọi authed request với **access token mới** (`setTokens` đã cập nhật store) → `200`. Vì E2E test ở tầng browser, assert gián tiếp: reload `/account-settings` → heading `Change Password` vẫn visible (không bị redirect `/login`). Test code (thêm vào describe 2, sau 1a):

```ts
test("keeps the current session alive after change (reload stays authed)", async ({
  page
}) => {
  await currentPassword(page).fill(DEFAULT_PASSWORD);
  await newPassword(page).fill(NEW_PASSWORD);
  await confirmPassword(page).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Update Password" }).click();
  await expect(page.getByText("Password updated successfully")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Change Password" })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/account-settings/);
});
```

> Note: 1b mutate password thật → nằm describe 2 (Gate A only). `afterAll ensureDefaultPassword(NEW_PASSWORD)` revert.

---

## Group 2 — AuthN (matrix row 2) — (a) A+B · (b) A only

- [ ] **2a unauth → redirect /login [NEW]** [error-guessing] — fresh context KHÔNG có auth (`clearCookies()` + storageState `undefined`) → `goto /account-settings` → bị `AuthGuardLayout` redirect về `/login`. **Phải tạo context mới**. Test code:

```ts
test("redirects unauthenticated user away from account settings", async ({
  browser
}) => {
  const ctx = await browser.newContext({ storageState: undefined });
  await ctx.clearCookies();
  const freshPage = await ctx.newPage();
  await freshPage.goto("/account-settings");
  await expect(freshPage).toHaveURL(/\/login/);
  await ctx.close();
});
```

- [ ] **2b PATCH không Bearer → 401 [NEW]** [authN] — gọi API trực tiếp không kèm Authorization → `401` (authGuard). Dùng `request.newContext` (không storageState). Test code:

```ts
test("rejects change-password API call without a bearer token (401)", async () => {
  const ctx = await request.newContext({
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000"
  });
  try {
    const res = await ctx.patch("/api/v1/auth/change-password", {
      data: {
        currentPassword: DEFAULT_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD
      }
    });
    expect(res.status()).toBe(401);
  } finally {
    await ctx.dispose();
  }
});
```

> Import bổ sung đầu file: `import { request } from "@playwright/test";`. 2b là `A only` (network-level) → đặt describe 1; **không mutate** (401 trước khi chạm DB) nên describe 1 OK.

- [ ] **Row 3 AuthZ — DEFER (N/A)**: endpoint chỉ có `authGuard`, self-service, `authId` lấy từ JWT (không tin body) → không có role/ownership surface để escalate. Không viết test. Ghi N/A + lý do vào `e2e.md`.

---

## Group 3 — Validation (matrix row 4) — A+B (rows có PATCH thật → A only)

- [ ] **4-confirm-mismatch [EXISTS]** — `confirm=Different@123` → `aria-invalid=true` trên confirm + **no PATCH**. (Đã có, describe 1.)
- [ ] **4-wrong-current [EXISTS-partial]** [DT row i] — `current=WrongPass@123` + `new=NewPass@123` → **có PATCH** → `400 CHANGE_PASSWORD_WRONG_CURRENT` map về field `currentPassword`. (Đã có; PATCH thật nhưng KHÔNG đổi được mật khẩu → an toàn để describe 1.)
- [ ] **4-new-equals-current [EXISTS]** — `new=current=User@123` → `aria-invalid` trên `newPassword`. (Đã có, describe 1.)

### 4-EP worked example + parametrized list [NEW]

- [ ] **4-EP-policy worked example** [EP] — ONE test minh hoạ pattern "invalid newPassword class → `aria-invalid` + no PATCH", engineer parametrize phần còn lại. Test code (describe 1):

```ts
test("rejects new password missing an uppercase letter (no API call)", async ({
  page
}) => {
  let patchCalled = false;
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().includes("/auth/change-password")) {
      patchCalled = true;
    }
  });
  await currentPassword(page).fill(DEFAULT_PASSWORD);
  await newPassword(page).fill("newpass@123");
  await confirmPassword(page).fill("newpass@123");
  await page.getByRole("button", { name: "Update Password" }).click();
  await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
  expect(patchCalled).toBe(false);
});
```

- [ ] **4-EP remaining classes — engineer parametrize** (cùng pattern trên; expected = `aria-invalid=true` trên `newPassword`, **no PATCH** — client policy chặn trước khi gọi BE):
  - empty `""` → required
  - no-lower `NEWPASS@123`
  - no-digit `NewPass@!!`
  - no-special `NewPass123`
  - (=current `User@123` đã cover bởi `4-new-equals-current` [EXISTS])
  - **currentPassword empty** `""` (+ new/confirm valid) → required trên `currentPassword`, no PATCH
- [ ] **4-DT row ii currentOK+newInvalid [NEW]** [DT] — `current=User@123` + `new=newpass@123` (invalid) → client policy thắng → `aria-invalid` trên `newPassword`, **no PATCH** (đã ngầm cover bởi worked example vì worked example dùng `current` đúng). KHÔNG cần test riêng — ghi mapping vào `e2e.md`.
- [ ] **4-DT row iii currentWrong+newInvalid [NEW]** [DT] — `current=WrongPass@123` + `new=newpass@123` → client policy chặn `newPassword` trước → **no PATCH** (BE chưa gọi, dù current cũng sai). Test code (describe 1):

```ts
test("client policy wins when both current is wrong and new is invalid (no API call)", async ({
  page
}) => {
  let patchCalled = false;
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().includes("/auth/change-password")) {
      patchCalled = true;
    }
  });
  await currentPassword(page).fill("WrongPass@123");
  await newPassword(page).fill("newpass@123");
  await confirmPassword(page).fill("newpass@123");
  await page.getByRole("button", { name: "Update Password" }).click();
  await expect(newPassword(page)).toHaveAttribute("aria-invalid", "true");
  expect(patchCalled).toBe(false);
});
```

---

## Group 4 — Empty / null (matrix row 5) — A+B

- [ ] **5-pristine-disabled [NEW]** [EP] — form pristine (3 field rỗng, `isDirty=false`) → Save + Cancel `disabled`; submit không fire → no PATCH. Test code (describe 1):

```ts
test("disables actions and blocks submit when the form is pristine", async ({
  page
}) => {
  let patchCalled = false;
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().includes("/auth/change-password")) {
      patchCalled = true;
    }
  });
  await expect(
    page.getByRole("button", { name: "Update Password" })
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await page.waitForTimeout(300);
  expect(patchCalled).toBe(false);
});
```

> Tooltip `noChanges`: cần hover (Radix tooltip render on hover). DEFER assertion text tooltip sang gate B MCP walk (visual) — gate A chỉ assert `disabled` (đủ chứng minh forcing-function). Ghi vào `e2e.md`.

---

## Group 5 — Boundary (matrix row 6) — A+B (accept-8 → A only)

- [ ] **6-BVA-7chars reject [NEW]** [BVA] — `new=Ab@3xyz` (7 ký tự, < min 8) → `aria-invalid` trên `newPassword`, no PATCH. (describe 1, dùng worked-example pattern.)
- [ ] **6-BVA-129chars reject [NEW]** [BVA] — `new` = 129 ký tự (> max, vd `"Ab@3" + "x".repeat(125)`) → `aria-invalid`, no PATCH. (describe 1.)
- [ ] **6-BVA-8chars accept [NEW]** [BVA] — `new=Ab@3xyzz` (đúng 8 ký tự, hợp lệ) + `current=User@123` → PATCH `200`, toast success. **Mutate thật** → describe 2 (Gate A only). **Mitigation**: helper `ensureDefaultPassword` chỉ thử `DEFAULT_PASSWORD` + 1 `currentGuess` → vì test này đặt mật khẩu thứ 3 (`Ab@3xyzz` ≠ `NEW_PASSWORD`), **phải tự revert trong chính test** (gọi `ensureDefaultPassword("Ab@3xyzz")` cuối test, hoặc đổi tiếp về `NEW_PASSWORD`) trước khi describe kết thúc.
- [ ] **Password-history depth — DEFER (N/A)**: không có reuse-history policy ngoài `new != current`. Pagination N/A (không list). Ghi N/A vào `e2e.md`.

---

## Group 6 — Filter / search (matrix row 7) — DEFER (N/A)

- [ ] **Row 7 — N/A**: feature là form 3-field, không có list/table/filter/search. Không test. Ghi N/A + lý do vào `e2e.md`.

---

## Group 7 — Data rendering (matrix row 8) — A+B

- [ ] **8-render-labels [EXISTS-implicit]** — render đúng English labels + heading `Change Password` + button `Update Password`. Đã assert gián tiếp qua `beforeEach` + mọi `getByLabel`. Thêm 1 test khẳng định explicit (describe 1):

```ts
test("renders the change-password form with the expected English labels", async ({
  page
}) => {
  await expect(currentPassword(page)).toBeVisible();
  await expect(newPassword(page)).toBeVisible();
  await expect(confirmPassword(page)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Update Password" })
  ).toBeVisible();
});
```

> Không có date/number/currency/relative-time surface để format-check → không thêm case format.

---

## Group 8 — i18n en + vi (matrix row 9) — A+B — MANDATORY

- [ ] **9-vi-render [NEW]** [i18n] — `goto /vi/account-settings` → heading + labels + nút Save render **chuỗi vi**. Lấy chuỗi vi thực tế từ `client/src/locales/vi/*.json` namespace `accountSettings.changePassword` (engineer đọc đúng key `title`/`fields.*`/`buttons.save` lúc viết — KHÔNG hardcode đoán). Test code (describe 1) — placeholder cần thay bằng chuỗi vi thật:

```ts
test("renders the form in Vietnamese on the /vi route", async ({ page }) => {
  await page.goto("/vi/account-settings");
  // Replace with the exact string from locales/vi (accountSettings.changePassword.title).
  const VI_HEADING = "Đổi mật khẩu";
  await expect(page.getByRole("heading", { name: VI_HEADING })).toBeVisible();
});
```

- [ ] **9-vi-error [NEW]** [i18n] — trên `/vi/account-settings`, trigger wrong-current (`current=WrongPass@123` + new/confirm valid → PATCH 400 → field error map sang i18n vi `wrongCurrentPassword`) → assert chuỗi lỗi vi hiện. Engineer đọc đúng key vi. **PATCH thật nhưng không đổi được mật khẩu** → an toàn describe 1. Đối chiếu en row 4.

> **Lưu ý route locale**: `next-intl` prefix `as-needed` — `en` không prefix, `vi` có prefix `/vi`. Auth storageState dùng chung (cookie không scope locale).

---

## Group 9 — Error / loading (matrix row 10) — A+B (loading lean B)

- [ ] **10-error-500 [NEW]** [error-guessing] — `page.route` intercept PATCH → `fulfill` 500 → `toast.error` hiện, form **không reset** (giá trị giữ nguyên), vẫn authed. KHÔNG mutate DB thật (route bị chặn) → describe 1 an toàn. Test code:

```ts
test("shows an error toast and keeps form values when the API fails (500)", async ({
  page
}) => {
  await page.route("**/api/v1/auth/change-password", (route) => {
    if (route.request().method() === "PATCH") {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          code: "INTERNAL_SERVER_ERROR",
          message: "Server error"
        })
      });
    }
    return route.continue();
  });
  await currentPassword(page).fill(DEFAULT_PASSWORD);
  await newPassword(page).fill(NEW_PASSWORD);
  await confirmPassword(page).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Update Password" }).click();
  await expect(page.getByText(/error/i).first()).toBeVisible();
  await expect(newPassword(page)).toHaveValue(NEW_PASSWORD);
  await page.unroute("**/api/v1/auth/change-password");
});
```

> `toast.error` text = `accountSettings.changePassword.toast.error` (en). Thay `getByText(/error/i)` bằng chuỗi i18n chính xác khi viết. **Mitigation flaky**: `page.unroute` cuối test để không rò route sang test serial kế.

- [ ] **10-loading-state [NEW]** [error-guessing] — `page.route` thêm delay (`setTimeout` 1500ms trước `fulfill` success-shape giả) → giữa flight: nút Save loading + 3 input `disabled`; sau resolve → bình thường. **Lean gate B** (visual spinner khó assert deterministic ở gate A); gate A assert được `disabled` của input lúc in-flight. Test code (describe 1):

```ts
test("disables inputs while the change-password request is in flight", async ({
  page
}) => {
  await page.route("**/api/v1/auth/change-password", async (route) => {
    if (route.request().method() === "PATCH") {
      await new Promise((r) => setTimeout(r, 1500));
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { accessToken: "x", idToken: "x", expiresIn: 900 }
        })
      });
    }
    return route.continue();
  });
  await currentPassword(page).fill(DEFAULT_PASSWORD);
  await newPassword(page).fill(NEW_PASSWORD);
  await confirmPassword(page).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Update Password" }).click();
  await expect(currentPassword(page)).toBeDisabled();
  await expect(newPassword(page)).toBeDisabled();
  await expect(confirmPassword(page)).toBeDisabled();
  await page.unroute("**/api/v1/auth/change-password");
});
```

> Route mock fulfill nên không mutate DB → describe 1. Nếu fake token-pair shape làm `setTokens` lỗi/store bẩn ảnh hưởng test kế → **mitigation**: chạy ở describe riêng hoặc reload sau test. Ghi follow-up vào `e2e.md` nếu observe được store contamination.

---

## Group 10 — Mutation safety (matrix row 11) — A only (isolated)

> **Toàn bộ group 10 đặt ở describe 3 (isolated, serial)** — KHÔNG chạy song song với read scenario chia session (token-revoke + rate-limit làm hỏng session/window). Gate B chỉ verify read/render, không mutate.

- [ ] **11-ST-valid [NEW]** [ST] — đã cover bởi **1b** (phiên sống sót với token mới). Ghi mapping 11-ST-valid → 1b vào `e2e.md`, không lặp test.
- [ ] **11-ST-invalid revoke other device [NEW] — MANDATORY** [ST] — capture refresh token từ **context #2** (login trước khi đổi), context #1 đổi mật khẩu, reuse cookie cũ của context #2 → `POST /auth/token/refresh` → `401/403` (`PasswordNotChangedGuard`). **Gate A only**. Test code (describe 3):

```ts
test("revokes other-device refresh token after password change (ST invalid)", async ({
  browser
}) => {
  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const EMAIL = process.env.E2E_USER_EMAIL ?? "user@test.com";

  // Context #2 = "other device": log in BEFORE the change to capture a pre-change
  // refresh token (iat < passwordChangedAt -> must be rejected on next refresh).
  const otherDevice = await request.newContext({ baseURL });
  const loginRes = await otherDevice.post("/api/v1/auth/login", {
    data: { email: EMAIL, password: DEFAULT_PASSWORD }
  });
  expect(loginRes.ok()).toBeTruthy();
  const oldRefreshCookie = (await otherDevice.storageState()).cookies.find(
    (c) => c.name === "refreshToken"
  );
  expect(oldRefreshCookie).toBeTruthy();

  // Context #1 = current device: perform the real password change.
  const current = await request.newContext({ baseURL });
  const curLogin = await current.post("/api/v1/auth/login", {
    data: { email: EMAIL, password: DEFAULT_PASSWORD }
  });
  const curToken = (await curLogin.json()).data.accessToken as string;
  const changeRes = await current.patch("/api/v1/auth/change-password", {
    headers: { Authorization: `Bearer ${curToken}` },
    data: {
      currentPassword: DEFAULT_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD
    }
  });
  expect(changeRes.ok()).toBeTruthy();

  // Other device reuses its now-stale refresh cookie -> must be kicked.
  const refreshRes = await otherDevice.post("/api/v1/auth/token/refresh", {
    headers: oldRefreshCookie
      ? { Cookie: `refreshToken=${oldRefreshCookie.value}` }
      : {}
  });
  expect([401, 403]).toContain(refreshRes.status());

  await otherDevice.dispose();
  await current.dispose();
});
```

> **Revert**: describe 3 `afterAll → ensureDefaultPassword(NEW_PASSWORD)`. Vì test này đổi mật khẩu thật, đặt cuối describe hoặc đảm bảo `afterAll` chạy.

- [ ] **11-double-submit [NEW]** [error-guessing] — click Save 2 lần nhanh → **đúng 1 PATCH** (nút `disabled` khi `isPending`). Đếm request. Test code (describe 3 — UI, dùng `page`):

```ts
test("fires exactly one PATCH on rapid double-submit", async ({ page }) => {
  await page.goto("/account-settings");
  await expect(
    page.getByRole("heading", { name: "Change Password" })
  ).toBeVisible();
  let patchCount = 0;
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().includes("/auth/change-password")) {
      patchCount += 1;
    }
  });
  await currentPassword(page).fill(DEFAULT_PASSWORD);
  await newPassword(page).fill(NEW_PASSWORD);
  await confirmPassword(page).fill(NEW_PASSWORD);
  const saveBtn = page.getByRole("button", { name: "Update Password" });
  await saveBtn.click();
  await saveBtn.click({ force: true });
  await expect(page.getByText("Password updated successfully")).toBeVisible();
  expect(patchCount).toBe(1);
});
```

> Mutate thật → describe 3; revert qua `afterAll`.

- [ ] **11-rate-limit-429 [NEW]** [BVA] — 5 lần trong window OK / lần thứ **6** → `429` (config `MAX_REQUESTS=5`). Gọi API trực tiếp 6 lần với wrong current password (không đổi mật khẩu thật mỗi lần, vẫn tiêu rate-limit theo IP+user). Test code (describe 3):

```ts
test("rate-limits change-password after 5 attempts in the window (6th -> 429)", async () => {
  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const EMAIL = process.env.E2E_USER_EMAIL ?? "user@test.com";
  const ctx = await request.newContext({ baseURL });
  const login = await ctx.post("/api/v1/auth/login", {
    data: { email: EMAIL, password: DEFAULT_PASSWORD }
  });
  const token = (await login.json()).data.accessToken as string;
  const attempt = () =>
    ctx.patch("/api/v1/auth/change-password", {
      headers: { Authorization: `Bearer ${token}` },
      // Wrong current -> 400 each time (does NOT mutate password) but still
      // consumes the IP+user rate-limit bucket.
      data: {
        currentPassword: "WrongPass@123",
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD
      }
    });
  for (let i = 0; i < 5; i++) {
    const res = await attempt();
    expect(res.status()).not.toBe(429);
  }
  const sixth = await attempt();
  expect(sixth.status()).toBe(429);
  await ctx.dispose();
});
```

> **DEFER risk + mitigation**: rate-limit phụ thuộc **config window + key (IP+user)** và **state Redis** giữa các lần chạy. Nếu một run trước đã tiêu bucket → run này có thể 429 sớm hơn (flaky). **Mitigation**: (a) chạy isolated cuối cùng trong describe 3; (b) nếu window dài (vd 15ph) → test không reset được trong 1 run → **DEFER với lý do**: cần env test có window ngắn hoặc Redis-flush hook trước test. Ghi rõ điều kiện chạy + cách reset bucket vào `e2e.md`; nếu CI không cấp được → đánh dấu `test.skip` kèm lý do, KHÔNG xóa.

- [ ] **11-revert [EXISTS]** — `afterAll ensureDefaultPassword(NEW_PASSWORD)` (idempotent). Áp cho describe 2 + 3 (mọi describe mutate password thật).

---

## Group 11 — Accessibility (matrix row 12) — Gate B (+ tab-order Gate A)

- [ ] **12-role-label [EXISTS-implicit]** — selector dùng role/label (`getByLabel(..., { exact })`, `getByRole`) đã chứng tỏ label↔input liên kết. Không thêm test riêng.
- [ ] **12-tab-order [NEW]** [a11y] — Tab đi `Current → New → Confirm → Save` đúng thứ tự DOM. Gate A khả thi qua `keyboard.press("Tab")` + assert focus. Test code (describe 1):

```ts
test("tabs through fields in DOM order: current -> new -> confirm -> save", async ({
  page
}) => {
  await currentPassword(page).focus();
  await expect(currentPassword(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(newPassword(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(confirmPassword(page)).toBeFocused();
  // PasswordInput may have a show/hide toggle between field and submit;
  // if so, adjust the number of Tab presses — verify against the rendered DOM.
});
```

> **Lưu ý**: `PasswordInput` có thể có nút toggle hiện/ẩn mật khẩu trong tab order giữa input và nút Save → engineer kiểm DOM thật để chỉnh số lần `Tab` (đừng giả định). Nếu toggle phá thứ tự kỳ vọng → flag follow-up vào `e2e.md`, KHÔNG sửa app.

- [ ] **12-announce [NEW]** [a11y] — `#announcer` (`aria-live=polite`) announce `announce.saving` lúc submit + `announce.saved` khi success. **Lean gate B** (timing aria-live khó deterministic ở gate A vì `announce.saving` → `announce.saved` ghi đè nhanh). Gate A có thể assert text cuối (`announce.saved`) sau success. DEFER assertion `announce.saving` (transient) sang gate B MCP walk (`browser_snapshot` bắt aria-live). Ghi vào `e2e.md`.

---

## Group 12 — Error-Guessing cross-cutting (matrix note) — A+B

- [ ] **EG-trailing-space [NEW]** [error-guessing] — dán `"NewPass@123 "` (trailing space) vào cả `new` + `confirm` → **document hành vi quan sát được** (KHÔNG assert cứng kết quả vì là exploratory): zod compare nguyên văn → confirm khớp nếu cả 2 cùng trailing space; policy có pass không; BE trim hay reject. Ghi kết quả thật vào `e2e.md`. Nếu thấy behavior bất ngờ (vd space lọt vào hash) → flag follow-up, KHÔNG sửa app. (describe 1 — nếu mutate thật thì describe 2 + revert.)

---

## Group 13 — Tạo `docs/specs/change-password/e2e.md` (bước §4.3 implementation)

- [ ] **E2E-DOC tạo `docs/specs/change-password/e2e.md`** — tài liệu kịch bản per-scenario (source-of-truth runtime cho dual-gate §4.3). Nội dung bắt buộc:
  - **Header**: feature, ngày, link tới `design.md §10.5` (matrix) + file test `client/e2e/change-password/change-password.e2e.ts`.
  - **Bảng scenario per-row** (1 row matrix → 1+ entry): `# | scenario | input cụ thể | expected | technique | Gate | trạng thái ([EXISTS]/[NEW]) | test name`.
  - **N/A registry**: rows 3 (AuthZ), 7 (Filter/search), password-history/pagination (row 6) — mỗi cái lý do N/A (no silent gaps).
  - **DEFER registry**: 11-rate-limit-429 (điều kiện window/Redis-flush + cách reset bucket; nếu CI không cấp → `test.skip` + lý do); 12-announce `announce.saving` (transient → gate B); 5-tooltip-text + 10-loading-spinner (visual → gate B). Mỗi defer có **lý do + mitigation/điều kiện chạy lại**.
  - **Mapping cover-by**: 11-ST-valid → 1b; 4-DT row ii → 4-EP worked example.
  - **Error-guessing observation log**: kết quả thật của EG-trailing-space (confirm match? policy pass? BE trim/reject?) — điền sau khi chạy.
  - **Contamination & isolation notes**: describe 3 isolated; gate B auth context riêng (cookie localhost không scope port → `clearCookies()` + `storageState: undefined` cho fresh context); rows `A only` gate B chỉ read/render.
  - **Revert notes**: `afterAll ensureDefaultPassword(NEW_PASSWORD)`; helper chỉ thử `DEFAULT_PASSWORD` + 1 `currentGuess` → bất kỳ test đặt mật khẩu thứ 3 (vd 6-BVA-8chars `Ab@3xyzz`) phải tự revert trong test.
  - **Env preconditions**: `E2E_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` (admin/seed creds), app chạy BE :5000 + FE :3000 + Mongo + Redis (CLAUDE.md §4.3 tiền đề app-running).

---

## Self-Review — E2E Backfill Plan

- **Matrix coverage**: 12 rows đều có task hoặc DEFER/N/A có lý do — row1 ✅, row2 ✅, row3 N/A, row4 ✅, row5 ✅, row6 ✅ (+N/A history), row7 N/A, row8 ✅, row9 ✅, row10 ✅, row11 ✅, row12 ✅ + EG cross-cutting ✅. Không silent gap.
- **Non-obvious test code đã viết full**: AuthN fresh context (2a) + no-Bearer (2b), error 500 + loading via `page.route` (10), ST-invalid token revoke 2-context (11), double-submit (11), rate-limit 429 6th (11), tab-order (12), DT row iii (4).
- **Trivial validation**: 1 worked example ([EP] no-upper) + danh sách class còn lại để parametrize.
- **Contamination**: token-revoke + rate-limit + mutating → describe 3 isolated, `A only`, không song song read; fresh context `clearCookies()` + `storageState: undefined`.
- **Revert**: mọi mutate password thật → `afterAll ensureDefaultPassword`; 8-char boundary đặt mật khẩu thứ 3 → mitigation self-revert nêu rõ.
- **DEFER có lý do + mitigation**: rate-limit (window/Redis), announce.saving (transient), tooltip/loading visual → gate B.
- **e2e.md task**: liệt kê đủ nội dung bắt buộc cho bước §4.3.
- **Cần xác nhận lúc impl**: chuỗi i18n vi thật (9-vi-render/error placeholder), số lần Tab khi PasswordInput có toggle (12), shape token-pair mock cho loading test (10) — engineer đọc locale/DOM thật, KHÔNG hardcode đoán.
