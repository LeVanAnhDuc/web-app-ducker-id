// libs
import { Get, JsonController, Patch } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { NotificationService } from "./notification.service";
// common
import { ApiErrors, ApiProperty, Paginated } from "@/common/openapi";
import { Auth, PathVariable, RequestParam, Respond } from "@/common/routing";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";
// others
import {
  MarkedReadCountDto,
  NotificationItemDto,
  UnreadCountDto
} from "./dtos";
import { NotificationListQueryDto } from "./dtos/requests";

// Every failure takes the one key.
const NOTIFICATION_ID = [
  IsRequiredObjectId("validation:id.invalid"),
  ApiProperty({
    example: "507f1f77bcf86cd799439012",
    description: "MongoDB ObjectId of the notification"
  })
];

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
  list(
    @RequestParam(NotificationListQueryDto) query: NotificationListQueryDto
  ) {
    return this.service.list(query);
  }

  @Patch("/:id/read")
  @OpenAPI({ summary: "Mark one notification as read" })
  @ApiErrors(404)
  @Respond({
    message: "notification:success.markRead",
    type: NotificationItemDto
  })
  markRead(@PathVariable("id", ...NOTIFICATION_ID) id: string) {
    return this.service.markRead(id);
  }
}
