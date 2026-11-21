import { parseList, parseTrustProxy } from "./parse-env";

describe("parseList", () => {
  it("splits, trims and drops empty items", () => {
    expect(parseList("http://a, http://b,,")).toEqual(["http://a", "http://b"]);
  });
});

describe("parseTrustProxy", () => {
  it.each([
    [undefined, "loopback"],
    ["true", true],
    ["false", false],
    ["1", 1],
    ["10.0.0.0/8", "10.0.0.0/8"]
  ])("%p → %p", (raw, expected) => {
    expect(parseTrustProxy(raw)).toBe(expected);
  });
});
