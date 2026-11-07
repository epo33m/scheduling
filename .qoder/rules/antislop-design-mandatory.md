---
trigger: always_on
---

# Antislop + DESIGN.md Are Mandatory

These rules are NON-NEGOTIABLE for any work that touches a user-facing surface, user-visible text, or code comments. They combine two systems: **antislop** (process filter) and **DESIGN.md** (the Apple-derived visual language at the repo root) as the single source of truth for how things should look and read.

## When the antislop skills MUST be loaded

1. **Any UI work** — building, editing, styling, or reviewing interfaces, pages, components, layouts — load the `antislop` core **plus** the matching specializations before writing code:
   - `antislop-ui` for color, layout, components, motion, performance
   - `antislop-layoutmobile` for responsive reflow and tap targets
2. **Any user-facing prose** — headlines, copy, CTAs, empty states, error messages — load `antislop` + `antislop-copywriting`.
3. **Code comments in user-visible surfaces / generated code** — load `antislop-code` before touching comments.
4. **Accessibility-sensitive work** — forms, focus, contrast, keyboard flows — load `antislop-human`; use its `contrast-check.py` to verify ratios instead of eyeballing them.

The core's "Two Usage Modes" default (ask during/after) is overridden here: **mode = during** for this repo. Apply the gates while working, not as an after-the-fact pass.

## DESIGN.md is the only design system

5. **Every visual decision comes from `DESIGN.md`** — tokens (colors, typography, spacing, radius, elevation), component grammar, and the Do's/Don'ts sections. No ad-hoc styling, no invented palettes, no third design language.
6. Hard constraints lifted verbatim from `DESIGN.md`:
   - Single interactive accent: Action Blue `#0066cc` (focus `#0071e3`, on-dark link `#2997ff`). No second brand color.
   - SF Pro Display/Text with negative tracking at display sizes; system-ui fallbacks only.
   - Zero decorative gradients; elevation = exactly one product drop-shadow (`rgba(0,0,0,0.22) 3px 5px 30px`), never on chrome.
   - Section rhythm via alternating light (white / `#f5f5f7`) and near-black tiles — the color change is the divider.
7. **Resolve a DESIGN.md × antislop conflict in this order**: DESIGN.md tokens win on concrete visual values; antislop R-XX rules win on process and AI-slop patterns (FORBIDDEN clichés like always-3-step "How It Works", badge-highlighted middle pricing tier). Both must be satisfied; if a request cannot satisfy both, surface the conflict instead of silently breaking one.

## Prohibited

- ❌ Shipping UI/prose/comments without loading the matching antislop skill(s) first.
- ❌ Introducing colors, fonts, shadows, radii, or gradients not defined in `DESIGN.md`.
- ❌ Treating "the task didn't mention design" as an escape hatch — any change with visual or textual output triggers these rules.
