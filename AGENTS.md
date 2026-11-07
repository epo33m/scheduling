# AGENTS.md

## Agent skills

### Issue tracker

Issues are tracked as GitHub Issues on `epo33m/scheduling` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Graphify — MANDATORY

These rules are strict and non-negotiable for every agent working in this repo:

1. **Always use graphify first** for any question about this codebase — architecture, file/symbol relationships, "where/how" lookups, impact analysis. Direct grep/reads are a fallback only after a graphify query has run.
2. **Build the graph before using it**: if `graphify-out/` is missing, run `/graphify .` (CLI: `graphify .`) and let it complete before answering.
3. **Query, don't guess**: `graphify query "<question>"` (`--dfs` to trace a specific path). Cite graphify evidence (nodes/edges/communities) in answers; quote files only to confirm.
4. **Keep the graph fresh**: after significant code changes, run `graphify . --update` before the next query.

Full rule text: `.qoder/rules/graphify-mandatory.md`.

## Antislop + DESIGN.md — MANDATORY

Strict and non-negotiable for every agent working in this repo:

1. **Load antislop before shipping user-facing work**: `antislop` core + `antislop-ui`/`antislop-layoutmobile` for any UI, `antislop-copywriting` for any prose, `antislop-code` for comments, `antislop-human` (with its contrast checker) for a11y-sensitive work. Mode = **during** — gates apply while working, not after.
2. **`DESIGN.md` is the only design system**: all visual decisions come from its tokens (Action Blue `#0066cc` single accent, SF Pro typography, zero decorative gradients, one product drop-shadow, light/dark tile rhythm). No ad-hoc styling.
3. **Conflict order**: DESIGN.md wins on concrete visual values; antislop R-XX wins on process and AI-slop patterns. Both must be satisfied — surface conflicts, never silently break one.

Full rule text: `.qoder/rules/antislop-design-mandatory.md`.

## Ponytail — default-on overlay

Ponytail is a session-scoped minimizer, **default ON** for logic / bug-fix / refactor work — assume lazy mode from the first prompt, no `/ponytail` needed. It shrinks the diff; it never overrides the mandatory rules above. Say "stop ponytail" / "normal mode" to opt out. It is suspended automatically for UI/UX (see #2).

1. **Precedence when they conflict**: (1) graphify + antislop + DESIGN.md are non-negotiable → (2) whatever the user explicitly asked for → (3) everything else (internals, extras, abstractions, dependencies) ponytail minimizes. Be lazy about internals, never about user-facing quality, accessibility, security, or validation.
2. **Auto-OFF for UI/UX work**: the moment a task touches interface, layout, styling, components, or user-facing prose, ponytail is suspended for that work — antislop + DESIGN.md govern it. It resumes on its own for the next logic/bug-fix/refactor pass; no need to re-invoke `/ponytail`.
3. **Scope is not laziness**: ponytail must still run the graphify blast-radius query and finish every caller/test/fixture a change touches. It cuts speculative code, not required coverage.
