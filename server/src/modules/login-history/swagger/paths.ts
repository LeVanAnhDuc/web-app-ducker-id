// types
import type { OpenAPIV3 } from "openapi-types";
// modules
import {
  CLIENT_TYPES,
  DEVICE_TYPES,
  LOGIN_HISTORY_SORT_BY_ADMIN,
  LOGIN_HISTORY_SORT_BY_USER,
  LOGIN_HISTORY_STATS_RANGES,
  LOGIN_METHODS,
  LOGIN_SOURCES,
  LOGIN_STATUSES
} from "@/modules/login-history/constants";
// common
import { PAGINATION } from "@/common/pagination";

const ok = (
  description: string,
  data: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
): OpenAPIV3.ResponseObject => ({
  description,
  content: {
    "application/json": {
      schema: {
        allOf: [
          { $ref: "#/components/schemas/SuccessResponse" },
          { type: "object", properties: { data } }
        ]
      }
    }
  }
});

const page = (itemRef: string): OpenAPIV3.SchemaObject => ({
  type: "object",
  properties: {
    items: { type: "array", items: { $ref: itemRef } },
    meta: { $ref: "#/components/schemas/PaginationMeta" }
  }
});

const query = (
  name: string,
  schema: OpenAPIV3.SchemaObject
): OpenAPIV3.ParameterObject => ({ name, in: "query", schema });

const enumOf = (values: readonly string[]): OpenAPIV3.SchemaObject => ({
  type: "string",
  enum: [...values]
});

const objectId: OpenAPIV3.SchemaObject = {
  type: "string",
  pattern: "^[a-fA-F0-9]{24}$"
};

const filterParams = (
  sortBy: readonly string[]
): OpenAPIV3.ParameterObject[] => [
  query("page", { type: "integer", minimum: 1, default: 1 }),
  query("limit", {
    type: "integer",
    minimum: 1,
    maximum: PAGINATION.MAX_LIMIT,
    default: PAGINATION.DEFAULT_LIMIT
  }),
  query("status", enumOf(Object.values(LOGIN_STATUSES))),
  query("method", enumOf(Object.values(LOGIN_METHODS))),
  query("deviceType", enumOf(Object.values(DEVICE_TYPES))),
  query("clientType", enumOf(Object.values(CLIENT_TYPES))),
  query("source", enumOf(Object.values(LOGIN_SOURCES))),
  query("webAppId", objectId),
  query("interactive", { type: "boolean" }),
  query("country", { type: "string" }),
  query("city", { type: "string" }),
  query("os", { type: "string" }),
  query("browser", { type: "string" }),
  query("fromDate", { type: "string", format: "date" }),
  query("toDate", { type: "string", format: "date" }),
  query("sortBy", enumOf(sortBy)),
  query("sortOrder", enumOf(["asc", "desc"]))
];

const authErrors = {
  "401": { $ref: "#/components/responses/Unauthorized" }
};

const adminErrors = {
  ...authErrors,
  "403": { $ref: "#/components/responses/Forbidden" }
};

export const loginHistoryPaths: OpenAPIV3.PathsObject = {
  "/login-history": {
    get: {
      summary: "List my sign-in history",
      description:
        "The caller's own sign-ins, newest first by default. IP addresses are masked.",
      tags: ["Login History"],
      security: [{ bearerAuth: [] }],
      parameters: filterParams(LOGIN_HISTORY_SORT_BY_USER),
      responses: {
        "200": ok(
          "Login history retrieved",
          page("#/components/schemas/MyLoginHistoryItem")
        ),
        "400": { $ref: "#/components/responses/ValidationError" },
        ...authErrors
      }
    }
  },
  "/login-history/stats": {
    get: {
      summary: "My sign-in statistics",
      description:
        "Totals, per-method and per-device counts and a zero-filled day series for the range, bucketed by the caller's IANA time zone.",
      tags: ["Login History"],
      security: [{ bearerAuth: [] }],
      parameters: [
        query("range", enumOf(LOGIN_HISTORY_STATS_RANGES)),
        query("tz", {
          type: "string",
          maxLength: 64,
          example: "Asia/Ho_Chi_Minh"
        })
      ],
      responses: {
        "200": ok("Login statistics retrieved", {
          $ref: "#/components/schemas/MyLoginStats"
        }),
        "400": { $ref: "#/components/responses/ValidationError" },
        ...authErrors
      }
    }
  },
  "/admin/login-history": {
    get: {
      summary: "List every account's sign-in history (admin)",
      tags: ["Login History Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        ...filterParams(LOGIN_HISTORY_SORT_BY_ADMIN),
        query("userId", objectId),
        query("ip", { type: "string" })
      ],
      responses: {
        "200": ok(
          "All login history retrieved",
          page("#/components/schemas/AdminLoginHistoryItem")
        ),
        "400": { $ref: "#/components/responses/ValidationError" },
        ...adminErrors
      }
    }
  },
  "/admin/login-history/{id}": {
    get: {
      summary: "One sign-in record (admin)",
      tags: ["Login History Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: objectId }
      ],
      responses: {
        "200": ok("Login history detail retrieved", {
          $ref: "#/components/schemas/AdminLoginHistoryItem"
        }),
        "400": { $ref: "#/components/responses/ValidationError" },
        ...adminErrors,
        "404": { $ref: "#/components/responses/NotFound" }
      }
    }
  }
};
