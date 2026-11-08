---
kind: frontend_style
name: Apple-Inspired Design System with CSS Custom Properties (No Framework)
category: frontend_style
scope:
    - '**'
source_files:
    - DESIGN.md
    - web/app/globals.css
    - web/app/layout.tsx
    - web/package.json
    - web/next.config.ts
---

## What system/approach is used

The `web/` Next.js app uses a **minimal, framework-free styling approach**: plain CSS custom properties (CSS variables) defined in `web/app/globals.css`, with no CSS-in-JS library, no Tailwind, no component library, and no build-time style processor. The only dependencies are `next` and `react` — there is no `tailwindcss`, `postcss`, `sass`, or UI kit in `web/package.json`. The design language itself is documented as an Apple-inspired system in the root `DESIGN.md`, which defines colors, typography, spacing, rounded corners, components, responsive breakpoints, and do/don't rules.

## Key files and packages

- `DESIGN.md` — Authoritative design spec: YAML token definitions (`colors.*`, `typography.*`, `spacing.*`, `rounded.*`, `components.*`) plus prose describing the Apple photography-first aesthetic, color palette, typography hierarchy, layout rhythm, elevation, shapes, components, responsive breakpoints, and iteration guide.
- `web/app/globals.css` — Runtime CSS tokens mapped from the spec: `--color-canvas`, `--color-ink`, `--color-canvas-parchment`, `--font-display`, `--font-text`, `--text-display-lg-*`, `--text-body-*`, `--spacing-xs`, `--spacing-lg`; global reset (`box-sizing: border-box`, zero margins on html/body); body defaults using `var(--color-canvas)`, `var(--color-ink)`, `var(--font-text)`.
- `web/app/layout.tsx` — Root Next.js layout that imports `globals.css` and sets `<html lang="id">`.
- `web/next.config.ts` — Empty Next config; no style-related plugins configured.
- `web/package.json` — Confirms absence of any CSS tooling beyond Next's built-in CSS support.

## Architecture and conventions

1. **Design tokens live in one spec file.** `DESIGN.md` is the single source of truth for every visual decision: hex values, font stacks, type scale, spacing scale, radius scale, and component recipes. It is written as YAML frontmatter followed by detailed prose.
2. **CSS custom properties mirror the spec.** `globals.css` declares a small subset of tokens currently needed at runtime (`canvas`, `ink`, `parchment`, display/body type scales, xs/lg spacing). Comments in the CSS explicitly reference the spec sections (e.g. `/* DESIGN.md Typography › Hierarchy: {typography.display-lg} */`).
3. **No class-based CSS methodology.** There are no utility classes, BEM names, or component-scoped styles yet — the app currently renders only a Next.js default page. Styling is expected to be added via inline `style` attributes or new CSS selectors that consume the `--*` variables.
4. **Typography follows the Apple ladder.** Headlines use SF Pro Display with negative letter-spacing; body uses SF Pro Text at 17px / 400 / 1.47 / -0.374px tracking. Weight 500 is deliberately absent; the ladder is 300/400/600/700.
5. **Color model is single-accent.** Action Blue (`#0066cc`) is the only interactive brand color; surfaces alternate between white (`#ffffff`), parchment (`#f5f5f7`), and near-black tiles (`#272729` / `#2a2a2c` / `#252527`). No decorative gradients are defined.
6. **Spacing is 8px-based.** Tokens go 4/8/12/17/24/32/48/80px; structural layout snaps to these values.
7. **Rounded grammar:** `none` (0px) for full-bleed tiles, `sm` (8px) for compact utilities, `md` (11px) for pearl buttons, `lg` (18px) for cards, `pill` (9999px) for primary CTAs and chips, `full` for circular controls.
8. **Elevation is singular.** Exactly one drop-shadow (`rgba(0,0,0,0.22) 3px 5px 30px`) is reserved for product imagery resting on a surface; cards, buttons, and text get no shadows.
9. **Responsive strategy is breakpoint-driven.** Breakpoints are documented in `DESIGN.md`: ≤419px, 420–640px, 641–735px, 736–833px, 834–1023px, 1024–1068px, 1069–1440px, ≥1441px, with content locked at 1440px max width.

## Conventions and constraints

- **Token usage convention:** CSS comments in `globals.css` cross-reference `DESIGN.md` sections (e.g. `/* DESIGN.md Typography › Hierarchy: {typography.body} */`), establishing that new tokens should be added both to the spec and mirrored as CSS custom properties.
- **No second accent color:** `DESIGN.md` states "Don't introduce a second accent color; every 'click me' signal is `{colors.primary}`" — this is a documented constraint for future UI work.
- **Body copy must be 17px, not 16px:** The spec calls out "Apple breaks the SaaS convention and runs paragraph text at 17px" and instructs "Don't tighten line-height below 1.47 for body copy."
- **Weight 500 is excluded:** The spec says "Weight 500 is deliberately absent" and "Don't set body copy at weight 500."
- **Shadows only on product imagery:** "Don't add shadows to cards, buttons, or text — shadow is reserved for product imagery."
- **Full-bleed tiles are unrounded:** "Don't round full-bleed tiles — tiles are rectangular and edge-to-edge."
- **No gradients as decorative backgrounds:** The spec explicitly notes "no gradient-based design tokens" and "Don't use gradients as decorative backgrounds."
- **Active/pressed state is uniform:** Buttons use `transform: scale(0.95)` as the system-wide micro-interaction.
- **Touch targets minimum 44×44px** per the documented touch-target rule.
- **Language attribute:** Root layout sets `<html lang="id">`, indicating Indonesian as the application locale.