import {
  parseBoolean,
  parseList,
  parseNumber,
  parseRequired,
  parseTrustProxy
} from "./parse-env";

describe("parseRequired", () => {
  it("returns the trimmed value", () => {
    expect(parseRequired("DB_URL", "  mongodb://x  ")).toBe("mongodb://x");
  });

  it.each([undefined, "", "   "])("throws when the value is %p", (raw) => {
    expect(() => parseRequired("DB_URL", raw)).toThrow(
      "Missing required environment variable DB_URL"
    );
  });
});

describe("parseNumber", () => {
  it("reads a number", () => {
    expect(parseNumber("7", 10)).toBe(7);
  });

  it("keeps a deliberate 0", () => {
    expect(parseNumber("0", 2)).toBe(0);
  });

  it.each([undefined, "", "abc"])("falls back for %p", (raw) => {
    expect(parseNumber(raw, 10)).toBe(10);
  });
});

describe("parseBoolean", () => {
  it.each([
    ["true", true],
    [" true ", true],
    ["false", false],
    ["1", false],
    [undefined, false]
  ])("%p → %p", (raw, expected) => {
    expect(parseBoolean(raw)).toBe(expected);
  });
});

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
