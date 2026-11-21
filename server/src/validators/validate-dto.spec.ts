// libs
import { Type } from "class-transformer";
import {
  IsDefined,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidateNested,
  ValidatorConstraint
} from "class-validator";
import type { ValidatorConstraintInterface } from "class-validator";
// validators
import { validateDto } from "@/validators/validate-dto";

class FlatDto {
  @IsString({ message: "validation:a.invalid" })
  @MaxLength(2, { message: "validation:a.max" })
  a!: string;
}

class TwoRulesDto {
  @MinLength(5, { message: "validation:code.min" })
  @Matches(/^\d+$/, { message: "validation:code.pattern" })
  code!: string;
}

class ChildDto {
  @IsString({ message: "validation:name.invalid" })
  name!: string;
}

class ParentDto {
  @ValidateNested({ each: true })
  @Type(() => ChildDto)
  items!: ChildDto[];
}

@ValidatorConstraint({ name: "alwaysFails" })
class AlwaysFails implements ValidatorConstraintInterface {
  validate(): boolean {
    return false;
  }
}

class RootDto {
  @Validate(AlwaysFails, {
    message: "validation:range.invalid",
    context: { root: true }
  })
  to!: string;
}

class RootAndFieldDto extends RootDto {
  @IsString({ message: "validation:other.invalid" })
  other!: string;
}

class RequiredDto {
  @IsDefined({ message: "validation:a.required" })
  a!: string;
}

describe("validateDto", () => {
  it("returns the instance with unknown properties stripped", async () => {
    const { value, failures } = await validateDto(FlatDto, {
      a: "x",
      extra: 1
    });

    expect(failures).toEqual([]);
    expect(value).toBeInstanceOf(FlatDto);
    expect({ ...value }).toEqual({ a: "x" });
  });

  it("reports one failure per field with the first failing constraint", async () => {
    const { failures } = await validateDto(FlatDto, { a: "abcd" });

    expect(failures).toEqual([
      { field: "a", reason: "maxLength", key: "validation:a.max" }
    ]);
  });

  it("reports the bottom-most decorator when two rules fail on one field", async () => {
    const { failures } = await validateDto(TwoRulesDto, { code: "ab" });

    expect(failures).toEqual([
      { field: "code", reason: "matches", key: "validation:code.pattern" }
    ]);
  });

  it("dots nested paths", async () => {
    const { failures } = await validateDto(ParentDto, {
      items: [{ name: "ok" }, { name: 5 }]
    });

    expect(failures).toEqual([
      {
        field: "items.1.name",
        reason: "isString",
        key: "validation:name.invalid"
      }
    ]);
  });

  it('reports root-context constraints at field ""', async () => {
    const { failures } = await validateDto(RootDto, { to: "x" });

    expect(failures).toEqual([
      { field: "", reason: "alwaysFails", key: "validation:range.invalid" }
    ]);
  });

  it("drops root failures while any field fails, as Joi skipped object rules", async () => {
    const { failures } = await validateDto(RootAndFieldDto, {
      to: "x",
      other: 5
    });

    expect(failures).toEqual([
      { field: "other", reason: "isString", key: "validation:other.invalid" }
    ]);
  });

  it("keeps a root failure once every field passes", async () => {
    const { failures } = await validateDto(RootAndFieldDto, {
      to: "x",
      other: "y"
    });

    expect(failures).toEqual([
      { field: "", reason: "alwaysFails", key: "validation:range.invalid" }
    ]);
  });

  it("treats undefined input as an empty object", async () => {
    const { failures } = await validateDto(RequiredDto, undefined);

    expect(failures).toEqual([
      { field: "a", reason: "isDefined", key: "validation:a.required" }
    ]);
  });

  it.each([
    ["an empty array", []],
    ["an array of objects", [{}]],
    ["an array holding a valid object", [{ a: "x" }]],
    ["a string", "x"],
    ["a number", 5],
    ["a boolean", true]
  ])(
    "refuses %s as a whole instead of validating it",
    async (_label, plain) => {
      const { failures } = await validateDto(RequiredDto, plain);

      expect(failures).toEqual([
        { field: "", reason: "isObject", key: "validation:body.invalid" }
      ]);
    }
  );
});
