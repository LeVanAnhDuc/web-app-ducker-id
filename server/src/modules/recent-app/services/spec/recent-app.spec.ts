// types
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { FavoriteRepository } from "@/modules/favorite/repository/favorite.repository";
import type { RecentAppRepository } from "../../repository/recent-app.repository";
import type { RecentAppUsage } from "../../types";
// commons
import { NotFoundError } from "@/common/exceptions";
// modules
import { RecentAppService } from "../";
import { RECENT_APP_CONFIG } from "../../constants";
import { PAGINATION } from "@/common/pagination";
import { RequestContext } from "@/utils/request-context";

const USER = "507f1f77bcf86cd799439011";
const APP_A = "64b7f0c2f1a2b3c4d5e6f7a1";
const APP_B = "64b7f0c2f1a2b3c4d5e6f7b2";

const makeApp = (id: string, displayName: string) => ({
  _id: { toString: () => id },
  displayName,
  description: null,
  iconUrl: null,
  homeUrl: `https://${id}.example.com`,
  categoryIds: [],
  categories: []
});

const usage = (
  webAppId: string,
  minutesAgo: number,
  id = `${webAppId.slice(0, 20)}0001`
): RecentAppUsage => ({
  id,
  webAppId,
  lastUsedAt: new Date(Date.UTC(2026, 9, 4, 10, 0) - minutesAgo * 60_000),
  useCount: 3
});

const makeDeps = () => {
  const recentAppRepo = {
    record: jest.fn().mockResolvedValue(undefined),
    findVisibleWebAppIds: jest.fn().mockResolvedValue([]),
    findPage: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    findUsages: jest.fn().mockResolvedValue([]),
    hide: jest.fn().mockResolvedValue(undefined),
    hideAll: jest.fn().mockResolvedValue(undefined),
    restore: jest.fn().mockResolvedValue(undefined)
  };
  const webAppRepo = {
    findById: jest.fn().mockResolvedValue(null),
    findActiveByIds: jest.fn().mockResolvedValue([])
  };
  const favoriteRepo = {
    findFavoritedAppIds: jest.fn().mockResolvedValue(new Set<string>())
  };
  const service = new RecentAppService({
    recentAppRepo: recentAppRepo as unknown as RecentAppRepository,
    webAppRepo: webAppRepo as unknown as WebAppRepository,
    favoriteRepo: favoriteRepo as unknown as FavoriteRepository
  });
  return { recentAppRepo, webAppRepo, favoriteRepo, service };
};

describe("RecentAppService", () => {
  beforeEach(() => {
    jest.spyOn(RequestContext, "requireUserId").mockReturnValue(USER);
    jest
      .spyOn(RequestContext, "getUser")
      .mockReturnValue({ sub: USER, authId: "auth1", roles: "user" });
  });
  afterEach(() => jest.restoreAllMocks());

  describe("list", () => {
    it("returns an empty first page without touching the catalog when nothing was used", async () => {
      const { webAppRepo, service } = makeDeps();

      await expect(service.list({})).resolves.toEqual({
        items: [],
        meta: {
          total: 0,
          page: 1,
          limit: PAGINATION.DEFAULT_LIMIT,
          totalPages: 0
        }
      });
      expect(webAppRepo.findActiveByIds).not.toHaveBeenCalled();
    });

    it("pages only over apps the catalog still shows, newest first", async () => {
      const { recentAppRepo, webAppRepo, service } = makeDeps();
      recentAppRepo.findVisibleWebAppIds.mockResolvedValue([APP_A, APP_B]);
      webAppRepo.findActiveByIds.mockResolvedValue([makeApp(APP_A, "Blog")]);

      await service.list({ search: "blo", page: 2, limit: 5 });

      expect(webAppRepo.findActiveByIds).toHaveBeenCalledWith([APP_A, APP_B], {
        role: "user",
        search: "blo"
      });
      expect(recentAppRepo.findPage).toHaveBeenCalledWith(USER, [APP_A], {
        skip: 5,
        limit: 5,
        sort: { lastUsedAt: -1 }
      });
    });

    it("maps rows to DTOs in usage order with isFavorite, usage fields and page meta", async () => {
      const { recentAppRepo, webAppRepo, favoriteRepo, service } = makeDeps();
      recentAppRepo.findVisibleWebAppIds.mockResolvedValue([APP_A, APP_B]);
      webAppRepo.findActiveByIds.mockResolvedValue([
        makeApp(APP_A, "Blog"),
        makeApp(APP_B, "Shop")
      ]);
      const rows = [usage(APP_B, 5), usage(APP_A, 60)];
      recentAppRepo.findPage.mockResolvedValue({ data: rows, total: 3 });
      favoriteRepo.findFavoritedAppIds.mockResolvedValue(new Set([APP_A]));

      const page = await service.list({ limit: 2 });

      expect(page.items.map((i) => [i.displayName, i.isFavorite])).toEqual([
        ["Shop", false],
        ["Blog", true]
      ]);
      expect(page.items[0]).toMatchObject({
        lastUsedAt: rows[0].lastUsedAt.toISOString(),
        useCount: 3
      });
      expect(page.meta).toEqual({ total: 3, page: 1, limit: 2, totalPages: 2 });
    });
  });

  describe("recordLaunch", () => {
    it("records an active app visible to the user", async () => {
      const { recentAppRepo, webAppRepo, service } = makeDeps();
      webAppRepo.findById.mockResolvedValue({
        status: "ACTIVE",
        requiredRoles: ["user"]
      });

      await service.recordLaunch(APP_A);

      expect(recentAppRepo.record).toHaveBeenCalledWith(
        USER,
        APP_A,
        expect.any(Date),
        RECENT_APP_CONFIG.DEDUPE_WINDOW_MS
      );
    });

    it.each([
      ["missing", null],
      ["inactive", { status: "INACTIVE", requiredRoles: ["user"] }],
      ["admin-only", { status: "ACTIVE", requiredRoles: ["admin"] }]
    ])("rejects a %s app with NotFound and records nothing", async (_, app) => {
      const { recentAppRepo, webAppRepo, service } = makeDeps();
      webAppRepo.findById.mockResolvedValue(app);

      await expect(service.recordLaunch(APP_A)).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(recentAppRepo.record).not.toHaveBeenCalled();
    });
  });

  it("record writes for the given user without a visibility check", async () => {
    const { recentAppRepo, webAppRepo, service } = makeDeps();

    await service.record("otherUser", APP_A);

    expect(webAppRepo.findById).not.toHaveBeenCalled();
    expect(recentAppRepo.record).toHaveBeenCalledWith(
      "otherUser",
      APP_A,
      expect.any(Date),
      RECENT_APP_CONFIG.DEDUPE_WINDOW_MS
    );
  });

  it("hide, hideAll and restore are scoped to the current user", async () => {
    const { recentAppRepo, service } = makeDeps();

    await service.hide(APP_A);
    await service.hideAll();
    await service.restore(APP_A);

    expect(recentAppRepo.hide).toHaveBeenCalledWith(
      USER,
      APP_A,
      expect.any(Date)
    );
    expect(recentAppRepo.hideAll).toHaveBeenCalledWith(USER, expect.any(Date));
    expect(recentAppRepo.restore).toHaveBeenCalledWith(USER, APP_A);
  });
});
