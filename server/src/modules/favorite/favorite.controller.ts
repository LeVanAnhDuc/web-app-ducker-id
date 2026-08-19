// types
import type { Response } from "express";
import type {
  FavoriteAppIdRequest,
  ListFavoritesRequest
} from "@/modules/favorite/types";
import type { FavoriteService } from "./favorite.service";
// commons
import {
  CreatedSuccess,
  NoContentSuccess,
  OkSuccess
} from "@/common/responses";

export class FavoriteController {
  constructor(private readonly service: FavoriteService) {}

  add = async (req: FavoriteAppIdRequest, res: Response): Promise<void> => {
    await this.service.add(req.params.appId);
    new CreatedSuccess({ message: "favorite:success.add" }).send(req, res);
  };

  remove = async (req: FavoriteAppIdRequest, res: Response): Promise<void> => {
    await this.service.remove(req.params.appId);
    new NoContentSuccess().send(req, res);
  };

  list = async (req: ListFavoritesRequest, res: Response): Promise<void> => {
    const data = await this.service.list(req.query);
    new OkSuccess({ data, message: "favorite:success.list" }).send(req, res);
  };
}
