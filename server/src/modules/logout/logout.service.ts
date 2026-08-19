// others
import { Logger } from "@/libs/logger";
import { RequestContext } from "@/utils/request-context";

export class LogoutService {
  async logout(): Promise<void> {
    const userId = RequestContext.requireUserId();
    Logger.info("Logout successful", { userId });
  }
}
