// types
import type { FavoriteRepository } from "./favorite.repository";
import type { WebAppRepository } from "@/modules/web-app/repositories";
import type { AppFavoritableGuard } from "./guards";
// commons
import { NotFoundError } from "@/common/exceptions";
// modules
import { FavoriteService } from "./favorite.service";
import { RequestContext } from "@/utils/request-context";

const USER = "507f1f77bcf86cd799439011";

const makeDoc = (id: string, displayName: string) => ({
  _id: { toString: () => id },
  displayName,
  description: null,
  iconUrl: null,
  homeUrl: `https://${id}.example.com`,
  category: null
});

const makeDeps = () => {
  const favoriteRepo = {
    add: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    findWebAppIdsByUser: jest.fn().mockResolvedValue([]),
    findFavoritedAppIds: jest.fn().mockResolvedValue(new Set<string>())
  };
  const webAppRepo = {
    findById: jest.fn().mockResolvedValue(null),
    findActiveByIds: jest.fn().mockResolvedValue([])
  };
  const guard = {
    assert: jest.fn().mockResolvedValue(undefined)
  };
  const makeService = () =>
    new FavoriteService(
      favoriteRepo as unknown as FavoriteRepository,
      webAppRepo as unknown as WebAppRepository,
      guard as unknown as AppFavoritableGuard
    );
  return { favoriteRepo, webAppRepo, guard, makeService };
};

describe("FavoriteService", () => {
  beforeEach(() => {
    jest.spyOn(RequestContext, "requireUserId").mockReturnValue(USER);
    jest
      .spyOn(RequestContext, "getUser")
      .mockReturnValue({ sub: USER, authId: "auth1", roles: "user" });
  });
  afterEach(() => jest.restoreAllMocks());

  it("add asserts favoritable then upserts the favorite", async () => {
    const { favoriteRepo, guard, makeService } = makeDeps();
    const svc = makeService();

    await svc.add("app1");

    expect(guard.assert).toHaveBeenCalledWith("app1", "user");
    expect(favoriteRepo.add).toHaveBeenCalledWith(USER, "app1");
  });

  it("add throws and does not upsert when guard rejects", async () => {
    const { favoriteRepo, guard, makeService } = makeDeps();
    guard.assert.mockRejectedValue(
      new NotFoundError({
        i18nMessage: (t) => t("favorite:errors.appNotFound")
      })
    );
    const svc = makeService();

    await expect(svc.add("missing")).rejects.toBeInstanceOf(NotFoundError);
    expect(favoriteRepo.add).not.toHaveBeenCalled();
  });

  it("remove deletes the favorite", async () => {
    const { favoriteRepo, makeService } = makeDeps();
    const svc = makeService();

    await svc.remove("app1");

    expect(favoriteRepo.remove).toHaveBeenCalledWith(USER, "app1");
  });

  it("list returns items in recent (favorited) order by default", async () => {
    const { favoriteRepo, webAppRepo, makeService } = makeDeps();
    favoriteRepo.findWebAppIdsByUser.mockResolvedValue(["a", "b", "c"]);
    // repo returns in arbitrary order — service must re-rank by orderedIds
    webAppRepo.findActiveByIds.mockResolvedValue([
      makeDoc("c", "Charlie"),
      makeDoc("a", "Alpha"),
      makeDoc("b", "Bravo")
    ]);
    const svc = makeService();

    const res = await svc.list({});

    expect(res.items.map((i) => i._id)).toEqual(["a", "b", "c"]);
    expect(res.items.every((i) => i.isFavorite)).toBe(true);
    expect(webAppRepo.findActiveByIds).toHaveBeenCalledWith(["a", "b", "c"], {
      role: "user",
      search: undefined,
      categoryId: undefined
    });
  });

  it("list sorts items by name when sort=name", async () => {
    const { favoriteRepo, webAppRepo, makeService } = makeDeps();
    favoriteRepo.findWebAppIdsByUser.mockResolvedValue(["a", "b", "c"]);
    webAppRepo.findActiveByIds.mockResolvedValue([
      makeDoc("a", "Charlie"),
      makeDoc("b", "Alpha"),
      makeDoc("c", "Bravo")
    ]);
    const svc = makeService();

    const res = await svc.list({ sort: "name" });

    expect(res.items.map((i) => i.displayName)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie"
    ]);
  });

  it("list returns empty without querying apps when user has no favorites", async () => {
    const { favoriteRepo, webAppRepo, makeService } = makeDeps();
    favoriteRepo.findWebAppIdsByUser.mockResolvedValue([]);
    const svc = makeService();

    const res = await svc.list({});

    expect(res.items).toEqual([]);
    expect(webAppRepo.findActiveByIds).not.toHaveBeenCalled();
  });
});
