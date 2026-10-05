// others
import {
  buildAccessFilter,
  canAccessApp,
  roleAllows,
  toAccessScope,
  toUserAccess
} from "./entitlement.helper";

const APP_ID = "64b2f0c2f1a2b3c4d5e6f7b1";
const OTHER_ID = "64b2f0c2f1a2b3c4d5e6f7b2";

const app = (requiredRoles: string[]) => ({
  _id: { toString: () => APP_ID },
  requiredRoles
});

describe("roleAllows", () => {
  it.each([
    ["user", [], true],
    ["user", ["user"], true],
    ["user", ["admin"], false],
    ["user", ["user", "admin"], true],
    // Admin is eligible for every app by default (DR-2), including user-only ones.
    ["admin", ["user"], true],
    ["admin", ["admin"], true],
    [undefined, ["user"], true],
    [undefined, ["admin"], false]
  ])("role %s × %j → %s", (role, requiredRoles, expected) => {
    expect(roleAllows(role, requiredRoles)).toBe(expected);
  });
});

describe("canAccessApp", () => {
  const scope = (role: string | undefined, override?: "allow" | "deny") => ({
    role,
    allowIds: override === "allow" ? [APP_ID] : [OTHER_ID],
    denyIds: override === "deny" ? [APP_ID] : [OTHER_ID]
  });

  // Decision table: role default × override. An override always wins.
  it.each([
    ["user", ["user"], undefined, true],
    ["user", ["user"], "deny", false],
    ["user", ["user"], "allow", true],
    ["user", ["admin"], undefined, false],
    ["user", ["admin"], "allow", true],
    ["user", ["admin"], "deny", false],
    ["admin", ["user"], undefined, true],
    ["admin", ["user"], "deny", false],
    ["admin", ["admin"], "deny", false],
    ["user", [], undefined, true],
    ["user", [], "deny", false]
  ] as const)(
    "role %s × %j × override %s → %s",
    (role, requiredRoles, override, expected) => {
      expect(canAccessApp(app([...requiredRoles]), scope(role, override))).toBe(
        expected
      );
    }
  );
});

describe("buildAccessFilter", () => {
  it("adds nothing for an admin with no deny override", () => {
    expect(
      buildAccessFilter({ role: "admin", allowIds: [], denyIds: [] })
    ).toEqual([]);
  });

  it("only excludes denied apps for an admin", () => {
    const [clause, ...rest] = buildAccessFilter({
      role: "admin",
      allowIds: [OTHER_ID],
      denyIds: [APP_ID]
    });

    expect(rest).toHaveLength(0);
    expect(clause._id.$nin.map(String)).toEqual([APP_ID]);
  });

  it("matches the role default or an allow override, minus deny overrides, for a user", () => {
    const clauses = buildAccessFilter({
      role: "user",
      allowIds: [OTHER_ID],
      denyIds: [APP_ID]
    });

    expect(clauses).toHaveLength(2);
    const [roleClause, denyClause] = clauses;
    expect(roleClause.$or).toEqual([
      { requiredRoles: { $size: 0 } },
      { requiredRoles: "user" },
      { _id: { $in: [expect.anything()] } }
    ]);
    expect(roleClause.$or[2]._id.$in.map(String)).toEqual([OTHER_ID]);
    expect(denyClause._id.$nin.map(String)).toEqual([APP_ID]);
  });

  it("falls back to the user role and drops empty id lists", () => {
    expect(
      buildAccessFilter({ role: undefined, allowIds: [], denyIds: [] })
    ).toEqual([
      {
        $or: [{ requiredRoles: { $size: 0 } }, { requiredRoles: "user" }]
      }
    ]);
  });
});

describe("toAccessScope", () => {
  it("keeps only the given user's rows and splits them by effect", () => {
    expect(
      toAccessScope("u1", "user", [
        { userId: "u1", webAppId: "a", effect: "allow" },
        { userId: "u2", webAppId: "b", effect: "deny" },
        { userId: "u1", webAppId: "c", effect: "deny" }
      ])
    ).toEqual({ role: "user", allowIds: ["a"], denyIds: ["c"] });
  });
});

describe("toUserAccess", () => {
  const catalog = [
    { _id: { toString: () => "blog" }, requiredRoles: ["user"] },
    { _id: { toString: () => "ops" }, requiredRoles: ["admin"] },
    { _id: { toString: () => "notes" }, requiredRoles: ["user"] }
  ];

  it("lists effective grants and the overridden cells in catalog order", () => {
    expect(
      toUserAccess(
        "u1",
        { role: "user", allowIds: ["ops"], denyIds: ["notes"] },
        catalog
      )
    ).toEqual({
      userId: "u1",
      grantedAppIds: ["blog", "ops"],
      overriddenAppIds: ["ops", "notes"]
    });
  });

  it("ignores an override for an app outside the catalog", () => {
    expect(
      toUserAccess(
        "u1",
        { role: "user", allowIds: ["gone"], denyIds: [] },
        catalog
      ).overriddenAppIds
    ).toEqual([]);
  });
});
