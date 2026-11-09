---
kind: configuration_system
name: Environment-based Configuration with dotenv and Supabase TOML
category: configuration_system
scope:
    - '**'
source_files:
    - .env.example
    - api/src/env.ts
    - api/src/main.ts
    - web/next.config.ts
    - api/test/setup-env.ts
    - supabase/config.toml
    - package.json
---

## Approach

The project uses a minimal, file-and-environment-driven configuration strategy:

- **Application config**: plain `.env` files loaded at runtime via `dotenv`.
- **Supabase local stack config**: `supabase/config.toml` (TOML).
- **Prisma connection strings**: read from `DATABASE_URL` / `DIRECT_URL` env vars.
- **Next.js public config**: variables prefixed `NEXT_PUBLIC_` in `.env`/`.env.local`, inlined by Next at build time.
- **No schema validation or typed config loader** — values are consumed directly as strings from `process.env`.

There is no centralized config module, no feature-flag system, and no secrets manager integration beyond environment variables.

## Key Files

- `.env.example` — single source of truth for all env keys (`DATABASE_URL`, `DIRECT_URL`, `PORT`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `API_URL`).
- `api/src/env.ts` — loads `.env` then falls back to repo-root `.env` so an `api/.env` can override it.
- `api/src/main.ts` — bootstrap; reads `PORT` from `process.env` with default `3001`.
- `web/next.config.ts` — explicitly loads `.env.local` before `../.env` so per-package overrides win over the shared root file.
- `api/test/setup-env.ts` — pins `SUPABASE_URL` for Jest specs before `AppModule` imports.
- `supabase/config.toml` — full Supabase CLI configuration (ports shifted to `5442x` to coexist with another local Supabase instance).
- `package.json` scripts (`db:start`, `db:stop`, `db:migrate`, `db:seed`) drive the Supabase CLI against this config.

## Architecture & Conventions

### Layered `.env` loading

Both the API and the web package call `dotenv.config()` themselves rather than relying on a framework default:

- `api/src/env.ts` calls `config({ path: ['.env', '../.env'] })` — first match wins, so `api/.env` takes precedence over the repo-root `.env`.
- `web/next.config.ts` calls `config({ path: [path.resolve('.env.local'), path.resolve('../.env')] })` — `web/.env.local` wins over the shared root file.
- The comment in `api/src/env.ts` documents the rule: "One `.env` at the repo root, shared by the api runtime, Prisma and the seed. An `api/.env` can override it."

This means the effective precedence is:

1. Process environment (already set) — highest priority.
2. Per-package `.env` / `.env.local`.
3. Repo-root `.env`.

### Environment variable conventions

- Database URLs live in `DATABASE_URL` (pooled, used by NestJS/Prisma client) and `DIRECT_URL` (direct, used by Prisma migrations). Both point at the Supabase-local Postgres port `54422`.
- `SUPABASE_URL` is the Auth endpoint; the API verifies access tokens against `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`.
- `NEXT_PUBLIC_*` variables are intentionally committed only as placeholders in `.env.example`; they are inlined into the browser bundle by Next.js.
- `API_URL` tells the web app where to reach the NestJS API after login.
- `PORT` defaults to `3001` in `main.ts` when unset.

### Secrets handling

- No encryption, secret rotation, or external vault. Secrets are plain-text environment variables.
- `.gitignore` excludes `.env` (not shown here but implied by `.env.example` being committed instead).
- Supabase `config.toml` uses the `env(VAR_NAME)` substitution syntax for sensitive values (e.g. `openai_api_key = "env(OPENAI_API_KEY)"`, provider secrets), which the Supabase CLI resolves at runtime.

### Test-time configuration

- `api/test/setup-env.ts` sets `process.env.SUPABASE_URL = 'http://127.0.0.1:54421'` before importing `AppModule`, because the spec suite signs its own JWTs against a local key and needs a fixed issuer URL.
- The comment states this "overrides rather than defaults" and asserts that an exported `SUPABASE_URL` must not change the issuer the tests expect.

### Build/runtime separation

- `turbo.json` (root) orchestrates `dev`/`build`/`start` across workspaces.
- `next.config.ts` loads env at build/import time (Next.js also supports `NEXT_PUBLIC_*` at build time).
- There is no runtime config reload — changing `.env` requires restarting the process.

## Constraints & Rules

- **Single shared `.env` at the repo root**, with optional per-package overrides (`api/.env`, `web/.env.local`) — documented in `api/src/env.ts` and implemented identically in both packages.
- **Database connections require two URLs**: `DATABASE_URL` for pooled connections and `DIRECT_URL` for Prisma migrations — stated in the `.env.example` comments.
- **`SUPABASE_URL` must match the URL the browser signs in to**, because the API validates tokens against its JWKS endpoint — stated in `.env.example`.
- **`NEXT_PUBLIC_*` variables are inlined into the browser bundle** and should only contain non-secret values — stated in `.env.example`.
- **Jest specs pin `SUPABASE_URL` before `AppModule` import** — enforced by `api/test/setup-env.ts` and its accompanying comment.
- **Supabase local ports are shifted to `5442x`** (API `54421`, DB `54422`, Studio `54423`, etc.) to allow coexistence with another local Supabase stack — stated in `supabase/config.toml` comments.
- **Secrets in `supabase/config.toml` use the `env(VAR)` substitution syntax** — enforced by the Supabase CLI; literal secrets are not committed.