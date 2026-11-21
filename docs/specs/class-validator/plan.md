# Request validation — Joi → class-validator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every Joi request schema in `server/` with a class-validator / class-transformer DTO class, with the same accepted inputs, message keys and error entries — only `errors[].reason` changes.

**Architecture:** One function `validateDto(Dto, plain)` turns a plain object into a DTO instance plus `{ field, reason, key }` failures; the existing `bodyPipe` / `paramsPipe` / `queryPipe` call it and translate keys. While modules move, the pipe accepts either a Joi schema or a DTO class, and a **parity test** runs Joi and the DTO on the same inputs and snapshots the result — the snapshot is what still guards behaviour after Joi is deleted.

**Tech Stack:** Express 4, TypeScript 5.4 (`experimentalDecorators` + `emitDecoratorMetadata` already on), class-validator, class-transformer, reflect-metadata (already a dependency), Jest + ts-jest, Playwright API suite in `automation-test/`.

**Spec:** `docs/specs/class-validator/design.md`

All paths below are relative to the worktree root `.worktrees/class-validator/` unless they start with `server/src` shorthand `@/`.

## Global Constraints

- Dependencies pinned exactly (`pnpm add -E`), per `standard-security`.
- Request DTO files: `server/src/modules/<module>/dtos/requests/<what>.<body|params|query>.ts`, class `<What><Body|Params|Query>Dto`, barrel `dtos/requests/index.ts`. Never mixed into the response DTO files.
- Every constraint carries `message: "<ns>:<key>"` — an i18n key, never English. Where Joi has a key for that failure, reuse it verbatim. Where Joi had none (it shipped English), reuse the field's nearest key (`.invalid`, else `.required`); add a new `<ns>:validation.<field>.invalid` to **both** `server/src/i18n/locales/{en,vi}/` only when the field has no key at all.
- One constraint per failure kind, each with its own constraint name, so `reason` still distinguishes what Joi distinguished.
- Object-level failures (date range, empty PATCH body) are declared with `context: { root: true }` and reported as `field: ""`.
- Never `enableImplicitConversion`. Numbers and booleans from query/params use `@ToInt()` / `@ToBoolean()`.
- `stopAtFirstError: true` — at most one entry per field.
- Every string field gets `@IsString()`; every optional string without Joi `.allow("")` also rejects `""`.
- `server/.claude/rules/*.md` are local-only: edit them in the main checkout's `server/.claude/` if at all, never `git add` them.
- **User review gate before every commit**: show the user the staged diff summary and wait for an explicit OK. Conventional Commits, scope `validation`, English subject.

## Review Focus

1. **Query-string booleans** — `?interactive=false` must stay `false` (implicit conversion would make it `true`). Test in Task 2 (`ToBoolean`) and Task 6 (login-history parity).
2. **`null` clears a profile field** — `PATCH /users/me` with `phone: null` must reach the service as `null`, not be dropped or rejected. Test in Task 4 parity cases.
3. **Signup `dateOfBirth` is a `Date`, profile `dateOfBirth` is a string** — Joi.date() converts, `Joi.string().isoDate()` does not; services depend on each. Parity `value` comparison in Tasks 3 and 4.
4. **Normalising transforms run before length checks** — whitespace-padded `search` at max length is accepted (TC in `favorites.api.ts`), category names are normalised before `max`. Parity cases in Tasks 5 and 6.
5. **Wrong-type and empty-string inputs** — `email: 123`, `password: { $ne: "" }`, `status: ["resolved"]`, `?search=` all stay 400. Parity cases in every module task (each parity table must contain one wrong-type and one `""` row per field kind).

---

### Task 1: Validation core — `validateDto`, dual-mode pipe, parity harness

