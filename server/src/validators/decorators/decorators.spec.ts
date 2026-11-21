// libs
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  MaxLength
} from "class-validator";
// validators
import { getDateOfBirthBounds } from "@/validators/date-of-birth";
import { validateDto } from "@/validators/validate-dto";
import {
  ArrayUniqueItems,
  EachItem,
  IsDateOfBirthNotTooOld,
  IsDateOfBirthNotTooYoung,
  IsIsoDateString,
  IsNotEmptyBody,
  IsObjectId,
  IsOnOrAfter,
  IsRedirectUri,
  IsRequiredObjectId,
  Lowercase,
  MatchesProperty,
  ToBoolean,
  ToDate,
  ToInt,
  ToIsoDateString,
  Trim,
  TrimEach
} from "@/validators/decorators";

class IsoDateDto {
  @IsIsoDateString({ message: "validation:fromDate.invalid" })
  @ToIsoDateString()
  date!: string;
}

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

class DateDto {
  @IsDate({ message: "validation:dateOfBirth.invalid" })
  @ToDate()
  date!: Date;
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

class EachObjectIdDto {
  @IsObjectId("validation:userId.invalid", { each: true })
  @IsArray({ message: "validation:userIds.invalid" })
  ids!: string[];
}

class RedirectUrisDto {
  @IsRedirectUri({
    each: true,
    message: "webApp:validation.redirectUris.invalid"
  })
  @TrimEach()
  uris!: string[];
}

class UniqueDto {
  @ArrayUniqueItems({ message: "validation:ids.duplicate" })
  ids!: unknown[];
}

class EvenDto {
  @EachItem("isEven", (item) => typeof item === "number" && item % 2 === 0, {
    message: "validation:numbers.invalid"
  })
  numbers!: unknown[];
}

class RequiredIdDto {
  @IsRequiredObjectId("category:validation.id.invalid")
  id!: string;
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

  it.each([
    ["TRUE", true],
    ["False", false],
    ["fAlSe", false]
  ])(
    "maps %p case-insensitively, as Joi's boolean() does",
    async (flag, expected) => {
      const { value, failures } = await validateDto(BooleanDto, { flag });

      expect(failures).toEqual([]);
      expect(value.flag).toBe(expected);
    }
  );

  it.each(["maybe", " true", "", "1"])(
    "leaves %p for @IsBoolean to reject",
    async (flag) => {
      const { failures } = await validateDto(BooleanDto, { flag });

      expect(failures).toEqual([
        {
          field: "flag",
          reason: "isBoolean",
          key: "validation:interactive.invalid"
        }
      ]);
    }
  );
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

describe("ToDate", () => {
  it.each([
    ["1995-05-15", "1995-05-15T00:00:00.000Z"],
    ["1995-05-15T10:30:00.000Z", "1995-05-15T10:30:00.000Z"],
    [800000000000, "1995-05-09T06:13:20.000Z"],
    ["800000000000", "1995-05-09T06:13:20.000Z"]
  ])("converts %p as Joi's date() does", async (date, expected) => {
    const { value, failures } = await validateDto(DateDto, { date });

    expect(failures).toEqual([]);
    expect(value.date).toEqual(new Date(expected));
  });

  it.each(["", "   ", "not-a-date", true, Number.NaN])(
    "leaves %p for @IsDate to reject",
    async (date) => {
      const { failures } = await validateDto(DateDto, { date });

      expect(failures).toEqual([
        {
          field: "date",
          reason: "isDate",
          key: "validation:dateOfBirth.invalid"
        }
      ]);
    }
  );
});

describe("ToIsoDateString / IsIsoDateString", () => {
  it.each([
    ["1995-05-15", "1995-05-15T00:00:00.000Z"],
    ["1995", "1995-01-01T00:00:00.000Z"],
    ["1995-05-15T10:30:00+07:00", "1995-05-15T03:30:00.000Z"],
    ["1995-05-15T10:30+07", "1995-05-15T03:30:00.000Z"]
  ])(
    "normalises %p as Joi's string().isoDate() does",
    async (date, expected) => {
      const { value, failures } = await validateDto(IsoDateDto, { date });

      expect(failures).toEqual([]);
      expect(value.date).toBe(expected);
    }
  );

  it.each(["", " 1995-05-15 ", "15/05/1995", "1995-02-30T25:00", 800000000000])(
    "leaves %p as sent and rejects it",
    async (date) => {
      const { value, failures } = await validateDto(IsoDateDto, { date });

      expect(value.date).toBe(date);
      expect(failures).toEqual([
        {
          field: "date",
          reason: "isIsoDateString",
          key: "validation:fromDate.invalid"
        }
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

describe("EachItem", () => {
  it("reports each failing item at its index", async () => {
    const { failures } = await validateDto(EvenDto, {
      numbers: [2, 3, 4, "6"]
    });
    expect(failures).toEqual([
      {
        field: "numbers.1",
        reason: "isEven",
        key: "validation:numbers.invalid"
      },
      {
        field: "numbers.3",
        reason: "isEven",
        key: "validation:numbers.invalid"
      }
    ]);
  });

  it("accepts an empty list", async () => {
    expect((await validateDto(EvenDto, { numbers: [] })).failures).toEqual([]);
  });
});

describe("IsObjectId / IsRedirectUri with { each: true }", () => {
  it("reports each bad id at its index", async () => {
    const { failures } = await validateDto(EachObjectIdDto, {
      ids: ["a".repeat(24), "x", 5]
    });
    expect(failures.map((failure) => failure.field)).toEqual([
      "ids.1",
      "ids.2"
    ]);
    expect(failures[0].reason).toBe("isObjectId");
  });

  it("leaves a non-array to @IsArray", async () => {
    const { failures } = await validateDto(EachObjectIdDto, { ids: "x" });
    expect(failures).toEqual([
      { field: "ids", reason: "isArray", key: "validation:userIds.invalid" }
    ]);
  });

  it("trims each redirect URI before checking it", async () => {
    const { value, failures } = await validateDto(RedirectUrisDto, {
      uris: [" https://a.example.com/cb ", "http://evil.example.com/cb"]
    });
    expect(value.uris[0]).toBe("https://a.example.com/cb");
    expect(failures).toEqual([
      {
        field: "uris.1",
        reason: "isRedirectUri",
        key: "webApp:validation.redirectUris.invalid"
      }
    ]);
  });
});

describe("ArrayUniqueItems", () => {
  it("reports every repeat, never the first occurrence", async () => {
    const { failures } = await validateDto(UniqueDto, {
      ids: ["a", "b", "a", "a"]
    });
    expect(failures.map((failure) => failure.field)).toEqual([
      "ids.2",
      "ids.3"
    ]);
    expect(failures[0].reason).toBe("arrayUnique");
  });
});

describe("IsRequiredObjectId", () => {
  it.each([
    [undefined, "isDefined"],
    [null, "isDefined"],
    [5, "isString"],
    ["", "isNotEmpty"],
    ["x", "isObjectId"]
  ])("refuses %p as %s with the one key", async (id, reason) => {
    const { failures } = await validateDto(RequiredIdDto, { id });
    expect(failures).toEqual([
      { field: "id", reason, key: "category:validation.id.invalid" }
    ]);
  });
});
