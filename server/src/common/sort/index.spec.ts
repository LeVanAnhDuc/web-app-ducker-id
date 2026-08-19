import { resolveSortDirection, buildSort, SORT_ORDERS } from "./index";

describe("sort util", () => {
  it("resolves asc to 1", () => {
    expect(resolveSortDirection(SORT_ORDERS.ASC)).toBe(1);
  });
  it("resolves desc to -1", () => {
    expect(resolveSortDirection(SORT_ORDERS.DESC)).toBe(-1);
  });
  it("defaults undefined to -1 (desc)", () => {
    expect(resolveSortDirection(undefined)).toBe(-1);
  });
  it("buildSort builds a mongo sort object", () => {
    expect(buildSort("createdAt", SORT_ORDERS.ASC)).toEqual({ createdAt: 1 });
    expect(buildSort("createdAt")).toEqual({ createdAt: -1 });
  });
});
