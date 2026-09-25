# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Ducker ID
**Generated:** 2026-09-25 22:13:48 (step 1, `ui-ux-pro-max --design-system`)
**Decided:** 2026-09-25 (step 2, `frontend-design`)
**Category:** SaaS (General) — identity provider / app launcher

---

## What step 2 overrode, and why

Step 1 returned the catalog's SaaS default: Glassmorphism, trust blue `#2563EB` + orange
`#EA580C`, and **Plus Jakarta Sans for both type roles**. Three of those are overridden.

| Step 1 proposed | Final decision | Why |
| --- | --- | --- |
| Plus Jakarta Sans / Plus Jakarta Sans | **Space Grotesk** display + **IBM Plex Sans** body | One family violates the ≥2-distinct-families rule this bootstrap enforces. Plus Jakarta is also the default SaaS voice — it says nothing about a credential product |
| Trust blue `#2563EB` + orange `#EA580C` | **Prussian `#143A5A`** primary + **Brass `#B07D2B`** accent on **warm stone** neutrals | Ducker ID is chrome around *other* apps' brand colours — the launcher grid is full of third-party icons. Saturated blue chrome competes with them; warm near-neutrals let them sit calmly. Brass carries the keyring/gate metaphor and is the single warm hit |
| Glassmorphism | **Engineered flat — depth from surface, not blur** | The catalog itself flags this style `risk:conditional | requires:contrast-text-4.5`. Frosted panels over a grid of arbitrary third-party icons is exactly where that risk lands. One controlled exception: the sticky header |
| Page pattern "Hero + Features + CTA" | **App shell** (`AppHeader → PageShell → PageHeader → PageToolbar → PageContent`) | There is no marketing landing page in this product. The section order described a page that does not exist |

Not overridable, kept verbatim from step 1: the a11y/UX rules, spacing scale, shadow depths,
anti-patterns and the pre-delivery checklist.

**Signature element — the brass keyline.** A 2px brass rule marks the active boundary:
active nav item, focused field, selected app tile. Besides the CTA fill it is the only
non-neutral fill in the product. Used anywhere else it stops meaning "here".

---

## Global Rules

### Color Palette

Three-layer tokens: **primitive → semantic → component**. Components reference the semantic
or component layer only — a raw hex or a primitive in a component is a bug.

#### Layer 1 — primitive

| Token | Light | Note |
| --- | --- | --- |
| `--stone-50` | `#FAFAF9` | warm neutral, not slate/zinc |
| `--stone-100` | `#F5F5F4` | |
| `--stone-200` | `#E7E5E4` | |
| `--stone-400` | `#A8A29E` | |
| `--stone-600` | `#57534E` | |
| `--stone-700` | `#44403C` | |
| `--stone-900` | `#1C1917` | ink |
| `--prussian-700` | `#143A5A` | brand |
| `--prussian-500` | `#2A5F8F` | |
| `--prussian-300` | `#7CA9D8` | dark-mode brand |
| `--brass-600` | `#B07D2B` | accent |
| `--brass-300` | `#E7B75F` | dark-mode accent |
| `--red-600` | `#B42318` | destructive |

#### Layer 2 — semantic

| Role | Light | Dark | CSS Variable |
|------|-----|-----|--------------|
| Primary | `#143A5A` | `#7CA9D8` | `--color-primary` |
| On Primary | `#FFFFFF` | `#1C1917` | `--color-on-primary` |
| Accent / CTA | `#B07D2B` | `#E7B75F` | `--color-accent` |
| On Accent / CTA | `#1C1917` | `#1C1917` | `--color-on-accent` |
| Background | `#FAFAF9` | `#1C1917` | `--color-background` |
| Foreground | `#1C1917` | `#FAFAF9` | `--color-foreground` |
| Card | `#FFFFFF` | `#292524` | `--color-card` |
| Muted | `#F5F5F4` | `#292524` | `--color-muted` |
| Muted Foreground | `#57534E` | `#A8A29E` | `--color-muted-foreground` |
| Border | `#E7E5E4` | `#44403C` | `--color-border` |
| Destructive | `#B42318` | `#B42318` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#B07D2B` | `#E7B75F` | `--color-ring` |

#### Layer 3 — component

`--button-primary-bg: var(--color-primary)` · `--button-primary-fg: var(--color-on-primary)` ·
`--button-cta-bg: var(--color-accent)` · `--button-cta-fg: var(--color-on-accent)` ·
`--input-border: var(--color-border)` · `--input-focus-keyline: var(--color-ring)` ·
`--card-bg: var(--color-card)` · `--keyline: var(--color-accent)`

#### Verified contrast (WCAG 2.1)

| Pair | Ratio | Verdict |
| --- | --- | --- |
| White on Prussian `#143A5A` | **11.78** | AAA |
| Ink `#1C1917` on Brass `#B07D2B` | **4.84** | AA |
| White on Brass `#B07D2B` | 3.61 | ✗ — never white on brass |
| Brass `#B07D2B` as text on `#FAFAF9` | 3.46 | ✗ — **brass is a fill and a keyline, never body text** |
| White on Destructive `#B42318` | 6.57 | AA |
| Muted fg `#57534E` on bg | 7.30 | AAA |
| Foreground on background (both modes) | 16.74 | AAA |
| Dark-mode primary `#7CA9D8` on card `#292524` | 6.16 | AA |

