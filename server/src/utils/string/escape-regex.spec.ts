// utils
import { escapeRegex } from "./escape-regex";

describe("escapeRegex", () => {
  it("leaves a plain alphanumeric string unchanged", () => {
    expect(escapeRegex("blog")).toBe("blog");
    expect(escapeRegex("My App 123")).toBe("My App 123");
  });

  it("escapes a single regex metacharacter", () => {
    expect(escapeRegex("a.b")).toBe("a\\.b");
  });

  it("escapes every regex metacharacter", () => {
    expect(escapeRegex(".*+?^${}()|[]\\")).toBe(
      "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\"
    );
  });

  it("neutralises a catastrophic-backtracking payload", () => {
    expect(escapeRegex("(a+)+$")).toBe("\\(a\\+\\)\\+\\$");
  });

  it("returns an empty string unchanged", () => {
    expect(escapeRegex("")).toBe("");
  });
});
