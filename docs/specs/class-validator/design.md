# Request validation — Joi schemas → class-validator DTOs

Date: 2026-11-21 · Branch: `refactor/class-validator`

**Status:** implemented 2026-11-21 — Joi and `joi-to-swagger` removed, every route validated by a request DTO.

## Why

Input validation lives in Joi schemas under `server/src/validators/schemas/`, while the TypeScript
type of the same input is a hand-written interface in `modules/<name>/types/`
(`updateProfileSchema` vs `UpdateProfileData`). `Joi.ObjectSchema<T>` is only a cast — nothing
checks the two agree, so a field added to one and not the other still compiles.

The owner wants validation declared the NestJS / Spring way: a request class whose properties carry
decorators. The class is both the runtime rule set and the compile-time type, so the drift above
cannot happen, and the code reads the way it would after a future move to NestJS
(`ValidationPipe` uses the same two libraries).

## Goals

- Every `bodyPipe` / `paramsPipe` / `queryPipe` (27 / 20 / 13 = 60 routes) takes a **request DTO
  class** decorated with `class-validator` + `class-transformer`.
- The hand-written request interfaces those DTOs replace are deleted; controllers and services use
  the DTO class as the type.
- Joi is removed from `server/package.json`, `src/validators/schemas/` is deleted.
- Same accepted / rejected inputs, same i18n message keys, same `{ field, reason, message }`
  error entries — except `reason`, the one contract change listed below.

## Non-goals

- Changing the routing layer (`*.routes.ts`, guards, rate limiter, `handle`). Annotations stop at
  the DTO — no `@Body()` on controller methods, no routing-controllers / tsoa (rejected, see
  Approaches).
- Generating Swagger from DTOs. Four modules (`login`, `signup`, `forgot-password`,
  `change-password`) build their request schemas from Joi today through `joi-to-swagger`; those
  16 request schemas become hand-written `OpenAPIV3.SchemaObject`s like every other module's, and
  `joi-to-swagger` is removed with Joi. (`class-validator-jsonschema` was considered and rejected:
  one more dependency for 16 small objects, and the other 12 modules are already hand-written.)
  *Found while planning, after the design was approved.*
- The hand-rolled checks in `src/validators/utils.ts` (`validateObjectId`, `validateRequiredString`,
  `validateStringLength`, `validateEmail`) called from inside services. They guard internal calls,
  not HTTP input, and do not use Joi.
- Mongoose schema validators in `src/models/`.
- Response DTOs (`modules/<name>/dtos/*.dto.ts`, `to…Dto()` mappers) — untouched.

## Anti-goals

- A user-visible message changes. Message keys are carried over verbatim; `catalogue.spec.ts` and
  the API suite's message assertions must stay green without edits.
- An input that was accepted is now refused, or the reverse.
  Particular traps: query-string booleans and numbers, trimming/lowercasing before length checks,
  `null` meaning "clear this field" on profile update, defaults that Joi filled in, and the two
  below.
  - **Empty string on an optional field.** `Joi.string()` refuses `""` unless `.allow("")`, so
    `?search=`, `?status=`, `?country=` are a 400 today; `@IsOptional()` does *not* skip `""`.
    Every optional string field without `.allow("")` gets an explicit non-empty constraint.
  - **Wrong type.** `email: 123`, `password: { $ne: "" }` (TC-AUTH-070), `status: null` /
    `["resolved"]` (TC-ADMINCONTACT-023) are a 400 today through `string.base`. Every string field
    gets `@IsString()`, every enum `@IsIn`, etc. — never rely on a later rule to reject a
    wrong type by accident.
- A field now produces more than one entry in `errors[]`.

## Contract changes (agreed)

**`errors[].reason` becomes the class-validator constraint name** (`isLength`, `isNotEmpty`,
`matches`, `isEmail`, custom decorator names…) instead of the Joi type (`string.min`,
`any.required`, `string.email`). This is the only contract change. No client reads `reason`.
Six API files assert old codes and are updated: `auth/lockout-unlock.api.ts`,
`auth/signup.api.ts` (TC-AUTH-012/019/020), `auth/login-otp.api.ts` (TC-AUTH-061),
`auth/magic-link.api.ts`, `favorites/favorites.api.ts`, `ops/error-envelope.api.ts`, plus any
row in `automation-test/src/test-cases/*.md` / `defects/*.md` that quotes a code.

