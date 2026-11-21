# OpenAPI from controller annotations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate `/api-docs` from the annotated controllers and DTOs, and delete every hand-written `swagger/` folder, the Postman collections and the hand assembly, without the docs ever again disagreeing with the code.

**Architecture:** `routing-controllers-openapi` assembles paths from routing-controllers' metadata. A single bridge, `routeOperation`, is registered on every controller class with `OpenAPI(routeOperation)(Ctor)`; it fills each operation from our routing metadata (#49): params, body, security, status, and the 400/401/403/429/`@ApiErrors` responses. `class-validator-jsonschema` turns request DTO rules and `@ApiProperty`-marked response DTOs into `components.schemas`. During the migration the builder merges generated operations for migrated modules with the hand-written ones still present.

**Tech Stack:**
- `routing-controllers-openapi` 5.0.1 and `class-validator-jsonschema` 5.2.0, both pinned exactly; already added to `server/package.json` by the step-0 spike, uncommitted;
- routing-controllers 0.11.3, class-validator 0.15.1, class-transformer 0.5.1, `swagger-ui-express`;
- Jest, with real HTTP via `fetch` as in `src/common/routing/spec/`.

**Spec:** `docs/specs/openapi-annotations/design.md`. Read its "Step 0 result — PASS" section first: it names the mechanism this plan builds.

Paths are relative to the worktree root `.worktrees/openapi-annotations/`; `@/` is `server/src/`.

## Global Constraints

- A controller method declares only `@OpenAPI({ summary, description? })`, plus `@ApiErrors(...)` and `@Respond({ type })` when needed. It never restates params, body, security or 400/401/403/429. The class declares `@OpenAPI({ tags: [...] })`.
- `@ApiErrors(...statuses)` is the only manual error declaration. Each status maps to a shared `components.responses` entry. **422 is never carried over** unless the module's code can actually throw it; dropped codes are listed in the PR.
- `@ApiProperty` on a **request** DTO accepts only `example` and `description`; anything else throws when the decorator is applied. On a **response** DTO it also accepts `type`, `items`, `nullable`, `enum`, `format` (needed by `ExposeDate`) and `$ref` (through the function form).
- A 2xx with `type` documents `allOf: [SuccessResponse, { properties: { data } }]`. A 2xx without `type` documents the bare `SuccessResponse`. A 204 documents no `content`.
- `Paginated(Dto)` returns one cached class named `<DtoName>Page` with `items: Dto[]` and `meta: PageMeta`.
- Schema names are class names. Two classes with one name fail the build, and the error names both files.
- All 63 `/api/v1` routes are documented; there are no exemptions. OAuth, `/health` and Bull Board stay out.
- Modules import from `routing-controllers-openapi` only `OpenAPI`, and from `@/common/openapi` only `ApiErrors`, `ApiProperty` and `Paginated`. `class-validator-jsonschema` is imported only inside `@/common/openapi` and `@/libs/swagger`. The existing source-scan spec enforces this.
- Exactly one post-processing step, `normalizePathKeys(spec)`. No library patches.
- No runtime behaviour changes. Response DTO classes stay plain data: no constructor, no methods.
- Dependencies are pinned exactly. **User review gate before every commit**, unless the user waives it for the run. Conventional Commits with scope `openapi`, English.

## Review Focus

1. **A request field that accepts `null`.** `@IsOptional()` lets `null` through, so its schema must say `nullable: true`; a field under `UnlessMissing` must not. Test in Task 1 (converters).
2. **Array and type-only fields on response DTOs.** They must never show up as `$ref: …/Array` or `$ref: …/Object`. A spec walks every generated schema and fails on either. Test in Task 1, re-run by every later task.
3. **Query numbers and booleans** (`ToInt` / `ToBoolean`) are documented as `integer` / `boolean`, not `string` or `number`. Test in Task 1 (converters), plus the favorite pilot diff in Task 2.
4. **201 with no data, and 204.** `POST /users/me/favorites/:appId` documents 201 with the bare envelope, and `DELETE` documents 204 with no `content`. Test in Task 1 (bridge) and Task 2.
5. **`/api-docs` and `/api-docs.json` still answer.** They must answer once the spec is mounted from `mountHttp`, and not be swallowed by the `/api/v1` stop step or the 404. Real-HTTP test in Task 1.

