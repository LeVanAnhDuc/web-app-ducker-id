import { addDays, startOfZonedDay, toZonedDay } from "./zoned-day";

describe("toZonedDay", () => {
  it("reads the day off the user's own clock, not off UTC", () => {
    // 17:30 UTC is already the next day in Hanoi.
    const instant = new Date("2026-10-04T17:30:00.000Z");

    expect(toZonedDay(instant, "UTC")).toBe("2026-10-04");
    expect(toZonedDay(instant, "Asia/Ho_Chi_Minh")).toBe("2026-10-05");
  });

  it("puts an after-midnight login on the day the user calls it", () => {
    // 00:30 in Hanoi on the 4th is still the 3rd in UTC.
    const instant = new Date("2026-10-03T17:30:00.000Z");

    expect(toZonedDay(instant, "Asia/Ho_Chi_Minh")).toBe("2026-10-04");
  });

  it("handles a zone behind UTC", () => {
    const instant = new Date("2026-10-04T02:00:00.000Z");

    expect(toZonedDay(instant, "America/New_York")).toBe("2026-10-03");
  });
});

describe("addDays", () => {
  it("walks forwards and backwards across a month boundary", () => {
    expect(addDays("2026-10-04", -6)).toBe("2026-09-28");
    expect(addDays("2026-09-28", 6)).toBe("2026-10-04");
  });

  it("walks across a year boundary", () => {
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("knows February in a leap year", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("does not drift across a DST change, where adding 24h would", () => {
    // In New York, 2026-11-01 is 25 hours long.
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
  });
});

describe("startOfZonedDay", () => {
  it("returns the instant local midnight happens at", () => {
    expect(startOfZonedDay("2026-09-28", "UTC")).toEqual(
      new Date("2026-09-28T00:00:00.000Z")
    );
    expect(startOfZonedDay("2026-09-28", "Asia/Ho_Chi_Minh")).toEqual(
      new Date("2026-09-27T17:00:00.000Z")
    );
  });

  it("follows the offset in force on that date, not today's", () => {
    // New York is UTC-4 in July and UTC-5 in January.
    expect(startOfZonedDay("2026-07-01", "America/New_York")).toEqual(
      new Date("2026-07-01T04:00:00.000Z")
    );
    expect(startOfZonedDay("2026-01-01", "America/New_York")).toEqual(
      new Date("2026-01-01T05:00:00.000Z")
    );
  });

  it("round-trips: the start of a day reads back as that day", () => {
    const zones = ["UTC", "Asia/Ho_Chi_Minh", "America/New_York"];
    const days = ["2026-01-01", "2026-07-15", "2026-11-01", "2026-12-31"];

    zones.forEach((zone) => {
      days.forEach((day) => {
        expect(toZonedDay(startOfZonedDay(day, zone), zone)).toBe(day);
      });
    });
  });
});
