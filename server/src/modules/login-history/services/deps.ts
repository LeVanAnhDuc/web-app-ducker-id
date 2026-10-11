// types
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";
import type { LoginHistoryRepository } from "../repository/login-history.repository";

export interface LoginHistoryServiceDeps {
  loginHistoryRepo: LoginHistoryRepository;
  notificationDispatcher: NotificationDispatcher;
}
