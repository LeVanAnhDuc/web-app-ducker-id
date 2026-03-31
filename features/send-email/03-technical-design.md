# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Send Email là service-only module cung cấp khả năng gửi email cho toàn bộ hệ thống. Sử dụng React Email để render template thành HTML, Nodemailer để gửi qua Gmail SMTP. Service dùng generic types để đảm bảo type-safety cho từng loại email (5 loại). Singleton pattern cho transport instance với connection pooling và rate limiting.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
Calling Modules                  Email Service
┌──────────────┐                 ┌───────────────────────────────────────┐
│ LoginService │──send()──────▶  │ SendEmailService                      │
│ SignupService│──send()──────▶  │   ├── renderTemplate(type, options)   │
│ UnlockService│──send()──────▶  │   │     ├── LoginOtpEmail             │
│ ForgotPwServ │──send()──────▶  │   │     ├── SignupOtpEmail            │
└──────────────┘                 │   │     ├── MagicLinkEmail            │
                                 │   │     ├── UnlockTempPasswordEmail   │
                                 │   │     └── ForgotPasswordOtpEmail    │
                                 │   ├── getSubject(type, locale)        │
                                 │   │     └── getEmailT() translations  │
                                 │   └── transport.sendRawEmail()        │
                                 │         ↓                             │
                                 │   NodemailerTransport (Singleton)     │
                                 │     └── Gmail SMTP (pool: 5 conn)     │
                                 └───────────────────────────────────────┘
```

---

## 3.3. Data Model

Không tương tác với database. Module này chỉ gửi email.

### Email Data Types

```typescript
// LOGIN_OTP
{ otp: string, expiryMinutes: number }

// SIGNUP_OTP
{ otp: string, expiryMinutes: number }

// MAGIC_LINK
{ magicLinkUrl: string, expiryMinutes: number }

// UNLOCK_TEMP_PASSWORD
{ tempPassword: string, loginUrl: string }

// FORGOT_PASSWORD_OTP
{ otp: string, expiryMinutes: number }
```

---

## 3.4. API Design

**Không có API endpoint.** Module này là service-only.

### Public Method

```typescript
send<T extends EmailType>(type: T, options: SendEmailOptions<T>): void

// options:
{
  email: string;              // Địa chỉ email người nhận
  data: EmailDataMap[T];      // Data tương ứng với email type
  locale?: I18n.Locale;       // Ngôn ngữ (default: "vi")
}
```

---

## 3.5. Luồng xử lý chính (Main Flow)

```
1. Module caller gọi sendEmailService.send(type, options)
2. send() gọi sendAsync() trong .catch() → fire-and-forget
3. sendAsync():
   a. renderTemplate(type, options):
      - Chọn React Email component theo type (switch-case)
      - Truyền data và locale vào component
      - render() → HTML string
   b. getSubject(type, locale):
      - getEmailT(locale) lấy translations theo locale (default: "vi")
      - Return subject string theo email type
   c. transport.sendRawEmail({ to, subject, htmlContent }):
      - Nodemailer gửi email qua Gmail SMTP
      - Connection pool tự quản lý
4. Logger.info nếu thành công
5. Nếu lỗi → Logger.error, KHÔNG throw (đã catch ở bước 2)
```

---

## 3.6. Cấu trúc file (File Structure)

```
server/src/
├── services/email/
│   ├── email.module.ts              # createEmailModule() → { emailService }, export EmailType
│   ├── email.service.ts             # SendEmailService (send, renderTemplate, getSubject)
│   ├── email.types.ts               # EmailType enum, data interfaces, SendEmailOptions
│   ├── email.helper.ts              # getEmailT() — load translations theo locale
│   └── templates/
│       ├── login-otp.tsx            # Login OTP email template
│       ├── signup-otp.tsx           # Signup OTP email template
│       ├── forgot-password-otp.tsx  # Forgot password OTP email template
│       ├── magic-link.tsx           # Magic link email template
│       ├── unlock-temp-password.tsx # Unlock temp password email template
│       └── components/
│           ├── email-layout.tsx     # Shared layout (header gradient, footer)
│           ├── otp-block.tsx        # OTP display block (large, dashed border)
│           ├── info-box.tsx         # Info/warning/danger box component
│           └── cta-button.tsx       # Call-to-action button (gradient)
├── services/cores/
│   └── NodemailerTransport.ts       # EmailTransport abstract class + NodemailerTransport (singleton, pool)
└── i18n/locales/
    ├── en/sendEmail.json            # English translations
    └── vi/sendEmail.json            # Vietnamese translations
