# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature Logout là một endpoint đơn giản xóa refresh token khỏi HTTP-only cookie. Yêu cầu valid access token (Bearer auth) thông qua middleware `authGuard`. Không tương tác với database hay Redis. Client chịu trách nhiệm xóa access token và id token khỏi memory.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
Client                              Server (Express)
┌──────────┐                        ┌──────────────────────────────┐
│ POST     │                        │ authGuard middleware          │
│ /auth/   │──Bearer token────────▶ │   ↓ (verify JWT)            │
│ logout   │                        │ LogoutController             │
│          │                        │   ↓                          │
│          │◀──clearCookie──────────│ LogoutService.logout()       │
│          │  + 204 No Content      │   ↓                          │
│ Xóa AT,  │                        │ res.clearCookie(refreshToken) │
│ IT local │                        └──────────────────────────────┘
└──────────┘
```

---

## 3.3. Data Model

Không thay đổi. Feature này không tương tác với database.

---

## 3.4. API Design

### Endpoint: Logout

```
POST /api/v1/auth/logout

Headers:
  Authorization: Bearer {accessToken}

Request Body: Không có

Response 204: No Content (không có body)

Set-Cookie: refreshToken=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax

Response 401: Access token không hợp lệ hoặc thiếu
```

---

## 3.5. Luồng xử lý chính (Main Flow)

```
1. Client gửi POST /api/v1/auth/logout với Authorization: Bearer {accessToken}
2. Middleware authGuard:
   a. Extract token từ Authorization header
   b. verifyAccessToken(token) → decode payload
   c. Gán req.user = { userId, authId, email, roles }
   d. Nếu lỗi → throw UnauthorizedError
3. LogoutController.logout(req, res):
   a. Gọi service.logout(req.user!.userId)
   b. res.clearCookie(REFRESH_TOKEN, REFRESH_TOKEN_COOKIE_OPTIONS)
      - REFRESH_TOKEN = "refreshToken" (từ constants/modules/token)
      - REFRESH_TOKEN_COOKIE_OPTIONS (từ config/cookie.ts):
        { httpOnly: true, secure: ..., sameSite: ..., path: "/" }
   c. Trả response 204 No Content qua new NoContentSuccess().send(req, res)
4. LogoutService.logout(userId):
   a. Logger.info("Logout successful", { userId })
   b. Return void
```

---

## 3.6. Cấu trúc file (File Structure)

```
server/src/
├── modules/logout/
│   ├── logout.module.ts         # Factory function: tạo service, controller, gọi createLogoutRoutes()
│   ├── logout.controller.ts     # Handler: clearCookie + NoContentSuccess
│   ├── logout.routes.ts         # Route wiring: POST / với authGuard + asyncHandler
│   ├── logout.service.ts        # Business logic (log + return void)
│   └── swagger/
│       ├── index.ts             # Export paths + schemas
│       ├── paths.ts             # OpenAPI path definition
│       └── schemas.ts           # OpenAPI schema (LogoutResponse)
├── config/
│   └── cookie.ts                # REFRESH_TOKEN_COOKIE_OPTIONS (shared)
├── constants/modules/token/
│   └── index.ts                 # REFRESH_TOKEN constant (shared)
├── types/modules/
│   └── logout.ts                # LogoutRequest type (= Request)
└── middlewares/guards/
    └── auth.guard.ts            # authGuard middleware (shared)
```

---

## 3.7. Dependencies & Integrations

| Dependency                   | Loại     | Mô tả                                          | Ghi chú                          |
| ---------------------------- | -------- | ----------------------------------------------- | -------------------------------- |
| authGuard                    | Internal | Middleware xác thực Bearer token                 | middlewares/guards/auth.guard.ts  |
| Logger                       | Internal | Ghi log logout events                           | utils/logger                     |
| REFRESH_TOKEN                | Internal | Tên cookie refresh token                        | constants/modules/token/index.ts  |
| REFRESH_TOKEN_COOKIE_OPTIONS | Internal | Cookie options cho refresh token                | config/cookie.ts                  |
| NoContentSuccess             | Internal | Response class trả 204 No Content               | config/responses/success.ts       |

---

## 3.8. Migration & Deployment Strategy

**Feature flag:** Không sử dụng.

**Rollback plan:**
- Revert deployment
- Không có side effects cần cleanup (không tương tác DB/Redis)
