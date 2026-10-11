// types
import type { LoginEventPayload } from "../../types";
import type { LoginHistoryRepository } from "../../repository/login-history.repository";
// others
import { Logger } from "@/libs/logger";
import { buildLoginHistoryData } from "../../helpers";

/**
 * Ba method `record*` không cần đánh giá bất thường đổ về đây (đăng nhập
 * thành công tự ghi trong `record-successful-login.ts`). Chạm Mongo nên không
 * phải helper, và dùng chung bởi nhiều method nên nằm ở `shared/`.
 *
 * Không bao giờ throw: ghi lịch sử hỏng không được làm hỏng lần đăng nhập.
 */
export const logLoginAttempt = async (
  loginHistoryRepo: LoginHistoryRepository,
  payload: LoginEventPayload
): Promise<void> => {
  try {
    const { userId, usernameAttempted, status, loginMethod } = payload;

    await loginHistoryRepo.create(buildLoginHistoryData(payload));

    Logger.info("Login history logged successfully", {
      userId,
      usernameAttempted,
      status,
      loginMethod
    });
  } catch (error) {
    Logger.error("Failed to log login history", {
      error,
      payload: {
        userId: payload.userId,
        usernameAttempted: payload.usernameAttempted,
        status: payload.status,
        loginMethod: payload.loginMethod
      }
    });
  }
};
