export interface FavoriteRepository {
  add(userId: string, webAppId: string): Promise<void>;
  remove(userId: string, webAppId: string): Promise<void>;
  findWebAppIdsByUser(userId: string): Promise<string[]>;
  findFavoritedAppIds(
    userId: string,
    webAppIds: string[]
  ): Promise<Set<string>>;
}
