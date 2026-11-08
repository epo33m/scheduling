---
kind: build_system
name: Turborepo Monorepo Build System (Bun + Next.js/NestJS)
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - turbo.json
    - .github/workflows/ci.yml
    - api/package.json
    - web/package.json
    - supabase/config.toml
---

## Overview

The project is a TypeScript monorepo built on **Bun** workspaces with **Turbo** as the task runner and cache layer. There are two application packages (`web` — Next.js 16 / React 19, `api` — NestJS 11) plus shared workspace packages under `packages/`. Database tooling uses Prisma (schema in `api/prisma/schema`) and Supabase CLI for local Postgres.

## Entrypoints and Task Graph

- Root `package.json` declares `workspaces: ["web", "api", "packages/*"]`, pins `packageManager: "bun@1.4.3"`, and exposes top-level scripts that delegate to Turbo:
  - `dev`, `build`, `start`, `typecheck`, `test`, `test:api`, `db:generate`, `db:migrate`, `db:seed`, `format`, `format:check`.
- `turbo.json` defines the canonical task graph:
  - `build` depends on `^build` (topological dependency order) and emits `.next/**` and `dist/**`.
  - `db:generate` writes `src/generated/**` and is uncached.
  - `db:seed` depends on `^build` and `db:generate`, uncached.
  - `typecheck` depends on `^build` and `db:generate`.
  - `dev` and `start` are marked `persistent: true`; `dev` additionally requires `db:generate`.
  - `test` depends on `^build` and `db:generate`; `test:api` adds `cache: false`.
  - Global env pass-through: `DATABASE_URL`, `DIRECT_URL`.

Per-package scripts (from each `package.json`):
- `api`: `nest start --watch`, `nest build`, `node dist/main.js`, `tsc --noEmit`, `vitest run`, `jest --config test/jest-api.json`, `prisma generate/migrate deploy/db seed`.
- `web`: `next dev --port 3000`, `next build`, `next start --port 3000`, `tsc --noEmit`, `vitest run --passWithNoTests`.

## CI Pipeline

`.github/workflows/ci.yml` runs on `push` to `main` and all `pull_request`s on `ubuntu-latest`:
1. Checkout.
2. Install Bun 1.4.3 via `oven-sh/setup-bun@v2`.
3. `bun install --frozen-lockfile` (lockfile pinned).
4. `bun run db:generate` → `bun run typecheck` → `bun run test` → `bun run test:api` → `bun run build`.

No Dockerfile or image build exists in the repo; deployment artifacts are the Next.js `.next` output and NestJS `dist/` directory produced by Turbo.

## Local Dev Stack

- `supabase/config.toml` configures a self-contained local Supabase stack with shifted ports (API 54421, DB 54422, shadow 54420, Studio 54423, SMTP 54424, analytics 54427) so it can coexist with another ERP Supabase instance on the same host.
- Root scripts `db:start` / `db:stop` wrap `supabase start` / `supabase stop`.
- The database schema lives in `api/prisma/schema/*.prisma` with migrations under `api/prisma/migrations/` and a seed script at `api/prisma/seed.ts`.

## Conventions Observed

- All workspace packages share TypeScript ^6.0.3 and are type-checked via `tsc --noEmit`.
- Tests use Vitest for unit tests and Jest (with ts-jest) for API integration tests; both are wired through Turbo tasks.
- Dependency resolution is lockfile-only: CI enforces `--frozen-lockfile`.
- Environment variables needed by downstream tasks are whitelisted in `turbo.json` via `globalPassThroughEnv`.
- Generated code paths (`src/generated/**`, `.next/**`, `dist/**`) are declared as Turbo outputs so caching respects them.
- Port numbers for the local Supabase services are deliberately offset from defaults (see comments in `supabase/config.toml`).

## Rules Enforced by Tooling

- Lockfile must not drift: `bun install --frozen-lockfile` in CI.
- Type checking passes before tests: `typecheck` task depends on `^build` and `db:generate`.
- Seed/generate steps cannot be cached: `db:generate` and `db:seed` have `cache: false` in `turbo.json`.
- Integration tests bypass cache: `test:api` has `cache: false`.
- Only `DATABASE_URL` and `DIRECT_URL` are passed through to child tasks by default (enforced by `globalPassThroughEnv`).