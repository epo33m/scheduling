---
kind: build_system
name: Bun + Turborepo Monorepo Build System
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - turbo.json
    - .github/workflows/ci.yml
    - api/package.json
    - web/package.json
    - api/tsconfig.build.json
    - api/prisma/schema/schema.prisma
    - api/prisma/seed.ts
    - supabase/config.toml
---

## Build System Overview

The Kyne shift-scheduling project is a Bun-based Turborepo monorepo with two application workspaces (`web` — Next.js PWA, `api` — NestJS service) plus shared packages under `packages/`. All orchestration flows through the root `package.json` scripts and `turbo.json`, with CI running on GitHub Actions.

## Toolchain

- **Package manager**: Bun 1.4.3 (pinned via `packageManager: "bun@1.4.3"` in root `package.json`; lockfile `bun.lock`).
- **Monorepo orchestrator**: Turborepo 2.x (`turbo run ...`), configured in `turbo.json`.
- **TypeScript**: v6 across all workspaces, sharing `tsconfig.base.json` at the repo root.
- **Formatting**: Prettier 3.x invoked via `bun run format` / `format:check` at the workspace root; `.prettierrc` and `.prettierignore` live at the repo root.
- **Database tooling**: Prisma 7.10.0 inside `api/`, with migrations under `api/prisma/migrations/` and seed script `api/prisma/seed.ts`.
- **CI runtime**: GitHub Actions on `ubuntu-latest`, using `oven-sh/setup-bun@v2` to pin Bun 1.4.3.

## Workspace Layout

Root `package.json` declares:
```json
"workspaces": ["web", "api", "packages/*"]
```

Top-level scripts delegate to Turborepo:
- `dev` → `turbo run dev`
- `build` → `turbo run build`
- `start` → `turbo run start`
- `typecheck` → `turbo run typecheck`
- `test` → `turbo run test`
- `test:api` → `turbo run test:api`
- `db:*` commands are proxied into the `api` workspace (`bun run --cwd api db:...` or `turbo run db:seed`).

Each workspace defines its own scripts:
- `api/package.json`: Nest CLI (`nest build`, `nest start --watch`), Vitest unit tests, Jest API integration tests (`jest --config test/jest-api.json`), Prisma commands (`prisma generate`, `prisma migrate deploy`, `prisma db seed`).
- `web/package.json`: Next.js (`next build`, `next dev --port 3000`, `next start --port 3000`), Vitest for client-side tests.

## Task Graph & Caching (turbo.json)

Key task definitions:

| Task | Dependencies | Cache behavior | Notes |
|---|---|---|---|
| `build` | `^build` (all deps built first) | Cached; outputs `.next/**` (excluding cache dir) and `dist/**` | Next.js app shell + Nest compiled JS |
| `dev` | `db:generate` | Not cached, persistent | Hot-reload mode |
| `start` | `build` | Not cached, persistent | Production server entry |
| `typecheck` | `^build`, `db:generate` | Cached | `tsc --noEmit` per workspace |
| `test` | `^build`, `db:generate` | Cached | Unit tests |
| `test:api` | `^build`, `db:generate` | Not cached | Integration tests against real HTTP stack |
| `db:generate` | none | Not cached | Prisma codegen to `src/generated/**` |
| `db:seed` | `^build`, `db:generate` | Not cached | Seeds DB |

Environment propagation:
- `globalPassThroughEnv`: `DATABASE_URL`, `DIRECT_URL` (passed from host env).
- `globalEnv`: `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `API_URL` (must be set explicitly by the caller).

## CI Pipeline (.github/workflows/ci.yml)

Triggers on push to `main` and on any pull request. The single job runs these steps in order:

1. Checkout.
2. Install Bun 1.4.3 via `oven-sh/setup-bun@v2`.
3. `bun install --frozen-lockfile` — enforces exact lockfile contents.
4. `bun run db:generate` — regenerates Prisma client.
5. `bun run typecheck` — full TS type check across workspaces.
6. `bun run test` — unit tests.
7. `bun run test:api` — API integration tests.
8. `bun run build` — full production build, with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` injected from GitHub repository variables (comment explains that Next.js evaluates pages during build to determine static vs dynamic routes).

No Dockerfile, no Makefile, no release/publish step exists in this repository snapshot. There is no cross-compilation configuration.

## Database Lifecycle

- Schema lives in `api/prisma/schema/` (split files: `employee.prisma`, `off_request.prisma`, `schedule_week.prisma`, `schema.prisma`, `shift_request.prisma`, `shift_type.prisma`) with a `prisma.config.ts` at `api/`.
- Migrations are timestamped directories under `api/prisma/migrations/` (e.g. `20261108120000_init`, `20261108120100_hardening`, `20261109000000_request_flow`, `20261109000100_request_flow_hardening`) plus `migration_lock.toml`.
- Seed data is in `api/prisma/seed.ts`.
- Supabase local dev is driven by root scripts `db:start` / `db:stop` invoking the Supabase CLI; `supabase/config.toml` configures the local instance.

## Shared Packages

`packages/types` and `packages/validators` are workspace dependencies referenced as `*` from both `web` and `api` (e.g. `"@repo/types": "*"`, `"@repo/validators": "*"`), enabling cross-workspace TypeScript sharing without publishing.

## Conventions Observed

- All top-level developer workflows go through `bun run <script>` at the repo root; there are no direct calls to `nest`, `next`, or `prisma` in CI.
- Lockfile integrity is enforced in CI via `--frozen-lockfile`.
- Prisma code generation (`db:generate`) is a prerequisite of every build, test, and typecheck task via Turborepo's `dependsOn` graph — it cannot be skipped.
- Tests are split by concern: Vitest for unit tests (`*.spec.ts` co-located with source), Jest for API integration tests (`test/*.api-spec.ts` with `test/jest-api.json`).
- Environment variables needed by downstream tasks are declared centrally in `turbo.json`'s `globalEnv`; callers must supply them explicitly rather than relying on host environment.
- Version numbers in workspace `package.json` files are all `0.0.0` and marked `private: true` — no npm publish flow is present.