Those tests distinguish failure kinds by `reason` (length vs pattern vs empty; too young vs too
old; not boolean vs not `true` vs missing). **That distinction is kept**: each failure kind is its
own constraint with its own name — e.g. `isDateOfBirthNotTooYoung` / `isDateOfBirthNotTooOld`,
not one constraint that picks a key. The tests change which strings they expect, not how many
kinds they tell apart.

**Object-level errors keep `field: ""`** — no second contract change. Joi reports two rules at
the root today: the `fromDate > toDate` date range (login-history user + admin, contact-admin;
asserted in `admin-login-history/login-history.api.ts` and `login-history/my-history.api.ts:481`)
and the non-empty body on `PATCH /admin/apps/:id` (`adminUpdateAppBodySchema.min(1)`,
`webApp:validation.body.empty`). Their decorators sit on a property (`toDate`, or a class-level
custom constraint) but carry `context: { root: true }`; the pipe reports any failure whose
constraint has that context with `field: ""`. *Builder's call.*

## Constraints

- Express 4 today, but `refactor/express-5` (uncommitted worktree) rewrites the same
  `validation.pipe.ts`. The new pipe is written Express-5-safe from the start: validate
  `req[source] ?? {}`, and write the result back with
  `Object.defineProperty(req, source, { value, writable: true, enumerable: true, configurable: true })`
  instead of assignment (`req.query` is a getter in Express 5). Whichever branch merges second
  resolves one file.
- `tsconfig.json` already has `experimentalDecorators` + `emitDecoratorMetadata`; `reflect-metadata`
  is already a dependency and imported first in `server.ts`. Jest runs through `ts-jest`, which
  emits decorator metadata; `test/setup.ts` must import `reflect-metadata` too if any spec builds a
  DTO without going through `server.ts`.
- Dependency pinning follows `standard-security` (exact versions).
- `server/.claude/rules/*.md` describe Joi (`validators.md`, `imports.md`, `i18n.md`, `modules.md`,
  `common.md`, `types.md`). They are local-only (gitignored) — updated in the working copy, never
  committed to the app repo.

## Approaches

| | Approach | Trade-off | |
| --- | --- | --- | --- |
| 1 | **DTO classes per module, pipe stays on the route** (`bodyPipe(UpdateProfileBodyDto)`) | NestJS-like file placement; routing untouched; one pipe changes | **Chosen** |
| 2 | DTO classes, but kept centralised in `src/validators/dtos/<module>.ts` | least file movement; rules sit far from the module that owns them, unlike NestJS | rejected |
| 3 | Annotations on controllers too (`@Body() dto`) via routing-controllers / tsoa | full NestJS feel, but rewrites guards, rate limiting, `handle` and the hand-wired DI — a framework migration, not a validation swap | rejected |

Library: **class-validator + class-transformer** (owner's choice over Zod, for the annotation style
and the NestJS path).

## Design

### Layout

```
server/src/
  modules/<name>/dtos/
    my-profile.dto.ts                 ← existing response DTO, unchanged
    requests/
      update-profile.body.ts          ← export class UpdateProfileBodyDto
      user-id.params.ts               ← export class UserIdParamsDto
      admin-users.query.ts            ← export class AdminUsersQueryDto
      index.ts                        ← barrel for the requests folder
  validators/
    constants.ts                      ← unchanged (patterns, length limits)
    decorators/                       ← shared custom decorators + transforms
    dtos/                             ← shared base / reusable request DTOs
    utils.ts                          ← minus objectIdSchema (Joi)
  middlewares/pipes/validation.pipe.ts
```

Naming: file `<what>.<source>.ts`, class `<What><Source>Dto` with source ∈ `Body` / `Params` /
`Query`. Request DTOs live under `dtos/requests/` so they never mix with response DTOs.
*Builder's call — any consistent scheme is fine.*

