# Ánh xạ ID cũ → mới (2026-10-13)

Bộ test được đổi sang quy ước của skill `scaffold-automation-testing`: mã module trong ID = tên thư mục module viết HOA bỏ gạch, bug đánh số theo module. Spec cũ dưới `docs/specs/` (ngoài `automation-test/`) và `docs/runs/run-2026-10-11.md` giữ ID cũ như bản ghi lịch sử — tra bảng này.

## Mã module (REQ / TC)

| Cũ           | Mới                 | Module                |
| ------------ | ------------------- | --------------------- |
| `ADMAPPS`    | `ADMINAPPS`         | `admin-apps`          |
| `ADMCAT`     | `ADMINCATEGORIES`   | `admin-categories`    |
| `ADMCONTACT` | `ADMINCONTACT`      | `admin-contact`       |
| `ADMENT`     | `ADMINENTITLEMENTS` | `admin-entitlements`  |
| `ADMLOGHIST` | `ADMINLOGINHISTORY` | `admin-login-history` |
| `ADMUSERS`   | `ADMINUSERS`        | `admin-users`         |
| `FAV`        | `FAVORITES`         | `favorites`           |
| `LOGHIST`    | `LOGINHISTORY`      | `login-history`       |
| `NOTIF`      | `NOTIFICATIONS`     | `notifications`       |
| `PWD`        | `PASSWORD`          | `password`            |
| `RECENT`     | `RECENTLYUSED`      | `recently-used`       |

Giữ nguyên: `AUTH`, `AUTHZ`, `APPS`, `HOME`, `OIDC`, `OPS`, `PROFILE`, `SETTINGS`, `SUPPORT`. Số thứ tự không đổi (`TC-PWD-045` → `TC-PASSWORD-045`).

## Bug

| Cũ      | Mới                                                                                    | File                             |
| ------- | -------------------------------------------------------------------------------------- | -------------------------------- |
| BUG-001 | [BUG-AUTHZ-01](../defects/authz.md#bug-authz-01)                                       | `defects/authz.md`               |
| BUG-002 | [BUG-AUTH-01](../defects/auth.md#bug-auth-01)                                          | `defects/auth.md`                |
| BUG-003 | [BUG-PASSWORD-01](../defects/password.md#bug-password-01)                              | `defects/password.md`            |
| BUG-004 | [BUG-PASSWORD-02](../defects/password.md#bug-password-02)                              | `defects/password.md`            |
| BUG-005 | [BUG-PASSWORD-03](../defects/password.md#bug-password-03)                              | `defects/password.md`            |
| BUG-006 | [BUG-AUTH-02](../defects/auth.md#bug-auth-02)                                          | `defects/auth.md`                |
| BUG-007 | [BUG-AUTH-03](../defects/auth.md#bug-auth-03)                                          | `defects/auth.md`                |
| BUG-008 | [BUG-OIDC-01](../defects/oidc.md#bug-oidc-01)                                          | `defects/oidc.md`                |
| BUG-009 | [BUG-OIDC-02](../defects/oidc.md#bug-oidc-02)                                          | `defects/oidc.md`                |
| BUG-010 | [BUG-AUTHZ-02](../defects/authz.md#bug-authz-02)                                       | `defects/authz.md`               |
| BUG-011 | [BUG-PROFILE-01](../defects/profile.md#bug-profile-01)                                 | `defects/profile.md`             |
| BUG-012 | [BUG-PROFILE-02](../defects/profile.md#bug-profile-02)                                 | `defects/profile.md`             |
| BUG-013 | [BUG-ADMINLOGINHISTORY-01](../defects/admin-login-history.md#bug-adminloginhistory-01) | `defects/admin-login-history.md` |
| BUG-014 | [BUG-LOGINHISTORY-01](../defects/login-history.md#bug-loginhistory-01)                 | `defects/login-history.md`       |
| BUG-015 | [BUG-ADMINUSERS-01](../defects/admin-users.md#bug-adminusers-01)                       | `defects/admin-users.md`         |
| BUG-016 | [BUG-APPS-01](../defects/apps.md#bug-apps-01)                                          | `defects/apps.md`                |
| BUG-017 | [BUG-AUTH-04](../defects/auth.md#bug-auth-04)                                          | `defects/auth.md`                |
| BUG-018 | [BUG-PASSWORD-04](../defects/password.md#bug-password-04)                              | `defects/password.md`            |
| BUG-019 | [BUG-SUPPORT-01](../defects/support.md#bug-support-01)                                 | `defects/support.md`             |
| BUG-020 | [BUG-ADMINCONTACT-01](../defects/admin-contact.md#bug-admincontact-01)                 | `defects/admin-contact.md`       |
| BUG-021 | [BUG-OIDC-03](../defects/oidc.md#bug-oidc-03)                                          | `defects/oidc.md`                |
| BUG-022 | [BUG-OIDC-04](../defects/oidc.md#bug-oidc-04)                                          | `defects/oidc.md`                |
| BUG-023 | [BUG-OIDC-05](../defects/oidc.md#bug-oidc-05)                                          | `defects/oidc.md`                |
| BUG-024 | [BUG-OPS-01](../defects/ops.md#bug-ops-01)                                             | `defects/ops.md`                 |
| BUG-025 | [BUG-PROFILE-03](../defects/profile.md#bug-profile-03)                                 | `defects/profile.md`             |
| BUG-026 | [BUG-PROFILE-04](../defects/profile.md#bug-profile-04)                                 | `defects/profile.md`             |
| BUG-027 | [BUG-ADMINAPPS-01](../defects/admin-apps.md#bug-adminapps-01)                          | `defects/admin-apps.md`          |
| BUG-028 | [BUG-ADMINCATEGORIES-01](../defects/admin-categories.md#bug-admincategories-01)        | `defects/admin-categories.md`    |
| BUG-029 | [BUG-AUTHZ-03](../defects/authz.md#bug-authz-03)                                       | `defects/authz.md`               |
| BUG-030 | [BUG-ADMINUSERS-02](../defects/admin-users.md#bug-adminusers-02)                       | `defects/admin-users.md`         |
| BUG-031 | [BUG-PASSWORD-05](../defects/password.md#bug-password-05)                              | `defects/password.md`            |
| BUG-032 | [BUG-SETTINGS-01](../defects/settings.md#bug-settings-01)                              | `defects/settings.md`            |

## Mức ưu tiên

| Cũ  | Mới |
| --- | --- |
| P1  | P0  |
| P2  | P1  |
| P3  | P2  |

Mức bug: S1 → Cao, S2 → Trung bình, S3 → Thấp.
