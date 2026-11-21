// libs
import { Get, JsonController, Patch } from "routing-controllers";
// types
import type { NotificationService } from "./services";
// common
import { Auth, Respond, ValidParams, ValidQuery } from "@/common/routing";
// others
import {
  NotificationIdParamsDto,
  NotificationListQueryDto
} from "./dtos/requests";

@JsonController("/notifications")
@Auth()
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get("/unread-count")
  @Respond({ message: "notification:success.unreadCount" })
  unreadCount() {
    return this.service.unreadCount();
  }

  @Patch("/read-all")
  @Respond({ message: "notification:success.markAllRead" })
  markAllRead() {
    return this.service.markAllRead();
  }

  @Get("/")
  @Respond({ message: "notification:success.list" })
  list(@ValidQuery(NotificationListQueryDto) query: NotificationListQueryDto) {
    return this.service.list(query);
  }

  @Patch("/:id/read")
  @Respond({ message: "notification:success.markRead" })
  markRead(
    @ValidParams(NotificationIdParamsDto) params: NotificationIdParamsDto
  ) {
    return this.service.markRead(params.id);
  }
}
