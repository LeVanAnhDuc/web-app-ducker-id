// types
import type { OpenAPIV3 } from "openapi-types";
// modules
import { loginSwaggerSchemas, loginPaths } from "@/modules/login/swagger";
import { signupSwaggerSchemas, signupPaths } from "@/modules/signup/swagger";
import { logoutSwaggerSchemas, logoutPaths } from "@/modules/logout/swagger";
import { tokenSwaggerSchemas, tokenPaths } from "@/modules/token/swagger";
import {
  forgotPasswordSwaggerSchemas,
  forgotPasswordPaths
} from "@/modules/forgot-password/swagger";
import {
  changePasswordSwaggerSchemas,
  changePasswordPaths
} from "@/modules/change-password/swagger";
import {
  contactAdminSwaggerSchemas,
  contactAdminPaths
} from "@/modules/contact-admin/swagger";
import { userSwaggerSchemas, userPaths } from "@/modules/user/swagger";
import { webAppSwaggerSchemas, webAppPaths } from "@/modules/web-app/swagger";
// others
import ENV from "@/constants/env";
import { commonSchemas, commonResponses } from "./common.schemas";

const PORT = ENV.APP_PORT || 3000;

const allSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  ...commonSchemas,
  ...loginSwaggerSchemas,
  ...signupSwaggerSchemas,
  ...logoutSwaggerSchemas,
  ...tokenSwaggerSchemas,
  ...forgotPasswordSwaggerSchemas,
  ...changePasswordSwaggerSchemas,
  ...contactAdminSwaggerSchemas,
  ...userSwaggerSchemas,
  ...webAppSwaggerSchemas
};

const allPaths: OpenAPIV3.PathsObject = {
  ...loginPaths,
  ...signupPaths,
  ...logoutPaths,
  ...tokenPaths,
  ...forgotPasswordPaths,
  ...changePasswordPaths,
  ...contactAdminPaths,
  ...userPaths,
  ...webAppPaths
};

export const openApiSpec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "AppStore Web API",
    version: "1.0.0",
    description: `RESTful API for AppStore Web Application.`.trim()
  },
  servers: [
    {
      url: `http://localhost:${PORT}/api/v1`,
      description: "Development server"
    }
  ],
  tags: [
    {
      name: "Auth - Signup",
      description: "User registration endpoints"
    },
    {
      name: "Auth - Login",
      description: "User authentication endpoints"
    },
    {
      name: "Auth - Session",
      description: "Session management endpoints (logout, token refresh)"
    },
    {
      name: "Auth - Forgot Password",
      description: "Password recovery via OTP or magic link"
    },
    {
      name: "Contact Admin",
      description:
        "Submit contact requests to the admin; authenticated users can list/view their own submitted contacts"
    },
    {
      name: "User Profile",
      description: "View and update user profile, upload avatar"
    },
    {
      name: "Web App Admin",
      description: "Admin endpoints for managing apps and categories"
    }
  ],
  paths: allPaths,
  components: {
    schemas: allSchemas,
    responses: commonResponses,
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token"
      }
    }
  }
};
