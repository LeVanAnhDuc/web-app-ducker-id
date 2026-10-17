// types
import type { OpenAPIV3 } from "openapi-types";
// modules
import {
  CLIENT_TYPES,
  DEVICE_TYPES,
  LOGIN_FAIL_REASONS,
  LOGIN_METHODS,
  LOGIN_SOURCES,
  LOGIN_STATUSES
} from "@/modules/login-history/constants";

const countBy = (keys: string[]): OpenAPIV3.SchemaObject => ({
  type: "object",
  properties: Object.fromEntries(keys.map((k) => [k, { type: "integer" }]))
});

const MY_ITEM_PROPERTIES: Record<string, OpenAPIV3.SchemaObject> = {
  _id: { type: "string", example: "507f1f77bcf86cd799439011" },
  method: { type: "string", enum: Object.values(LOGIN_METHODS) },
  status: { type: "string", enum: Object.values(LOGIN_STATUSES) },
  failReason: {
    type: "string",
    nullable: true,
    enum: Object.values(LOGIN_FAIL_REASONS)
  },
  ip: { type: "string", example: "203.0.113.x" },
  country: { type: "string", example: "VN" },
  city: { type: "string", example: "Ho Chi Minh City" },
  deviceType: { type: "string", enum: Object.values(DEVICE_TYPES) },
  os: { type: "string", example: "Windows" },
  browser: { type: "string", example: "Chrome" },
  clientType: { type: "string", enum: Object.values(CLIENT_TYPES) },
  isAnomaly: { type: "boolean" },
  createdAt: { type: "string", format: "date-time" },
  source: { type: "string", enum: Object.values(LOGIN_SOURCES) },
  interactive: { type: "boolean" },
  app: {
    type: "object",
    nullable: true,
    description: "The satellite app signed in to; null for an IdP sign-in",
    properties: {
      id: { type: "string", nullable: true },
      name: { type: "string" },
      iconUrl: { type: "string", nullable: true }
    }
  }
};

export const loginHistorySwaggerSchemas: Record<
  string,
  OpenAPIV3.SchemaObject
> = {
  MyLoginHistoryItem: {
    type: "object",
    description: "One of the caller's own sign-ins; the IP is masked",
    properties: MY_ITEM_PROPERTIES
  },
  AdminLoginHistoryItem: {
    type: "object",
    properties: {
      ...MY_ITEM_PROPERTIES,
      ip: { type: "string", example: "203.0.113.7" },
      userId: { type: "string", nullable: true },
      usernameAttempted: { type: "string", example: "user@example.com" },
      userAgent: { type: "string" },
      timezoneOffset: { type: "string", nullable: true, example: "+07:00" },
      anomalyReasons: { type: "array", items: { type: "string" } }
    }
  },
  MyLoginStats: {
    type: "object",
    properties: {
      total: { type: "integer" },
      successful: { type: "integer" },
      failed: { type: "integer" },
      byMethod: countBy(Object.values(LOGIN_METHODS)),
      byDevice: countBy(Object.values(DEVICE_TYPES)),
      byDay: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string", example: "2026-10-15" },
            total: { type: "integer" },
            successful: { type: "integer" },
            failed: { type: "integer" }
          }
        }
      },
      byApp: {
        type: "array",
        items: {
          type: "object",
          properties: {
            webAppId: { type: "string" },
            clientName: { type: "string", nullable: true },
            count: { type: "integer" }
          }
        }
      },
      anomalies: { type: "integer" },
      range: {
        type: "object",
        properties: {
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          days: { type: "integer" },
          timezone: { type: "string", example: "Asia/Ho_Chi_Minh" }
        }
      }
    }
  }
};
