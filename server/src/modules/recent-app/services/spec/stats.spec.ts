// types
import type { WebAppRepository } from "@/modules/web-app/repository/web-app.repository";
import type { FavoriteRepository } from "@/modules/favorite/repository/favorite.repository";
import type { RecentAppRepository } from "../../repository/recent-app.repository";
import type { RecentAppUsage } from "../../types";
import type { EntitlementRepository } from "@/modules/entitlement/repository/entitlement.repository";
// modules
import { RecentAppService } from "../";
import { AccessPolicy } from "@/modules/entitlement/services/access-policy";
import { RECENT_APP_STATS } from "../../constants";
import { RequestContext } from "@/utils/request-context";

const USER = "507f1f77bcf86cd799439011";
const APP_A = "64b7f0c2f1a2b3c4d5e6f7a1";
const APP_B = "64b7f0c2f1a2b3c4d5e6f7b2";
const APP_C = "64b7f0c2f1a2b3c4d5e6f7c3";

const NOW = new Date("2026-10-04T10:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number): Date => new Date(NOW.getTime() - days * DAY_MS);

const makeApp = (id: string, displayName: string, category?: string) => {
  const doc = category
    ? {
        _id: { toString: () => `cat-${category}` },
        slug: category.toLowerCase(),
        name: { en: category, vi: `${category} (vi)` }
      }
    : null;
  return {
    _id: { toString: () => id },
    displayName,
    description: null,
    iconUrl: null,
    homeUrl: `https://${id}.example.com`,
    categoryIds: doc ? [doc._id] : [],
    categories: doc ? [doc] : []
  };
};

const usage = (
  webAppId: string,
  useCount: number,
  lastUsedAt: Date
): RecentAppUsage => ({
  id: `${webAppId.slice(0, 20)}0001`,
  webAppId,
  useCount,
  lastUsedAt
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
    favoriteRepo: favoriteRepo as unknown as FavoriteRepository,
    accessPolicy: new AccessPolicy({
      findByUser: jest.fn().mockResolvedValue([])
    } as unknown as EntitlementRepository)
  });
  return { recentAppRepo, webAppRepo, service };
};

describe("RecentAppService.stats", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    jest.spyOn(RequestContext, "requireUserId").mockReturnValue(USER);
    jest
      .spyOn(RequestContext, "getUser")
      .mockReturnValue({ sub: USER, authId: "auth1", roles: "user" });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("answers with zeroes and never touches the catalog when nothing was used", async () => {
    const { webAppRepo, service } = makeDeps();

    await expect(service.stats({})).resolves.toEqual({
      totalApps: 0,
      activeLast7Days: 0,
      activeLast30Days: 0,
      topApps: [],
      byCategory: []
    });
    expect(webAppRepo.findActiveByIds).not.toHaveBeenCalled();
  });

  it("counts only apps the catalog still shows the user", async () => {
    const { recentAppRepo, webAppRepo, service } = makeDeps();
    recentAppRepo.findVisibleWebAppIds.mockResolvedValue([APP_A, APP_B]);
    // APP_B was deactivated since it was last opened.
    webAppRepo.findActiveByIds.mockResolvedValue([makeApp(APP_A, "Blog")]);
    recentAppRepo.findUsages.mockResolvedValue([usage(APP_A, 4, daysAgo(1))]);

    const result = await service.stats({});

    expect(webAppRepo.findActiveByIds).toHaveBeenCalledWith([APP_A, APP_B], {
      access: { role: "user", allowIds: [], denyIds: [] }
    });
    expect(recentAppRepo.findUsages).toHaveBeenCalledWith(USER, [APP_A]);
    expect(result.totalApps).toBe(1);
    expect(result.topApps).toHaveLength(1);
  });

  it("splits the active windows on lastUsedAt, not on useCount", async () => {
    const { recentAppRepo, webAppRepo, service } = makeDeps();
    recentAppRepo.findVisibleWebAppIds.mockResolvedValue([APP_A, APP_B, APP_C]);
    webAppRepo.findActiveByIds.mockResolvedValue([
      makeApp(APP_A, "Blog"),
      makeApp(APP_B, "Shop"),
      makeApp(APP_C, "Gym")
    ]);
    recentAppRepo.findUsages.mockResolvedValue([
      usage(APP_A, 1, daysAgo(2)),
      usage(APP_B, 99, daysAgo(20)),
      usage(APP_C, 50, daysAgo(60))
    ]);

    const result = await service.stats({});

    expect(result.totalApps).toBe(3);
    expect(result.activeLast7Days).toBe(1);
    expect(result.activeLast30Days).toBe(2);
  });

  it("ranks by lifetime useCount and breaks ties on the newer use", async () => {
    const { recentAppRepo, webAppRepo, service } = makeDeps();
    recentAppRepo.findVisibleWebAppIds.mockResolvedValue([APP_A, APP_B, APP_C]);
    webAppRepo.findActiveByIds.mockResolvedValue([
      makeApp(APP_A, "Blog"),
      makeApp(APP_B, "Shop"),
      makeApp(APP_C, "Gym")
    ]);
    recentAppRepo.findUsages.mockResolvedValue([
      usage(APP_A, 7, daysAgo(9)),
      usage(APP_B, 7, daysAgo(1)),
      usage(APP_C, 20, daysAgo(40))
    ]);

    const result = await service.stats({});

    expect(result.topApps.map((app) => app.appId)).toEqual([
      APP_C,
      APP_B,
      APP_A
    ]);
    expect(result.topApps[0].useCount).toBe(20);
    expect(result.topApps[0].lastUsedAt).toBe(daysAgo(40).toISOString());
  });

  it("honours the requested limit and falls back to the default", async () => {
    const { recentAppRepo, webAppRepo, service } = makeDeps();
    const ids = [APP_A, APP_B, APP_C];
    recentAppRepo.findVisibleWebAppIds.mockResolvedValue(ids);
    webAppRepo.findActiveByIds.mockResolvedValue(
      ids.map((id, i) => makeApp(id, `App ${i}`))
    );
    recentAppRepo.findUsages.mockResolvedValue(
      ids.map((id, i) => usage(id, 10 - i, daysAgo(i)))
    );

    await expect(service.stats({ limit: 2 })).resolves.toMatchObject({
      topApps: [{ appId: APP_A }, { appId: APP_B }]
    });

    const all = await service.stats({});
    expect(all.topApps).toHaveLength(
      Math.min(ids.length, RECENT_APP_STATS.TOP_APPS_DEFAULT_LIMIT)
    );
  });

  it("groups by category, heaviest first, keeping uncategorised apps", async () => {
    const { recentAppRepo, webAppRepo, service } = makeDeps();
    recentAppRepo.findVisibleWebAppIds.mockResolvedValue([APP_A, APP_B, APP_C]);
    webAppRepo.findActiveByIds.mockResolvedValue([
      makeApp(APP_A, "Blog", "Tools"),
      makeApp(APP_B, "Shop", "Tools"),
      makeApp(APP_C, "Gym")
    ]);
    recentAppRepo.findUsages.mockResolvedValue([
      usage(APP_A, 1, daysAgo(1)),
      usage(APP_B, 1, daysAgo(1)),
      usage(APP_C, 1, daysAgo(1))
    ]);

    const result = await service.stats({});

    expect(result.byCategory).toEqual([
      {
        category: {
          _id: "cat-Tools",
          slug: "tools",
          name: { en: "Tools", vi: "Tools (vi)" }
        },
        count: 2
      },
      { category: null, count: 1 }
    ]);
  });
});