---

### Task 1: OpenAPI core and builder, beside the hand-written docs

**Files:**
- Create in `server/src/common/openapi/`:
  - `api-property.ts`
  - `api-errors.ts`
  - `paginated.ts`
  - `converters.ts`
  - `bridge.ts` (exports `routeOperation`)
  - `normalize-path-keys.ts`
  - `index.ts`
  - `spec/{api-property,converters,bridge,normalize-path-keys}.spec.ts`
- Modify `server/src/common/routing/metadata.ts`: `RespondOptions` gains `type?: Function | [Function]`, and a route records `errors: number[]` through `ApiErrors`.
- Modify `server/src/common/dto/index.ts`: `ExposeOrNull`, `ExposeDate` and `ExposeId` also apply `ApiProperty` (`nullable: true`; `format: "date-time"`; `type: "string"`).
- Rewrite `server/src/libs/swagger/openapi.ts` as `buildOpenApiSpec(controllers: object[]): OpenAPIV3.Document`, in the order given in design §Step 0. It also merges the hand-written `allPaths` / `allSchemas` of modules that still have a `swagger/` folder (the generated operation wins on a clash), and keeps `info`, `servers`, tag descriptions and `components.responses` / `securitySchemes` from `common.schemas.ts`.
- Modify `server/src/libs/swagger/swagger.setup.ts` and `server/src/app.ts`: `setupSwagger(app, getSpec: () => OpenAPIV3.Document)` is called from `mountHttp` **before** `mountControllers`, and the spec is built right after. Remove the call from `app.ts`.
- Modify `server/src/loaders/http.ts`.
- Rewrite `server/src/libs/swagger/openapi.spec.ts`: drift checks 1-4 from design §"Guarding against drift", limited to the modules in `GENERATED_MODULES` (an exported array, empty in this task).
- Modify `server/src/common/routing/mount.ts`: the allowlist gains the openapi rules from Global Constraints.
- Delete `server/src/libs/swagger/spike/`.
- Commit the pinned dependency changes already in `server/package.json` and `server/pnpm-lock.yaml`.

**Interfaces (produced):**
- `ApiProperty(schema?: ApiPropertyOptions | (() => SchemaObject)): PropertyDecorator`. It registers a no-op class-validator constraint named `apiProperty`, plus `JSONSchema`.
- `ApiErrors(...statuses: number[]): MethodDecorator`.
- `Paginated<T>(Dto: new () => T): new () => { items: T[]; meta: PageMeta }`.
- `routeOperation(op: OperationObject, route: { target: Function; method: string }): OperationObject`. It deletes the library's default `summary` and `tags` first.
- `additionalConverters` from `converters.ts`: `isIn`, `isObjectId`, `isIsoDateString`, `isDefined`, `min`/`max` (integer when paired with `ToInt`), and `isOptional` → `nullable` (not under `UnlessMissing`).
- `normalizePathKeys(spec): spec` strips a trailing `/` and throws on a collision.
- `buildOpenApiSpec(controllers)`.
- `GENERATED_MODULES: string[]`.

