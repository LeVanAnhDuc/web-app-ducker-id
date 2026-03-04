# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Send Email là service-only module cung cấp khả năng gửi email cho toàn bộ hệ thống. Sử dụng React Email để render template thành HTML, Nodemailer để gửi qua Gmail SMTP. Service dùng generic types để đảm bảo type-safety cho từng loại email. Singleton pattern cho transport instance với connection pooling và rate limiting.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
Calling Modules                  Send Email Module
┌──────────────┐                 ┌──────────────────────────────────────┐
│ LoginService │──send()──────▶  │ SendEmailService                     │
│ SignupService│──send()──────▶  │   ├── renderTemplate(type, options)  │
│ UnlockService│──send()──────▶  │   │     ├── LoginOtpEmail            │
└──────────────┘                 │   │     ├── SignupOtpEmail           │
                                 │   │     ├── MagicLinkEmail           │
                                 │   │     └── UnlockTempPasswordEmail  │
                                 │   ├── getSubject(type, locale)       │
                                 │   │     └── i18n translations        │
                                 │   └── transport.sendRawEmail()       │
                                 │         ↓                            │
                                 │   NodemailerTransport (Singleton)    │
                                 │     └── Gmail SMTP (pool: 5 conn)    │
                                 └──────────────────────────────────────┘
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
  locale?: "vi" | "en";      // Ngôn ngữ (default: "vi")
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
      - Lấy translations theo locale (default: "vi")
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
├── modules/send-email/
│   ├── send-email.module.ts         # Singleton setup, export service + EmailType
│   ├── send-email.service.ts        # Business logic (send, renderTemplate, getSubject)
│   ├── send-email.types.ts          # EmailType enum, data interfaces, SendEmailOptions
│   ├── send-email.i18n.ts           # getEmailT() — load translations theo locale
│   └── templates/
│       ├── login-otp.tsx            # Login OTP email template
│       ├── signup-otp.tsx           # Signup OTP email template
│       ├── magic-link.tsx           # Magic link email template
│       ├── unlock-temp-password.tsx # Unlock temp password email template
│       └── components/
│           ├── email-layout.tsx     # Shared layout (header gradient, footer)
│           ├── otp-block.tsx        # OTP display block (large, dashed border)
│           ├── info-box.tsx         # Info/warning/danger box component
│           └── cta-button.tsx       # Call-to-action button (gradient)
├── core/
│   ├── EmailTransport.ts            # Abstract class (interface)
│   └── implements/
│       └── NodemailerTransport.ts   # Gmail SMTP implementation (singleton, pool)
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

**Modules sử dụng send-email:**

| Module          | Email Type           | Khi nào                                  |
| --------------- | -------------------- | ---------------------------------------- |
| login           | LOGIN_OTP            | User yêu cầu đăng nhập bằng OTP         |
| login           | MAGIC_LINK           | User yêu cầu đăng nhập bằng magic link  |
| signup          | SIGNUP_OTP           | User đăng ký, cần verify email           |
| unlock-account  | UNLOCK_TEMP_PASSWORD | User yêu cầu mở khóa tài khoản bị lock  |

---

## 3.8. Transport Configuration

```typescript
// NodemailerTransport (Singleton)
{
  service: "gmail",
  auth: {
    user: ENV.USERNAME_EMAIL,      // Gmail address
    pass: ENV.PASSWORD_EMAIL       // Gmail App Password
  },
  pool: true,                      // Enable connection pooling
  maxConnections: 5,               // Max concurrent SMTP connections
  maxMessages: 100,                // Max messages per connection before reconnect
  rateDelta: 1000,                 // Rate limit window (ms)
  rateLimit: 5                     // Max emails per rateDelta
}
```

---

## 3.9. Template Components

### EmailLayout

Shared layout cho tất cả email types:
- Header gradient (customizable, default: purple)
- Title text (white on gradient)
- Content area (padded)
- Footer (gray background, copyright)

### OtpBlock

Hiển thị OTP code:
- Font size 36px, bold
- Letter spacing 8px
- Dashed border, rounded corners
- Color customizable (default: #667eea)

### InfoBox

Box thông báo với 3 variants:
- **warning**: nền vàng, viền vàng, text nâu
- **danger**: nền đỏ nhạt, viền đỏ, text đỏ đậm
- **info**: nền xanh nhạt, viền xanh, text xanh đậm

### CtaButton

Button call-to-action:
- Gradient background (customizable)
- White text, rounded corners
- Padding 16px 48px, font 18px bold

---

## 3.10. Migration & Deployment Strategy

**Feature flag:** Không sử dụng.

**Rollback plan:**
- Revert deployment
- Không có side effects cần cleanup
- Các module caller đã handle lỗi gửi email (non-blocking)
