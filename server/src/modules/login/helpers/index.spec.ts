// others
import { getSecondsUntilMidnightUTC } from "./index";

describe("getSecondsUntilMidnightUTC", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns full day in seconds when called exactly at UTC midnight", () => {
    jest.setSystemTime(new Date("2026-05-03T00:00:00.000Z"));

    expect(getSecondsUntilMidnightUTC()).toBe(24 * 60 * 60);
  });

  it("returns 1 second when called 1s before next UTC midnight", () => {
    jest.setSystemTime(new Date("2026-05-03T23:59:59.000Z"));

    expect(getSecondsUntilMidnightUTC()).toBe(1);
  });

  it("returns half-day at UTC noon", () => {
    jest.setSystemTime(new Date("2026-05-03T12:00:00.000Z"));

    expect(getSecondsUntilMidnightUTC()).toBe(12 * 60 * 60);
  });

  it("rolls over month boundary correctly", () => {
    jest.setSystemTime(new Date("2026-01-31T23:30:00.000Z"));

    expect(getSecondsUntilMidnightUTC()).toBe(30 * 60);
  });

  it("rolls over year boundary correctly", () => {
    jest.setSystemTime(new Date("2026-12-31T23:00:00.000Z"));

    expect(getSecondsUntilMidnightUTC()).toBe(60 * 60);
  });

  it("uses ceil so partial second still counts as 1", () => {
    jest.setSystemTime(new Date("2026-05-03T23:59:59.500Z"));

    expect(getSecondsUntilMidnightUTC()).toBe(1);
  });
});
