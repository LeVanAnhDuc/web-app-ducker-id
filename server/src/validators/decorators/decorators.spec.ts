// libs
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength
} from "class-validator";
// validators
import { getDateOfBirthBounds } from "@/validators/date-of-birth";
import { validateDto } from "@/validators/validate-dto";
import {
  IsDateOfBirthNotTooOld,
  IsDateOfBirthNotTooYoung,
  IsNotEmptyBody,
  IsObjectId,
  IsOnOrAfter,
  Lowercase,
  MatchesProperty,
  ToBoolean,
  ToInt,
  Trim
} from "@/validators/decorators";

class BooleanDto {
  @IsBoolean({ message: "validation:interactive.invalid" })
  @ToBoolean()
  flag!: boolean;
}

class IntDto {
  @IsInt({ message: "validation:page.invalid" })
  @ToInt()
  page!: number;
}

class TrimmedDto {
  @MaxLength(3, { message: "validation:search.invalid" })
  @IsString({ message: "validation:search.invalid" })
  @Lowercase()
  @Trim()
  search!: string;
}

class ObjectIdDto {
  @IsObjectId("validation:userId.invalid")
  id!: string;
}

class ConfirmDto {
  @IsString()
  password!: string;

  @MatchesProperty("password", {
    message: "changePassword:validation.confirmMismatch"
  })
  confirmPassword!: string;
}

class RangeDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOnOrAfter("fromDate", {
    message: "validation:dateRange.invalid",
    context: { root: true }
  })
  @IsOptional()
  @IsString()
  toDate?: string;
}

class DateOfBirthDto {
  @IsDateOfBirthNotTooOld({ message: "validation:dateOfBirth.tooOld" })
  @IsDateOfBirthNotTooYoung({ message: "validation:dateOfBirth.tooYoung" })
  dateOfBirth!: string;
}

@IsNotEmptyBody({ message: "webApp:validation.body.empty" })
class PatchDto {
  @IsOptional()
  @IsString()
  name?: string;
}

const yearsAgo = (years: number, days = 0): string => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

describe("ToBoolean", () => {
  it('keeps "false" false rather than truthy', async () => {
    const { value, failures } = await validateDto(BooleanDto, {
      flag: "false"
    });

    expect(failures).toEqual([]);
    expect(value.flag).toBe(false);
  });

  it('maps "true" and passes booleans through', async () => {
    expect((await validateDto(BooleanDto, { flag: "true" })).value.flag).toBe(
      true
    );
    expect((await validateDto(BooleanDto, { flag: false })).value.flag).toBe(
      false
    );
  });

  it("leaves anything else for @IsBoolean to reject", async () => {
    const { failures } = await validateDto(BooleanDto, { flag: "maybe" });

    expect(failures).toEqual([
      {
        field: "flag",
        reason: "isBoolean",
        key: "validation:interactive.invalid"
      }
    ]);
  });
});

describe("ToInt", () => {
  it("converts an integer string", async () => {
    const { value, failures } = await validateDto(IntDto, { page: "2" });

    expect(failures).toEqual([]);
    expect(value.page).toBe(2);
  });

  it.each([
    ["+2", 2],
    [" 2", 2],
    ["2.0", 2],
    ["1e2", 100],
    ["02", 2]
  ])("converts %p as Joi's number() does", async (page, expected) => {
    const { value, failures } = await validateDto(IntDto, { page });

    expect(failures).toEqual([]);
    expect(value.page).toBe(expected);
  });

  it.each(["1.5", "abc", "", "   ", "99999999999999999999"])(
    "leaves %p for @IsInt to reject",
    async (page) => {
      const { failures } = await validateDto(IntDto, { page });

      expect(failures).toEqual([
        { field: "page", reason: "isInt", key: "validation:page.invalid" }
      ]);
    }
  );
});

describe("Trim / Lowercase", () => {
  it("normalises before the length check", async () => {
    const { value, failures } = await validateDto(TrimmedDto, {
      search: "  AbC  "
    });

    expect(failures).toEqual([]);
    expect(value.search).toBe("abc");
  });

  it("leaves non-strings alone for @IsString to reject", async () => {
    const { failures } = await validateDto(TrimmedDto, { search: 5 });

    expect(failures).toEqual([
      { field: "search", reason: "isString", key: "validation:search.invalid" }
    ]);
  });
});

