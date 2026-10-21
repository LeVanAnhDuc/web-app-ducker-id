// types
import type {
  NotificationListRequest,
  NotificationIdRequest
} from "@/modules/notification/types";
import type { NotificationService } from "./services";

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  list = async (req: NotificationListRequest) => this.service.list(req.query);

  unreadCount = async () => this.service.unreadCount();

  markRead = async (req: NotificationIdRequest) =>
    this.service.markRead(req.params.id);

  markAllRead = async () => this.service.markAllRead();
}
