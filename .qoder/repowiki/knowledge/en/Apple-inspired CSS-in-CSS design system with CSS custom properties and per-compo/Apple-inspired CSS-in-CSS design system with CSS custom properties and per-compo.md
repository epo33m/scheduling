---
kind: frontend_style
name: Apple-inspired CSS-in-CSS design system with CSS custom properties and per-component modules
category: frontend_style
scope:
    - '**'
source_files:
    - DESIGN.md
    - web/app/globals.css
    - web/app/login/login.module.css
    - web/app/manager/dashboard/dashboard.module.css
    - web/app/staff/request/request.module.css
    - web/app/manager/staff/staff.module.css
    - web/package.json
---

## What system/approach is used

The web frontend (`web/`) is a Next.js 16 + React 19 application styled entirely in plain CSS — no Tailwind, no SCSS, no component library, no CSS-in-JS runtime. Visual consistency comes from:

- A single global stylesheet `web/app/globals.css` that declares the design tokens as CSS custom properties on `:root` (colors, typography, spacing, border radius) and defines shared base styles plus two reusable button primitives (`button-primary`, `button-secondary`).
- Per-page/component `.module.css` files (e.g. `login.module.css`, `dashboard.module.css`, `staff.module.css`, `request.module.css`) scoped to their components via Next's CSS Modules.
- A human-authored design spec at `DESIGN.md` describing an Apple-inspired visual language (Action Blue `#0066cc`, SF Pro Display/Text, pill CTAs, parchment surfaces, negative letter-spacing) which the CSS custom properties mirror token-for-token.

There is no build-time style toolchain beyond what Next provides; `web/package.json` lists only `next`, `react`, `react-dom`, Supabase client packages, TypeScript, and Vitest for tests.

## Key files and packages

- `DESIGN.md` — The authoritative design spec (YAML frontmatter + prose). Defines colors, typography scale, spacing, rounded-radius scale, component specs, Do/Don't rules, breakpoints, and touch-target minimums.
- `web/app/globals.css` — Root-level CSS custom properties and shared primitives. Declares `--color-*`, `--font-*`, `--text-*`, `--spacing-*`, `--rounded-*` variables and the `.button-primary` / `.button-secondary` classes.
- `web/app/login/login.module.css` — Login page layout and typography tokens applied via CSS variables.
- `web/app/manager/dashboard/dashboard.module.css` — Manager dashboard card/list layout, referencing `DESIGN.md` and antislop-layoutmobile R-03 in comments.
- `web/app/staff/request/request.module.css` — Staff request screen styling.
- `web/app/manager/staff/staff.module.css` — Staff management screen styling.
- `web/package.json` — Confirms no CSS framework dependency; Next.js handles CSS Modules natively.

## Architecture and conventions

**Design tokens via CSS custom properties.** All values live in `globals.css` under `:root`. Comments explicitly tie each variable back to `DESIGN.md` sections (e.g. `/* DESIGN.md Colors: the single interactive accent, never a second one */`, `/* DESIGN.md Typography › Hierarchy: {typography.display-lg} */`, `/* DESIGN.md Layout › Spacing System */`, `/* DESIGN.md Shapes › Border Radius */`). This makes the CSS file both the implementation and a living mirror of the spec.

**Typography hierarchy is tokenized, not ad-hoc.** The spec defines `hero-display`, `display-lg`, `display-md`, `lead`, `tagline`, `body-strong`, `body`, `caption`, `caption-strong`, etc., and `globals.css` exposes them as paired size/weight/line-height/tracking variables (e.g. `--text-display-lg-size`, `--text-display-lg-weight`, `--text-display-lg-line-height`, `--text-display-lg-tracking`). Component CSS applies these variables rather than hardcoding font sizes.

**Spacing and radius are also tokenized.** `--spacing-xs/sm/md/lg/xl` (8/12/16/24/32px) and `--rounded-lg` (18px), `--rounded-pill` (9999px), `--rounded-sm` (8px) are the only radii used in the codebase.

