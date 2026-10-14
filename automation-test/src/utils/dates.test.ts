import { test, expect } from "@playwright/test";
import { isoDateFromToday, toDisplayDate } from "./dates";

test("isoDateFromToday(0) is today as yyyy-mm-dd", () => {
  const now = new Date();
  const expected = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
  expect(isoDateFromToday(0)).toBe(expected);
});

test("isoDateFromToday shifts years and days", () => {
  const year = new Date().getFullYear();
  expect(isoDateFromToday(-13).slice(0, 4)).toBe(String(year - 13));
  expect(isoDateFromToday(0, 1)).not.toBe(isoDateFromToday(0));
});

test("toDisplayDate turns yyyy-mm-dd into dd/MM/yyyy", () => {
  expect(toDisplayDate("1990-03-15")).toBe("15/03/1990");
});
