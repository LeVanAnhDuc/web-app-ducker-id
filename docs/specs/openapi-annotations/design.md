# OpenAPI from annotations — hand-written `swagger/` → routing-controllers-openapi

> **Status: approved 2026-11-21.** Owner decisions 2026-11-21: approach B; keep route-specific errors (`@ApiErrors`); keep request examples and descriptions (`@ApiProperty`, example and description only).

## Why

The API docs (`/api-docs`) are written by hand, and spread out:
- every module has a `swagger/` folder (`paths.ts`, `schemas.ts`, `index.ts`), about 4,750 lines in all;
- two modules also keep a Postman collection;
- `src/libs/swagger/openapi.ts` imports every module's barrel by hand;
- `common.schemas.ts` holds the shared envelope and error schemas.

A change to an endpoint is a change in two places (the controller, then its `swagger/paths.ts`), and nothing ties them together except `openapi.spec.ts`'s prefix and `$ref` checks.

The owner wants each endpoint's documentation **declared on the controller method**, the way Spring (`@Operation`, `@Schema`) and NestJS (`@ApiOperation`, `@ApiProperty`) do it. The `swagger/` folders should disappear.

## Goals

- Every documented endpoint's OpenAPI operation is produced from its controller: method, path, tags, summary/description, security, parameters, request body, success response and error responses.
- What the code already knows is never declared twice. These come from the routing metadata of #49 with no extra annotation:
  - verb, path and status (`@Respond`);
  - bearer security (`@Auth` / `@Admin` / `@PasswordChangeAuth`; `@OptionalAuth` means optional);
  - 400 (`@ValidBody` / `@ValidQuery` / `@ValidParams`), 401/403 (guards) and 429 (`@RateLimit`);
  - request schemas, taken from the class-validator rules of the #43 DTOs.
- Response bodies are documented from response DTO **classes**, wrapped in the success envelope `{ timestamp, path, message, data }`.
- `swagger/` folders, the two Postman collections and the hand-written assembly in `openapi.ts` are deleted.
- `/api-docs` keeps working with the same Swagger UI (`swagger-ui-express`, custom CSS).

## Non-goals

- The OAuth/OIDC routes (`/oauth/*`, `/.well-known/*`). They are not in `/api-docs` today and stay out.
- `/health` and Bull Board.
- Changing any runtime behaviour: paths, statuses, bodies and validation are untouched. The new decorators are documentation metadata only.
- Fixing the `AppStore Web API` title naming debt. It is copied as is (CLAUDE.md lists it as known debt).

## Anti-goals

- The docs disagree with the code again, for example a field the validator requires but the docs mark optional, or a 204 documented as 200. The request schema must come from the validation rules themselves, not a second declaration.
- An endpoint silently missing from `/api-docs`, or documented without a summary.
- Every method needs a long `@OpenAPI({ parameters, requestBody, security, responses })` block. That is the hand-written config again, just moved.

## Constraints

