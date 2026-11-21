# Plan — response DTOs on class-transformer

Design: `design.md`. Every step ends with `pnpm type-check && pnpm test` green in `server/`.

1. **Core** — `src/common/dto/index.ts` (`toDto`, `Expose`, `ExposeId`, `ExposeIds`,
   `ExposeDate`, `ExposeOrNull`, `ExposeFrom`) + `index.spec.ts` covering the four traps.
2. **category** — `AdminCategoryDto`, `PublicCategoryDto`; services `create`, `list`, `update`,
   `list-public`.
3. **contact-admin** — `ContactDetailItemDto`, `AdminContactDetailItemDto extends …`,
   `ContactListItemDto`, `SubmitContactResponseDto` (`id` from `_id`), `UpdateContactStatusDto`;
   five services.
4. **login-history** — `LoginAppFieldsDto` (source / interactive defaults, app resolution kept as a
   private function behind `ExposeFrom`), `AllHistoryItemDto`, `MyHistoryItemDto` (`maskIp`); two
   services. Existing `login-app.dto.spec.ts` / `my-history-item.dto.spec.ts` move to `toDto`.
5. **notification** — `NotificationItemDto` (`id` from `_id`, `params ?? {}`); `list`, `mark-read`.
6. **user** — `AdminUserDto` (aggregate row), `MyProfileDto` / `PublicProfileDto` + typed
   one-line wrappers for `avatar`.
7. **web-app / favorite / recent-app** — `AdminAppDto` (`status` through
   `WEB_APP_STATUS_PUBLIC`, `categoryIds` via `ExposeIds`), `AdminAppCreatedDto` wrapper,
   `UserAppDto` (ordered `categories` → `PublicCategoryDto`) + wrappers `toUserAppDto`,
   `toFavoriteAppDto`, `toRecentAppDto`.
8. **tokens** — `LoginResponseDto`, `UnlockVerifyDto` from `AuthTokensResponse`.
9. **Exact-key specs** — one `*.dto.spec.ts` per converted module, `toStrictEqual` on a full
   fixture.
10. **Docs** — `CLAUDE.md` cross-cutting table gets a *Response DTOs* row, suite count refreshed;
    local `server/.claude/rules/modules.md` §37–40 updated (not committed). README untouched: no
    user-facing change.
11. **Review gate** — stop, show the diff; commit only after the owner's go.
