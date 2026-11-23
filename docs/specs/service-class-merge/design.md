# Services as one class — method files only where they earn it

Date: 2026-11-23 · Branch: `refactor/transactional-decorator` (batch 1)

## Why

The `module-struct-batch*` series split every service into one file per public method plus a
façade class of one-line delegates. For the modules it was aimed at (`oauth` 769 lines, `signup`
516, `login-history` 517) that was right. For the rest it costs more than it buys: most service
folders total 100–300 lines, every method's signature is written twice (method file + façade), and
every call rebuilds a `deps` object out of the façade's own fields. `favorite` is 124 lines across
four files, 45 of them delegation.

Two more reasons now:

- `@Transactional()` (`docs/specs/transactional-decorator/`) annotates a **method**. With logic in
  free functions, a transactional step has to be routed back through the façade
  (`SignupService.createUserAccount`), which is the indirection this change removes.
- 27 of 29 service specs already test through the class (`new FavoriteService(...)`), so the public
  surface does not move and the specs barely change.

## The rule

- **The class is the service.** `class <Name>Service` — in `<name>.service.ts` or `services/index.ts`,
  see below — has each public method's body inline and reads dependencies from `this`. No `deps` object, no one-line delegate.
- **A private step is a `private` method** on the class, or an unexported function at the top of
  the file when it touches no dependency (a pure mapping or check).
- **A method moves to its own file only when it earns it**: its body passes ~60 lines, or it carries
  private steps no other method uses. The file then keeps today's shape (`export const x = async
  (deps, …)`) and the class method stays a one-line delegate. Shared steps keep
  `services/shared/<name>.ts`.
- **A class that is all there is lives in one file at the module root**, `<name>.service.ts`,
  imported as `@/modules/<name>/<name>.service` — a `services/` folder holding only `index.ts` and
  `spec/` is two levels of nesting for one file. Its specs sit beside it like a controller's:
  `<name>.service.spec.ts`, or `<name>.service.<topic>.spec.ts` when there are several (they stay
  separate files because a `jest.mock` applies to the whole file). The `services/` folder is kept
  only when something sits next to the class: a method file, `services/shared/`, or a second service.
- Sub-folders for modules with two or more services (`services/login/`, `services/login-audit/`)
  and `strategies/` are unchanged; each sub-folder's `index.ts` follows the same rule.

## Batches

- **Batch 1** (this change): `favorite`, `notification`, `session`, `token`, `authentication`,
  `contact-admin`, `recent-app` — service folders under ~300 lines. Together with `change-password` and
  `logout` (already a single class), they become `<name>.service.ts`.
- **Batch 2**: `user`, `category`, `web-app`, `unlock-account`, `forgot-password`, `entitlement`,
  `login-history`.
- **Stay split** (long methods, the rule keeps their files): `oauth`, `signup`, `login`. Each still
  follows the rule for its short methods.

`CLAUDE.md` describes the rule once batch 1 lands; until batch 2 lands it names the modules that
still use the old layout.

## Testing

No behaviour changes. Specs that import a method file directly switch to the class; `pnpm test`,
`pnpm type-check` and lint must stay green with the same test count.
