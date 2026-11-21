// libs
import { IsDefined, IsString } from "class-validator";
import { targetConstructorToSchema } from "class-validator-jsonschema";
// common
import { ExposeDate, ExposeId, ExposeOrNull, toDto } from "@/common/dto";
// others
import { ApiProperty, assertApiPropertyUsage } from "../api-property";
import { jsonSchemaOptions } from "../converters";
import { Listed, Paginated } from "../paginated";

const schemaOf = (Dto: Function) =>
  targetConstructorToSchema(Dto, jsonSchemaOptions) as {
    properties: Record<string, unknown>;
    required?: string[];
  };

describe("ApiProperty", () => {
  it("rejects anything but example/description on a request DTO", () => {
    expect(() => {
      class RequestWithType {
        @ApiProperty({ type: "integer" })
        @IsString()
        name!: string;
      }
      return RequestWithType;
    }).toThrow(
      "RequestWithType.name: @ApiProperty on a request DTO takes only example and description (got type)"
    );

    expect(() => {
      class RequestWithFunction {
        @ApiProperty(() => ({ type: "string" }))
        @IsString()
        name!: string;
      }
      return RequestWithFunction;
    }).toThrow(/RequestWithFunction\.name: .* request DTO/);

    class RequestWithExample {
      @ApiProperty({ example: "Ada", description: "Display name" })
      @IsString()
      name!: string;
    }
    expect(schemaOf(RequestWithExample).properties.name).toEqual({
      type: "string",
      example: "Ada",
      description: "Display name"
    });
  });

  it("rejects a restricted key on a request DTO whose rules are declared after it", () => {
    // The first property is decorated before the second one's rules exist, so
    // only the builder's re-check can see this class is a request DTO.
    class LateRequest {
      @ApiProperty({ nullable: true })
      first!: string;

      @IsDefined()
      second!: string;
    }

    expect(LateRequest.name).toBe("LateRequest");
    expect(() => assertApiPropertyUsage()).toThrow(
      "LateRequest.first: @ApiProperty on a request DTO takes only example and description (got nullable)"
    );
  });

  it("documents an array of DTOs as items.$ref, never $ref Array", () => {
    class ChildItemDto {
      @ApiProperty()
      label!: string;
    }
    class ParentItemDto {
      @ApiProperty({ type: [ChildItemDto] })
      children!: ChildItemDto[];

      @ApiProperty({ type: ChildItemDto, nullable: true })
      favourite!: ChildItemDto | null;
    }

    const { properties, required } = schemaOf(ParentItemDto);
    expect(properties.children).toEqual({
      type: "array",
      items: { $ref: "#/components/schemas/ChildItemDto" }
    });
    expect(properties.favourite).toEqual({
      nullable: true,
      allOf: [{ $ref: "#/components/schemas/ChildItemDto" }]
    });
    expect(required).toEqual(["children", "favourite"]);
  });

  it("documents ExposeOrNull as nullable", () => {
    class ExposedDto {
      @ExposeId("_id")
      id!: string;

      @ExposeOrNull()
      note!: string | null;

      @ExposeDate()
      createdAt!: string;
    }

    expect(schemaOf(ExposedDto).properties).toEqual({
      id: { type: "string" },
      note: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" }
    });
    // Documentation metadata only: the mapping is unchanged.
    const createdAt = new Date("2026-01-02T03:04:05.000Z");
    expect(
      toDto(ExposedDto, { _id: "a1", note: undefined, createdAt })
    ).toStrictEqual({
      id: "a1",
      note: null,
      createdAt: "2026-01-02T03:04:05.000Z"
    });
  });
});

describe("ApiProperty enum", () => {
  it("replaces a reflected $ref Object with a string enum", () => {
    type Mode = "a" | "b";
    class WithEnum {
      @ApiProperty({ enum: ["a", "b"], nullable: true })
      mode!: Mode | null;
    }
    expect(schemaOf(WithEnum).properties.mode).toEqual({
      type: "string",
      enum: ["a", "b"],
      nullable: true
    });
  });
});

describe("Paginated", () => {
  it("returns one cached <Dto>Page class with items: Dto[] and meta: PageMeta", () => {
    class PagedItemDto {
      @ApiProperty()
      label!: string;
    }
    const Page = Paginated(PagedItemDto);

    expect(Paginated(PagedItemDto)).toBe(Page);
    expect(Page.name).toBe("PagedItemDtoPage");
    expect(schemaOf(Page)).toEqual({
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/PagedItemDto" }
        },
        meta: { $ref: "#/components/schemas/PageMeta" }
      },
      required: ["items", "meta"]
    });
  });
});

describe("Listed", () => {
  it("returns one cached <Dto>List class with items: Dto[] and no meta", () => {
    class ListedItemDto {
      @ApiProperty()
      label!: string;
    }
    const List = Listed(ListedItemDto);

    expect(Listed(ListedItemDto)).toBe(List);
    expect(List.name).toBe("ListedItemDtoList");
    expect(schemaOf(List)).toEqual({
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/ListedItemDto" }
        }
      },
      required: ["items"]
    });
  });
});
