// modules
import { LoginHistoryStatsQueryDto } from "@/modules/login-history/dtos/requests";
// validators
import { isSupportedTimeZone } from "./utils";
import { validateDto } from "./validate-dto";

describe("isSupportedTimeZone", () => {
  it("accepts a zone under either spelling, canonical or link", () => {
    // Which of the two `Intl.supportedValuesOf` calls canonical depends on the
    // ICU build, and the browser picks its own. Both have to work or Vietnamese
    // users get a 400 from one Node version and not from another.
    expect(isSupportedTimeZone("Asia/Saigon")).toBe(true);
    expect(isSupportedTimeZone("Asia/Ho_Chi_Minh")).toBe(true);
    expect(isSupportedTimeZone("Asia/Calcutta")).toBe(true);
    expect(isSupportedTimeZone("Asia/Kolkata")).toBe(true);
    expect(isSupportedTimeZone("Europe/Kiev")).toBe(true);
    expect(isSupportedTimeZone("Europe/Kyiv")).toBe(true);
  });

  it("accepts UTC, which the canonical list leaves out", () => {
    expect(isSupportedTimeZone("UTC")).toBe(true);
  });

  it("rejects anything the runtime cannot resolve", () => {
    expect(isSupportedTimeZone("Mars/Olympus")).toBe(false);
    expect(isSupportedTimeZone("")).toBe(false);
    expect(isSupportedTimeZone("'; drop")).toBe(false);
    expect(isSupportedTimeZone("../../etc")).toBe(false);
  });

  it("answers the same on a repeat call, from cache", () => {
    expect(isSupportedTimeZone("Asia/Tokyo")).toBe(true);
    expect(isSupportedTimeZone("Asia/Tokyo")).toBe(true);
    expect(isSupportedTimeZone("Nope/Nope")).toBe(false);
    expect(isSupportedTimeZone("Nope/Nope")).toBe(false);
  });
});

describe("LoginHistoryStatsQueryDto", () => {
  const keysOf = async (query: Record<string, unknown>) =>
    (await validateDto(LoginHistoryStatsQueryDto, query)).failures.map(
      (failure) => failure.key
    );

  it("passes a browser-reported zone through untouched", async () => {
    const { failures, value } = await validateDto(LoginHistoryStatsQueryDto, {
      range: "30d",
      tz: "Asia/Saigon"
    });

    expect(failures).toEqual([]);
    expect({ ...value }).toEqual({ range: "30d", tz: "Asia/Saigon" });
  });

  it("refuses a range outside the three on offer", async () => {
    expect(await keysOf({ range: "365d" })).toEqual([
      "validation:range.invalid"
    ]);
  });

  it("refuses a timezone the runtime cannot resolve", async () => {
    expect(await keysOf({ tz: "Mars/Olympus" })).toEqual([
      "validation:timezone.invalid"
    ]);
  });

  it("allows both to be absent", async () => {
    expect(await keysOf({})).toEqual([]);
  });
});
