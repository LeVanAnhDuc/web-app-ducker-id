# Remove Decorative Gradients — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every decorative `bg-gradient-*` fill in `client/src/**` and unify the affected surfaces to consistent neutral tokens (`bg-muted` / `bg-card`), keeping semantic color only in text/icon/border.

**Architecture:** Pure Tailwind class swaps + dead prop/field/type cleanup. No behavior, data, or API-contract change. The animated public-layout background is out of scope.

**Tech Stack:** Next.js 15 + React 19, Tailwind CSS 4, shadcn/ui. Tokens defined in `client/src/app/[locale]/globals.css`.

## Global Constraints

- Design system source of truth: `client/.claude/uiux/design-guide.md §1.1` — achromatic palette; color = semantic meaning only, never decorative fill. `frontend-reference.md §1` for token names.
- Replacement tokens: tiles/thumbnails/avatars/icon-boxes → `bg-muted`; card-level surfaces → `bg-card` (Card default; drop gradient + keep border). Any `text-primary-foreground` on a now-light surface → `text-foreground`; secondary `/70–80` → `text-muted-foreground`.
- Inner buttons previously styled for a dark colored bg → standard `CustomButton` (default variant); remove ad-hoc `bg-primary-foreground`/`bg-warning` overrides (design-guide §5.2 defines no warning button variant).
- No TDD cycle: this is a styling/cleanup change with no behavior to assert (E2E skipped per design §7). Verification per task = `cd client && yarn lint` clean; full gate at the end = `yarn lint && yarn build` green.
- Client conventions: component props typed inline; one default export per `index.tsx`; follow `client/.claude/CLAUDE.md`.

---

### Task 1: QuickAccess section + card → neutral

**Files:**
- Modify: `client/src/views/Home/mains/QuickAccessSection/index.tsx`
- Modify: `client/src/views/Home/components/QuickAccessCard/index.tsx`

- [ ] **Step 1: Delete the `GRADIENTS` array and stop passing `gradient`**

In `QuickAccessSection/index.tsx`: delete the `const GRADIENTS = [...]` block (lines ~13–18) and remove the `gradient={GRADIENTS[idx % GRADIENTS.length]}` prop line from the `<QuickAccessCard>` usage.

- [ ] **Step 2: Neutralize the card surface + foreground**

In `QuickAccessCard/index.tsx`:
- Remove `gradient,` from the destructure and `gradient: string;` from the inline prop type.
- The `CustomButton` tile `className`: replace the trailing `gradient` argument; set the tile fill to `bg-muted`. Final classlist (no gradient):
  `"flex h-[140px] w-full cursor-pointer flex-col items-start justify-start gap-2.5 rounded-xl bg-muted p-6 text-left whitespace-normal transition-opacity hover:opacity-90"` (drop the `gradient` cn arg entirely).
- Inner icon box: `bg-primary-foreground/15 text-primary-foreground` → `bg-background text-foreground`.
- Name span: `text-primary-foreground` → `text-foreground`.
- Category span: `text-primary-foreground/80` → `text-muted-foreground`.
- Favorite-button wrapper: `text-primary-foreground [&_svg]:text-primary-foreground/80` → `text-muted-foreground [&_svg]:text-muted-foreground`.

- [ ] **Step 3: Lint**

Run: `cd client && yarn lint`
Expected: no errors in the two files.

---

### Task 2: Recommended section + card + Explore CTA → neutral

**Files:**
- Modify: `client/src/views/Home/mains/RecommendedSection/index.tsx`
- Modify: `client/src/views/Home/components/RecommendedAppCard/index.tsx`

- [ ] **Step 1: Delete `GRADIENTS` + stop passing `gradient`**

In `RecommendedSection/index.tsx`: delete the `const GRADIENTS = [...]` block (lines ~20–25) and remove the `gradient={GRADIENTS[idx % GRADIENTS.length]}` prop on `<RecommendedAppCard>`.

- [ ] **Step 2: Neutralize the Explore CTA card**

In `RecommendedSection/index.tsx`, the bottom `<Card>`:
- className: replace `from-primary to-primary/90 text-primary-foreground … border-0 bg-gradient-to-br` with `bg-card text-foreground … border` (keep `mt-2 flex items-center justify-between gap-4 rounded-2xl p-7`).
- Inner icon box: `bg-primary-foreground/10` → `bg-muted`; `<Compass>` `text-primary-foreground` → `text-foreground`.
- Title `<p>`: keep `text-base font-semibold` (inherits `text-foreground` now).
- Subtitle `<p>`: `text-primary-foreground/70` → `text-muted-foreground`.
- CTA `CustomButton`: remove `className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"` so it renders the default (primary) variant.

- [ ] **Step 3: Neutralize the thumbnail in the card**

In `RecommendedAppCard/index.tsx`:
- Remove `gradient,` from destructure and `gradient: string;` from inline prop type.
- The thumbnail `<div>` `className`: drop the `gradient` cn argument; set fill to `bg-muted text-foreground`. Final:
  `"flex h-24 items-center justify-center overflow-hidden rounded-xl bg-muted text-2xl font-semibold text-foreground"`.

- [ ] **Step 4: Lint**

Run: `cd client && yarn lint`
Expected: no errors.

---

### Task 3: Greeting section (hero + icon block + achievement banner) → neutral

**Files:**
- Modify: `client/src/views/Home/mains/GreetingSection/index.tsx`

- [ ] **Step 1: Greeting hero card**