- **Libraries (owner's choice, approach B):**
  - `routing-controllers-openapi` 5.0.1, which needs routing-controllers `^0.11.0` (we run 0.11.3);
  - `class-validator-jsonschema` 5.2.0, which needs class-validator `^0.14 || ^0.15` (we run 0.15.1) and class-transformer `^0.5`.
  - Both pinned exactly.
- `routing-controllers-openapi` reads routing-controllers' own metadata. It **does not understand our decorators**:
  - our parameters are custom param decorators;
  - our guards, limiters and status live in our metadata store (`src/common/routing/metadata.ts`).
  
  Our decorators must therefore feed it through its `@OpenAPI(...)` merge mechanism. That way controllers do not repeat what they already declare.
- **`class-validator-jsonschema` only knows class-validator metadata.**
  - Request DTOs (#43) are covered.
  - Composite decorators such as `@IsAppEmail()`, and the custom transforms, need entries in `additionalConverters` where the generic output would be wrong.
  - Response DTOs carry only `@Expose` / `@ExposeId` / `@ExposeFrom` / `@ExposeOrNull` (#46), so nothing is generated for them.
- **26 of the 45 response DTOs are `interface`s.** These are the loose-value DTOs, plus `UserAppDto` extending a class. Interfaces have no runtime existence, so `@ResponseSchema` cannot reference them. Every documented response shape needs a class.
- `routing-controllers-openapi` depends on `reflect-metadata ^0.1.13`, while the repo uses 0.2.2. Two copies would mean two metadata registries; this must be verified, not assumed.
- Module code may import from `routing-controllers` only the allowlisted names, enforced by a source scan (#49). Imports from `routing-controllers-openapi` and `class-validator-jsonschema` are a separate allowlist question, decided below.
- **User review gate before every commit.** Conventional Commits; English code and comments.

## Approaches

| | Approach | Trade-off | |
| --- | --- | --- | --- |
| A | Our own Nest-style decorators and our own spec generator, reading our routing metadata | full control, understands our decorators natively; we maintain the generator | not chosen |
| B | **`routing-controllers-openapi` + `class-validator-jsonschema`**, with our decorators feeding the library's `@OpenAPI` merge | maintained libraries do the spec assembly and schema generation; our decorators must bridge to them, or every method repeats its params, body and security by hand | **chosen by the owner** |
| C | Move to NestJS for `@nestjs/swagger` | the real model; rewrites bootstrap, DI, guards and tests | rejected (as in the routing-controllers design) |

## Design

### What a controller looks like

```ts
@JsonController("/users/me/favorites")
@Auth()
@OpenAPI({ tags: ["Favorites"] })
export class FavoriteController {
  @Get("/")
  @OpenAPI({
    summary: "List my favourite apps",
    description: "Only apps the caller may still open. Not paginated."
  })
  @Respond({ message: "favorite:success.list", type: [UserAppDto] })
  list(@ValidQuery(ListFavoritesQueryDto) query: ListFavoritesQueryDto) { … }
}
```

- The method adds `@OpenAPI({ summary, description? })`. A class adds `@OpenAPI({ tags })` (or `@OpenAPI` with `tags` on a method that differs).
- **`@Respond` gains `type`**: a DTO class, `[Class]` for an array, `Paginated(Class)` for a page, or omitted for no `data`.
  - With a `type`, it feeds the library a 2xx response whose schema is `allOf: [SuccessResponse, { properties: { data: <ref> } }]`.
  - Without one, the 2xx schema is the bare `SuccessResponse` envelope, with no `data` property. That matches the runtime, where `data` is omitted.
  - A NO_CONTENT route documents `204` with no `content` at all.
- **Everything else is emitted by our existing decorators**, by calling the library's `OpenAPI(fn)` merge on the same method:

  | Decorator | Feeds the operation |
  | --- | --- |
  | `@Auth` / `@Admin` / `@PasswordChangeAuth` | `security: [{ bearerAuth: [] }]`, `401`, and `403` for `@Auth` and `@Admin` (`authGuard` answers 403 `AUTH_PASSWORD_CHANGE_REQUIRED` in a temporary-password session; `@PasswordChangeAuth` admits that session) |
  | `@OptionalAuth` | `security: [{}, { bearerAuth: [] }]` |
  | `@RateLimit` | `429` |
  | `@ValidParams(Dto)` / `@ValidQuery(Dto)` | `parameters`: one per DTO property, schema from `class-validator-jsonschema` |
  | `@ValidBody(Dto)` | `requestBody`: `$ref` to the DTO's schema, and `400` |

- **`@ApiErrors(...statuses)`** on a method documents the route-specific errors the code cannot reveal: 404, 409, 500, and any other status a service throws. Each status points at a shared `components.responses` entry (`NotFound`, `Conflict`, `InternalError`, …) in `common.schemas.ts`. It is one line, and it is the only manual error declaration. 400/401/403/429 are never listed by hand. *(Owner decision.)*
  - Today's hand-written docs list **422** on 20 operations. The API answers validation failures with **400** (`VALIDATION_ERROR`), so 422 is not carried over; it was wrong. Before deleting each module's `swagger/`, the builder checks whether that module's code can actually return 422. If it can, the module gets `@ApiErrors(422)`. If it cannot, the code is dropped and listed in the PR.
- `@ApiProperty({ ... })` is a thin decorator in `@/common/openapi` and works on both kinds of DTO:
  - **Request DTOs:** only `example` and `description` are allowed (`ApiProperty` rejects other keys on a class that has class-validator rules). Type, required, format, length, pattern and enum still come from the validation rules, so the two cannot disagree. The 206 `example` values and the field descriptions in today's `swagger/` are carried over this way. *(Owner decision.)*
  - **Response DTOs:** also everything reflection cannot infer: array item type, nullability, enum, and nested DTO.

  `ApiProperty` registers through `class-validator-jsonschema`'s `@JSONSchema`, plus whatever it takes for an undecorated `@Expose` property to appear at all. The step-0 spike settles exactly how.

### Response DTOs

- `Paginated(Dto)` returns a named class, `<Dto>Page`, with `items: Dto[]` and `meta: PageMeta`. It is cached per `Dto`, so the same name and schema are produced every time. `PageMeta` becomes a class too.
- Each documented response shape becomes a **class**. The 26 interfaces become classes with `@ApiProperty` on every field. Where a `to…Dto` function builds the object from loose values today, it keeps building a plain object typed as that class; nothing changes at runtime. `UserAppDto` (an interface extending `UserAppCardDto`) becomes a class extending it.
- Response DTO classes stay **plain**: no constructor, no methods. The interfaces that become classes are still built as object literals typed as the class; `toDto`/`@Expose` is not applied to them. Their existing `toStrictEqual` specs are unchanged.
- A spec checks that every response DTO class referenced by `@Respond({ type })` produces a schema with at least one property, and that every property has a type. A class whose fields reflect as `Object` without `@ApiProperty` fails.

### Spec assembly

- `src/libs/swagger/openapi.ts` becomes a small builder:
  - call `routingControllersToSpec(getMetadataArgsStorage(), { routePrefix: "/api/v1" }, { info, servers, components })`;
  - add `components.schemas` from `validationMetadatasToSchemas({ refPointerPrefix: "#/components/schemas/", additionalConverters })`;
  - add the shared `SuccessResponse` / error schemas and `components.responses` from `common.schemas.ts`, which stays;
  - add `securitySchemes.bearerAuth`.
- The builder runs once, eagerly, inside `mountHttp`, right after `mountControllers`: metadata exists only once the controller classes are imported. `setupSwagger(app, spec)` moves from `app.ts` to `mountHttp`. It is mounted **before** `mountControllers`, so its `/api-docs` and `/api-docs.json` are matched before the `/api/v1` stop step, the 404 and the error handler; the spec object is filled in after the mount and served by reference. The drift spec builds the document without Mongo or Redis, with the same stubbed `createModules()` that `route-manifest.spec.ts` already uses.
- **Schema names** are class names. A name used by two different classes fails the build with both module paths in the message; the builder renames one. No consumer references today's schema names (the client does not read `/api-docs`; the Postman collections are deleted), so names may change. Changed names are listed in the PR.
- Tags and their descriptions move from `openapi.ts` onto the controllers. A tag description lives in one table in the builder, keyed by tag name, because OpenAPI keeps tag descriptions at the document level.

### Guarding against drift

`openapi.spec.ts` is rewritten to assert:
1. every action mounted by `mountControllers` has exactly one operation in the spec, at the same method and path (paths with `:id` become `{id}`). That is all 63 routes, with no exemptions;
2. every operation has a `summary`;
3. every local `$ref` resolves;
4. the operation's 2xx status equals the route's `@Respond` status, and its security, 400, 401/403 and 429 match the route's guards, limiters and pipes, read from our metadata.

### Allowlist

Module code may import from `routing-controllers-openapi` only `OpenAPI`, and from `@/common/openapi` `ApiErrors`, `ApiProperty` and `Paginated`. It may not import `ResponseSchema`: `@Respond({ type })` owns responses, so there is one source. `class-validator-jsonschema` is imported only inside `@/common/openapi`. The source-scan spec is extended to enforce both.

## Step 0 result — PASS (2026-11-21)

The evidence is in `.superpowers/spike-openapi-notes.md`. The spike code is `server/src/libs/swagger/spike/spike.spec.ts`; it is uncommitted and gets deleted.

| Q | Finding | Evidence |
| --- | --- | --- |
| 1 deps | The two new libraries add no peer warnings; the only warning is the existing `class-validator` one from routing-controllers. `reflect-metadata` installs twice (0.1.14 via rco, 0.2.2 ours), but both polyfill the global `Reflect` and are only called through it, so there is **one registry in either load order**. The app loads 0.2 first (`server.ts`, `test/setup.ts`). Round trips in both directions work. | notes §Q1 |
| 2 raw spec | All 63 actions are emitted at the right verb, and `:id` becomes `{id}`. Our custom param decorators are **ignored cleanly**: no phantom params and no requestBody. But: the 19 `"/"` actions get a **trailing slash**; path params carry a leaked `pattern: "[^\/#\?]+?"`; status is always 200 (`@HttpCode` exists only after mount); and summary and tags default to the method and class names, which would hide a missing `@OpenAPI({summary})`. | notes §Q2 |
| 3 bridge | **One function**, registered by the builder on each controller class with `OpenAPI(bridge)(Ctor)`, reads `readRouteMeta()` and sets params (from the `@ValidParams` / `@ValidQuery` DTO schemas), requestBody, security, the `@Respond` status (204 without content) and 400/401/403/429. Proven on `FavoriteController` and `UserController`; a method then needs only `@OpenAPI({summary})`. It is cleaner than having each decorator call `OpenAPI`: one place and one source, the same store `mountControllers` reads. | notes §Q3 |
| 3 schemas | `validationMetadatasToSchemas` **throws as is**: `EachItem("isIn", …)` has no constraints. `additionalConverters` are required (`isIn`, `isObjectId`, `isIsoDateString`), and `isDefined` and `min`/`max` are recommended. `@IsAppEmail` gives `format: email` plus lengths and pattern. `ToBoolean` gives `boolean`. `ToInt` gives `number` instead of `integer` until `min`/`max` is fixed. Four same-named DTOs in `login` and `forgot-password` are **merged silently**. | notes §Q3 |
| 4 response DTOs | `@JSONSchema` alone and `@Expose` alone produce nothing. `@Allow()` gives an untyped `{}`. A **no-op named class-validator constraint** makes the property appear with its type reflected from `design:type`, and all such properties are required. Reflection drops `| null`, turns `Dto[]` into `$ref Array` and turns type-only imports into `$ref Object`. `JSONSchema(() => schema)` overrides each of these. | notes §Q4 |

**Verdict: PASS.** No controller method restates params, body, security or errors; it needs only `@OpenAPI({summary})` (plus our `@Respond({type})` and `@ApiErrors`). No library patch is needed. Exactly one post-processing function is needed: `normalizePathKeys(spec)`, which strips the trailing `/` from path keys and fails on a collision. The converters are options passed to the library, not post-processing. An alternative that needs no post-processing is writing `@Get()` instead of `@Get("/")` in 19 places; it is untested at runtime and is a convention the drift spec would have to enforce.

**Mechanism for the plan** (all in `src/common/openapi/`):
- `bridge.ts` exports `routeOperation(op, route)`. It:
  - reads `readRouteMeta`;
  - **deletes rco's default `summary` and `tags` first**, so that drift checks 2 and 4 see what the controller declared;
  - rebuilds path params from the params DTO;
  - replaces `responses` completely.
- The builder (`libs/swagger/openapi.ts`) runs in this order:
  1. a duplicate-class-name check over `getMetadataStorage().validationMetadatas`;
  2. `validationMetadatasToSchemas({ refPointerPrefix, additionalConverters, classTransformerMetadataStorage })`;
  3. `OpenAPI(routeOperation)(Ctor)` for every mounted controller class (once, guarded by a WeakSet);
  4. `routingControllersToSpec(...)`;
  5. `normalizePathKeys`.
- `converters.ts` holds `isIn` (delegates to the default when constraints exist, wraps EachItem rules as an array), `isObjectId`, `isIsoDateString`, `isDefined: {}`, and `min`/`max` without `type`.
- `ApiProperty(schema?)` registers a no-op constraint named `apiProperty` plus `JSONSchema`. On response DTOs it uses the function form when a type is given. `ExposeOrNull`, `ExposeDate` and `ExposeId` should register it themselves with `nullable: true`.
- `RespondOptions` gains `type`, which is stored in the existing metadata store.

**Open risks:**
- Request-side nullability: `@IsOptional` passes `null`, but no schema says `nullable`. `IsOptional` and `ValidateIf` share one validation type, so a converter needs to inspect the constraint.
- Renaming the four duplicate DTO classes in `login` / `forgot-password`.
- The response-DTO spec must reject `$ref` to `Array` / `Object`.
- `pnpm.overrides` for `reflect-metadata` is optional and untried.

## Migration order — one branch, one PR, several commits

0. **Spike.** On the real routing setup, find out:
   - whether `routingControllersToSpec` produces correct paths for our controllers. Questions: does it ignore our custom param decorators cleanly; does `routePrefix` behave; how do `:id` paths convert;
   - whether the `reflect-metadata` 0.1 / 0.2 copies share one registry;
   - whether `@JSONSchema` can describe an `@Expose`-only response class.
   
   Outcome recorded here before step 1.

   - **Pass:** our decorators emit params, body, security and errors, so a controller method needs only `@OpenAPI({ summary })`. One generic post-processing step in the builder is allowed (for example, dropping a phantom parameter the library derives from our custom param decorators), as long as it is a single function covered by a spec. A patch to the library is not allowed.
   - **Fail:** anything that needs per-method restatement of params, body or security. The plan stops there and the owner decides between approach A and accepting that. This is a time-boxed go/no-go gate, not open-ended research.
1. Core: `@/common/openapi` (`ApiProperty`, the bridge from our routing decorators to `OpenAPI`, `@Respond({ type })`), the builder, converters for the custom validators, the drift spec, and its own specs.
2. Pilot on `favorite`: delete its `swagger/`, and diff its operations against the hand-written ones. Same paths, parameters, statuses and schemas, except for differences listed and accepted in the PR.
3. Modules in the #49 groups (read-only → admin and profile → auth flows), converting their response interfaces to classes as each group needs them.
4. Delete the remaining `swagger/` folders, the Postman collections and the old assembly; update `CLAUDE.md` ("Adding an endpoint touches…", module anatomy) and `README.md`.

## Verification

- `pnpm type-check`, `pnpm lint`, `pnpm test`, including the drift spec and DTO schema specs.
- Per group, a structural diff of the generated operations against the hand-written ones they replace (path set, parameters, request schema properties, response status set). Differences are listed in the PR, not hidden.
- Load `/api-docs` in a browser once at the end and check that it renders and lists all 63 operations.

## Left to the builder

- File layout inside `@/common/openapi`.
- The exact `additionalConverters` set: whatever the per-module diff shows is needed.
- How `@ApiProperty` makes an `@Expose`-only field visible to `class-validator-jsonschema`. Step 0 decides.

## Decisions made while proposing (owner may override)

- **Paginated responses** use `Paginated(Dto)`, a named and cached `<Dto>Page` class, not one hand-written page class per endpoint.
- **A 2xx without `type`** documents the bare envelope; a 204 documents no content.
- **Spike pass/fail** is defined in step 0: one generic, spec-covered post-processing function is allowed, and library patches are not.
- **The spec is built eagerly in `mountHttp`**, and `/api-docs` is mounted before the controllers.
- **Response DTO classes stay plain data:** no constructors, no methods.
- **Schema-name collisions** fail the build; names may change from today's, and changes are listed in the PR.

- Postman collections are deleted, not regenerated. Postman imports the OpenAPI document directly (`/api-docs.json` or equivalent).
- A missing `summary` fails the drift spec rather than producing an undocumented operation.
