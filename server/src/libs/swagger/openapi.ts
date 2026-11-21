// libs
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { getMetadataStorage } from "class-validator";
import { validationMetadatasToSchemas } from "class-validator-jsonschema";
// types
import type { OpenAPIV3 } from "openapi-types";
// common
import {
  assertApiPropertyUsage,
  generatePaths,
  isDocumented,
  jsonSchemaOptions,
  SCHEMA_REF_PREFIX
} from "@/common/openapi";
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
import {
  categorySwaggerSchemas,
  categoryPaths
} from "@/modules/category/swagger";
import {
  entitlementSwaggerSchemas,
  entitlementPaths
} from "@/modules/entitlement/swagger";
import {
  recentAppSwaggerSchemas,
  recentAppPaths
} from "@/modules/recent-app/swagger";
import {
  notificationSwaggerSchemas,
  notificationPaths
} from "@/modules/notification/swagger";
import {
  loginHistorySwaggerSchemas,
  loginHistoryPaths
} from "@/modules/login-history/swagger";
import { favoritePaths } from "@/modules/favorite/swagger";
import {
  unlockAccountSwaggerSchemas,
  unlockAccountPaths
} from "@/modules/unlock-account/swagger";
// others
import ENV from "@/constants/env";
import { commonSchemas, commonResponses } from "./common.schemas";

const PORT = ENV.app.port;

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
  ...webAppSwaggerSchemas,
  ...categorySwaggerSchemas,
  ...entitlementSwaggerSchemas,
  ...recentAppSwaggerSchemas,
  ...notificationSwaggerSchemas,
  ...loginHistorySwaggerSchemas,
  ...unlockAccountSwaggerSchemas
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
  ...webAppPaths,
  ...categoryPaths,
  ...entitlementPaths,
  ...recentAppPaths,
  ...notificationPaths,
  ...loginHistoryPaths,
  ...favoritePaths,
  ...unlockAccountPaths
};

const handWritten = (): OpenAPIV3.Document => ({
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
      name: "Auth - Unlock",
      description: "Self-service unlock of an account locked by failed sign-ins"
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
      description: "Admin endpoints for managing apps"
    },
    {
      name: "Categories",
      description: "Public category list for the launcher filter"
    },
    {
      name: "Notifications",
      description:
        "The signed-in user's inbox — written by domain events, rendered by the client in the reader's locale"
    },
    {
      name: "Login History",
      description: "The signed-in user's own sign-ins and statistics"
    },
    {
      name: "Login History Admin",
      description: "Every account's sign-ins, for admins"
    },
    {
      name: "Favorites",
      description: "The signed-in user's pinned apps"
    },
    {
      name: "Categories Admin",
      description:
        "Admin endpoints for creating, renaming, ordering and deleting categories"
    },
    {
      name: "Entitlements Admin",
      description:
        "Admin endpoints for granting or revoking a user's access to an app beyond the role default"
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
});

const SRC_ROOT = join(__dirname, "../..");

// Where a class is declared, for the duplicate-name error. Class objects do
// not know their file, so the sources (or the compiled output) are searched;
// this only runs once a clash is found.
const declarationsOf = (name: string): string[] => {
  const pattern = new RegExp(`\\bclass ${name}\\b`);
  return (readdirSync(SRC_ROOT, { recursive: true }) as string[])
    .filter((file) => /\.(ts|js)$/.test(file) && !file.endsWith(".d.ts"))
    .flatMap((file) =>
      readFileSync(join(SRC_ROOT, file), "utf8")
        .split("\n")
        .flatMap((line, index) =>
          pattern.test(line) ? [`${file.replace(/\\/g, "/")}:${index + 1}`] : []
        )
    );
};

/** Every class name that more than one class-validator target carries. */
const duplicateClassNames = (): Set<string> => {
  const byName = new Map<string, Set<Function>>();
  const { validationMetadatas } = getMetadataStorage() as unknown as {
    validationMetadatas: Map<unknown, unknown>;
  };
  for (const target of validationMetadatas.keys()) {
    if (typeof target !== "function") continue;
    const targets = byName.get(target.name) ?? new Set<Function>();
    targets.add(target);
    byName.set(target.name, targets);
  }
  return new Set(
    [...byName].filter(([, targets]) => targets.size > 1).map(([name]) => name)
  );
};

const schemaRefsIn = (node: unknown, found: Set<string>): Set<string> => {
  if (Array.isArray(node)) node.forEach((item) => schemaRefsIn(item, found));
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (
        key === "$ref" &&
        typeof value === "string" &&
        value.startsWith(SCHEMA_REF_PREFIX)
      ) {
        found.add(value.slice(SCHEMA_REF_PREFIX.length));
      } else schemaRefsIn(value, found);
    }
  }
  return found;
};

/** The generated schemas the generated paths reach, directly or through others. */
const reachableSchemas = (
  paths: OpenAPIV3.PathsObject,
  generated: Record<string, OpenAPIV3.SchemaObject>
): Record<string, OpenAPIV3.SchemaObject> => {
  const reached: Record<string, OpenAPIV3.SchemaObject> = {};
  const pending = [...schemaRefsIn(paths, new Set())];
  while (pending.length) {
    const name = pending.pop() as string;
    if (reached[name] || !generated[name]) continue;
    reached[name] = generated[name];
    pending.push(...schemaRefsIn(generated[name], new Set()));
  }
  return reached;
};

/**
 * The `/api-docs` document. Operations of controllers that declare their own
 * `@OpenAPI` are generated from their annotations (see `@/common/openapi`);
 * the rest still come from the hand-written `swagger/` folders, and a
 * generated operation replaces a hand-written one at the same method and path.
 *
 * Order (design §Step 0): duplicate class names → schemas → bridge on each
 * generated controller → library → normalizePathKeys (inside generatePaths).
 * Only the schemas the generated operations reach are added, and a duplicate
 * name fails only when such a schema is one of them: two classes with one name
 * would silently merge into one schema.
 */
export const buildOpenApiSpec = (controllers: object[]): OpenAPIV3.Document => {
  assertApiPropertyUsage();
  const duplicates = duplicateClassNames();
  const schemas = validationMetadatasToSchemas(
    jsonSchemaOptions
  ) as unknown as Record<string, OpenAPIV3.SchemaObject>;

  const documented = controllers
    .map((instance) => instance.constructor)
    .filter(isDocumented);
  const generatedPaths = generatePaths(documented);
  const generatedSchemas = reachableSchemas(generatedPaths, schemas);

  for (const name of Object.keys(generatedSchemas)) {
    if (duplicates.has(name)) {
      throw new Error(
        `Two classes are named ${name}: ${declarationsOf(name).join(", ")}. Schema names are class names; rename one.`
      );
    }
  }

  const doc = handWritten();
  for (const name of Object.keys(generatedSchemas)) {
    if (doc.components?.schemas?.[name]) {
      throw new Error(
        `Schema ${name} is both generated and hand-written; rename the class.`
      );
    }
  }

  const paths: OpenAPIV3.PathsObject = { ...doc.paths };
  for (const [path, item] of Object.entries(generatedPaths)) {
    paths[path] = { ...paths[path], ...item };
  }

  return {
    ...doc,
    paths,
    components: {
      ...doc.components,
      schemas: { ...doc.components?.schemas, ...generatedSchemas }
    }
  };
};
