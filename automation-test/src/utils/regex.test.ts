import { test, expect } from "@playwright/test";
import { escapeRegExp } from "./regex";

test("escapeRegExp makes every metacharacter literal", () => {
  const text = "a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o";
  const re = new RegExp(`^${escapeRegExp(text)}$`);
  expect(re.test(text)).toBe(true);
  expect(re.test("aXb*c+d?e^f$g{h}i(j)k|l[m]n\\o")).toBe(false);
});

test("escapeRegExp leaves plain text unchanged", () => {
  expect(escapeRegExp("Operations Console 2")).toBe("Operations Console 2");
});