### Shared building blocks (`src/validators/`)

Replace each reusable Joi fragment with a decorator or base class:

| Joi today | Replacement |
| --- | --- |
| `emailSchema`, `passwordSchema`, OTP, full-name fragments in `base.ts` | composed decorators, e.g. `@IsAppEmail()` = trim+lowercase transform + `IsEmail` + length + `Matches(SAFE_EMAIL_PATTERN)`, each with its existing message key (`applyDecorators`-style helper) |
| `objectIdSchema(ns, key)`, the repeated `/^[a-fA-F0-9]{24}$/` | `@IsObjectId(messageKey)` |
| `dateOfBirthSchema` + `getDateOfBirthBounds` | two decorators, `@IsDateOfBirthNotTooYoung()` + `@IsDateOfBirthNotTooOld()` — distinct constraint names so `reason` still tells them apart; `getDateOfBirthBounds` and its tests stay |
| `Joi.ref("newPassword")` / `Joi.ref("password")` | `@MatchesProperty("newPassword")` |
| object-level `.custom` date range (login-history, contact-admin) | `@IsOnOrAfter("fromDate", { context: { root: true } })` on `toDate` → reported as `field: ""` |
| `adminUpdateAppBodySchema.min(1)` (empty PATCH body) | class-level non-empty constraint with `context: { root: true }` → `field: ""`, key `webApp:validation.body.empty` |
| `isSupportedTimeZone` custom | `@IsSupportedTimeZone()` |
| `isValidRedirectUri` custom (web-app) | `@IsRedirectUri()` with `{ each: true }` on the array |
| category name custom (normalise + slug check, **returns the normalised value**) | `@Transform(normalizeCategoryName)` then `@IsNotEmpty` + `@HasSlug()` for `nameEn` |
| pagination `page` / `limit` / `sortOrder` repeated in every list query | `PaginationQueryDto` base class, extended per module |
| `loginHistoryQuerySchema.keys({...})` (admin variant) | `class LoginHistoryAdminQueryDto extends LoginHistoryQueryDto` |
| `.trim()`, `.lowercase()` | `@Trim()`, `@Lowercase()` transforms |
| `Joi.number()` / `Joi.boolean()` on query strings | explicit `@ToInt()` / `@ToBoolean()` transforms — **not** `enableImplicitConversion`, which turns the string `"false"` into `true` |
| `.default(x)` (2 places, e.g. `deleteCategoryBody.reassignments = []`) | class field initialiser |
| `.allow(null).optional()` | `@IsOptional()` (skips rules for `null` and `undefined`), with `null` kept in the value so profile update can `$unset` |

### The pipe

```ts
const validationPipe = <T extends object>(source: "body" | "params" | "query", Dto: ClassConstructor<T>) =>
  async (req, _res, next) => {
    try {
      const instance = plainToInstance(Dto, req[source] ?? {});           // explicit transforms only
      const failures = await validate(instance, {
        whitelist: true,            // = Joi stripUnknown: undecorated properties are removed
        forbidNonWhitelisted: false,
        stopAtFirstError: true,     // at most one entry per field (Joi could emit two: min + pattern)
        validationError: { target: false, value: false }
      });
      if (failures.length) throw new ValidationError({ key: "common:errors.validationFailed", errors: flatten(failures, req.t) });
      Object.defineProperty(req, source, { value: instance, writable: true, enumerable: true, configurable: true });
      next();
    } catch (e) { next(e); }
  };
```

`flatten` walks `children` for nested objects / arrays and emits
`{ field: "parent.0.child", reason: <constraint name>, message: req.t(<key>) }` — the `field`
format Joi produced (`path.join(".")`).

