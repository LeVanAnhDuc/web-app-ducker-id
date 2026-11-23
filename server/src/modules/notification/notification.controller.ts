// libs
import { Get, JsonController, Patch } from "routing-controllers";
// types
import type { NotificationService } from "./notification.service";
// common
import { Auth, PathVariable, RequestParam, Respond } from "@/common/routing";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import { NotificationListQueryDto } from "./dtos/requests";

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
  list(
    @RequestParam(NotificationListQueryDto) query: NotificationListQueryDto
  ) {
    return this.service.list(query);
  }

  @Patch("/:id/read")
  @Respond({ message: "notification:success.markRead" })
  markRead(
    @PathVariable("id", IsRequiredObjectId("validation:id.invalid")) id: string
  ) {
    return this.service.markRead(id);
  }
}
