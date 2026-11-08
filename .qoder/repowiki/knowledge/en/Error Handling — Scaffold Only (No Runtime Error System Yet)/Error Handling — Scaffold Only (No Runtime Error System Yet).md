---
kind: error_handling
name: Error Handling — Scaffold Only (No Runtime Error System Yet)
category: error_handling
scope:
    - '**'
source_files:
    - api/src/main.ts
    - api/src/app.module.ts
    - api/src/health/health.controller.ts
    - api/src/env.ts
    - packages/types/src/index.ts
    - packages/validators/src/index.ts
    - .agents/skills/antislop-human/SKILL.md
    - .agents/skills/antislop-human/references/A11Y-PATTERNS.md
---

## What system/approach is used

This repository is a **pre-implementation scaffold** for the Kyne shift scheduling application. At present it contains:

- A NestJS API (`api/`) that bootstraps an `AppModule` importing only `PrismaModule` and `HealthModule`, and exposes a single `/health` GET endpoint returning `{ status: 'ok' }`.
- Two shared packages under `packages/`: `types` (shared TypeScript types for employee/shift) and `validators` (validation helpers).
- An agent-skill registry under `.agents/skills/` and `agent/skills/` containing Markdown-based skills consumed by AI-assisted development.

There is **no runtime error-handling system implemented yet**: no custom error classes, no global exception filter, no middleware that catches errors, no error codes, no `errors/` directory, and no use of `try/catch` or `throw` in any source file. The only HTTP response surface is the health check controller, which never throws.

The closest thing to an error strategy is documentation in the accessibility skill references:

- `.agents/skills/antislop-human/references/A11Y-PATTERNS.md` has an "Error handling" section instructing that form errors be announced to screen readers and focus moved to the first invalid field on submit, using an `#error-summary` element with `role="alert"` and per-field `aria-invalid` / `aria-describedby` attributes.
- `.agents/skills/antislop-human/SKILL.md` states as a rule (R-27): every data view must have explicit empty, loading, and error states, each announced or visible, not communicated by color alone.

These are **frontend accessibility guidelines for future UI code**, not a backend error model.

## Key files and packages

- `api/src/main.ts` — NestJS bootstrap; no global error configuration.
- `api/src/app.module.ts` — Root module; imports only Prisma and Health modules.
- `api/src/health/health.controller.ts` — Only controller; returns a success-only shape.
- `api/src/env.ts` — Loads `.env` via `dotenv`; no validation or error path when keys are missing.
- `packages/types/src/` — Shared domain types only (employee, shift); no error types.
- `packages/validators/src/` — Validation helpers only; no thrown exceptions surfaced here.
- `.agents/skills/antislop-human/references/A11Y-PATTERNS.md` — Accessibility-oriented error presentation guidance.
- `.agents/skills/antislop-human/SKILL.md` — Rule R-27 requiring empty/loading/error states on data views.

## Architecture and conventions

As a scaffold, there is no established convention to document. Observed patterns are minimal:

- The NestJS app uses the default NestJS error pipeline (global filters, interceptors, pipes are not configured). Any unhandled exception would fall through to NestJS's built-in JSON error response.
- Environment variables are loaded once at import time via `dotenv` in `api/src/env.ts` with no validation or typed access; missing keys will surface as `undefined` at runtime rather than at startup.
- The only documented error-related convention is frontend-facing: accessibility skill references prescribe how error messages should be presented to assistive technology (ARIA alerts, error summaries, per-field `aria-invalid`).

## Conventions and constraints

- **No backend error types or sentinel errors exist yet.** There are no `class *Error extends Error` definitions, no error-code constants, and no `errors/` package.
- **No global exception filter or middleware is registered.** `main.ts` calls `NestFactory.create(AppModule)` and `app.listen()` without attaching any global filters or interceptors.
- **Frontend error-state guidance is documented but not implemented:**
  - Rule R-27 in `.agents/skills/antislop-human/SKILL.md` requires every data view to expose empty, loading, and error states that are explicitly announced or visible.
  - `.agents/skills/antislop-human/references/A11Y-PATTERNS.md` prescribes an `#error-summary` element with `role="alert"`, per-field `aria-invalid` and `aria-describedby`, and programmatic focus management on submit.
- **Environment loading has no validation contract.** `api/src/env.ts` simply calls `config({ path: ['.env', '../.env'] })` and does not assert required keys or throw on absence.

Because this is a scaffold with no business logic yet, the error_handling category is applicable only in the sense that the absence of a system is itself the current state; there is no established pattern to enforce.