describe("IsObjectId", () => {
  it("accepts 24 hex characters", async () => {
    const { failures } = await validateDto(ObjectIdDto, {
      id: "a".repeat(24)
    });

    expect(failures).toEqual([]);
  });

  it.each([["a".repeat(23)], ["z".repeat(24)], [123]])(
    "rejects %p with the given key",
    async (id) => {
      const { failures } = await validateDto(ObjectIdDto, { id });

      expect(failures).toEqual([
        { field: "id", reason: "isObjectId", key: "validation:userId.invalid" }
      ]);
    }
  );
});

describe("MatchesProperty", () => {
  it("accepts an equal value", async () => {
    const { failures } = await validateDto(ConfirmDto, {
      password: "Secret1!",
      confirmPassword: "Secret1!"
    });

    expect(failures).toEqual([]);
  });

  it("reports a mismatch on the confirming field", async () => {
    const { failures } = await validateDto(ConfirmDto, {
      password: "Secret1!",
      confirmPassword: "Secret2!"
    });

    expect(failures).toEqual([
      {
        field: "confirmPassword",
        reason: "matchesProperty",
        key: "changePassword:validation.confirmMismatch"
      }
    ]);
  });
});

describe("IsOnOrAfter", () => {
  it("accepts an equal or later date and a missing bound", async () => {
    for (const input of [
      { fromDate: "2026-01-01", toDate: "2026-01-01" },
      { fromDate: "2026-01-01", toDate: "2026-02-01" },
      { toDate: "2026-02-01" },
      { fromDate: "2026-02-01" }
    ]) {
      expect((await validateDto(RangeDto, input)).failures).toEqual([]);
    }
  });

  it("leaves an unparsable bound to the field's own rules, as Joi did", async () => {
    for (const input of [
      { fromDate: "2026-02-01", toDate: "not-a-date" },
      { fromDate: "not-a-date", toDate: "2026-01-01" }
    ]) {
      expect((await validateDto(RangeDto, input)).failures).toEqual([]);
    }
  });

  it('reports an inverted range against the object, field ""', async () => {
    const { failures } = await validateDto(RangeDto, {
      fromDate: "2026-02-01",
      toDate: "2026-01-01"
    });

    expect(failures).toEqual([
      {
        field: "",
        reason: "isOnOrAfter",
        key: "validation:dateRange.invalid"
      }
    ]);
  });
});

describe("IsDateOfBirthNotTooYoung / IsDateOfBirthNotTooOld", () => {
  it("accepts today's 13th birthday", async () => {
    const { failures } = await validateDto(DateOfBirthDto, {
      dateOfBirth: yearsAgo(13)
    });

    expect(failures).toEqual([]);
  });

  it("refuses a 12-year-old as too young", async () => {
    const { failures } = await validateDto(DateOfBirthDto, {
      dateOfBirth: yearsAgo(12)
    });

    expect(failures).toEqual([
      {
        field: "dateOfBirth",
        reason: "isDateOfBirthNotTooYoung",
        key: "validation:dateOfBirth.tooYoung"
      }
    ]);
  });

  it("refuses a date of birth over 120 years ago as too old", async () => {
    const { failures } = await validateDto(DateOfBirthDto, {
      dateOfBirth: yearsAgo(121)
    });

    expect(failures).toEqual([
      {
        field: "dateOfBirth",
        reason: "isDateOfBirthNotTooOld",
        key: "validation:dateOfBirth.tooOld"
      }
    ]);
  });

  it("uses the same bounds as getDateOfBirthBounds", async () => {
    const { maxDate, minDate } = getDateOfBirthBounds();
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    for (const dateOfBirth of [iso(maxDate), iso(minDate)]) {
      expect(
        (await validateDto(DateOfBirthDto, { dateOfBirth })).failures
      ).toEqual([]);
    }
  });
});

describe("IsNotEmptyBody", () => {
  it('reports an empty body against the object, field ""', async () => {
    const { failures } = await validateDto(PatchDto, {});

    expect(failures).toEqual([
      {
        field: "",
        reason: "isNotEmptyBody",
        key: "webApp:validation.body.empty"
      }
    ]);
  });

  it("counts only known properties, unknown ones being stripped", async () => {
    const { failures } = await validateDto(PatchDto, { other: 1 });

    expect(failures.map((failure) => failure.reason)).toEqual([
      "isNotEmptyBody"
    ]);
  });

  it("accepts a body with one known property and adds nothing to it", async () => {
    const { value, failures } = await validateDto(PatchDto, { name: "x" });

    expect(failures).toEqual([]);
    expect({ ...value }).toEqual({ name: "x" });
  });
});
