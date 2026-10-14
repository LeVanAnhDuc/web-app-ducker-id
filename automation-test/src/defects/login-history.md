# LOGINHISTORY — Bug log

## Đang mở

| Bug                                         | Mức        | TC                                       | Tóm tắt                                                                                                                            |
| ------------------------------------------- | ---------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [BUG-LOGINHISTORY-01](#bug-loginhistory-01) | Trung bình | TC-LOGINHISTORY-017, TC-LOGINHISTORY-022 | Lịch sử đăng nhập của chính user thiếu lý do thất bại, hệ điều hành và cờ bất thường (không có cột; item API không có `isAnomaly`) |

### BUG-LOGINHISTORY-01

- **TC:** TC-LOGINHISTORY-017, TC-LOGINHISTORY-022 · **Requirement:** REQ-LOGINHISTORY-01
- **Mức:** Trung bình · **Phát hiện:** 2026-10-10 · **Mã cũ:** BUG-014
- **Bước tái hiện:** chạy test của TC-LOGINHISTORY-017, TC-LOGINHISTORY-022 — `tests/e2e/login-history/filters.e2e.ts` ("A failed row shows its reason, the OS and the anomaly flag"), `tests/api/login-history/my-history.api.ts` ("Rows carry the anomaly flag")
- **Mong đợi:** như README / REQ-LOGINHISTORY-01
- **Thực tế:** Lịch sử đăng nhập của chính user thiếu lý do thất bại, hệ điều hành và cờ bất thường (không có cột; item API không có `isAnomaly`)

## Đã sửa

_(chưa có)_