**Files:**
- Modify: `server/package.json`, `server/pnpm-lock.yaml` (add `class-validator`, `class-transformer`, exact)
- Create: `server/src/validators/validate-dto.ts`
- Create: `server/src/validators/validate-dto.spec.ts`
- Modify: `server/src/middlewares/pipes/validation.pipe.ts`
- Create: `server/src/middlewares/pipes/validation.pipe.spec.ts`
- Modify: `server/test/setup.ts` (first line `import "reflect-metadata";`)
- Create: `server/test/helpers/validation-parity.ts`

**Interfaces:**
- Produces:
  - `type DtoClass<T extends object> = new () => T`
  - `interface DtoFailure { field: string; reason: string; key: string }`
  - `validateDto<T extends object>(Dto: DtoClass<T>, plain: unknown): Promise<{ value: T; failures: DtoFailure[] }>` — `plainToInstance(Dto, plain ?? {})`, `validate(..., { whitelist: true, stopAtFirstError: true, forbidUnknownValues: false, validationError: { target: false, value: false } })`, then flattens `children` with dotted paths (`items.0.name`); `field` is `""` when the failing constraint's `contexts[name]?.root === true`; `reason` = constraint name; `key` = constraint message.
  - `bodyPipe | paramsPipe | queryPipe(schemaOrDto: Joi.Schema | DtoClass<object>)` — if `Joi.isSchema(arg)` keep the current Joi path, else `validateDto`; on failures throw `ValidationError({ key: "common:errors.validationFailed", errors: failures.map(f => ({ field: f.field, reason: f.reason, message: req.t(f.key as I18n.Key) })) })`; on success write back with `Object.defineProperty(req, source, { value, writable: true, enumerable: true, configurable: true })`. Both paths validate `req[source] ?? {}`.
  - `expectParity(joiSchema: Joi.Schema, Dto: DtoClass<object>, cases: Record<string, unknown>)` in `server/test/helpers/validation-parity.ts` — for each named case: runs Joi (`abortEarly: false, stripUnknown: true`) and `validateDto`; asserts (a) both accept or both reject; (b) same set of failing fields (Joi's object-level path `[]` = `""`); (c) per field, DTO `key` equals Joi's **first** message for that field when that message matches `/^[a-zA-Z]+:/`, otherwise DTO `key` must itself match that regex; (d) on accept, `instanceToPlain`-free deep equality of the DTO instance's own enumerable props with Joi's `value`; then `expect({ value, failures }).toMatchSnapshot(caseName)` on the DTO result.
  - `expectDto(Dto, cases)` — same call shape, snapshot only (used after Task 7).

- [ ] **Step 1:** In `server/`, `pnpm install --frozen-lockfile`, then `pnpm add -E class-validator class-transformer`. Add `import "reflect-metadata";` as line 1 of `server/test/setup.ts`.
- [ ] **Step 2: Write failing tests** in `validate-dto.spec.ts`, using inline fixture DTO classes:
  - `"returns the instance with unknown properties stripped"` — `{ a: "x", extra: 1 }` → `value` has `a`, not `extra`, `failures` `[]`.
  - `"reports one failure per field with the first failing constraint"` — a field with `@IsString({message:"validation:a.invalid"}) @MaxLength(2,{message:"validation:a.max"})` given `"abcd"` → exactly `[{ field: "a", reason: "maxLength", key: "validation:a.max" }]`.
  - `"dots nested paths"` — `@ValidateNested({each:true}) @Type(() => Child) items` with `items[1].name` invalid → `field: "items.1.name"`.
  - `"reports root-context constraints at field \"\""` — a custom constraint declared with `context: { root: true }` → `field: ""`.
  - `"treats undefined input as an empty object"` — required field missing on `validateDto(Dto, undefined)` → one failure on that field.
- [ ] **Step 3:** Run `pnpm test src/validators/validate-dto.spec.ts` — expect FAIL (module not found).
- [ ] **Step 4:** Implement `validate-dto.ts` per the Interfaces block.
- [ ] **Step 5:** Run — expect PASS.
- [ ] **Step 6: Write failing pipe tests** in `validation.pipe.spec.ts` (mock `req.t = (k) => \`t(${k})\``):
  - `"Joi schema path is unchanged"` — invalid body → `next` called with `ValidationError` whose `errors[0].reason` is a Joi type.
  - `"DTO path translates keys"` — invalid body → `errors[0].message === "t(validation:a.max)"`, `reason === "maxLength"`.
  - `"DTO path replaces req.query even when it is a getter"` — `Object.defineProperty(req, "query", { get: () => ({ a: "x", extra: "1" }), configurable: true })` → after the pipe `req.query` deep-equals `{ a: "x" }`.
  - `"missing body is validated as {}"` — `req.body = undefined` with a required field → `ValidationError`.
- [ ] **Step 7:** Run — FAIL. Implement the dual-mode pipe. Run — PASS.
- [ ] **Step 8:** Write `test/helpers/validation-parity.ts` per Interfaces. No spec of its own: Task 2's first parity use exercises it.
- [ ] **Step 9:** `pnpm type-check && pnpm lint && pnpm test` — all green (baseline 103 suites + 2 new).
- [ ] **Step 10:** User review gate, then commit `build(validation): add class-validator core and dual-mode pipe`. Include `docs/specs/class-validator/{design,plan}.md` in a separate first commit `docs(specs): class-validator migration design and plan` (same gate).

### Task 2: Shared decorators and base DTOs

**Files:**
- Create: `server/src/validators/decorators/transforms.ts` — `Trim()`, `Lowercase()`, `ToInt()`, `ToBoolean()`
- Create: `server/src/validators/decorators/rules.ts` — `IsObjectId(key)`, `MatchesProperty(property, opts)`, `IsOnOrAfter(property, opts)`, `IsSupportedTimeZone(opts)`, `IsRedirectUri(opts)`, `IsDateOfBirthNotTooYoung(opts)`, `IsDateOfBirthNotTooOld(opts)`, `IsNotEmptyBody(opts)` (class-level, root)
- Create: `server/src/validators/decorators/fields.ts` — composed field decorators mirroring `schemas/base.ts`: `IsAppEmail()`, `IsAppPassword()`, `IsOtp()`, `IsFullName()`, `IsGender()`
- Create: `server/src/validators/decorators/index.ts` (barrel)
- Create: `server/src/validators/dtos/pagination.query.ts` — `PaginationQueryDto { page?: number; limit?: number; sortOrder?: SortOrder }` with keys `validation:page.invalid`, `validation:limit.invalid`, `validation:sortOrder.invalid`, `limit` max `PAGINATION.MAX_LIMIT`
- Create: `server/src/validators/decorators/decorators.spec.ts`
- Create: `server/src/validators/dtos/base.parity.spec.ts`

**Interfaces:**
- Consumes: `validateDto`, `expectParity` (Task 1).
- Produces: the decorator names above, all accepting class-validator `ValidationOptions` where a message is needed; `ToBoolean()` maps `"true"`→`true`, `"false"`→`false`, booleans pass through, anything else is left as-is so `@IsBoolean` rejects it; `ToInt()` maps a string matching `/^-?\d+$/` to a number and leaves anything else as-is (so `"1.5"` and `"abc"` still fail `@IsInt`); composed decorators combine via a local `composeDecorators(...decorators: PropertyDecorator[]): PropertyDecorator`.
- Constraint names (these become `reason`): `isObjectId`, `matchesProperty`, `isOnOrAfter`, `isSupportedTimeZone`, `isRedirectUri`, `isDateOfBirthNotTooYoung`, `isDateOfBirthNotTooOld`, `isNotEmptyBody`.

- [ ] **Step 1: Write failing tests** in `decorators.spec.ts`: `ToBoolean` (`"false"`→`false`, `"maybe"` rejected), `ToInt` (`"2"`→`2`, `"1.5"` rejected), `Trim`+`MaxLength` accepts a padded value at max, `IsObjectId` rejects 23 hex chars, `MatchesProperty` mismatch key, `IsOnOrAfter` with `context: { root: true }` reports `field: ""`, both date-of-birth bounds using `getDateOfBirthBounds` (13th birthday today accepted, 12 refused with `isDateOfBirthNotTooYoung`, 121 refused with `isDateOfBirthNotTooOld`) — port the three cases from `schemas/base.spec.ts`.
- [ ] **Step 2:** Run — FAIL. Implement. Move `getDateOfBirthBounds` to `server/src/validators/date-of-birth.ts` (re-export from `schemas/base.ts` until Task 7). Run — PASS.
- [ ] **Step 3:** `base.parity.spec.ts`: for each of `emailSchema`, `passwordSchema`, `otpSchema`, `fullNameSchema`, `genderSchema`, wrap in `Joi.object({ v: schema.required() })` and a one-field DTO using the composed decorator; `expectParity` with cases: valid, missing, `""`, wrong type (`123`), too short, too long, pattern break, padded/upper-case (email). Run — PASS, snapshots written.
- [ ] **Step 4:** Full `pnpm type-check && pnpm lint && pnpm test`. Gate, commit `feat(validation): shared decorators and pagination base DTO`.

### Task 3: Auth flows — signup, login, forgot-password, change-password, unlock-account

**Files (per module `<m>` ∈ signup, login, forgot-password, change-password, unlock-account):**
- Create: `server/src/modules/<m>/dtos/requests/*.ts` + `index.ts` — one DTO per schema in `server/src/validators/schemas/<m>.ts` (18 schemas, names from the export list: e.g. `sendOtpSchema` → `SendOtpBodyDto`, `loginSchema` → `LoginBodyDto`, `fpResetPasswordSchema` → `ResetPasswordBodyDto`)
- Create: `server/src/modules/<m>/dtos/requests/<m>.parity.spec.ts`
- Modify: `server/src/modules/<m>/<m>.routes.ts` (pass the DTO class)
- Modify: `server/src/modules/<m>/types/*` (request interfaces reference DTOs; delete pure request-shape interfaces)
- Modify: `server/src/modules/{login,signup,forgot-password,change-password}/swagger/schemas.ts` — replace `j2s(schema)` with hand-written `OpenAPIV3.SchemaObject` (required list, types, `minLength`/`maxLength`/`pattern`/`enum`/`format: "email"` copied from the DTO constraints)
- Modify: `automation-test/src/tests/api/auth/{signup,login-otp,magic-link,lockout-unlock}.api.ts`, `automation-test/src/tests/api/ops/error-envelope.api.ts`, and any `reason` quoted in `automation-test/src/test-cases/{auth,ops}.md`

**Interfaces:**
- Consumes: Task 2 decorators (`IsAppEmail`, `IsAppPassword`, `IsOtp`, `IsFullName`, `IsGender`, `MatchesProperty`, `IsDateOfBirthNotTooYoung/Old`, `Trim`, `ToBoolean`).
- Produces: DTO classes exported from `@/modules/<m>/dtos/requests`.

- [ ] **Step 1:** For each schema, write the parity spec first with cases covering every key in its `.messages()` map, plus `""`, wrong type, and one fully valid input. Signup `completeSignupSchema` cases must include the `dateOfBirth` valid case (value must come out a `Date`, as Joi.date() makes it) and `confirmPassword` mismatch; change-password and signup include `MatchesProperty`.
- [ ] **Step 2:** Run — FAIL (DTOs missing). Write the DTOs until `expectParity` passes for every case. Where parity fails only because Joi shipped English (rule (c)), pick the key per Global Constraints.
- [ ] **Step 3:** Switch the routes to the DTO classes; update `types/`; fix compile errors in controllers/services (`pnpm type-check`).
- [ ] **Step 4:** Rewrite the four `swagger/schemas.ts` request schemas by hand; `pnpm test src/libs/swagger` (`openapi.spec.ts`) — PASS.
- [ ] **Step 5:** Update the automation-test `reason` assertions to the DTO constraint names your parity snapshots show (e.g. `string.min` → `minLength`, `any.required` → the name of the constraint that fires on a missing field, `string.email` → `isEmail`). Run `cd automation-test && pnpm typecheck`.
- [ ] **Step 6:** `pnpm type-check && pnpm lint && pnpm test` in `server/`. Gate, commit `refactor(validation): move auth flows to class-validator DTOs`.

### Task 4: user + contact-admin

**Files:** same pattern as Task 3 for modules `user` (4 schemas) and `contact-admin` (5 schemas); delete the request-shape interfaces `AdminUsersQuery`, `MyContactsQuery` and peers once unused; `validators/schemas/user.spec.ts` cases move into `modules/user/dtos/requests/user.parity.spec.ts`.

**Interfaces:**
- Consumes: Task 2 (`PaginationQueryDto`, `IsObjectId`, `IsOnOrAfter` with root context, `IsDateOfBirthNotTooYoung/Old`, `Trim`, `ToInt`).
- Produces: `UpdateProfileBodyDto`, `PublicProfileParamsDto`, `AdminUserIdParamsDto`, `AdminUsersQueryDto extends PaginationQueryDto`, contact-admin DTOs; repository input types (`UpdateProfileData` etc.) stay.

- [ ] **Step 1:** Parity specs. `updateProfileSchema` must include: whitespace-only `fullName` → `validation:fullName.required`; padded name trimmed; all four nullable fields `null` → accepted with `null` kept in `value`; `dateOfBirth` stays a string. Contact-admin queries must include `fromDate > toDate` → `field: ""`, and TC-ADMINCONTACT-023 inputs `status: ""`, `null`, `["resolved"]` → rejected.
- [ ] **Step 2:** FAIL → write DTOs → PASS.
- [ ] **Step 3:** Routes, types, `pnpm type-check`. Delete `validators/schemas/user.spec.ts` (its cases now live in the parity spec).
- [ ] **Step 4:** Full server check. Gate, commit `refactor(validation): move user and contact-admin to DTOs`.

### Task 5: web-app + category + entitlement

**Files:** same pattern for `web-app` (5 schemas), `category` (5), `entitlement` (2); `validators/schemas/{category,entitlement}.spec.ts` cases move into the modules' parity specs.

**Interfaces:**
- Consumes: Task 2 (`IsRedirectUri` with `{ each: true }`, `IsNotEmptyBody` root, `PaginationQueryDto`, `IsObjectId`, `Trim`, `ToInt`).
- Produces: web-app / category / entitlement DTOs. Category name fields use a `@Transform` calling the existing `normalizeCategoryName`, so the instance carries the normalised value, then a constraint `hasCategorySlug` (key `category:validation.nameEn.noSlug`) on `nameEn`. `DeleteCategoryBodyDto.reassignments` defaults to `[]` via a field initialiser.

- [ ] **Step 1:** Parity specs. Must include: `PATCH /admin/apps/:id` with `{}` → `field: ""`, key `webApp:validation.body.empty`; redirect URI array with one bad entry → `field: "redirectUris.<i>"`; `deleteCategoryBodySchema` on `undefined` body → `value` `{ reassignments: [] }`; category name with only punctuation → `noSlug`; padded category name normalised before `max`.
- [ ] **Step 2:** FAIL → DTOs → PASS.
- [ ] **Step 3:** Routes, types, delete the two old schema specs. Full server check. Gate, commit `refactor(validation): move web-app, category and entitlement to DTOs`.

### Task 6: favorite, recent-app, login-history, notification

**Files:** same pattern for `favorite` (2), `recent-app` (3), `login-history` (4), `notification` (2). `LoginHistoryAdminQueryDto extends LoginHistoryQueryDto`. Update `automation-test/src/tests/api/favorites/favorites.api.ts` (`["search", "string.max"]` → the DTO constraint name) and the matching row in `test-cases/favorites.md`.

**Interfaces:**
- Consumes: Task 2 (`PaginationQueryDto`, `IsOnOrAfter` root, `IsSupportedTimeZone`, `ToBoolean`, `ToInt`, `Trim`, `IsObjectId`).

- [ ] **Step 1:** Parity specs. Must include: `?interactive=false` → `false`, `?interactive=maybe` → rejected with `validation:interactive.invalid`; `fromDate > toDate` → `field: ""`; `tz=Mars/Base` → `validation:timezone.invalid`; padded `search` at exactly `SEARCH_MAX_LENGTH` accepted, `SEARCH_MAX_LENGTH + 1` rejected; `?search=` rejected.
- [ ] **Step 2:** FAIL → DTOs → PASS.
- [ ] **Step 3:** Routes, types, automation-test edit, `cd automation-test && pnpm typecheck`. Full server check. Gate, commit `refactor(validation): move favorite, recent-app, login-history and notification to DTOs`.

### Task 7: Remove Joi, docs, end-to-end verification

**Files:**
- Delete: `server/src/validators/schemas/` (whole folder), `objectIdSchema` in `server/src/validators/utils.ts`
- Modify: `server/src/middlewares/pipes/validation.pipe.ts` (drop Joi branch; signature `bodyPipe(Dto: DtoClass<object>)`), its spec (drop the Joi case)
- Modify: `server/test/helpers/validation-parity.ts` → keep only `expectDto`; every `*.parity.spec.ts` switches `expectParity(joi, Dto, cases)` → `expectDto(Dto, cases)` and is renamed `*.dto.spec.ts` (move the `.snap` files with them so the snapshots written while Joi existed keep guarding behaviour — `pnpm test` must report 0 snapshots written, 0 obsolete)
- Modify: `server/package.json` / lockfile (remove `joi`, `joi-to-swagger`)
- Modify: `CLAUDE.md` (stack line `Joi` → `class-validator`; cross-cutting row "Joi schemas" → "Request DTOs | `modules/<name>/dtos/requests/` + shared `src/validators/{decorators,dtos}/` | applied per route via `bodyPipe(Dto)` …; whitelist strips unknown properties"; pagination note "every paginated Joi schema" → "every paginated query DTO (`PaginationQueryDto`)"; test count), `README.md` tech-stack table if it names Joi, `docs/specs/class-validator/design.md` status line

- [ ] **Step 1:** Make the edits. `grep -rn "joi" server/src server/test server/package.json` (case-insensitive) — expect no hits.
- [ ] **Step 2:** `pnpm install --frozen-lockfile=false` then `pnpm type-check && pnpm lint && pnpm test` — PASS, `0 snapshots written` and no obsolete snapshots.
- [ ] **Step 3:** API parity against the running app: start the dedicated e2e stack per `automation-test/src/docs/test-plan.md` (`DB_NAME=ducker-id-e2e`, API `:5600`, production-built client `:3600`, `E2E_BASE_URL` set explicitly — this is a worktree), then `cd automation-test && pnpm test:api` — expect all pass except tests already marked `test.fail()`. Any other failure is a parity bug: fix the DTO, add the input as a case to its `*.dto.spec.ts`, rerun.
- [ ] **Step 4:** `pnpm coverage:check` in `automation-test/` — PASS.
- [ ] **Step 5:** Manual spot checks from the design (`?interactive=false`, `?page=2`, `phone: null`, padded category name, empty `DELETE` category body) with `curl` against `:5600` — each answers as before.
- [ ] **Step 6:** Gate, commit `refactor(validation): remove Joi`. Then update the local `server/.claude/rules/{validators,imports,i18n,modules,common,types}.md` in the main checkout (not committed to this repo).
