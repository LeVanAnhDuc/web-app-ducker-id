# App Store — Design System (STRICT — SuperDesign MUST obey)

> The ONLY visual source of truth for generated designs. Stack: Next.js 15 + React 19 + Tailwind CSS 4 + shadcn/ui + lucide-react. Mirrors `client/src/app/[locale]/globals.css`.
>
> ⛔ The generic look (indigo/slate/sky palette, Plus Jakarta Sans / any Google Font, `shadow-xl`, `rounded-2xl` everywhere) is WRONG. Do NOT produce it.
> ✅ Every design MUST be rendered in BOTH light AND dark, using the project's real dark tokens (see §1a).

---

## 0. MANDATORY BOILERPLATE — copy this `<head>` VERBATIM into every generated HTML

Colors are wired as CSS variables (`:root` = light, `.dark` = dark) so opacity utilities (`bg-primary/10`) AND dark mode both work. Do NOT change these values. Do NOT add Google Fonts.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            background: 'oklch(var(--background) / <alpha-value>)',
            foreground: 'oklch(var(--foreground) / <alpha-value>)',
            card: 'oklch(var(--card) / <alpha-value>)',
            'card-foreground': 'oklch(var(--card-foreground) / <alpha-value>)',
            popover: 'oklch(var(--popover) / <alpha-value>)',
            'popover-foreground': 'oklch(var(--popover-foreground) / <alpha-value>)',
            primary: 'oklch(var(--primary) / <alpha-value>)',
            'primary-foreground': 'oklch(var(--primary-foreground) / <alpha-value>)',
            secondary: 'oklch(var(--secondary) / <alpha-value>)',
            'secondary-foreground': 'oklch(var(--secondary-foreground) / <alpha-value>)',
            muted: 'oklch(var(--muted) / <alpha-value>)',
            'muted-foreground': 'oklch(var(--muted-foreground) / <alpha-value>)',
            accent: 'oklch(var(--accent) / <alpha-value>)',
            'accent-foreground': 'oklch(var(--accent-foreground) / <alpha-value>)',
            destructive: 'oklch(var(--destructive) / <alpha-value>)',
            border: 'oklch(var(--border) / <alpha-value>)',
            input: 'oklch(var(--input) / <alpha-value>)',
            'input-background': 'oklch(var(--input-background) / <alpha-value>)',
            ring: 'oklch(var(--ring) / <alpha-value>)',
            success: 'oklch(var(--success) / <alpha-value>)',
            warning: 'oklch(var(--warning) / <alpha-value>)',
            info: 'oklch(var(--info) / <alpha-value>)'
          },
          borderRadius: { sm: '0.375rem', md: '0.5rem', lg: '0.625rem', xl: '0.875rem' },
          boxShadow: {
            xs: '0 1px 2px oklch(0 0 0 / 0.05)',
            sm: '0 1px 2px oklch(0 0 0 / 0.05)',
            md: '0 4px 6px oklch(0 0 0 / 0.07)',
            lg: '0 10px 15px oklch(0 0 0 / 0.1)'
          },
          fontFamily: {
            sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
          }
        }
      }
    };
  </script>
  <style>
    :root {
      --background: 1 0 0;
      --foreground: 0.141 0.005 285.823;
      --card: 1 0 0;
      --card-foreground: 0.141 0.005 285.823;
      --popover: 1 0 0;
      --popover-foreground: 0.141 0.005 285.823;
      --primary: 0.141 0.005 285.823;
      --primary-foreground: 0.985 0 0;
      --secondary: 0.967 0.001 286.375;
      --secondary-foreground: 0.21 0.006 285.885;
      --muted: 0.967 0.001 286.375;
      --muted-foreground: 0.552 0.016 285.938;
      --accent: 0.967 0.001 286.375;
      --accent-foreground: 0.21 0.006 285.885;
      --destructive: 0.577 0.245 27.325;
      --border: 0.92 0.004 286.32;
      --input: 0.92 0.004 286.32;
      --input-background: 0.967 0.001 286.375;
      --ring: 0.141 0.005 285.823;
      --success: 0.6 0.15 150;
      --warning: 0.75 0.15 85;
      --info: 0.45 0.12 260;
    }
    .dark {
      --background: 0.141 0.005 285.823;
      --foreground: 0.985 0 0;
      --card: 0.21 0.006 285.885;
      --card-foreground: 0.985 0 0;
      --popover: 0.21 0.006 285.885;
      --popover-foreground: 0.985 0 0;
      --primary: 0.985 0 0;
      --primary-foreground: 0.141 0.005 285.823;
      --secondary: 0.274 0.006 286.033;
      --secondary-foreground: 0.985 0 0;
      --muted: 0.274 0.006 286.033;
      --muted-foreground: 0.705 0.015 286.067;
      --accent: 0.274 0.006 286.033;
      --accent-foreground: 0.985 0 0;
      --destructive: 0.704 0.191 22.216;
      --border: 0.38 0.006 286;
      --input: 0.45 0.006 286;
      --input-background: 0.19 0.006 286;
      --ring: 0.985 0 0;
      --success: 0.55 0.12 150;
      --warning: 0.75 0.15 85;
      --info: 0.55 0.12 260;
    }
    body { font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
  </style>
</head>
```

---

## 1a. BOTH themes — MANDATORY page structure

Every generated `<body>` MUST render the SAME design TWICE, stacked, so light and dark are reviewed together. Put a small label above each. Dark works simply by adding `class="dark"` on the section wrapper (the `.dark` CSS above re-scopes the variables to that subtree):

```html
<body class="bg-background text-foreground">
  <section class="bg-background text-foreground">
    <div class="px-6 py-3 text-xs font-medium text-muted-foreground">Light</div>
    <!-- design here -->
  </section>
  <section class="dark bg-background text-foreground">
    <div class="px-6 py-3 text-xs font-medium text-muted-foreground">Dark</div>
    <!-- EXACT same design here -->
  </section>
</body>
```

Both frames must be byte-identical in markup — only the wrapper `class="dark"` differs. Never hand-pick different colors for dark; let the tokens flip.

---

## 1b. HARD RULES (a design is REJECTED if it breaks any)

- **Both themes present** (§1a). Missing dark or light = reject.
- **Font**: system UI sans only (the `font-sans` stack). ❌ NEVER a Google Font `<link>` / Plus Jakarta / Inter.
- **Color**: ONLY the token classes above. ❌ NEVER Tailwind's `indigo/slate/sky/rose/violet/emerald/amber/gray/zinc/blue/*`.
  - Primary action = `bg-primary text-primary-foreground` (deep navy in light, near-white in dark — NEVER blue/indigo).
  - Icon tiles / brand tint = `bg-primary/10 text-primary`, ALL tiles identical (no rainbow).
  - Secondary text `text-muted-foreground` · surfaces `bg-card`/`bg-background`/`bg-popover` · hover `bg-accent` · borders `border-border` · fields `bg-input-background border-input`.
  - Search-match highlight = `bg-primary/10 text-primary rounded-sm px-0.5`.
- **Radius**: rows/popover items `rounded-md` (8px) · buttons/inputs `rounded-lg` (10px) · cards `rounded-xl` (14px). ❌ No `rounded-2xl+` on controls.
- **Shadow**: popovers = `shadow-md` ONLY. ❌ No `shadow-xl`, no extra `ring-1 ring-black/5`.
- **Icons**: iconify **`lucide:`** set only. 16px standard, 20px section-header, 12–14px inline.
- **Control height**: 36px `h-9` compact · 40px `h-10` default · 48px `h-12` large.

---

## 2. Typography tiers

| Tier | Classes |
| --- | --- |
| Page title (`h1`) | `text-2xl font-bold tracking-tight` |
| Section heading (`h2`) | `text-xl font-bold` |
| Card/section title (`h3`) | `text-base font-semibold` |
| App name in a row | `text-sm font-semibold` |
| Category / subtitle | `text-xs text-muted-foreground font-medium` |
| Body | `text-sm` |

## 3. Header (reproduce faithfully — see replica template)

Sticky, `h-16`, `border-b border-border`, `bg-card/80 backdrop-blur-sm`, `px-4 lg:px-6`. Left: logo tile `bg-primary text-primary-foreground rounded-lg size-8` (`lucide:layout-grid`) + `App Store` (`text-lg font-semibold`). Center: search input (§4). Right: ghost bell icon-button (`size-10 rounded-full`, hover `bg-accent`) with a `bg-destructive` unread dot, then avatar `size-9 rounded-full border border-border`.

## 4. Search input + popover (this feature)

- Input: relative wrapper `max-w-md`, `lucide:search` icon `text-muted-foreground` at `left-3`, input `h-10 w-full rounded-lg border border-input bg-input-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none transition`.
- Popover: below the input, ~8px gap, `w-full rounded-lg border border-border bg-popover shadow-md p-2`. NOT `rounded-xl`, NOT `shadow-xl`.
- Section label ("Recently used"): `flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground` + `lucide:history` (14px).
- App row: `group flex items-center justify-between gap-3 rounded-md p-2.5 hover:bg-accent cursor-pointer transition-colors`. Left: tile `size-10 rounded-xl bg-primary/10 text-primary font-semibold text-base` (initial / `lucide:` glyph, all identical tint). Middle: name `text-sm font-semibold text-foreground` + category `text-xs text-muted-foreground`. Right: `lucide:arrow-up-right` `text-muted-foreground opacity-0 group-hover:opacity-100`.
- Results state: replace the "Recently used" label with results; highlight matched substring with `bg-primary/10 text-primary rounded-sm px-0.5`; matches on name OR description. Optional footer `text-xs font-medium text-muted-foreground hover:text-foreground` = "View All".
- Empty state: centered muted `lucide:search`, `text-sm font-medium text-foreground` "No apps found", `text-xs text-muted-foreground` "Try a different keyword".

## 5. UX copy (EN, short, friendly-directive)

`Search apps...` · `Recently used` · `No apps found` + `Try a different keyword` · `Open` · `View All` · `Clear`.

## 6. Accessibility

Input `role="combobox"` `aria-expanded` `aria-controls` → listbox popover; rows `role="option"`. Announce result count (`aria-live="polite"`). Keyboard ↑/↓ move, Enter open, Esc close. Visible focus ring on every control (`focus:ring-2 focus:ring-ring/20`); never bare `outline:none`.
