// types
import type { Response } from "express";
import type {
  NotificationListRequest,
  NotificationIdRequest
} from "@/modules/notification/types";
import type { NotificationService } from "./notification.service";
// common
import { OkSuccess } from "@/common/responses";

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  list = async (req: NotificationListRequest, res: Response): Promise<void> => {
    const data = await this.service.list(req.query);
    new OkSuccess({ data, message: "notification:success.list" }).send(
      req,
      res
    );
  };

  unreadCount = async (
    req: NotificationListRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.unreadCount();
    new OkSuccess({ data, message: "notification:success.unreadCount" }).send(
      req,
      res
    );
  };

  markRead = async (
    req: NotificationIdRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.markRead(req.params.id);
    new OkSuccess({ data, message: "notification:success.markRead" }).send(
      req,
      res
    );
  };

  markAllRead = async (
    req: NotificationListRequest,
    res: Response
  ): Promise<void> => {
    const data = await this.service.markAllRead();
    new OkSuccess({ data, message: "notification:success.markAllRead" }).send(
      req,
      res
    );
  };
}