**Color discipline: one accent.** `--color-primary` (`#0066cc`) is the sole interactive brand color; `--color-primary-focus` (`#0071e3`) is reserved for focus rings. Surfaces use `--color-canvas` (white), `--color-canvas-parchment` (`#f5f5f7`), `--color-hairline` (`#e0e0e0`), and `--color-ink` (`#1d1d1f`). No secondary brand color exists in the CSS.

**Shared primitives in globals.css.** Two button classes (`button-primary`, `button-secondary`) encapsulate the full grammar: pill radius, 44px min-height, 11×22px padding, press state `transform: scale(0.95)`, disabled surface fallback, and focus ring via the global `:focus-visible` rule.

**Per-component CSS Modules.** Each route/page gets its own `.module.css` file with class names like `.page`, `.panel`, `.wordmark`, `.notice`, `.windowBar`, `.requestCard`, `.decideRow`, `.bentrok`, `.empty`, `.error`, `.locked`. These are imported by their sibling `.tsx` pages via Next's CSS Modules convention.

**Responsive strategy is mobile-first and fluid.** There are no media queries in the observed CSS. Instead, responsiveness is achieved through fluid layouts: centered single-column stacks with `max-width` caps (e.g. dashboard `.page` has `max-width: 760px`), `flex-wrap` with `gap`, `min-height: 100dvh`, and percentage-based widths. The manager dashboard comment explicitly states it must "act on a phone between shifts" and uses a "single centered column with a fluid cap, never a fixed grid or a wide table" (citing antislop-layoutmobile R-03).

**Accessibility is baked into the base layer.** `:focus-visible` is defined globally with a 2px solid `--color-primary-focus` outline and 3px offset. The `bentrok` (conflict) label is bold text placed inline after request text so status is readable without color alone (citing antislop-human: "colour-only feedback is not a status"). Non-happy states (`.empty`, `.error`, `.locked`) each get their own distinct surface (antislop-human R-27).

**Comments document provenance.** Every meaningful style block carries a comment linking back to `DESIGN.md` or an antislop skill rule, making the CSS self-documenting against the spec.

## Conventions and constraints

- **No CSS frameworks.** The project does not import Tailwind, Bootstrap, Material UI, or any other UI library. Style is hand-written CSS Modules.
- **All design values go through CSS custom properties.** Hardcoded hex values for colors, sizes, and spacing do not appear in component CSS; they are consumed via `var(--color-*)`, `var(--text-*)`, `var(--spacing-*)`, `var(--rounded-*)`.
- **Single accent color rule.** `DESIGN.md` states Action Blue (`#0066cc`) is "the single brand-level interactive color... non-negotiable," and the CSS enforces this by exposing only `--color-primary` as the interactive color.
- **Pill radius is the action signal.** `--rounded-pill` (9999px) is used exclusively for primary CTAs, secondary ghost buttons, and search inputs — the same grammar across the app.
- **Press state is uniform.** Both button primitives use `transform: scale(0.95)` on `:active:not(:disabled)`; `DESIGN.md` calls this "the system-wide micro-interaction."
- **Body copy is 17px, not 16px.** The spec and CSS both set `--text-body-size: 17px` with line-height 1.47 and tracking -0.374px, deliberately breaking the SaaS convention noted in `DESIGN.md`.
- **Touch targets ≥ 44px.** Button primitives enforce `min-height: 44px`; `DESIGN.md` mandates 44×44px minimum touch targets.
- **No decorative shadows or gradients.** `DESIGN.md` forbids decorative gradients and reserves the single product shadow for imagery only; the CSS reflects this by using hairline borders (`--color-hairline`) and surface-color changes for elevation.
- **Mobile-first fluid layout.** Components avoid fixed grids and wide tables; the manager dashboard comment documents this as a requirement from antislop-layoutmobile R-03.
- **Status is text-first, not color-only.** The `bentrok` label is bold text, not a colored badge, per antislop-human guidance.
- **CSS Modules scoping.** Styles are colocated with components in `.module.css` files and imported by their respective `.tsx` pages.