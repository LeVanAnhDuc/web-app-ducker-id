# Header Search — Implementation Report (Tasks 1–5)

Scope: FE-only implementation of Tasks 1 through 5 of `plan.md`. Task 6 (E2E) is out of scope for this report — handled separately by the dual-gate E2E flow.

## Files created / modified

### Created

- `client/src/layouts/AppHeader/components/HeaderSearch/index.tsx` — orchestrator: query/open/activeIndex state, debounce, `useApps`, keyboard nav, announce, Popover wiring.
- `client/src/layouts/AppHeader/components/HeaderSearch/mains/ResultList/index.tsx` — loading skeleton / empty state / suggested-or-results list rendering.
- `client/src/layouts/AppHeader/components/HeaderSearch/components/ResultRow/index.tsx` — single result row (icon tile, name, category, ArrowUpRight affordance).

### Modified

- `client/src/locales/en/dashboard.json` — added `header.suggestedLabel`, `resultsLabel`, `noResults`, `noResultsHint`, `viewAll`, `openLabel`, `announce.{results,noResults,opened}`.
- `client/src/locales/vi/dashboard.json` — VI counterparts of the same keys.
- `client/src/constants/pagination.ts` — added `PAGINATION.HEADER_SEARCH_RESULT_LIMIT = 5` (exposed via `CONSTANTS.PAGINATION.HEADER_SEARCH_RESULT_LIMIT`).
- `client/src/components/SearchInput/index.tsx` — extended to forward ref + arbitrary input props (`onFocus`, `onKeyDown`, `role`, `aria-*`, etc.) via `forwardRef` + `Omit<ComponentProps<typeof CustomInput>, "value"|"onChange"|"placeholder"|"className">`. Backward-compatible: all existing callers (only `AppHeader` previously) keep working since no required prop changed.
- `client/src/layouts/AppHeader/index.tsx` — replaced inline `<SearchInput>` + local `searchValue`/`setSearchValue` state with `<HeaderSearch />`. Removed now-unused `useState` import for search value (kept `useState` import for `notifOpen`). Mobile search button, notification popover, and `UserMenu` left untouched.

## Commits (chronological, branch `feat/header-search`)

| Task | Hash | Message |
| --- | --- | --- |
| 1 | `1526e8a` | `feat(header-search): i18n keys + result limit constant` |
| 2 | `41a4e16` | `feat(header-search): ResultRow` |
| 3 | `038b40e` | `feat(header-search): ResultList states` |
| 4 | `f5491f0` | `feat(header-search): orchestrator (search + popover + keyboard)` |
| 5 | `356ce2a` | `feat(header-search): wire HeaderSearch into AppHeader` |

(Task 4 commit also includes the `SearchInput` extension, per plan Task 4 Step 2 — extending `SearchInput` was scoped as part of building the orchestrator, not a separate commit.)

## Final verification output

```
$ yarn lint
yarn run v1.22.19
$ eslint . --ext .js,.jsx,.ts,.tsx
Done in 15.45s.

$ npx tsc --noEmit
(no output — 0 errors)

$ git status --short
(empty — clean working tree)
```

Ran after every task (format → lint → tsc) per client CLAUDE.md Quality & Workflow gate; all green at every step, no errors deferred to the end.

## Deviations from plan (and why)

1. **`total` field path**: plan.md Task 4 said `total = data?.pagination?.total ?? items.length`. The actual shared type is `Paginated<T> = { items: T[]; meta: PaginationInfo }` (`src/types/common.d.ts`), where `PaginationInfo = { total, page, limit, totalPages }`. There is no `pagination` field on the response — it's `meta`. Implemented as `data?.meta?.total ?? items.length`. This matches the plan's own instruction ("đọc shape `Paginated<T>` để lấy đúng field total") — the plan's inline code snippet was just using the wrong field name; I used the field name it says to go verify.
2. **`ResultList` empty-state icon wrapper**: plan spec text says wrap in `aria-hidden` implicitly via icon usage elsewhere in the codebase (e.g. `ResultRow`'s icon tile), but Task 3 spec for the empty-state `Search` icon didn't explicitly say `aria-hidden="true"`. I added `aria-hidden="true"` to the decorative `Search` icon in the empty state for accessibility consistency with the rest of the codebase (every decorative icon elsewhere carries `aria-hidden`). Non-breaking, additive-only.
3. **Popover auto-focus**: added `onOpenAutoFocus={(e) => e.preventDefault()}` on `PopoverContent`, not explicitly mentioned in the plan. Rationale: without it, opening the popover (e.g. via focus-triggered auto-open) would steal focus away from the search input into the popover content, breaking the "type while popover is open" flow and combobox a11y pattern (input should retain focus while options list is visible). This is a minor, defensible technical necessity to make the documented Task 4 keyboard-nav behavior actually work — flagging for reviewer awareness.
4. **`SearchInput` extension implementation detail**: plan said "if `SearchInput` doesn't accept `onFocus`/`onKeyDown`/aria props, extend it (optional props, backward-compatible)." Implemented via `forwardRef` + spreading `...props` typed as `Omit<ComponentProps<typeof CustomInput>, ...>` rather than listing each prop individually (`onFocus?`, `onKeyDown?`, `role?`, ...). This is a broader but simpler extension — forwards *any* valid `<input>`-level prop (aria-*, data-*, etc.), still fully backward compatible since all new props are optional via the spread. Also added `ref` forwarding (not explicitly requested) since Radix `PopoverTrigger asChild` benefits from being able to attach a ref to the rendered child; in practice `asChild` clones the element and Radix manages its own internal ref via `cloneElement`, so this is defensive/idiomatic rather than strictly required — no behavior regression either way.
5. **Section-label markup in `ResultList`**: plan's Task 3 spec described the "has items" branch as one paragraph (label row + map). Implemented with a `<>...</>` Fragment wrapping the label `<span>` and the `.map(...)` of `ResultRow`s, since JSX requires a single root per conditional branch. No semantic deviation.

## Concerns for reviewer

- **`views.md` mains/components pattern applied outside `src/views/**`**: `plan.md`/`design.md` explicitly asked for a `mains/ResultList` + `components/ResultRow` split mirroring the `views/` convention, even though `HeaderSearch` lives under `src/layouts/AppHeader/components/HeaderSearch/`, which is technically outside the `src/views/**` path scope of `views.md`. Followed the plan's explicit folder layout as the authoritative spec for this feature; flagging in case client CLAUDE.md maintainers want to formalize this "mains/components inside layouts" pattern going forward (drift-audit candidate, not blocking).
- **`ResultList`'s multiple conditional markup branches in one file**: `views.md` §"One markup block per component" would ask for `isLoading`/`isEmpty`/`results` branches to be separate components if this lived under `src/views/**`. Since `HeaderSearch/` is under `src/layouts/`, that specific rule doesn't strictly apply by its own path scope, and `plan.md` explicitly specified this single-file structure with inline conditionals. Followed the plan as written; noting the tension for reviewer visibility.
- **Race/staleness**: relies on React Query's query-key dedupe (`[APPS, {search, limit}]`) for the "response cùn không đè query mới" requirement from design.md §4 — not manually guarded with an AbortController or request-id check. This matches the design doc's stated intent ("đã có cơ chế cache theo key") but is worth double-checking under the E2E BVA-timing scenario (matrix #6) in the dual-gate step.
- **Mobile behavior unchanged**: per design.md §6 scope, the mobile search button remains a no-op placeholder (not wired to `HeaderSearch`) — intentional, not a bug, flagged as a known follow-up per design doc.
- No `server/`, `docs/` (other than this report), or `src/components/ui/*` files were touched.
