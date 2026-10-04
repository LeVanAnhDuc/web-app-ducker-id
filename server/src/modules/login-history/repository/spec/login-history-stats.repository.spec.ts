jest.mock("@/models/login-history", () => ({
  __esModule: true,
  default: { aggregate: jest.fn() }
}));

// models
import LoginHistoryModel from "@/models/login-history";
import { MongoLoginHistoryRepository } from "../impl/mongo-login-history.repository";
import { LOGIN_METHODS } from "@/modules/login-history/constants";

const mockedAggregate = LoginHistoryModel.aggregate as unknown as jest.Mock;

const RANGE = {
  userId: "507f1f77bcf86cd799439011",
  from: new Date("2026-09-28T00:00:00.000Z"),
  to: new Date("2026-10-04T10:00:00.000Z"),
  timezone: "Asia/Ho_Chi_Minh",
  topAppsLimit: 5
};

type Stage = Record<string, unknown>;

const runAndCapturePipeline = async (): Promise<Stage[]> => {
  mockedAggregate.mockReturnValue({
    exec: jest.fn().mockResolvedValue([])
  });
  await new MongoLoginHistoryRepository().aggregateMyStats(RANGE);
  return mockedAggregate.mock.calls[0][0] as Stage[];
};

const facets = async (): Promise<Record<string, Stage[]>> => {
  const pipeline = await runAndCapturePipeline();
  return (pipeline[1].$facet ?? {}) as Record<string, Stage[]>;
};

describe("MongoLoginHistoryRepository.aggregateMyStats", () => {
  beforeEach(() => jest.clearAllMocks());

  it("scopes the root match to the user and the range only", async () => {
    const pipeline = await runAndCapturePipeline();

    expect(pipeline[0].$match).toEqual({
      userId: expect.anything(),
      createdAt: { $gte: RANGE.from, $lte: RANGE.to }
    });
  });

  it("still excludes SSO from each of the four counters that predate byApp", async () => {
    const facet = await facets();

    // The exclusion moved out of the root $match so byApp can see SSO rows.
    // If it stops leading these four, every number already on the Home cards
    // silently grows by the user's silent app sign-ins.
    ["total", "byStatus", "byMethod", "byDevice", "byDay"].forEach((name) => {
      expect(facet[name][0]).toEqual({
        $match: { method: { $ne: LOGIN_METHODS.SSO } }
      });
    });
  });

  it("reads byApp from the SSO rows only, skipping rows with no app", async () => {
    const facet = await facets();

    expect(facet.byApp[0]).toEqual({
      $match: { method: LOGIN_METHODS.SSO, webAppId: { $ne: null } }
    });
    expect(facet.byApp.at(-1)).toEqual({ $limit: RANGE.topAppsLimit });
  });

  it("cuts the day buckets in the caller's timezone", async () => {
    const facet = await facets();
    const group = facet.byDay[1].$group as { _id: Record<string, unknown> };

    expect(group._id).toEqual({
      $dateToString: {
        date: "$createdAt",
        format: "%Y-%m-%d",
        timezone: RANGE.timezone
      }
    });
  });

  it("answers with empty buckets when the aggregation returns nothing", async () => {
    mockedAggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([])
    });

    const result = await new MongoLoginHistoryRepository().aggregateMyStats(
      RANGE
    );

    expect(result).toEqual({
      total: [],
      byStatus: [],
      byMethod: [],
      byDevice: [],
      byDay: [],
      byApp: [],
      anomalies: []
    });
  });
});