**Color format:** the client is Tailwind v4 — every value ships as `oklch()` in
`client/src/app/[locale]/globals.css`. The hex above is the authoring reference; convert, do
not mix formats.

### Typography

- **Display font:** Space Grotesk — headings, the wordmark, empty-state titles
- **Body / UI font:** IBM Plex Sans — everything else
- **Mono:** IBM Plex Mono — OTP, client ID/secret, ticket IDs, IP addresses (same superfamily
  as the body face, so it is not a third voice)
- **Mood:** engineered, institutional, credential-grade — not friendly-SaaS

Both families are self-hosted through `next/font/google`, never a runtime
`@import url(fonts.googleapis.com)` — that is a render-blocking third-party request and the
project already routes fonts through `next/font`.

Type scale stays 1.25 (12 · 14 · 16 · 20 · 25 · 31 · 39 · 49 px). Weight ladder: 400 body /
500 label+button / 700 heading. Display face carries headings only; never set body copy in
Space Grotesk.

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

In dark mode elevation comes from a **lighter surface**, not a heavier shadow.

---

## Component Specs

Heights follow the project's unified control scale — 36 / 40 / 48 (`h-9` / `h-10` / `h-12`),
set in `BUTTON_SIZE_CLASSES`. Padding below is the visual spec; the height token wins.

### Buttons

```css
/* Primary — the page's one main action */
.btn-primary {
  background: var(--button-primary-bg);
  color: var(--button-primary-fg);
  padding: 0 16px;
  border-radius: 8px;
  font-weight: 500;
  transition: background-color 150ms ease;
  cursor: pointer;
}
.btn-primary:hover { background: var(--prussian-500); }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:focus-visible { box-shadow: 0 0 0 2px var(--input-focus-keyline); }

/* CTA — brass, ink label. Never white label on brass. */
.btn-cta {
  background: var(--button-cta-bg);
  color: var(--button-cta-fg);
  border-radius: 8px;
  font-weight: 500;
}

/* Secondary — outline, no fill */
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-weight: 500;
}
```

Six states are mandatory on every button: default · hover (no size change) · active
`scale(0.98)` · focus-visible keyline · disabled 40–50% opacity + `cursor: not-allowed` ·
loading (spinner replaces the label, **width unchanged**).

### Cards

```css
.card {
  background: var(--card-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 150ms ease, transform 150ms ease;
}
/* hover only when the card is actually clickable */
.card--interactive:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  cursor: pointer;
}
/* selected app tile — the signature keyline */
.card--selected { border-left: 2px solid var(--keyline); }
```

### Inputs

```css
.input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 150ms ease;
}
.input:focus-visible {
  border-color: var(--input-focus-keyline);
  outline: none;
  box-shadow: 0 0 0 2px var(--input-focus-keyline);
}
```

Label above the input, always. Placeholder never replaces a label. Validate on `blur`. The
error sits under its own field and says how to fix it.

### Modals

```css
.modal-overlay {
  background: rgba(28, 25, 23, 0.6);   /* warm ink, not pure black */
  backdrop-filter: blur(4px);
}
.modal {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
  overscroll-behavior: contain;
}
```

Destructive action on the left, safe action on the right.

---

## Style Guidelines

**Style:** Engineered flat — depth from surface, not blur *(overrides step 1's Glassmorphism)*

**Keywords:** warm neutral, 1px keylines, engineered, institutional, calm chrome, one metallic accent

**Key Effects:** hairline borders; elevation by surface lightness; the 2px brass keyline for
active boundaries; **backdrop blur only on the sticky header**

### Page Pattern

**Pattern Name:** App shell *(overrides step 1's "Hero + Features + CTA")*

- **Section order:** `AppHeader → PageShell → PageHeader → PageToolbar → PageContent`
- **Primary action:** one per section, in `PageHeader`; list pages put search left and the
  filter popover right in `PageToolbar`
- **Auth pages** are the one centred layout: single card, one column, submit full-width on mobile

---

## Motion

Framer Motion only — **do not install GSAP**, even when a motion tier suggests a GSAP preset.
Animate `transform` and `opacity` only. micro 100–150ms · small 150–250ms · medium 250–350ms ·
large 300–500ms, **hard ceiling 500ms**. `prefers-reduced-motion` always respected.

## Icons

**Lucide only.** Never emoji, never a second icon set. Sizes: 16 inline-sm · 20 inline-body ·
24 standalone · 32 feature · 48 empty-state. Icon-only buttons require `aria-label`.

---

## Anti-Patterns (Do NOT Use)

- ❌ Excessive animation
- ❌ Dark mode by default
- ❌ White text on brass (3.61:1) — ink label only
- ❌ Brass as body text (3.46:1) — fill and keyline only
- ❌ Backdrop blur anywhere but the sticky header
- ❌ Body copy set in the display face

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Lucide)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from the Lucide set
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
- [ ] Touch target ≥44×44 (pad the hit area; a 36px control is allowed only if its hit area reaches 44)
