// types
import type {
  FavoriteAppIdRequest,
  ListFavoritesRequest
} from "@/modules/favorite/types";
import type { FavoriteService } from "./services";

export class FavoriteController {
  constructor(private readonly service: FavoriteService) {}

  add = async (req: FavoriteAppIdRequest) => {
    await this.service.add(req.params.appId);
  };

  remove = async (req: FavoriteAppIdRequest) => {
    await this.service.remove(req.params.appId);
  };

  list = async (req: ListFavoritesRequest) => this.service.list(req.query);
}
