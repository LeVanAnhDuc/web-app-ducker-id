# Project Goals & Requirements — `web-app-store-idms`

> **Status**: Living document — single source of truth về định vị và scope dự án.
> **Last updated**: 2026-05-23
> **Audience**: AI agents trong pipeline SDD + developer onboarding.
> **Rule**: Mọi feature mới phải đối chiếu mục [4. Goals](#4-goals) và [5. Non-Goals](#5-non-goals) trước khi vào pipeline. Nếu xung đột → cập nhật doc này (qua PR có review của owner), không tự suy diễn.

---

## 1. Identity & Vision

**Tên dự án**: `web-app-store-idms`
**IDMS** = **Identity Management System**.

**Định vị**: IDMS là một **central Identity Provider (IdP)** kết hợp **Launcher Portal** cho một hệ "constellation" gồm nhiều web app vệ tinh thuộc cùng một tổ chức/owner.

**Câu chuyện sử dụng (user journey gốc)**:

1. User vào `idms.example.com` → đăng nhập 1 lần.
2. Sau khi login, user thấy **dashboard liệt kê các app vệ tinh** (Blog, App-2, App-3…). Click vào tile → mở app đó với session đã sẵn sàng (không phải đăng nhập lại).
3. Hoặc user truy cập thẳng `blog.example.com` (chưa đăng nhập) → app vệ tinh redirect về `idms.example.com/oauth/authorize?...&redirect_uri=blog...` → user login → IDMS redirect ngược về Blog tại đúng URL ban đầu đã truy cập.
4. Quản trị: admin của IDMS quản lý danh sách app, gán quyền user-vào-app, xem login-history, xử lý contact, lock/unlock account.

**Một câu**: IDMS là cái cổng đăng nhập + danh bạ app cho hệ thống web nội bộ của owner.

---

## 2. Domain Model — Constellation Concept

```
                       ┌───────────────────────┐
                       │  IDMS (this project)  │
                       │  - IdP (OAuth/OIDC)   │
                       │  - User Profile       │
                       │  - App Registry       │
                       │  - Entitlement        │
                       │  - Dashboard Portal   │
                       └───────────┬───────────┘
                                   │ OAuth 2.0 / OIDC
              ┌────────────────────┼────────────────────┐
              │                    │                    │
         ┌────▼─────┐         ┌────▼─────┐         ┌────▼─────┐
         │  Blog    │         │  App-2   │         │  App-N   │
         │ (split   │         │ (future) │         │          │
         │  later)  │         │          │         │          │
         └──────────┘         └──────────┘         └──────────┘
```

**Vai trò**:

- **IDMS**: Identity Provider + portal + canonical user profile.
- **Satellite App** (gọi tắt "app vệ tinh"): Web app vệ tinh đăng ký vào IDMS như một OAuth client. Có client_id, redirect_uri, requiredRoles.

---

## 3. Target Users & Roles

| Persona         | Mô tả                                                                                                         | Role    |
| --------------- | ------------------------------------------------------------------------------------------------------------- | ------- |
| Guest           | Khách chưa đăng ký, chỉ truy cập được trang public của IDMS (login/signup/forgot-password/contact-admin form) | —       |
| Registered User | User đã verify email, vào dashboard, dùng các app vệ tinh đã được entitle                                     | `USER`  |
| Admin           | Vận hành IDMS: CRUD app registry, grant/revoke entitlement, force logout, lock/unlock, reset password         | `ADMIN` |

---

## 4. Goals

### G1 — Identity Provider chuẩn OAuth 2.0 / OIDC

- Authorization Code Flow + **PKCE**.
- **Có consent screen** cho lần đầu user authorize 1 app (kể cả app first-party — để minh bạch + chuẩn UX SSO).
- Phát hành: access token (JWT, short-lived), refresh token (long-lived, rotation), ID token (chứa profile claims).
- JWKS endpoint (`/.well-known/jwks.json`) cho app vệ tinh verify token local.
- Introspection endpoint (`/oauth/introspect`) cho endpoint nhạy cảm cần check revoke real-time.

### G2 — Multi-factor passwordless auth

- 3 phương thức đăng nhập song song: password / OTP email / magic-link.
- Reset password qua OTP hoặc magic-link.
- Lock account sau N lần fail, unlock qua OTP.
- Phát hiện anomaly đăng nhập (geo, device đột biến) → flag trong login-history.

### G3 — Centralized user profile (2-tier)

- **Tier 1 (core, @ IDMS)**: email, fullName, avatar, phone, dateOfBirth, gender, address. Là single source of truth, app vệ tinh đọc qua API (`GET /users/me` với access token).
- **Tier 2 (app-specific, @ satellite)**: mỗi app vệ tinh được quyền tự lưu setting/preference riêng (vd: blog lưu bio author, signature). Không chạm vào tier 1.

### G4 — App registry & launcher dashboard

- Admin CRUD app entries qua UI: `name, url, iconUrl, description, category, status, requiredRoles, redirectUris[]`.
- Dashboard hiển thị danh sách app user **được phép truy cập** (đã được entitle).
- Click tile → bắt đầu OAuth flow tới app đó với session IDMS hiện tại → SSO.
- User personalization: **Favorites** (đánh dấu app yêu thích), **Recently Used** (track app vừa launch), **Discover** (gợi ý app mới available).

### G5 — Per-user entitlement

- Admin gán: `User × App → granted`.
- Mỗi App có `requiredRoles` mặc định; admin có thể override per-user (grant ngoại lệ hoặc revoke).
- Danh sách app ở `/apps` hiển thị app `ACTIVE` **lọc theo role** (auth-guarded): admin thấy toàn bộ catalog active; user thường chỉ thấy app có `user` trong `requiredRoles` (app admin-only bị ẩn). Lọc theo **per-user entitlement** (grant/revoke cá biệt) và **gating quyền launch** vẫn là follow-up — chưa áp ở list vòng này.

### G6 — Asymmetric session lifecycle

- **Logout @ IDMS** → invalidate refresh token + back-channel logout notify tới mọi app vệ tinh đang có session của user đó → global sign-out.
- **Logout @ satellite** → chỉ đóng session của app đó. IDMS và app khác vẫn active.
- **Admin force logout** → tương đương "logout @ IDMS" do admin trigger.

### G7 — Cross-app locale sync

- User chọn ngôn ngữ (EN/VI) ở IDMS.
- Locale được embed vào **ID token claim** (`locale: "vi"` hoặc `"en"`).
- App vệ tinh đọc claim này khi bootstrap để render đúng ngôn ngữ → UX nhất quán.

### G8 — Admin operations

- CRUD app registry entries.
- Grant/revoke user-app entitlement.
- Force logout / revoke session bất kỳ user nào.
- Lock/unlock account, reset password thay user.
- Xem login-history toàn cục, xử lý contact-admin inbox (status workflow: new → in-progress → resolved).

---

## 5. Non-Goals

Rõ ràng **KHÔNG** thuộc scope của IDMS:

- **Không phải e-commerce**: không có product/SKU, cart, checkout, payment gateway, order, inventory.
- **Không phải apartment/property management** (sửa lại README đang ghi sai).
- **Không phải social network**: không follow/feed/messaging giữa user.
- **Không host nội dung của satellite**: blog/khác sẽ tách ra src riêng. IDMS không lưu post, không proxy nội dung.
- **Không phải workflow engine / RBAC chi tiết per-resource**: entitlement chỉ ở mức "user X có vào được app Y không". Quyền chi tiết trong nội bộ app là việc của app đó.
- **Không là multi-tenant** (chỉ 1 tổ chức / owner duy nhất quản trị toàn constellation ở phase hiện tại).

---

## 6. Functional Scope

### 6.1 IDMS Core API

| Nhóm                 | Endpoint                                                                                                                                                                                   | Trạng thái                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Signup               | `/auth/signup/{send-otp, verify-otp, complete, check-email}`                                                                                                                               | ✅ có                                  |
| Login                | `/auth/login`, `/auth/login/otp/{send,verify}`, `/auth/login/magic-link/{send,verify}`                                                                                                     | ✅ có                                  |
| Logout               | `/auth/logout` (single sign-out, notify satellites)                                                                                                                                        | ⚠️ cần mở rộng cho back-channel logout |
| Token                | `/auth/token/refresh`                                                                                                                                                                      | ✅ có                                  |
| Forgot Password      | `/auth/forgot-password/{otp,magic-link,reset}`                                                                                                                                             | ✅ có                                  |
| Unlock               | `/auth/unlock/{request,verify}`                                                                                                                                                            | ✅ có                                  |
| User Profile         | `GET/PATCH /users/me`, `POST /users/me/avatar`, `GET /users/:id`                                                                                                                           | ✅ có                                  |
| **OAuth/OIDC**       | `/oauth/authorize`, `/oauth/token`, `/oauth/introspect`, `/oauth/revoke`, `/.well-known/openid-configuration`, `/.well-known/jwks.json`, `/oauth/userinfo`, `/oauth/logout` (RP-initiated) | ❌ **CHƯA CÓ — MVP-1**                 |
| **App Registry**     | `GET /apps` (user — catalog tất cả app `ACTIVE`, auth-guarded), `CRUD /admin/apps`, `CRUD /admin/apps/:id/entitlements`                                                                                    | ✅ user list (catalog) · ❌ entitlement-gated launch + admin entitlements CRUD (MVP-2) |
| **Favorites/Recent** | `POST/DELETE /users/me/favorites/:appId`, `GET /users/me/recent-apps`                                                                                                                      | ❌ chưa có                             |
| Login History        | `GET /login-history` (mình), `GET /admin/login-history`                                                                                                                                    | ✅ có                                  |
| Contact Admin        | `POST /contact/submit`, admin CRUD                                                                                                                                                         | ✅ có                                  |
| **Admin Power**      | force-logout user, lock/unlock, reset-password override                                                                                                                                    | ⚠️ cần bổ sung                         |

### 6.2 IDMS Frontend (Next.js 15)

| Route group  | Routes                                                                                                        | Trạng thái                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Public       | `/login`, `/signup`, `/forgot-password`, `/contact-admin`                                                     | ✅ có                                              |
| **OAuth UX** | `/oauth/authorize` (consent screen)                                                                           | ❌ MVP-1                                           |
| Dashboard    | `/`, `/apps`, `/discover`, `/favorites`, `/recently-used`, `/notifications`, `/login-history`, `/contacts/me` | ✅ shell có, cần wire vào App Registry             |
| Settings     | `/profile`, `/account-settings`, `/security`, `/billing`                                                     | ✅ có (Billing giữ như placeholder, không gỡ)     |
| Admin        | `/admin/contact`, `/admin/login-history`, **`/admin/apps`**, **`/admin/entitlements`**, **`/admin/users`**    | ✅ phần đầu / ❌ phần in đậm cần build             |

**Loại bỏ**: khu vực "Categories" 10 mục cứng trong sidebar (Productivity/Creativity/Health/Shopping…) — không phù hợp với IDMS portal. Category vẫn tồn tại như metadata của App entry (admin tự định nghĩa, vd: "Content", "Internal Tools"), không hardcode.

### 6.3 Satellite App Integration Contract (OAuth Client)

Mỗi app vệ tinh phải:

1. **Đăng ký** với IDMS qua admin UI để nhận `client_id` + `client_secret` (nếu confidential) + đăng ký `redirect_uris`.
2. **Implement Authorization Code + PKCE flow** chuẩn OIDC.
3. **Validate access token** bằng JWKS local cho request thông thường; gọi `/oauth/introspect` cho action nhạy cảm (vd: thanh toán, admin action, xoá vĩnh viễn).
4. **Đọc profile** từ ID token claims hoặc gọi `/oauth/userinfo`; KHÔNG lưu copy của profile core (tier 1) — chỉ cache với TTL ngắn.
5. **Lắng nghe back-channel logout** tại `/auth/backchannel-logout` (callback do IDMS post tới khi global sign-out).
6. **Đọc `locale` claim** để render đúng ngôn ngữ.

---

## 7. Non-Functional Requirements

| Yêu cầu           | Spec                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **i18n**          | EN (default, no URL prefix) + VI (`/vi`). next-intl @ FE, i18next @ BE (email/error). Locale truyền sang satellite qua ID token claim.                                                            |
| **A11y**          | WCAG 2.1 AA.                                                                                                                                                                                      |
| **Performance**   | SSR/RSC mặc định, code-split, React Query cache; theo `standard-performance`.                                                                                                                     |
| **Security**      | JWT trong HttpOnly cookie ở IDMS UI. Bcrypt password. Rate limit per-module (signup/login/contact). Helmet + Joi validation. PKCE bắt buộc cho public client. Refresh token rotation + blacklist. |
| **Observability** | Winston structured logging (daily rotate). BullMQ dashboard cho job queue.                                                                                                                        |
| **Reliability**   | BullMQ retry + fallback cho email.                                                                                                                                                                |
| **Compatibility** | Dev: localhost multi-port. Prod: cross-domain (không dựa vào cookie share). Mọi giả định cross-origin phải config CORS rõ ràng.                                                                   |

---

## 8. Key Architectural Decisions (ADR summary)

| ADR     | Quyết định                                                        | Lý do                                                                                                |
| ------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| ADR-001 | OAuth 2.0 / OIDC chuẩn (không cookie-share, không custom token)   | App vệ tinh sẽ cross-domain ở prod; OIDC là chuẩn industry, có ecosystem (lib client sẵn).           |
| ADR-002 | Authorization Code + PKCE + consent screen                        | First-party app vẫn cần consent để minh bạch + tránh confused deputy. PKCE bảo vệ public SPA client. |
| ADR-003 | Token validation hybrid: JWKS local + introspection cho sensitive | Cân bằng latency vs revoke real-time.                                                                |
| ADR-004 | Profile 2-tier: core @ IDMS, app-specific @ satellite             | SSOT cho identity, nhưng cho phép app mở rộng metadata mà không phình schema IDMS.                   |
| ADR-005 | Asymmetric logout (IDMS = global, satellite = local)              | Match mental model: "đăng xuất khỏi tài khoản" ≠ "đóng app".                                         |
| ADR-006 | Per-user entitlement (không chỉ role-based)                       | Linh hoạt: cùng role nhưng admin có thể grant/revoke cá biệt.                                        |
| ADR-007 | App registry DB-managed (không hardcoded)                         | Thêm app không phải redeploy IDMS.                                                                   |
| ADR-008 | Locale sync qua ID token claim                                    | Một nguồn chân lý, app không tự đoán.                                                                |

Mỗi ADR sẽ có file chi tiết riêng trong `docs/adr/` khi feature tương ứng được spec.

---

## 9. Tech Stack (fixed)

Chi tiết version: `.claude/techstack/frontend.md`, `.claude/techstack/backend.md`.

| Layer           | Stack                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| FE              | Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui, Zustand, TanStack Query, RHF + Zod, next-intl       |
| BE              | Express 4, Mongoose 8 (MongoDB), Redis + BullMQ, Nodemailer + React Email, jsonwebtoken, bcrypt, Joi, i18next |
| OAuth lib (mới) | TBD (sẽ chọn ở phase MVP-1: cân nhắc `node-oidc-provider` hoặc tự implement minimal — tùy ADR riêng)          |

---

## 10. Roadmap (MVP order)

> Mỗi phase đi qua pipeline SDD đầy đủ. Output ở `specs/{feature-name}/`.

| #           | Phase                                                                                                                           | Mục tiêu                                                                                                                                     | Phụ thuộc                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **MVP-1**   | OAuth/OIDC server                                                                                                               | Đủ Authorization Code + PKCE + consent + JWKS + introspection + RP-initiated logout + back-channel logout. Test bằng client giả lập.         | —                               |
| **MVP-2**   | App registry + entitlement                                                                                                      | App model + admin CRUD UI + per-user entitlement + dashboard hiển thị app theo entitlement + Favorites/RecentlyUsed wired.                   | MVP-1 (để có client_id mapping) |
| **MVP-3**   | Tách Blog thành satellite                                                                                                       | Scaffold project blog mới, migrate `apps/blog/*` ra src riêng, đăng ký Blog vào IDMS như app vệ tinh đầu tiên, validate end-to-end SSO flow. | MVP-1, MVP-2                    |
| **MVP-4**   | UI polish + Admin tools                                                                                                         | Hoàn thiện admin force-logout, lock/unlock, reset-password override. Loại bỏ Categories hardcoded. Notifications wire vào event thật.        | MVP-2                           |
| **Backlog** | Discover algorithm, Billing thực, Anomaly detection nâng cao, OAuth provider khác (Google/GitHub login social) | —                                                                                                                                            | —                               |

---

## 11. Out of Scope (phiên bản hiện tại)

- Payment gateway thực (Billing UI giữ làm placeholder).
- Team collaboration (mời thành viên, vai trò owner/admin/member): **Non-Goal** — trái mô hình single-tenant (§5). Placeholder UI `/team` đã được gỡ bỏ.
- Social login (Google/GitHub) — sẽ vào backlog sau MVP-4.
- Push notification real-time (WebSocket/SSE) — Notifications hiện chỉ là inbox.
- Mobile native app.
- Multi-tenant / workspace isolation.
- SCIM / directory sync với hệ thống ngoài.

---

## 12. Open Questions (defer — quyết định khi vào spec tương ứng)

1. Chọn lib OAuth/OIDC server: `node-oidc-provider` (đầy đủ chuẩn, nặng) vs custom minimal (gọn, tự kiểm soát) → **quyết định ở spec MVP-1**.
2. Cơ chế back-channel logout: signed JWT logout token (chuẩn OIDC Back-Channel Logout 1.0) vs custom webhook → **quyết định ở spec MVP-1**.
3. Refresh token storage: DB persistent vs Redis vs hybrid → **quyết định ở spec MVP-1**.
4. Consent persistence: lưu user-đã-consent app nào ở đâu (Mongo collection riêng?) → **quyết định ở spec MVP-1**.
5. UI Discover thuật toán: featured (admin curate) vs activity-based (most-used in org) → **quyết định ở spec MVP-2**.

---

## 13. Changelog

| Date       | Change                                            |
| ---------- | ------------------------------------------------- |
| 2026-05-23 | Initial — định vị IDMS, scope MVP-1..4, glossary. |
| 2026-06-29 | Gỡ bỏ Team collaboration placeholder (FE + docs); Team thành Non-Goal dứt khoát (single-tenant). |
