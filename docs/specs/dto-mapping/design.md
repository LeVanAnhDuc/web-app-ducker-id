# Response DTOs — hand-written `to…Dto` mappers → class-transformer classes

Date: 2026-11-21 · Branch: `refactor/dto-mapping`

## Why

Every response DTO under `server/src/modules/*/dtos/` is an `interface` plus a `to…Dto()` function
that lists each field a second time: 38 files, 42 mappers. Most of those lines are the same three
conversions repeated by hand — `.toISOString()` 21 times, `ObjectId.toString()` 18 times,
`?? null` 21 times.

`refactor/class-validator` (#43) brought `class-transformer` in for request DTOs. The same library
builds response DTOs the NestJS way: one class whose properties carry `@Expose` and a conversion,
mapped by `plainToInstance(Dto, source, { excludeExtraneousValues: true })`. The class is the type
and the mapping at once, and a field the class does not expose can never reach a response.

## Scope

Agreed with the owner: only the two mapping kinds that recur — **`to…`** (entity → response) and
**`update…`** (PATCH → update document). Query → filter (`build…Filter`), request → create data
(`build…Data`) and event payloads are out of scope.

### `to…` — what changes per mapper

| Kind | Mappers | After |
| --- | --- | --- |
| Field copy from a document / lean record / aggregate row | `toAdminCategoryDto`, `toPublicCategoryDto`, the five contact DTOs, `toAllHistoryItemDto`, `toMyHistoryItemDto`, `toLoginAppFieldsDto`, `toNotificationItemDto`, `toAdminUserDto`, `toAdminAppDto`, `toLoginResponseDto`, `toUnlockVerifyDto` | interface + function → **class**; callers use `toDto(XDto, doc)`; the function is deleted |
| Field copy plus a value from elsewhere | `toMyProfileDto(user, avatarUrl)`, `toPublicProfileDto(user, avatarUrl)`, `toUserAppDto(doc, isFavorite)`, `toAdminAppCreatedDto(doc, clientSecret)`, `toRecentAppDto(doc, usage, isFavorite)`, `toFavoriteAppDto(doc)` | class for the copied part; the function stays as a **typed one-liner** `({ ...toDto(XDto, doc), avatar: avatarUrl })` so a forgotten argument still fails to compile |
| Built from loose values, no source record | `toSendOtpResponseDto(expiresIn, cooldown)`, `toResetPasswordResponseDto()`, `toCheckEmailDto(available)`, `toResendOtpDto(…)`, `toCompleteSignupDto(account, tokens)`, … (13) | **unchanged** — there is nothing to transform; the interface already gives the compile-time check |
| Real computation | `toMyLoginStatsDto`, `toRecentAppsStatsDto`, `toEntitlementMatrixDto`, `toDeleteImpactDto` | **unchanged** — business logic, not mapping |

### `update…` — not done, on purpose

The only hand-built PATCH update is the `$set` / `$unset` loop in
`user/repository/impl/mongo-user.repository.ts` (`null` → `$unset`, `undefined` → skipped). Every
other repository either stores `null` by design (`web-app`: a blank description is kept as
`null`) or writes a fixed `$set`. A shared `toMongoUpdate` would have one consumer, which
`server/.claude/rules/utils.md` R1 forbids (shared only when used by ≥ 2 modules), and moving the
loop inside the user module changes nothing. It stays where it is; extract it the day a second
module needs `null`-means-unset.

## Design

### `src/common/dto/index.ts`

```ts
export { Expose };                                  // plain copy — strings, numbers, booleans, enums, string arrays
export const ExposeId      = (from?) => …;          // ObjectId → hex string | null       (`@ExposeId("_id") id`)
export const ExposeIds     = (from?) => …;          // ObjectId[] → string[], absent → []
export const ExposeDate    = (from?) => …;          // Date → ISO string | null
export const ExposeOrNull  = (from?) => …;          // undefined → null
export const ExposeFrom    = (compute) => …;        // computed from the whole record: defaults, lookups, masking, nested DTOs
export function toDto<T>(Dto, source: object): T;   // also accepts an array
```

- Each decorator is `@Expose()` plus a `@Transform` marked `toClassOnly`.
- `toDto` calls `toObject()` first when the source is a Mongoose document, maps with
  `excludeExtraneousValues: true`, and returns a **plain object** (spread of the instance), so
  responses serialise and service specs compare exactly as they did with the literal mappers.
- Placement: `src/common/` holds cross-module framework primitives (`responses/`, `pagination/`,
  `sort/`); response mapping is one more. Not `src/validators/` — that folder is request input.

### Traps the decorators exist for (pinned in `src/common/dto/index.spec.ts`)

1. **A bare `@Expose()` on an ObjectId** returns the ObjectId's internals, not a string —
   class-transformer walks it as an object. Ids always go through `ExposeId` / `ExposeIds`.
2. **A bare `@Expose()` on a nested object** copies *every* key of it (no target class → expose
   all). Nested values go through `ExposeFrom((src) => toDto(NestedDto, src.x))`, or a plain copy
   only when the nested shape is fully public (`name: { en, vi }` is rebuilt the same way, because
   lean category names carry an `_id`).
3. **A forgotten `@Expose()` drops the field silently** — TypeScript no longer catches it, as it
   did with the object literal. Each converted DTO gets a spec asserting its exact key set with
   `toStrictEqual`.
4. **Mongoose documents** must be `toObject()`ed first, or the getters and `$__` internals leak in;
   `toDto` does it, callers do not.

### Naming and layout

- File names stay (`contact-detail-item.dto.ts`); the exported `interface XDto` becomes
  `class XDto`. `extends` replaces spread where one DTO adds fields to another
  (`AdminContactDetailItemDto extends ContactDetailItemDto`, history items extend
  `LoginAppFieldsDto`).
- Barrels export the classes; type-only imports of a DTO (`import type { XDto }`) keep working.
- `server/.claude/rules/modules.md` §37–40 (local-only, not committed) is updated to describe the
  class form.

## Verification

- `pnpm type-check`, `pnpm lint`, `pnpm test` in `server/` — the service specs already assert the
  mapped output, so they are the regression net for every converted mapper; the new DTO specs add
  the exact-key check.
- `automation-test` `pnpm test:api` on the dedicated e2e stack is the end-to-end parity check; it
  needs MongoDB plus a running server, so it is listed for the reviewer rather than run here.

## Non-goals

- Swagger generation from DTOs (`class-validator-jsonschema`) — postponed by the owner.
- Request DTOs, validation, routing.
- Inlining the value-only factories into services — churn without a gain.

## Amendment — 2026-11-21, after #46

`ExposeIds` was removed. Its only consumer was `AdminAppDto.categoryIds`, and a decorator with one
consumer is the same YAGNI case as the `update…` helper above. That field now reads
`@ExposeFrom<WebAppDocument>((doc) => doc.categoryIds.map(String))`; the ObjectId trap (trap 1) applies
to every element of an array, so an array of ids always goes through `ExposeFrom` with `.map(String)`.