```

---

## 3.7. Dependencies & Integrations

| Dependency              | Loại     | Mô tả                                    | Ghi chú                    |
| ----------------------- | -------- | ----------------------------------------- | -------------------------- |
| nodemailer              | Library  | SMTP transport                            | Gmail provider, pool mode  |
| @react-email/render     | Library  | Render React components thành HTML        | Server-side rendering      |
| @react-email/components | Library  | UI components cho email (Text, Button…)   | Responsive email components|
| Gmail SMTP              | External | Email delivery service                    | Cần App Password           |

**Modules sử dụng email service:**

| Module          | Email Type           | Khi nào                                  |
| --------------- | -------------------- | ---------------------------------------- |
| login           | LOGIN_OTP            | User yêu cầu đăng nhập bằng OTP         |
| login           | MAGIC_LINK           | User yêu cầu đăng nhập bằng magic link  |
| signup          | SIGNUP_OTP           | User đăng ký, cần verify email           |
| unlock-account  | UNLOCK_TEMP_PASSWORD | User yêu cầu mở khóa tài khoản bị lock  |
| forgot-password | FORGOT_PASSWORD_OTP  | User yêu cầu reset mật khẩu             |

---

## 3.8. Transport Configuration

```typescript
// NodemailerTransport (Singleton) — services/cores/NodemailerTransport.ts
// Chứa cả EmailTransport abstract class và NodemailerTransport implementation trong cùng 1 file

const EMAIL_SERVICE = { PROVIDER: "gmail" };
const EMAIL_POOL = { MAX_CONNECTIONS: 5, MAX_MESSAGES_PER_CONNECTION: 100 };
const EMAIL_RATE_LIMIT = { PER_SECOND: 5, DELTA_MS: 1000 };

{
  service: "gmail",
  auth: {
    user: config.USERNAME_EMAIL,       // Gmail address
    pass: config.PASSWORD_EMAIL        // Gmail App Password
  },
  pool: true,                          // Enable connection pooling
  maxConnections: 5,                   // Max concurrent SMTP connections
  maxMessages: 100,                    // Max messages per connection before reconnect
  rateDelta: 1000,                     // Rate limit window (ms)
  rateLimit: 5                         // Max emails per rateDelta
}
```

---

## 3.9. Template Components

### EmailLayout

Shared layout cho tất cả email types:
- Header gradient (customizable, default: purple `#667eea → #764ba2`)
- Title text (white on gradient)
- Content area (padded `40px 30px`)
- Footer (gray background `#f8f9fa`, optional copyright)

### OtpBlock

Hiển thị OTP code:
- Font size 36px, bold
- Letter spacing 8px
- Dashed border, rounded corners (8px)
- Color customizable (default: #667eea)

### InfoBox

Box thông báo với 3 variants:
- **warning**: nền vàng (`#fff3cd`), viền vàng (`#ffc107`), text nâu (`#856404`)
- **danger**: nền đỏ nhạt (`#f8d7da`), viền đỏ (`#dc3545`), text đỏ đậm (`#721c24`)
- **info**: nền xanh nhạt (`#dbeafe`), viền xanh (`#3b82f6`), text xanh đậm (`#1e40af`)

### CtaButton

Button call-to-action:
- Gradient background (customizable, default: purple)
- White text, rounded corners (8px)
- Padding 16px 48px, font 18px bold (fontWeight 600)

---

## 3.10. Migration & Deployment Strategy

**Feature flag:** Không sử dụng.

**Rollback plan:**
- Revert deployment
- Không có side effects cần cleanup
- Các module caller đã handle lỗi gửi email (non-blocking)
