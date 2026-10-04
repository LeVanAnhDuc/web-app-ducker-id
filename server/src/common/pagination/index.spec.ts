// common
import { PAGINATION, resolvePaging, toPageMeta } from "./index";

describe("resolvePaging", () => {
  it("falls back to the defaults for an empty query", () => {
    expect(resolvePaging({})).toEqual({
      page: PAGINATION.DEFAULT_PAGE,
      limit: PAGINATION.DEFAULT_LIMIT,
      skip: 0,
      sort: { createdAt: -1 }
    });
  });

  it("computes skip from page and limit", () => {
    const { skip } = resolvePaging({ page: 4, limit: 25 });
    expect(skip).toBe(75);
  });

  it("caps limit at MAX_LIMIT", () => {
    const { limit } = resolvePaging({ limit: PAGINATION.MAX_LIMIT + 500 });
    expect(limit).toBe(PAGINATION.MAX_LIMIT);
  });

  it("does not raise a limit that is below the default", () => {
    expect(resolvePaging({ limit: 5 }).limit).toBe(5);
  });

  it("sorts descending unless asc is asked for", () => {
    expect(resolvePaging({}).sort).toEqual({ createdAt: -1 });
    expect(resolvePaging({ sortOrder: "desc" }).sort).toEqual({
      createdAt: -1
    });
    expect(resolvePaging({ sortOrder: "asc" }).sort).toEqual({ createdAt: 1 });
  });

  it("sorts by the requested field", () => {
    expect(resolvePaging({ sortBy: "status", sortOrder: "asc" }).sort).toEqual({
      status: 1
    });
  });

  it("takes a different default sort field when the caller gives one", () => {
    expect(resolvePaging({}, "lastSeenAt").sort).toEqual({ lastSeenAt: -1 });
    expect(resolvePaging({ sortBy: "name" }, "lastSeenAt").sort).toEqual({
      name: -1
    });
  });
});

describe("toPageMeta", () => {
  it("reports the page it was given back", () => {
    expect(toPageMeta(157, 3, 20)).toEqual({
      total: 157,
      page: 3,
      limit: 20,
      totalPages: 8
    });
  });

  it("rounds a partial last page up", () => {
    expect(toPageMeta(21, 1, 20).totalPages).toBe(2);
  });

  it("reports zero pages for an empty result", () => {
    expect(toPageMeta(0, 1, 20).totalPages).toBe(0);
  });
});
