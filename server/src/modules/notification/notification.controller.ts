// libs
import { Get, JsonController, Patch } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { NotificationService } from "./services";
// common
import { ApiErrors, Paginated } from "@/common/openapi";
import { Auth, Respond, ValidParams, ValidQuery } from "@/common/routing";
// others
import {
  MarkedReadCountDto,
  NotificationItemDto,
  UnreadCountDto
} from "./dtos";
import {
  NotificationIdParamsDto,
  NotificationListQueryDto
} from "./dtos/requests";

@JsonController("/notifications")
@Auth()
@OpenAPI({ tags: ["Notifications"] })
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get("/unread-count")
  @OpenAPI({ summary: "Count my unread notifications" })
  @Respond({
    message: "notification:success.unreadCount",
    type: UnreadCountDto
  })
  unreadCount() {
    return this.service.unreadCount();
  }

  @Patch("/read-all")
  @OpenAPI({ summary: "Mark all my notifications as read" })
  @Respond({
    message: "notification:success.markAllRead",
    type: MarkedReadCountDto
  })
  markAllRead() {
    return this.service.markAllRead();
  }

  @Get("/")
  @OpenAPI({
    summary: "List my notifications",
    description:
      "Newest first. Notifications are written by domain events (password changed, account locked, unusual sign-in, new app) through the `notification` queue, so a new one can appear a moment after the event. Only the caller's own notifications."
  })
  @Respond({
    message: "notification:success.list",
    type: Paginated(NotificationItemDto)
  })
  list(@ValidQuery(NotificationListQueryDto) query: NotificationListQueryDto) {
    return this.service.list(query);
  }

  @Patch("/:id/read")
  @OpenAPI({ summary: "Mark one notification as read" })
  @ApiErrors(404)
  @Respond({
    message: "notification:success.markRead",
    type: NotificationItemDto
  })
  markRead(
    @ValidParams(NotificationIdParamsDto) params: NotificationIdParamsDto
  ) {
    return this.service.markRead(params.id);
  }
}
