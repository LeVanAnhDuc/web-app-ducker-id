// libs
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import { targetConstructorToSchema } from "class-validator-jsonschema";
// validators
import {
  EachItem,
  IsObjectId,
  ToBoolean,
  ToInt,
  UnlessMissing
} from "@/validators/decorators";
import { PageQueryDto } from "@/validators/dtos/pagination.query";
// others
import { jsonSchemaOptions } from "../converters";

const ROLES = ["user", "admin"];

class ConverterFixtureDto {
  @IsString()
  @IsOptional()
  nickname?: string | null;

  @IsString()
  @UnlessMissing()
  title?: string;

  @Max(100)
  @Min(1)
  @IsInt()
  @IsOptional()
  @ToInt()
  limit?: number;

  @IsBoolean()
  @IsOptional()
  @ToBoolean()
  isRead?: boolean;

  @EachItem("isIn", (item) => ROLES.includes(item as string), {}, [ROLES])
  @IsArray()
  roles!: string[];

  @IsObjectId("validation:fixture.invalid", { each: true })
  @IsArray()
  ids!: string[];
}

const properties = () =>
  (
    targetConstructorToSchema(ConverterFixtureDto, jsonSchemaOptions) as {
      properties: Record<string, Record<string, unknown>>;
    }
  ).properties;

describe("additionalConverters", () => {
  it("marks an IsOptional field nullable", () => {
    expect(properties().nickname).toEqual({ type: "string", nullable: true });
  });

  it("keeps an UnlessMissing field non-nullable", () => {
    expect(properties().title).toEqual({ type: "string" });
  });

  it("documents a ToInt query field as integer with its min/max", () => {
    expect(properties().limit).toEqual({
      type: "integer",
      minimum: 1,
      maximum: 100,
      nullable: true
    });
    expect(
      (
        targetConstructorToSchema(PageQueryDto, jsonSchemaOptions) as {
          properties: Record<string, Record<string, unknown>>;
        }
      ).properties.page
    ).toMatchObject({ type: "integer", minimum: 1 });
  });

  it("documents ToBoolean as boolean", () => {
    expect(properties().isRead).toEqual({ type: "boolean", nullable: true });
  });

  it("documents EachItem(isIn) as an array of enum values", () => {
    expect(properties().roles).toEqual({
      type: "array",
      items: { type: "string", enum: ["user", "admin"] }
    });
  });

  it("documents IsObjectId each as an array of ObjectId strings", () => {
    expect(properties().ids).toEqual({
      type: "array",
      items: { type: "string", pattern: "^[a-fA-F0-9]{24}$" }
    });
  });
});
