import { test, expect } from "@playwright/test";
import { formatIcu } from "./icu";

const ANOMALY =
  "{reason, select, country {A sign-in from {country}.} both {{browser} on {os}, from {country}.} other {{browser} on {os}.}}";

test("formatIcu fills plain arguments", () => {
  expect(
    formatIcu("{appName} is now in your launcher.", { appName: "X" })
  ).toBe("X is now in your launcher.");
});

test("formatIcu picks the select branch and fills the arguments inside it", () => {
  const values = { browser: "Firefox", os: "Linux", country: "Japan" };
  expect(formatIcu(ANOMALY, { ...values, reason: "both" })).toBe(
    "Firefox on Linux, from Japan."
  );
  expect(formatIcu(ANOMALY, { ...values, reason: "country" })).toBe(
    "A sign-in from Japan."
  );
});

test("formatIcu falls back to `other` for an unknown or missing key", () => {
  const values = { browser: "Chrome", os: "Windows" };
  expect(formatIcu(ANOMALY, { ...values, reason: "device" })).toBe(
    "Chrome on Windows."
  );
  expect(formatIcu(ANOMALY, values)).toBe("Chrome on Windows.");
});

test("formatIcu leaves an argument it has no value for", () => {
  expect(formatIcu("Blocked for {minutes} minutes.")).toBe(
    "Blocked for {minutes} minutes."
  );
});

test("formatIcu throws on unbalanced braces", () => {
  expect(() => formatIcu("{reason, select, other {x}")).toThrow();
});

test("formatIcu picks the plural branch and replaces # with the count", () => {
  const OPENED = "{count, plural, one {Opened once} other {Opened # times}}";
  expect(formatIcu(OPENED, { count: 1 })).toBe("Opened once");
  expect(formatIcu(OPENED, { count: 3 })).toBe("Opened 3 times");
  expect(
    formatIcu("{count, plural, =0 {none} other {# apps}}", { count: 0 })
  ).toBe("none");
});
