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

  it("treats undefined input as an empty object", async () => {
    const { failures } = await validateDto(RequiredDto, undefined);

    expect(failures).toEqual([
      { field: "a", reason: "isDefined", key: "validation:a.required" }
    ]);
  });
});
