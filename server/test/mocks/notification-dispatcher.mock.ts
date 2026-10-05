// types
import type { NotificationDispatcher } from "@/services/notification/notification.dispatcher";

export function createNotificationDispatcherMock(): jest.Mocked<NotificationDispatcher> {
  return {
    notify: jest.fn(),
    notifyByAuthId: jest.fn(),
    broadcast: jest.fn()
  } as unknown as jest.Mocked<NotificationDispatcher>;
}
