// libs
import { IsDefined, IsEmail, IsOptional, IsString } from "class-validator";
import { commonResponses } from "@/libs/swagger/common.schemas";
import { IsNotEmptyBody } from "@/validators/decorators";
import { StatusCodes } from "http-status-codes";
import { Delete, Get, JsonController, Patch, Post } from "routing-controllers";
import { OpenAPI } from "routing-controllers-openapi";
// types
import type { OpenAPIV3 } from "openapi-types";
// common
import {
  Admin,
  Auth,
  OptionalAuth,
  PasswordChangeAuth,
  RateLimit,
  Respond,
  PathVariable,
  RequestParam,
  ValidBody
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

class OptionalBodyDto {
  @IsString()
  @IsOptional()
  note?: string;
}

@IsNotEmptyBody({ message: "validation:body.empty" })
class NonEmptyBodyDto {
  @IsString()
  @IsOptional()
  note?: string;
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
    @PathVariable("id", IsString(), IsDefined()) _id: string,
    @ValidBody(BridgeBodyDto) _body: BridgeBodyDto
  ) {
    return undefined;
  }

  @Delete("/:id")
  @Auth()
  @Admin()
  @Respond({ status: StatusCodes.NO_CONTENT })
  remove(@PathVariable(BridgeIdParamsDto) _params: BridgeIdParamsDto) {
    return undefined;
  }

  @Get("/")
  @OptionalAuth()
  @Respond({ type: [BridgeItemDto] })
  list(@RequestParam(BridgeQueryDto) _query: BridgeQueryDto) {
    return [];
  }
}

@JsonController("/bridge-named")
class NamedValueFixtureController {
  @Get("/:appId")
  find(
    @PathVariable(
      "appId",
      IsString(),
      IsDefined(),
      ApiProperty({
        example: "507f1f77bcf86cd799439011",
        description: "The app"
      })
    )
    _appId: string,
    @RequestParam(
      "email",
      IsEmail(),
      ApiProperty({ example: "user@example.com" })
    )
    _email: string
  ) {
    return undefined;
  }
}

@JsonController("/bridge-bodies")
class BodyFixtureController {
  @Patch("/optional")
  @ApiErrors(500)
  optional(@ValidBody(OptionalBodyDto) _body: OptionalBodyDto) {
    return undefined;
  }

  @Patch("/non-empty")
  nonEmpty(@ValidBody(NonEmptyBodyDto) _body: NonEmptyBodyDto) {
    return undefined;
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

@JsonController("/bridge-guards")
@OpenAPI({ tags: ["Guards"] })
class GuardFixtureController {
  @Patch("/password-change")
  @PasswordChangeAuth()
  @OpenAPI({ summary: "Change password" })
  passwordChange() {
    return undefined;
  }

  @Get("/optional")
  @OptionalAuth()
  @OpenAPI({ summary: "Optional" })
  optional() {
    return undefined;
  }
}

const paths = generatePaths([
  GuardFixtureController,
  BodyFixtureController,
  BridgeFixtureController,
  DocumentedFixtureController,
  NamedValueFixtureController
]);
const op = (path: string, method: "get" | "post" | "delete" | "patch") =>
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

  it("documents named @PathVariable / @RequestParam values inline, with the ApiProperty among their rules", () => {
    const find = op("/bridge-named/{appId}", "get");

    expect(find.parameters).toEqual([
      {
        in: "path",
        name: "appId",
        required: true,
        schema: {
          type: "string",
          example: "507f1f77bcf86cd799439011",
          description: "The app"
        }
      },
      {
        in: "query",
        name: "email",
        required: true,
        schema: { type: "string", format: "email", example: "user@example.com" }
      }
    ]);
    expect(find.responses["400"]).toEqual(ref("ValidationError"));
  });

  it("holds a named value to the request-DTO rule: ApiProperty takes only example and description", () => {
    expect(() => {
      @JsonController("/bridge-named-misuse")
      class MisuseController {
        @Get("/:id")
        get(
          @PathVariable("id", IsString(), ApiProperty({ type: "integer" }))
          _id: string
        ) {
          return undefined;
        }
      }
      return MisuseController;
    }).toThrow(
      "id.id: @ApiProperty on a request DTO takes only example and description (got type)"
    );
  });

  it("marks a body required only when a field is required or IsNotEmptyBody applies", () => {
    const body = (path: string) =>
      (op(path, "patch").requestBody as OpenAPIV3.RequestBodyObject).required;

    expect(op("/bridge-fixtures/{id}", "post").requestBody).toMatchObject({
      required: true
    });
    expect(body("/bridge-bodies/optional")).toBe(false);
    expect(body("/bridge-bodies/non-empty")).toBe(true);
  });

  it("resolves @ApiErrors(500) to the shared InternalError response", () => {
    expect(op("/bridge-bodies/optional", "patch").responses["500"]).toEqual(
      ref("InternalError")
    );
    expect(commonResponses.InternalError).toBeDefined();
  });

  it("derives no 403 for @PasswordChangeAuth or @OptionalAuth routes", () => {
    const passwordChange = op("/bridge-guards/password-change", "patch");
    const optional = op("/bridge-guards/optional", "get");

    // The temporary-password session is the one this route exists for, and an
    // optional Bearer token never refuses a request.
    expect(passwordChange.responses["401"]).toEqual(ref("Unauthorized"));
    expect(passwordChange.responses["403"]).toBeUndefined();
    expect(optional.responses["403"]).toBeUndefined();
    expect(optional.responses["401"]).toBeUndefined();
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
        schema: { type: "string" }
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
