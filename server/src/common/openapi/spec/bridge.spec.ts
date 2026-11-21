// libs
import { IsDefined, IsOptional, IsString } from "class-validator";
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Post } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { OpenAPIV3 } from "openapi-types";
// common
import {
  Admin,
  Auth,
  OptionalAuth,
  RateLimit,
  Respond,
  ValidBody,
  ValidParams,
  ValidQuery
} from "@/common/routing";
// others
import { ApiErrors } from "../api-errors";
import { ApiProperty } from "../api-property";
import { generatePaths, routeOperation } from "../bridge";

class BridgeIdParamsDto {
  @IsString()
  @IsDefined()
  id!: string;
}

class BridgeBodyDto {
  @IsString()
  @IsDefined()
  name!: string;
}

class BridgeQueryDto {
  @IsString()
  @IsDefined()
  search!: string;

  @IsString()
  @IsOptional()
  cursor?: string;
}

class BridgeItemDto {
  @ApiProperty()
  label!: string;
}

@JsonController("/bridge-fixtures")
class BridgeFixtureController {
  @Post("/:id")
  @Auth()
  @RateLimit("updateProfileByIp")
  @Respond({ status: StatusCodes.CREATED })
  @ApiErrors(404, 409)
  create(
    @ValidParams(BridgeIdParamsDto) _params: BridgeIdParamsDto,
    @ValidBody(BridgeBodyDto) _body: BridgeBodyDto
  ) {
    return undefined;
  }

  @Delete("/:id")
  @Auth()
  @Admin()
  @Respond({ status: StatusCodes.NO_CONTENT })
  remove(@ValidParams(BridgeIdParamsDto) _params: BridgeIdParamsDto) {
    return undefined;
  }

  @Get("/")
  @OptionalAuth()
  @Respond({ type: [BridgeItemDto] })
  list(@ValidQuery(BridgeQueryDto) _query: BridgeQueryDto) {
    return [];
  }
}

@JsonController("/bridge-documented")
@OpenAPI({ tags: ["Documented"] })
class DocumentedFixtureController {
  @Get("/one")
  @OpenAPI({ summary: "Get one", description: "The one." })
  @Respond({ type: BridgeItemDto })
  one() {
    return {};
  }
}

const paths = generatePaths([
  BridgeFixtureController,
  DocumentedFixtureController
]);
const op = (path: string, method: "get" | "post" | "delete") =>
  (paths[path] as OpenAPIV3.PathItemObject)[
    method
  ] as OpenAPIV3.OperationObject;

const ref = (name: string) => ({ $ref: `#/components/responses/${name}` });
const envelope = { $ref: "#/components/schemas/SuccessResponse" };

describe("routeOperation", () => {
  it("documents a guarded, limited, validated 201 route from its decorators", () => {
    const create = op("/bridge-fixtures/{id}", "post");

    expect(create.security).toEqual([{ bearerAuth: [] }]);
    expect(create.parameters).toEqual([
      { in: "path", name: "id", required: true, schema: { type: "string" } }
    ]);
    expect(create.requestBody).toEqual({
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/BridgeBodyDto" }
        }
      }
    });
    expect(create.responses).toEqual({
      "201": {
        description: "Created",
        content: { "application/json": { schema: envelope } }
      },
      "400": ref("ValidationError"),
      "401": ref("Unauthorized"),
      "403": ref("Forbidden"),
      "404": ref("NotFound"),
      "409": ref("Conflict"),
      "429": ref("TooManyRequests")
    });
    expect(create.summary).toBeUndefined();
    expect(create.tags).toBeUndefined();
  });

  it("documents a 204 route with no content", () => {
    const remove = op("/bridge-fixtures/{id}", "delete");

    expect(remove.responses).toEqual({
      "204": { description: "No content" },
      "400": ref("ValidationError"),
      "401": ref("Unauthorized"),
      "403": ref("Forbidden")
    });
  });

  it("documents an OptionalAuth route as optionally secured, with query params and typed data", () => {
    // "/" comes out of the library with a trailing slash; generatePaths strips it.
    const list = op("/bridge-fixtures", "get");

    expect(list.security).toEqual([{}, { bearerAuth: [] }]);
    expect(list.parameters).toEqual([
      {
        in: "query",
        name: "search",
        required: true,
        schema: { type: "string" }
      },
      {
        in: "query",
        name: "cursor",
        required: false,
        schema: { type: "string", nullable: true }
      }
    ]);
    expect(list.requestBody).toBeUndefined();
    expect(list.responses).toEqual({
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: {
              allOf: [
                envelope,
                {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/BridgeItemDto" }
                    }
                  }
                }
              ]
            }
          }
        }
      },
      "400": ref("ValidationError")
    });
  });

  it("keeps what the controller declares: class tags, method summary and description", () => {
    const one = op("/bridge-documented/one", "get");

    expect(one.tags).toEqual(["Documented"]);
    expect(one.summary).toBe("Get one");
    expect(one.description).toBe("The one.");
    expect(one.security).toBeUndefined();
    expect(one.responses).toEqual({
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: {
              allOf: [
                envelope,
                {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/BridgeItemDto" }
                  }
                }
              ]
            }
          }
        }
      }
    });
  });

  it("drops the library's default summary and tags", () => {
    const out = routeOperation(
      { summary: "Create", tags: ["Bridge Fixture"], responses: {} },
      { target: BridgeFixtureController, method: "create" }
    );
    expect(out.summary).toBeUndefined();
    expect(out.tags).toBeUndefined();
  });

  it("refuses an @ApiErrors status the decorators already document", () => {
    @JsonController("/bridge-restated")
    class RestatingController {
      @Get("/")
      @Auth()
      @ApiErrors(401)
      get() {
        return {};
      }
    }

    expect(() => generatePaths([RestatingController])).toThrow(
      "RestatingController.get: @ApiErrors(401) restates a status its decorators already document"
    );
  });

  it("refuses a status with no shared response", () => {
    expect(() => ApiErrors(418)).toThrow(
      "@ApiErrors(418): no shared response in components.responses"
    );
  });
});
