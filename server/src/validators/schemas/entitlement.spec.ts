// others
import {
  entitlementMatrixQuerySchema,
  updateEntitlementsBodySchema
} from "./entitlement";

const A = "64b2f0c2f1a2b3c4d5e6f7a1";
const B = "64b2f0c2f1a2b3c4d5e6f7a2";

const ids = (count: number): string =>
  Array.from({ length: count }, (_, i) =>
    (i + 1).toString(16).padStart(24, "0")
  ).join(",");

const firstError = (
  schema: typeof entitlementMatrixQuerySchema,
  input: unknown
) => schema.validate(input).error?.details[0].type;

describe("entitlementMatrixQuerySchema", () => {
  it("splits a comma list into ids", () => {
    const { error, value } = entitlementMatrixQuerySchema.validate({
      userIds: `${A}, ${B}`
    });
    expect(error).toBeUndefined();
    expect(value.userIds).toEqual([A, B]);
  });

  it.each([
    ["missing", {}, "any.required"],
    ["empty", { userIds: "" }, "array.includesRequiredUnknowns"],
    ["a bad id", { userIds: `${A},abc` }, "string.pattern.base"],
    ["a duplicate", { userIds: `${A},${A}` }, "array.unique"],
    ["51 ids", { userIds: ids(51) }, "array.max"]
  ])("rejects %s", (_label, input, type) => {
    expect(firstError(entitlementMatrixQuerySchema, input)).toBe(type);
  });

  it("accepts exactly 50 ids", () => {
    expect(
      entitlementMatrixQuerySchema.validate({ userIds: ids(50) }).error
    ).toBeUndefined();
  });
});

describe("updateEntitlementsBodySchema", () => {
  const change = { userId: A, appId: B, granted: true };
  const changes = (count: number) =>
    ids(count)
      .split(",")
      .map((appId) => ({ ...change, appId }));

  it("accepts 1 and 200 changes", () => {
    expect(
      updateEntitlementsBodySchema.validate({ changes: changes(1) }).error
    ).toBeUndefined();
    expect(
      updateEntitlementsBodySchema.validate({ changes: changes(200) }).error
    ).toBeUndefined();
  });

  it.each([
    ["no changes", { changes: [] }, "array.min"],
    ["201 changes", { changes: changes(201) }, "array.max"],
    [
      "the same pair twice",
      { changes: [change, { ...change, granted: false }] },
      "array.unique"
    ],
    [
      "a string boolean",
      { changes: [{ ...change, granted: "true" }] },
      "boolean.base"
    ],
    [
      "a bad app id",
      { changes: [{ ...change, appId: "x" }] },
      "string.pattern.base"
    ]
  ])("rejects %s", (_label, input, type) => {
    expect(
      updateEntitlementsBodySchema.validate(input).error?.details[0].type
    ).toBe(type);
  });
});
