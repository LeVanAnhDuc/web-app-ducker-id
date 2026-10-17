import { dateOfBirthSchema, getDateOfBirthBounds } from "./base";

describe("getDateOfBirthBounds", () => {
  it("accepts a 13th birthday from the first time zone it starts in", () => {
    // 01:00 on 2026-10-17 in UTC+7 is still 2026-10-16 in UTC.
    const now = new Date("2026-10-16T18:00:00Z");
    const { maxDate } = getDateOfBirthBounds(now);

    expect(new Date("2013-10-17") <= maxDate).toBe(true);
    // Two days short of 13 is too young in every time zone.
    expect(new Date("2013-10-19") <= maxDate).toBe(false);
  });

  it("refuses a date of birth more than 120 years ago everywhere", () => {
    const now = new Date("2026-10-17T12:00:00Z");
    const { minDate } = getDateOfBirthBounds(now);

    expect(new Date("1906-10-17") >= minDate).toBe(true);
    expect(new Date("1906-10-15") >= minDate).toBe(false);
  });

  it("is computed on every call rather than frozen at module load", () => {
    const early = getDateOfBirthBounds(new Date("2026-01-01T12:00:00Z"));
    const late = getDateOfBirthBounds(new Date("2026-06-01T12:00:00Z"));

    expect(late.maxDate.getTime()).toBeGreaterThan(early.maxDate.getTime());
  });
});

describe("dateOfBirthSchema", () => {
  const yearsAgo = (years: number, days = 0): string => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() - years);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  it("accepts today's 13th birthday and refuses a 12-year-old", () => {
    expect(dateOfBirthSchema.validate(yearsAgo(13)).error).toBeUndefined();
    expect(
      dateOfBirthSchema.validate(yearsAgo(12)).error?.details[0].message
    ).toBe("validation:dateOfBirth.tooYoung");
  });

  it("refuses a date of birth over 120 years ago", () => {
    expect(
      dateOfBirthSchema.validate(yearsAgo(121)).error?.details[0].message
    ).toBe("validation:dateOfBirth.tooOld");
  });
});
