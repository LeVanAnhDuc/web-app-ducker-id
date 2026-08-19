# Design — Remove decorative gradients, unify to neutral surfaces

> Feature: `remove-gradients` · Side: **FE only** (`client/src/**`) · Type: cosmetic refactor
> Output of `superpowers:brainstorming`. Input for `superpowers:writing-plans`.

## 1. Goal & Principle

Enforce `client/.claude/uiux/design-guide.md §1.1`: the palette is achromatic (navy + gray);
**color appears only when it carries semantic meaning (error/warning/success), never as decoration.**

The current UI uses `bg-gradient-*` decorative fills in several dashboard/profile/team surfaces.
This violates §1.1 and produces an inconsistent, multi-hue look. We remove **all decorative
gradients** and unify every affected surface to a single consistent **neutral** token
(`bg-muted` for tiles/thumbnails/avatars, `bg-card` for card-level surfaces).

**Decision (user-approved):** Unify *fully* to neutral — even brand/semantic gradient surfaces
(Explore CTA, achievement banner) become neutral surfaces. Semantic color survives **only in
text / icon / border**, never as a decorative fill. The animated public-layout background is
**out of scope**.

## 2. Replacement Rules (applied consistently across all sites)

| Old surface kind | New fill | Foreground cascade |
| --- | --- | --- |
| Icon/initial **tile or thumbnail** (QuickAccess tiles, Recommended thumbnails, avatar fallbacks, greeting icon block) | `bg-muted` | `text-primary-foreground` → `text-foreground`; muted sub-text `/70–80` → `text-muted-foreground` |
| **Card-level** gradient (greeting hero, Explore CTA, achievement banner) | drop gradient → Card default `bg-card` (keep existing border) | same cascade |
| Inner buttons styled for a dark colored bg (Explore `bg-primary-foreground text-primary`; achievement `bg-warning text-warning-foreground`) | standard `CustomButton` variant (`default`) — off-spec ad-hoc fills removed (design-guide §5.2 defines no `warning` button variant) | — |

**Why `bg-muted` vs `bg-card`:** `bg-muted` is the token for placeholder/media surfaces that
hold an icon or initial; `bg-card` is the surface for a card container. Picking per element keeps
the result consistent with the rest of the app (e.g. StatCard icon tiles, Skeleton).

## 3. File-by-file changes (`client/src/**`)

1. **`views/Home/mains/QuickAccessSection/index.tsx`** — delete the `GRADIENTS[]` array; stop passing the `gradient` prop to `QuickAccessCard`.
2. **`views/Home/components/QuickAccessCard/index.tsx`** — remove the `gradient` prop (type + destructure + usage); tile surface → `bg-muted`; inner icon box, name/category text, and favorite-button color → foreground tokens instead of `text-primary-foreground`.
3. **`views/Home/mains/RecommendedSection/index.tsx`** — delete `GRADIENTS[]`; stop passing `gradient`. Explore CTA `Card` → `bg-card` (keep `border`); inner icon box `bg-primary-foreground/10` → `bg-muted`; text `text-primary-foreground[/70]` → foreground/muted; inner CTA button → default `CustomButton` (drop the `bg-primary-foreground text-primary` override).
4. **`views/Home/components/RecommendedAppCard/index.tsx`** — remove `gradient` prop; thumbnail block → `bg-muted` + `text-foreground`.
5. **`views/Home/mains/GreetingSection/index.tsx`** —
   - greeting hero card `from-card to-primary/5 bg-gradient-to-b` → `bg-card`;
   - LayoutGrid icon block `from-primary/40 to-primary bg-gradient-to-br` → `bg-muted`, icon `text-primary-foreground` → `text-foreground`;
   - achievement banner `from-warning/15 to-warning/5 bg-gradient-to-r` → `bg-card`. **Keep** `border-warning/50`, the warning icon, and warning text (semantic, allowed by §1.1). The achievement icon box `bg-warning/25` may stay (semantic tint, not a gradient). Inner CTA button `bg-warning…` → default `CustomButton` variant.
6. **`views/Profile/mains/ProfileCard/index.tsx`** — `AvatarFallback` `from-cream to-primary bg-gradient-to-br text-primary-foreground` → `bg-muted text-foreground`.
7. **`views/Team/components/TeamMemberRow/index.tsx`** — `AvatarFallback` gradient → `bg-muted text-foreground`; remove `avatarFromColor` / `avatarToColor` props (type + destructure + usage).
8. **`views/Team/mains/TeamMembersCard/index.tsx`** — stop passing `avatarFromColor` / `avatarToColor` to `TeamMemberRow`.
9. **`mocks/Team/index.ts`** — remove `avatarFromColor` / `avatarToColor` from the `TeamMemberMock` interface and from all 3 member entries.
10. **`dataSources/Dashboard/index.ts`** — remove the unused `gradientClass` field from the `App` interface (declared, never consumed). Leave `colorClass` (not a gradient; out of scope).

## 4. Dead-code cleanup summary

- Props removed: `gradient` (QuickAccessCard, RecommendedAppCard), `avatarFromColor`/`avatarToColor` (TeamMemberRow).
- Mock/type fields removed: `avatarFromColor`/`avatarToColor` (TeamMemberMock), `gradientClass` (App).
- Constants removed: two `GRADIENTS[]` arrays.

## 5. Out of scope (deliberately untouched)

- **`layouts/PublicLayout/mains/AnimatedBackground/index.tsx`** — the radial/linear gradients here are the animated spotlight effect itself, already monochromatic (`--primary` tints + radial mask). Not decorative rainbow; removing it would delete the feature. (User decision.)
- Existing **non-gradient** semantic tints already flat & consistent: StatCard icon/badge tints (`bg-primary/10`, `bg-info/10`, `bg-warning/20`…), weekly-activity bars (`bg-primary`, `bg-primary/15`), role/stat badges, `colorClass`. These are not gradients and not decorative multi-hue surfaces — touching them is scope creep.

## 6. Risks / contrast notes

- Every surface flipping from a dark colored fill to a light neutral fill **requires** flipping its
  foreground from `text-primary-foreground` (near-white) to `text-foreground` (navy) to preserve
  WCAG AA contrast. The file-by-file list above pairs each surface change with its foreground change.
- The Explore CTA card loses its primary-colored prominence (user-accepted). The inner CTA button
  (a real `CustomButton`) remains the action affordance, now a standard `default` (primary) button.

## 7. Process gates (per root CLAUDE.md)

- **E2E dual-gate (§4.3): SKIP** — cosmetic-only, no user-observable behavior/contract change (color/fill only). No new screen, field, validation, or API contract. → no Scenario Matrix, no `e2e.md`.
- **Pencil mock (§1.5): SKIP** — no new layout/flow; styling-only change to existing UI.
- **Security review (§4.5): SKIP** — no auth/input/sensitive-data/attack surface touched.
- **CLAUDE.md drift audit (§4.6):** none of the facts CLAUDE.md records change. Optional: add a one-line note to `uiux/design-guide.md`/`frontend-reference.md` that gradient *fills* are disallowed — this only restates §1.1, not a new design decision.
- **Green checks (§4.7): REQUIRED** — `cd client && yarn lint && yarn build` must pass (FE `next build` type-checks).
- **Isolation (§6):** worktrees created on `client/` + `docs/` from latest `origin/main`, branch `chore/remove-gradients`.