Where Joi has no key for a rule today (mostly `string.base` and `string.empty` on optional
fields), it ships Joi's built-in English sentence. The new constraint reuses the field's nearest
existing key (`validation:search.invalid`, the field's `.invalid` / `.required` key); only where a
field has no key at all is a `<ns>:validation.<field>.invalid` key added to **both** locale
catalogues. These responses therefore go from an English sentence to a translated one — a fix,
not a regression, and no API test asserts the English text. *Builder's call.*

Every constraint must carry an i18n key as `message`. A constraint without one ships
class-validator's English sentence, exactly the bug the comment in `login-history.ts` warns about
for Joi. Guard it with a unit test: instantiate every request DTO with values that fail each rule
and assert every `message` matches `^[a-zA-Z]+:` (*builder decides how exhaustive*).

Order inside one property: with `stopAtFirstError` the first failing constraint wins. Decorators
run in registration order, which must reproduce Joi's message for the common cases asserted by the
API suite (missing → `required`, too long → `maxLength`, bad shape → `invalid`). Pin this with
unit tests per DTO, not by reasoning.

### Types

- `<Name>Request` interfaces in `modules/<name>/types` that only describe `req.body` / `req.query`
  / `req.params` now reference the DTO class (`body: UpdateProfileBodyDto`).
- Interfaces whose sole job was to be the request shape (`AdminAppsQuery`, `MyContactsQuery`, …)
  are deleted and replaced by the DTO.
- Repository input types (`UpdateProfileData` as the `updateById` argument, etc.) **stay** in
  `types/` — they are the persistence contract. The service passes the DTO through; TypeScript
  checks it structurally. If an interface is used both ways, the repository keeps it and the
  request side switches to the DTO. *Builder's call.*

### Migration order — one branch, one PR, several commits

During the migration the pipe accepts **either** a Joi schema or a DTO class (`Joi.isSchema(arg)`),
so every commit builds and passes `pnpm test`:

1. Deps (`class-validator`, `class-transformer`), dual-mode pipe + its spec, shared decorators and
   base DTOs with their specs.
2. Modules in a few groups (e.g. auth flows: signup / login / forgot-password / change-password /
   unlock-account; user + contact-admin; web-app + category + entitlement; favorite / recent-app /
   login-history / notification). Each group: DTOs, route wiring, type clean-up, spec rewrite
   (the four `schemas/*.spec.ts` move to the owning module's DTO specs).
3. Remove Joi: delete `validators/schemas/`, the Joi branch of the pipe, `objectIdSchema`, the
   `joi` dependency. Update `CLAUDE.md` (stack line, cross-cutting table, the pagination note
   that says "every paginated Joi schema"), README tech-stack table if it names Joi, and the
   six automation-test API files for the `reason` change. Local `server/.claude/rules/` updated, not
   committed.

## Verification

- `server`: `pnpm type-check`, `pnpm lint`, `pnpm test` (103 suites / 787 tests before; 118 suites / 878 tests after) green at
  every commit.
- `automation-test`: `pnpm test:api` against the dedicated e2e stack (`DB_NAME=ducker-id-e2e`, API
  `:5600`, client `:3600` — see `automation-test/src/docs/test-plan.md`) once, at the end. The API
  layer is where every validation contract is asserted; it is the real parity check.
  `pnpm coverage:check` stays green.
- Manual spot check of the Joi-specific traps: `?interactive=false`, `?page=2`, profile update with
  `phone: null`, category create with surrounding whitespace, empty `DELETE` category body.

## Left to the builder

- Exact decorator names, the composition helper, and file split inside `validators/decorators/`.
- How module groups are split into commits.
- How exhaustive the "every constraint has a key" test is.
- Whether `ValidationErrorItem` gets a stricter `reason` type.

## Known differences from Joi

Found while pinning every case against Joi; none is asserted by the API suite.

- **Mixed array failures.** An array with both a bad item and a duplicate, or a bad item and too
  many entries, reports one entry per array property; Joi reported several.
- **Email TLD list.** The allow-list comes from `@hapi/tlds` 1.1.7, slightly newer than the list
  Joi bundled — a handful of retired brand TLDs are judged differently.
- **One entry per field.** Where Joi reported two entries for one field (e.g. `acceptTerms`, a
  short password that also breaks the pattern), only the first is reported.
- **`null` on optional query fields** is accepted. Unreachable through a query string.
- **`null` entitlement change item.** Joi's unique comparator crashed on it (500); it is now a
  400 at `changes.<i>`.
