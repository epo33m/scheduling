---
kind: error_handling
name: NestJS Built-in Exceptions + Web Login Error Vocabulary
category: error_handling
scope:
    - '**'
source_files:
    - api/src/main.ts
    - api/src/auth/auth.guard.ts
    - api/src/auth/roles.guard.ts
    - api/src/auth/supabase-token.service.ts
    - api/src/employee/employee.controller.ts
    - api/src/employee/employee.service.ts
    - api/src/request/dashboard.controller.ts
    - api/src/request/dashboard.service.ts
    - api/src/request/request.controller.ts
    - api/src/request/request.service.ts
    - web/lib/login-error.ts
    - web/lib/safe-next.ts
---

## Approach

The codebase uses two distinct error-handling strategies, one per runtime:

- **API (NestJS)**: All application-level errors are expressed as NestJS built-in HTTP exceptions (`BadRequestException`, `ForbiddenException`, `UnauthorizedException`, `NotFoundException`, `ConflictException`) imported from `@nestjs/common`. There is no custom exception class hierarchy, no global exception filter, and no `setGlobalFilters` / `useInterceptors` wiring — the default NestJS exception handler converts these into JSON responses.
- **Web (Next.js)**: Errors are not thrown; instead they are represented as string keys in a typed vocabulary (`LOGIN_ERRORS`) and validated by a helper (`readLoginError`). URL redirect values are sanitized through `safeNext` to prevent open redirects.

## API Layer Conventions

### Where exceptions are thrown

| File | Exception(s) used | Purpose |
|---|---|---|
| `api/src/auth/auth.guard.ts` | `ForbiddenException`, `UnauthorizedException` | Rejects unregistered/inactive accounts and missing login headers |
| `api/src/auth/roles.guard.ts` | `ForbiddenException` | Denies access when the employee role lacks permission |
| `api/src/auth/supabase-token.service.ts` | `UnauthorizedException` | Invalid or email-less Supabase session |
| `api/src/employee/employee.controller.ts` | `BadRequestException` | Wraps Zod validation failures (`parsed.message`) |
| `api/src/employee/employee.service.ts` | `ConflictException`, `NotFoundException`, `BadRequestException` | Duplicate employees, missing records, invalid input |
| `api/src/request/dashboard.controller.ts` | `BadRequestException` | Zod validation failures |
| `api/src/request/dashboard.service.ts` | `NotFoundException` | Missing request rows |
| `api/src/request/request.controller.ts` | `BadRequestException` | Zod validation failures |
| `api/src/request/request.service.ts` | `BadRequestException`, `ConflictException`, `ForbiddenException` | Business-rule violations (e.g. off-day only Mon–Thu, duplicate requests, insufficient permissions) |

### Validation-driven bad requests

Controllers that accept DTOs use Zod (`zod`), catch its `.parse()` failure, and rethrow `parsed.message` as a `BadRequestException`. This pattern appears identically in `employee.controller.ts`, `dashboard.controller.ts`, and `request.controller.ts`.

### Environment errors

Missing environment variables surface as plain `new Error(...)` during bootstrap (e.g. `SUPABASE_URL belum diset` in `api/src/auth/supabase.ts`). These are not caught and propagate to the process level.

### No custom error types

A search for `class \w+Error extends Error` or any `extends Error` definition returns zero matches in the repository. The codebase does not define sentinel errors or a domain-specific error type hierarchy.

### No global error middleware

`api/src/main.ts` only calls `NestFactory.create(AppModule)` and `app.listen`; there is no `app.useGlobalFilters(...)`, no `ExceptionFilter`, and no interceptor that catches errors. Error presentation therefore relies entirely on NestJS's default exception handler.

## Web Layer Conventions

### Centralized login error vocabulary

`web/lib/login-error.ts` exports a single `as const` object of allowed error codes and their Indonesian user-facing messages, plus a `LoginError` type derived from its keys and a `readLoginError` validator that narrows an incoming string to `LoginError | undefined`. The comment explicitly states the design goal: "the callback route and the login page both name them, so the vocabulary lives here once: a typo would otherwise reach the page as a missing message."

### Open-redirect prevention

`web/lib/safe-next.ts` provides `safeNext(value)`, which rejects anything that is not a same-site path starting with `/`, strips protocol-relative URLs (`//host`), and rejects backslashes and control characters. It is used by the login flow to sanitize the `next` query parameter.

### Test helpers

Test files under `api/test/` throw plain `new Error('...')` when database rows are missing (e.g. `'off request not found'`, `'shift request not found'`, `'no such employee'`). These are test-only assertions, not production error paths.

## Rules Observed

1. Application-layer HTTP errors in the NestJS API are thrown as NestJS built-in exception classes from `@nestjs/common`; no custom exception classes exist.
2. Controller input validation failures are consistently wrapped as `BadRequestException(parsed.message)` after a Zod parse attempt.
3. Authorization failures go through guards (`auth.guard.ts`, `roles.guard.ts`) throwing `ForbiddenException` / `UnauthorizedException` rather than being checked inline in controllers.
4. Domain/business-rule violations (duplicate entities, out-of-window requests, insufficient permissions) are thrown directly from services as `ConflictException`, `BadRequestException`, or `ForbiddenException`.
5. User-visible error strings in the Next.js frontend are never ad-hoc literals; they are looked up from the `LOGIN_ERRORS` map keyed by a `LoginError` type.
6. Any value originating from a URL that becomes a redirect target is passed through `safeNext` before use, preventing open redirects.
7. Missing environment configuration is surfaced via plain `Error` at startup time without a dedicated error type.