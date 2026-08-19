// helpers
import {
  buildWebAppFilter,
  toInternalStatus,
  generateClientId,
  generateClientSecret
} from "./index";
// modules
import { WEB_APP_STATUSES } from "../constants";

describe("buildWebAppFilter", () => {
  it("maps public status 'active' to BE enum ACTIVE", () => {
    const filter = buildWebAppFilter({ status: "active" });
    expect(filter.status).toBe(WEB_APP_STATUSES.ACTIVE);
  });

  it("maps public status 'inactive' to BE enum INACTIVE", () => {
    const filter = buildWebAppFilter({ status: "inactive" });
    expect(filter.status).toBe(WEB_APP_STATUSES.INACTIVE);
  });

  it("builds case-insensitive $or search across name, displayName, description", () => {
    const filter = buildWebAppFilter({ search: "blog" });
    expect(filter.$or).toEqual([
      { name: { $regex: "blog", $options: "i" } },
      { displayName: { $regex: "blog", $options: "i" } },
      { description: { $regex: "blog", $options: "i" } }
    ]);
  });

  it("escapes regex metacharacters in the search term", () => {
    const filter = buildWebAppFilter({ search: "a.b" });
    expect(filter.$or).toEqual([
      { name: { $regex: "a\\.b", $options: "i" } },
      { displayName: { $regex: "a\\.b", $options: "i" } },
      { description: { $regex: "a\\.b", $options: "i" } }
    ]);
  });

  it("passes categoryId through and returns empty filter when no params", () => {
    expect(buildWebAppFilter({ categoryId: "cat1" }).categoryId).toBe("cat1");
    expect(buildWebAppFilter({})).toEqual({});
  });
});

describe("toInternalStatus", () => {
  it("maps 'active' to ACTIVE", () => {
    expect(toInternalStatus("active")).toBe(WEB_APP_STATUSES.ACTIVE);
  });
  it("maps 'inactive' to INACTIVE", () => {
    expect(toInternalStatus("inactive")).toBe(WEB_APP_STATUSES.INACTIVE);
  });
});

describe("generateClientId", () => {
  it("starts with the client_ prefix", () => {
    expect(generateClientId().startsWith("client_")).toBe(true);
  });
  it("produces unique values across calls", () => {
    expect(generateClientId()).not.toBe(generateClientId());
  });
});

describe("generateClientSecret", () => {
  it("returns a 64-char hex string (32 bytes)", () => {
    expect(generateClientSecret()).toMatch(/^[a-f0-9]{64}$/);
  });
});
