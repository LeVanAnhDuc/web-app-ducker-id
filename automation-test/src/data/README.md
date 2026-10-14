# data/

**Trả lời câu hỏi:** test dùng **giá trị** gì?

| File           | Nội dung                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `copy.ts`      | Text UI (`copy.<namespace>`) và message server (`serverMessage.<namespace>`), **import thẳng** từ `client/src/locales/en/*.json` và `server/src/i18n/locales/en/*.json`; `fill()` điền placeholder `{x}` / `{{x}}` |
| `test-data.ts` | Hằng số dữ liệu test: `THROWAWAY_DOMAIN`, `KNOWN_OTP`, `WRONG_PASSWORD`…                                                                                                                                           |

## Quy tắc

- Spec không viết chuỗi assert trực tiếp: lấy từ `copy` / `serverMessage`. App đổi chữ → test đọc chữ mới, không sửa gì.
- Namespace chưa có → thêm một dòng import JSON trong `copy.ts`. Cần tiếng Việt → import file `vi` cùng cách.
- Mã lỗi API (`LOGIN_INVALID_CREDENTIALS`) không phải copy: viết literal trong spec.
- Chỉ giá trị: không đọc `.env`, không gọi mạng.
- Dữ liệu sinh ngẫu nhiên phải duy nhất mỗi lần gọi (`throwawayEmail()` ở `utils/accounts.ts` gắn run id + pid).

**Import được:** `utils/` và file locale của client/server. Không import gì khác trong `src/`.