The first `<Card>`: replace `from-card to-primary/5 … bg-gradient-to-b` with `bg-card …` (keep `flex flex-row items-center justify-between gap-6 rounded-2xl border p-8 md:p-10`). Text inside already uses foreground tokens — leave it.

- [ ] **Step 2: LayoutGrid icon block**

The `<div>` with `from-primary/40 to-primary … bg-gradient-to-br`: replace gradient with `bg-muted` (keep `hidden size-32 shrink-0 items-center justify-center rounded-3xl lg:flex xl:size-40`). The `<LayoutGrid>` icon: `text-primary-foreground` → `text-foreground`.

- [ ] **Step 3: Achievement banner**

The last `<Card>` (`border-warning/50 from-warning/15 to-warning/5 … bg-gradient-to-r`): drop the gradient → `bg-card`. **Keep** `border-warning/50`. Keep the inner `bg-warning/25` icon box, `text-warning-foreground` icon, and warning-colored title/subtitle text (semantic, allowed by §1.1). The CTA `CustomButton`: remove `className="bg-warning text-warning-foreground hover:bg-warning/90 shrink-0"`, replace with `className="shrink-0"` so it renders the default variant (keep `shrink-0` layout, keep the `Trophy` iconLeft).

- [ ] **Step 4: Lint**

Run: `cd client && yarn lint`
Expected: no errors.

---

### Task 4: Profile avatar fallback → neutral

**Files:**
- Modify: `client/src/views/Profile/mains/ProfileCard/index.tsx`

- [ ] **Step 1: Neutralize avatar fallback**

The `<AvatarFallback>` className: `from-cream to-primary text-primary-foreground bg-gradient-to-br text-xl font-bold` → `bg-muted text-foreground text-xl font-bold`.

- [ ] **Step 2: Lint**

Run: `cd client && yarn lint`
Expected: no errors.

---

### Task 5: Team avatar + dead `avatar*Color` plumbing

**Files:**
- Modify: `client/src/views/Team/components/TeamMemberRow/index.tsx`
- Modify: `client/src/views/Team/mains/TeamMembersCard/index.tsx`
- Modify: `client/src/mocks/Team/index.ts`
- Modify: `client/src/types/Team/index.ts`

**Interfaces:**
- Produces: `TeamMemberMock` (in `types/Team` and the duplicate in `mocks/Team`) and `TeamMemberRow` props no longer carry `avatarFromColor` / `avatarToColor`.

- [ ] **Step 1: TeamMemberRow — neutral fallback + drop props**

- Remove `avatarFromColor,` and `avatarToColor,` from the destructure and `avatarFromColor: string;` / `avatarToColor: string;` from the inline prop type.
- `<AvatarFallback>` className: replace the `cn("bg-gradient-to-br text-xs font-semibold text-white", avatarFromColor, avatarToColor)` with the static string `"bg-muted text-foreground text-xs font-semibold"`. If `cn` is now unused, remove its import.

- [ ] **Step 2: TeamMembersCard — stop passing the two props**

Remove the `avatarFromColor={member.avatarFromColor}` and `avatarToColor={member.avatarToColor}` lines from the `<TeamMemberRow>` usage.

- [ ] **Step 3: mocks/Team — remove fields from interface + entries**

In `mocks/Team/index.ts`: remove `avatarFromColor: string;` and `avatarToColor: string;` from its local `TeamMemberMock` interface, and remove the `avatarFromColor`/`avatarToColor` lines from all 3 objects in `TEAM_MEMBERS_MOCK`.

- [ ] **Step 4: types/Team — remove fields from canonical interface**

In `types/Team/index.ts`: remove `avatarFromColor: string;` and `avatarToColor: string;` from the `TeamMemberMock` interface.

- [ ] **Step 5: Lint**

Run: `cd client && yarn lint`
Expected: no errors (no unused-var / missing-prop errors).

---

### Task 6: Remove unused `gradientClass` from `App` interface

**Files:**
- Modify: `client/src/dataSources/Dashboard/index.ts`

- [ ] **Step 1: Remove the field**

In the `App` interface, delete the `gradientClass: string;` line (declared, never consumed). Leave `colorClass` (not a gradient; out of scope).

- [ ] **Step 2: Lint**

Run: `cd client && yarn lint`
Expected: no errors.

---

### Task 7: Final verification gate (§4.7)

**Files:** none (verification only).

- [ ] **Step 1: Full lint + build**

Run: `cd client && yarn lint && yarn build`
Expected: both green; `next build` type-checks pass (catches any leftover reference to removed props/fields).

- [ ] **Step 2: Grep for stragglers**

Run a search for `gradient`, `from-`, `via-`, `bg-gradient` across `client/src/**` excluding `AnimatedBackground`.
Expected: no decorative gradient classes remain (only the out-of-scope `AnimatedBackground` radial/linear styles).

- [ ] **Step 3: Commit** (single squash-friendly commit on `chore/remove-gradients`)

```bash
cd client
git add -A
git commit -m "style(ui): remove decorative gradients, unify to neutral surfaces"
```

## Self-Review

- **Spec coverage:** design §3 items 1–10 each map to a task (1→T1, 3-4→T2, 5→T3, 6→T4, 7-9→T5, 10→T6). §7 gates → T7 + design notes (E2E/Pencil/security skipped).
- **Placeholder scan:** none — every step names exact files and exact class strings.
- **Type consistency:** prop/field removals listed in every consumer (TeamMemberRow props ↔ TeamMembersCard usage ↔ both `TeamMemberMock` copies; `gradient` prop ↔ both Home cards ↔ both sections).
