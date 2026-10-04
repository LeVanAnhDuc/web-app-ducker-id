// others
import { initSigningKeys } from "@/libs/jwks";

/**
 * Nạp khoá ký OIDC ngay lúc boot.
 *
 * Nếu để lazy, cấu hình khoá sai sẽ chỉ nổ ở request đăng nhập đầu tiên —
 * lúc đó server đã báo "ready" và lỗi trông như lỗi runtime ngẫu nhiên. Chạy
 * trước loadModules để fail fast.
 */
export const loadSigningKeys = (): void => {
  initSigningKeys();
};
