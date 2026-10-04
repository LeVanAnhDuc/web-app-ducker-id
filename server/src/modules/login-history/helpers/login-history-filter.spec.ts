// types
import type { LoginHistoryAdminQuery } from "@/modules/login-history/types";
// helpers
import { buildLoginHistoryFilter } from "./index";
// validators
import { loginHistoryQuerySchema } from "@/validators/schemas/login-history";

const USER = "507f1f77bcf86cd799439011";

describe("buildLoginHistoryFilter date bounds", () => {
  it("covers the whole day when toDate carries no time", () => {
    const filter = buildLoginHistoryFilter(
      { toDate: "2026-10-04" } as LoginHistoryAdminQuery,
      USER
    );

    // Without this, a single-day filter matched only the first millisecond of
    // the day and the list came back empty — which is what clicking a column
    // on Home used to do.
    expect(filter.toDate).toEqual(new Date("2026-10-04T23:59:59.999Z"));
  });

  it("keeps a full timestamp exactly as sent", () => {
    const filter = buildLoginHistoryFilter(
      { toDate: "2026-10-04T08:30:00.000Z" } as LoginHistoryAdminQuery,
      USER
    );

    expect(filter.toDate).toEqual(new Date("2026-10-04T08:30:00.000Z"));
  });

  it("leaves fromDate at the start of its day", () => {
    const filter = buildLoginHistoryFilter(
      { fromDate: "2026-10-04" } as LoginHistoryAdminQuery,
      USER
    );

    expect(filter.fromDate).toEqual(new Date("2026-10-04T00:00:00.000Z"));
  });

  it("a one-day filter spans that day from end to end", () => {
    const filter = buildLoginHistoryFilter(
      {
        fromDate: "2026-10-04",
        toDate: "2026-10-04"
      } as LoginHistoryAdminQuery,
      USER
    );

    expect(filter.fromDate).toEqual(new Date("2026-10-04T00:00:00.000Z"));
    expect(filter.toDate).toEqual(new Date("2026-10-04T23:59:59.999Z"));
  });

  it("scopes to the signed-in user and ignores a userId from the query", () => {
    const other = "507f1f77bcf86cd799439099";
    const filter = buildLoginHistoryFilter(
      { userId: other } as LoginHistoryAdminQuery,
      USER
    );

    expect(filter.userId).toBe(USER);
  });

  it("survives validation: the query pipe must not rewrite a plain date", () => {
    // Joi's isoDate() normalises "2026-10-04" to "2026-10-04T00:00:00.000Z"
    // unless .raw() is set, and the filter then cannot tell a whole day from
    // its first millisecond. This is the shape the route actually receives.
    const { value } = loginHistoryQuerySchema.validate({
      fromDate: "2026-10-04",
      toDate: "2026-10-04"
    });

    expect(value.toDate).toBe("2026-10-04");

    const filter = buildLoginHistoryFilter(value, USER);
    expect(filter.toDate).toEqual(new Date("2026-10-04T23:59:59.999Z"));
  });
});