- [ ] **Step 1: Write failing specs with fixture classes** (no real modules):
  - `api-property`: `"rejects anything but example/description on a request DTO"`; `"documents an array of DTOs as items.$ref, never $ref Array"`; `"documents ExposeOrNull as nullable"`.
  - `converters`: `"marks an IsOptional field nullable"`; `"keeps an UnlessMissing field non-nullable"`; `"documents a ToInt query field as integer with its min/max"`; `"documents ToBoolean as boolean"`; `"documents EachItem(isIn) as an array of enum values"`.
  - `bridge`: a fixture controller using `@Auth`, `@RateLimit`, `@ValidParams`, `@ValidBody`, `@Respond({ status: 201 })` and `@ApiErrors(404, 409)`. Its operation has `security: [{ bearerAuth: [] }]`, path params from the DTO, a `requestBody` `$ref`, `201` with the bare envelope, `400`/`401`/`404`/`409`/`429`, and no `summary` when none is declared. A 204 route has no `content`. An `@OptionalAuth` route has `security: [{}, { bearerAuth: [] }]`.
  - `normalize-path-keys`: `"/a/"` becomes `"/a"`; a clash throws.
  - `openapi.spec.ts`:
    - `"rejects two schemas with one class name"` (fixture);
    - `"has no $ref to Array or Object anywhere"`;
    - drift checks 1-4 over `GENERATED_MODULES`;
    - a real-HTTP test: `GET /api-docs.json` returns 200 with `openapi: "3.0.3"`, and `/api-docs` returns 200 HTML, with `mountControllers`, `handleNotFound` and `handleError` mounted after.
- [ ] **Step 2:** Run `pnpm test src/common/openapi src/libs/swagger`. Expected: FAIL.
- [ ] **Step 3:** Implement. `pnpm test` stays green, and today's `/api-docs` content is unchanged because `GENERATED_MODULES` is empty.
- [ ] **Step 4:** Run `pnpm test`, `pnpm type-check` and `pnpm lint`: all clean.
- [ ] **Step 5:** Review gate, then commit `feat(openapi): annotation-driven spec core beside the hand-written docs`.

### Task 2: Pilot `favorite`

**Files:**
- Modify `server/src/modules/favorite/favorite.controller.ts`:
  - `@OpenAPI({ tags: ["Favorites"] })` on the class;
  - `@OpenAPI({ summary, description })` per method, with the text copied from `favorite/swagger/paths.ts`;
  - `@Respond({ type })`: `[UserAppDto]` for list, none for add and remove;
  - `@ApiErrors(...)` with the hand-written non-derived codes, keeping only those the code can throw.
- Modify the response DTO `UserAppDto` (web-app module): it becomes a class extending `UserAppCardDto` with `isFavorite`. Add `@ApiProperty` (examples and descriptions from the hand-written schemas) to the request DTOs `ListFavoritesQueryDto` and `FavoriteAppIdParamsDto`, and to `UserAppCardDto` / `PublicCategoryDto` where reflection is blind.
- Create `server/test/helpers/openapi-diff.ts`: `diffOperations(handWritten: PathsObject, generated: PathsObject): string[]`. For each method and path it lists the differences in: path presence, parameter names and `in`/`required`, request-schema property names and required set, response status set, and `security`.
- Modify `server/src/libs/swagger/openapi.spec.ts` (`GENERATED_MODULES = ["favorite"]`).
- Create `server/test/fixtures/openapi/favorite.json` (frozen hand-written operations).
- Delete `server/src/modules/favorite/swagger/` and its import in `openapi.ts`.

- [ ] **Step 1:** Before touching anything, freeze today's hand-written operations: write `favoritePaths` (with its `$ref`s resolved against today's spec) to `server/test/fixtures/openapi/favorite.json`. Then add the test `"favorite: generated operations match the hand-written ones"`, which asserts that `diffOperations(<fixture>, generated)` equals an explicit `ACCEPTED_DIFFS` array in the spec (empty at first). Run it: FAIL.
- [ ] **Step 2:** Annotate until the diff is empty, or until each remaining entry is a real correction (such as a dropped 422). Copy those entries into `ACCEPTED_DIFFS` with a one-line reason each.
- [ ] **Step 3:** Delete `favorite/swagger/` and its import in `openapi.ts`. The diff test keeps running against the frozen fixture.
- [ ] **Step 4:** Run `pnpm test`, `pnpm type-check` and `pnpm lint`.
- [ ] **Step 5:** Review gate, then commit `refactor(openapi): document favorite from annotations`.

### Task 3: `recent-app`, `notification`, `login-history`

