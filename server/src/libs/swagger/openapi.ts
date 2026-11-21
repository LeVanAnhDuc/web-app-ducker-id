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
  normalizeRefSiblings,
  SCHEMA_REF_PREFIX
} from "@/common/openapi";
import { isNamedValueClass } from "@/common/routing";
// others
import ENV from "@/constants/env";
import { commonSchemas, commonResponses } from "./common.schemas";

const PORT = ENV.app.port;

/** One description per tag a controller declares; the document lists exactly these. */
export const TAG_DESCRIPTIONS: OpenAPIV3.TagObject[] = [
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
    name: "Auth - Change Password",
    description:
      "Change the signed-in user's password, including from a temporary-password session"
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
    name: "Web App",
    description:
      "The launcher's app list, filtered to what the signed-in user may open"
  },
  {
    name: "Recent Apps",
    description: "The signed-in user's recently launched apps"
  },
  {
    name: "User Admin",
    description:
      "Admin endpoints for listing users and locking, unlocking or resetting accounts"
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
];

const baseDocument = (): OpenAPIV3.Document => ({
  openapi: "3.0.3",
  info: {
    title: "AppStore Web API",
    version: "1.0.0",
    description: "RESTful API for AppStore Web Application."
  },
  servers: [
    {
      url: `http://localhost:${PORT}/api/v1`,
      description: "Development server"
    }
  ],
  tags: TAG_DESCRIPTIONS,
  paths: {},
  components: {
    schemas: commonSchemas,
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

type MetadataStorage = ReturnType<typeof getMetadataStorage>;

const validationMetadatasOf = (
  storage: MetadataStorage
): Map<unknown, unknown> =>
  (storage as unknown as { validationMetadatas: Map<unknown, unknown> })
    .validationMetadatas;

/**
 * The class-validator storage minus the classes `@PathVariable` /
 * `@RequestParam` build for named values: those are documented as inline
 * parameters, and several share a name (`id`), so letting them into the
 * schema pass would merge them into one bogus `id` schema.
 */
const dtoStorage = (): MetadataStorage => {
  const storage = getMetadataStorage();
  const validationMetadatas = new Map(
    [...validationMetadatasOf(storage)].filter(
      ([target]) => !isNamedValueClass(target)
    )
  );
  return Object.assign(Object.create(storage) as MetadataStorage, {
    validationMetadatas
  });
};

/** Every class name that more than one DTO class carries. */
const duplicateClassNames = (storage: MetadataStorage): Set<string> => {
  const byName = new Map<string, Set<Function>>();
  for (const target of validationMetadatasOf(storage).keys()) {
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
 * The `/api-docs` document, generated from the controllers' annotations (see
 * `@/common/openapi`).
 *
 * Order (design §Step 0): duplicate class names → schemas → bridge on each
 * controller → library → normalizePathKeys (inside generatePaths). The first
 * two skip the classes built for named values, which the bridge inlines as
 * parameters. Only the
 * schemas the operations reach are added, and a duplicate name fails only when
 * such a schema is one of them: two classes with one name would silently merge
 * into one schema.
 */
export const buildOpenApiSpec = (controllers: object[]): OpenAPIV3.Document => {
  assertApiPropertyUsage();
  const storage = dtoStorage();
  const duplicates = duplicateClassNames(storage);
  const schemas = normalizeRefSiblings(
    validationMetadatasToSchemas({
      ...jsonSchemaOptions,
      classValidatorMetadataStorage: storage
    })
  ) as unknown as Record<string, OpenAPIV3.SchemaObject>;

  const documented = controllers
    .map((instance) => instance.constructor)
    .filter(isDocumented);
  const paths = generatePaths(documented);
  const reached = reachableSchemas(paths, schemas);

  for (const name of Object.keys(reached)) {
    if (duplicates.has(name)) {
      throw new Error(
        `Two classes are named ${name}: ${declarationsOf(name).join(", ")}. Schema names are class names; rename one.`
      );
    }
  }

  const doc = baseDocument();
  for (const name of Object.keys(reached)) {
    if (doc.components?.schemas?.[name]) {
      throw new Error(
        `Schema ${name} is a shared envelope schema and also a class name; rename the class.`
      );
    }
  }

  return {
    ...doc,
    paths,
    components: {
      ...doc.components,
      schemas: { ...doc.components?.schemas, ...reached }
    }
  };
};
