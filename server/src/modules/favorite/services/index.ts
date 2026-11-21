// types
import type { UserAppDto } from "@/modules/web-app/dtos";
import type { ListFavoritesQueryDto } from "../dtos/requests";
import type { FavoriteServiceDeps } from "./deps";
// others
import { add } from "./add";
import { list } from "./list";
import { remove } from "./remove";

export class FavoriteService {
  constructor(private readonly deps: FavoriteServiceDeps) {}

  add(appId: string): Promise<void> {
    return add(this.deps, appId);
  }

  remove(appId: string): Promise<void> {
    return remove(this.deps, appId);
  }

  list(query: ListFavoritesQueryDto): Promise<{ items: UserAppDto[] }> {
    return list(this.deps, query);
  }
}