Repeat Task 2's steps per module, including a frozen fixture, a diff test and `ACCEPTED_DIFFS`. Convert the response interfaces these modules use to classes with `@ApiProperty`; `login-history` has 2 and `recent-app` has 1. Use `Paginated(Dto)` for paginated lists. Add the three modules to `GENERATED_MODULES`.

- [ ] **Step 1:** Write diff tests against frozen fixtures: FAIL.
- [ ] **Step 2:** Annotate, convert the interfaces, and delete the three `swagger/` folders.
- [ ] **Step 3:** Run `pnpm test`, `pnpm type-check` and `pnpm lint`.
- [ ] **Step 4:** Review gate, then commit `refactor(openapi): document recent-app, notification, login-history`.

### Task 4: `category`, `entitlement`, `web-app`, `user`, `contact-admin`

Same steps as Task 3. These modules hold interface response DTOs: category 1, entitlement 1, web-app 2. `user` and `contact-admin` own the two Postman collections; delete them with their `swagger/` folders. Add the five modules to `GENERATED_MODULES`.

- [ ] **Step 1:** Write diff tests: FAIL.
- [ ] **Step 2:** Annotate, convert the interfaces, delete the `swagger/` folders and Postman collections.
- [ ] **Step 3:** Run `pnpm test`, `pnpm type-check` and `pnpm lint`.
- [ ] **Step 4:** Review gate, then commit `refactor(openapi): document admin and profile modules`.

### Task 5: Auth flows: `signup`, `login`, `forgot-password`, `change-password`, `unlock-account`, `logout`, `token`

Same steps as Task 3. These modules hold interface response DTOs: signup 5, forgot-password 5, login 2, unlock-account 1, token 1. **Rename** the four `forgot-password` request DTOs that share a name with `login`'s: `OtpSendBodyDto`, `OtpVerifyBodyDto`, `MagicLinkSendBodyDto` and `MagicLinkVerifyBodyDto` become `ForgotPassword…`. Update their imports and DTO specs. Snapshot names change; regenerate those snapshots only. Add the seven modules to `GENERATED_MODULES`.

- [ ] **Step 1:** Write diff tests: FAIL.
- [ ] **Step 2:** Rename, annotate, convert the interfaces, and delete the seven `swagger/` folders.
- [ ] **Step 3:** Run `pnpm test`, `pnpm type-check` and `pnpm lint`.
- [ ] **Step 4:** Review gate, then commit `refactor(openapi): document auth flows`.

### Task 6: Remove the hand assembly

**Files:**
- In `server/src/libs/swagger/openapi.ts`, delete the merge with hand-written `allPaths` / `allSchemas` and every `swagger/` import. `common.schemas.ts` keeps only what the builder uses.
- Drop `GENERATED_MODULES` from `openapi.spec.ts`; the drift checks now cover all mounted actions and assert exactly 63 operations.
- Remove the allowlist exemption for `swagger/` paths, if Task 1 added one.
- Update `CLAUDE.md`:
  - "Adding an endpoint touches…": now a controller method only, plus `loaders/modules.ts` for a new controller;
  - module anatomy: no `swagger/` folder;
  - the "Responses" row: `@Respond({ type })`;
  - one short paragraph on the OpenAPI decorators, the bridge, `@ApiErrors`, `@ApiProperty` rules and the drift spec;
  - the test count.
- Update `README.md` and `server/README.md` wherever they list `swagger/` or the Postman collections.

- [ ] **Step 1:** Implement. `grep -rn "swagger/" server/src/modules` returns nothing.
- [ ] **Step 2:** Run `pnpm test`, `pnpm type-check` and `pnpm lint`. Start the server against a scratch database (`DB_NAME=ducker-id-openapi-scratch`) and load `/api-docs` once. Check that it renders with 63 operations, then drop the scratch database.
- [ ] **Step 3:** Review gate, then commit `refactor(openapi): drop the hand-written swagger assembly`. Open the PR. It lists every `ACCEPTED_DIFFS` entry, every dropped status code, and every renamed schema.
