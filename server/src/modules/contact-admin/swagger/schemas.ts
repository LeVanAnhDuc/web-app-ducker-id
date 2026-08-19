// types
import type { OpenAPIV3 } from "openapi-types";

export const contactAdminSwaggerSchemas: Record<
  string,
  OpenAPIV3.SchemaObject
> = {
  SubmitContactRequest: {
    type: "object",
    required: ["subject", "message"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
        description: "Optional contact email (auto-filled if logged in)"
      },
      subject: {
        type: "string",
        minLength: 5,
        maxLength: 200,
        example: "Cannot access my account"
      },
      message: {
        type: "string",
        minLength: 20,
        maxLength: 5000,
        example:
          "I have been unable to log in to my account for the past 2 days."
      }
    }
  },
  SubmitContactResponse: {
    type: "object",
    properties: {
      id: {
        type: "string",
        example: "507f1f77bcf86cd799439011",
        description: "MongoDB _id of the created contact"
      }
    }
  },
  ContactListItem: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      email: {
        type: "string",
        nullable: true,
        example: "user@example.com"
      },
      subject: { type: "string", example: "Cannot access my account" },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
        example: "medium"
      },
      status: {
        type: "string",
        enum: ["new", "processing", "resolved"],
        example: "new"
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    }
  },
  ContactDetailItem: {
    type: "object",
    properties: {
      _id: { type: "string", example: "507f1f77bcf86cd799439011" },
      email: {
        type: "string",
        nullable: true,
        example: "user@example.com"
      },
      subject: { type: "string", example: "Cannot access my account" },
      message: {
        type: "string",
        example:
          "I have been unable to log in to my account for the past 2 days."
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
        example: "medium"
      },
      status: {
        type: "string",
        enum: ["new", "processing", "resolved"],
        example: "new"
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    }
  }
};
