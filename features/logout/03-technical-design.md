# TÀI LIỆU 3: THIẾT KẾ KỸ THUẬT (Technical Design)

---

## 3.1. Tổng quan kỹ thuật (Technical Overview)

Feature Logout là một endpoint đơn giản xóa refresh token khỏi HTTP-only cookie. Yêu cầu valid access token (Bearer auth) thông qua middleware `authenticate`. Không tương tác với database hay Redis. Client chịu trách nhiệm xóa access token và id token khỏi memory.

---

## 3.2. Kiến trúc tổng quan (Architecture Overview)

```
Client                              Server (Express)
┌──────────┐                        ┌──────────────────────────────┐
│ POST     │                        │ authenticate middleware      │
│ /auth/   │──Bearer token────────▶ │   ↓ (verify JWT)            │
│ logout   │                        │ LogoutController             │
│          │                        │   ↓                          │
│          │◀──clearCookie──────────│ LogoutService.logout()       │
│          │  + { success: true }   │   ↓                          │
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

Response 200:
{
  "message": "Đăng xuất thành công",
  "data": {
    "success": true
  }
}

Set-Cookie: refreshToken=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax

Response 401: Access token không hợp lệ hoặc thiếu
```

---

## 3.5. Luồng xử lý chính (Main Flow)

```
1. Client gửi POST /api/v1/auth/logout với Authorization: Bearer {accessToken}
2. Middleware authenticate:
   a. Extract token từ Authorization header
   b. verifyAccessToken(token) → decode payload
   c. Gán req.user = { userId, authId, email, roles }
   d. Nếu lỗi → throw UnauthorizedError
3. LogoutController.logout():
   a. Gọi service.logout(req) → nhận { data, message }
   b. res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: ENV.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
      })
   c. Trả response 200 với { success: true }
4. LogoutService.logout():
   a. Logger.info("Logout initiated", { userId })
   b. Logger.info("Logout successful", { userId })
   c. Return { message: t("logout:success.logoutSuccessful"), data: { success: true } }
```

---

## 3.6. Cấu trúc file (File Structure)

```
server/src/
├── modules/logout/
│   ├── logout.module.ts         # DI setup, export router & service
│   ├── logout.controller.ts     # Route handler: POST / (with authenticate middleware)
│   ├── logout.service.ts        # Business logic (log + return success)
│   └── swagger/
│       ├── index.ts             # Export paths + schemas
│       ├── paths.ts             # OpenAPI path definition
│       └── schemas.ts           # OpenAPI schema (LogoutResponse)
└── middlewares/
    └── auth.ts                  # authenticate middleware (shared)
```

---

## 3.7. Dependencies & Integrations

| Dependency     | Loại     | Mô tả                                   | Ghi chú                  |
| -------------- | -------- | ---------------------------------------- | ------------------------ |
| authenticate   | Internal | Middleware xác thực Bearer token          | middlewares/auth.ts      |
| Logger         | Internal | Ghi log logout events                    | utils/logger             |

---

## 3.8. Migration & Deployment Strategy

**Feature flag:** Không sử dụng.

**Rollback plan:**
- Revert deployment
- Không có side effects cần cleanup (không tương tác DB/Redis)
