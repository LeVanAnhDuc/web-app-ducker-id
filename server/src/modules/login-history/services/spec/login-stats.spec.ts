// types
import type { LoginHistoryRepository } from "../../repository/login-history.repository";
import type { LoginStatsAggregationResult } from "@/modules/login-history/types";
// module under test
import { LoginHistoryService } from "../";
import { LOGIN_HISTORY_STATS } from "../../constants";
import { RequestContext } from "@/utils/request-context";
import { createNotificationDispatcherMock } from "@test/mocks/notification-dispatcher.mock";

const AUTH_ID = "507f1f77bcf86cd799439011";
const APP_ID = "64b7f0c2f1a2b3c4d5e6f7a1";
const NOW = new Date("2026-10-04T10:00:00.000Z");
const HANOI = "Asia/Ho_Chi_Minh";

const emptyAggregation = (): LoginStatsAggregationResult => ({
  total: [],
  byStatus: [],
  byMethod: [],
  byDevice: [],
  byDay: [],
  byApp: [],
  anomalies: []
});

const makeRepo = (
  aggregation: LoginStatsAggregationResult = emptyAggregation()
) => {
  const repo = {
    create: jest.fn(),
    findByUser: jest.fn(),
    findAll: jest.fn(),
    aggregateMyStats: jest.fn().mockResolvedValue(aggregation),
    findById: jest.fn(),
    findSignInTraits: jest.fn()
  };
  return {
    repo,
    service: new LoginHistoryService({
      loginHistoryRepo: repo as unknown as LoginHistoryRepository,
      notificationDispatcher: createNotificationDispatcherMock()
    })
  };
};

describe("LoginHistoryService.getMyLoginStats", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    jest.spyOn(RequestContext, "requireAuthId").mockReturnValue(AUTH_ID);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("defaults to seven days in UTC", async () => {
    const { repo, service } = makeRepo();

    const result = await service.getMyLoginStats({});

    expect(repo.aggregateMyStats).toHaveBeenCalledWith({
      userId: AUTH_ID,
      from: new Date("2026-09-28T00:00:00.000Z"),
      to: NOW,
      timezone: "UTC",
      topAppsLimit: LOGIN_HISTORY_STATS.TOP_APPS_LIMIT
    });
    expect(result.range.days).toBe(LOGIN_HISTORY_STATS.DEFAULT_RANGE_DAYS);
    expect(result.range.days).toBe(7);
    expect(result.byDay).toHaveLength(7);
  });

  it("starts the window at local midnight, not at the current time of day", async () => {
    const { repo, service } = makeRepo();

    await service.getMyLoginStats({ range: "7d", tz: HANOI });

    // 2026-09-28 00:00 in Hanoi is 2026-09-27 17:00 UTC. Cutting at "now minus
    // 7 × 24h" would instead start mid-afternoon and halve the first bar.
    expect(repo.aggregateMyStats).toHaveBeenCalledWith(
      expect.objectContaining({
        from: new Date("2026-09-27T17:00:00.000Z"),
        timezone: HANOI
      })
    );
  });

  it("falls back to the default when the range is not one of the offered ones", async () => {
    const { repo, service } = makeRepo();

    await service.getMyLoginStats({ range: "365d" });

    expect(repo.aggregateMyStats).toHaveBeenCalledWith(
      expect.objectContaining({ from: new Date("2026-09-28T00:00:00.000Z") })
    );
  });

  it("honours a longer range", async () => {
    const { service } = makeRepo();

    const result = await service.getMyLoginStats({ range: "30d" });

    expect(result.range.days).toBe(30);
    expect(result.byDay).toHaveLength(30);
    expect(result.byDay[0].date).toBe("2026-09-05");
    expect(result.byDay[29].date).toBe("2026-10-04");
  });

  it("keeps a column for every day, including the ones with no sign-in", async () => {
    const { service } = makeRepo({
      ...emptyAggregation(),
      byDay: [
        { _id: "2026-09-28", total: 2, successful: 2, failed: 0 },
        { _id: "2026-10-04", total: 4, successful: 3, failed: 1 }
      ]
    });

    const result = await service.getMyLoginStats({ range: "7d" });

    expect(result.byDay).toHaveLength(7);
    expect(result.byDay.map((day) => day.date)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04"
    ]);
    expect(result.byDay[0]).toEqual({
      date: "2026-09-28",
      total: 2,
      successful: 2,
      failed: 0
    });
    expect(result.byDay[3]).toEqual({
      date: "2026-10-01",
      total: 0,
      successful: 0,
      failed: 0
    });
    expect(result.byDay[6].failed).toBe(1);
  });

  it("maps the per-app buckets and the anomaly count", async () => {
    const { service } = makeRepo({
      ...emptyAggregation(),
      byApp: [
        {
          _id: {
            webAppId:
              APP_ID as unknown as LoginStatsAggregationResult["byApp"][number]["_id"]["webAppId"],
            clientName: "Match CV"
          },
          count: 9
        }
      ],
      anomalies: [{ count: 3 }]
    });

    const result = await service.getMyLoginStats({});

    expect(result.byApp).toEqual([
      { webAppId: APP_ID, clientName: "Match CV", count: 9 }
    ]);
    expect(result.anomalies).toBe(3);
  });

  it("reports zero rather than undefined when nothing happened", async () => {
    const { service } = makeRepo();

    const result = await service.getMyLoginStats({});

    expect(result.total).toBe(0);
    expect(result.successful).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.anomalies).toBe(0);
    expect(result.byApp).toEqual([]);
    expect(result.byDay.every((day) => day.total === 0)).toBe(true);
  });
});
