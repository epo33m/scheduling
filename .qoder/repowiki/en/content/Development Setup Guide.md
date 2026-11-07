# Development Setup Guide

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md)
- [.gitignore](file://.gitignore)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This guide helps you prepare the development environment for the Kyne shift scheduling application. At this stage, the repository is a scaffold with no application code yet. The goal here is to get your machine ready, understand the intended stack and structure, and establish a safe workflow while the project matures.

The product is a standalone PWA that will eventually live alongside an ERP monorepo. For now, treat this repo as the future home of the web frontend, API, shared packages, database schema, and deployment configuration once the stack is finalized.

**Section sources**
- [README.md:1-25](file://README.md#L1-L25)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:1-10](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L1-L10)

## Project Structure
Currently, the repository contains only documentation and a generic `.gitignore`. The expected future layout is described in the Product Requirements Document (PRD).

```mermaid
graph TB
Root["Repository Root"]
Docs["docs/<BR/>Product Requirements<br/>and planning notes"]
GitIgnore[".gitignore<BR/>Generic ignore rules"]
Readme["README.md<BR/>Repo metadata and placeholder commands"]
Root --> Docs
Root --> GitIgnore
Root --> Readme
```

**Diagram sources**
- [README.md:1-25](file://README.md#L1-L25)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-241](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L241)
- [.gitignore:1-34](file://.gitignore#L1-L34)

**Section sources**
- [README.md:22-25](file://README.md#L22-L25)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-241](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L241)

## Core Components
Until the technology stack is implemented, think of “components” as the areas you must prepare on your machine:

- Node.js runtime and package manager
- PostgreSQL database server
- Google Cloud Console account for authentication
- Supabase project for Auth and Database
- Local development tools such as Docker or PM2 for running NestJS later
- Editor settings aligned with the PRD’s monorepo expectations

### Environment Preparation
Prepare these before any code is added:

1. Install Node.js using the version recommended by the final stack.
2. Install a modern package manager: npm, yarn, pnpm, or Bun.
3. Install PostgreSQL locally or use a managed service.
4. Create a Google Cloud project and enable Google Sign-In.
5. Create a Supabase project and configure Google OAuth.
6. Prepare environment variables for local development.
7. Verify that your browser can open links from WhatsApp without blocking login flows.

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-241](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L241)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:218-228](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L218-L228)

### Required Tools Installation
| Tool | Purpose | Notes |
|---|---|---|
| Node.js | Runtime for Next.js and NestJS | Use a stable LTS release unless the stack pins another version |
| Package manager | Dependency management | Choose one tool consistently across the monorepo |
| PostgreSQL | Application database | Store dates and times carefully; timezone handling matters |
| Supabase | Auth and managed Postgres | Used for Google login and database access via Prisma |
| Google Cloud Console | Google OAuth client configuration | Configure redirect URIs for local and production URLs |
| Docker or PM2 | Backend process management | VPS hosting plan mentions Docker or PM2 |
| Reverse proxy | HTTPS termination | Caddy or Nginx is mentioned for production |
| Browser testing tools | Validate PWA and mobile behavior | Test on Android Chrome and iPhone Safari |

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-241](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L241)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:218-228](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L218-L228)

### Initial Project Configuration
When the stack is finalized, create these configuration artifacts:

- `.env.example` with all required keys
- `.env.local` for secrets that should never be committed
- Database connection string pointing to local or test PostgreSQL
- Supabase URL and anonymous/public keys if needed
- Google OAuth client ID and secret for local development
- Timezone setting for Asia/Makassar
- Frontend base URL and backend API URL
- Feature flags for probation request behavior and deadlines

The existing `.gitignore` already excludes environment files, dependency folders, build outputs, logs, editor-specific files, and private key files. Keep this pattern when adding framework-specific ignores.

**Section sources**
- [.gitignore:1-34](file://.gitignore#L1-L34)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:218-228](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L218-L228)

## Architecture Overview
The planned architecture follows a monorepo structure similar to the ERP system. The frontend will be a Next.js PWA, the backend will be NestJS, and data will be stored in PostgreSQL through Supabase and accessed via Prisma. Authentication uses Supabase Auth with Google sign-in and PKCE redirect.

```mermaid
graph TB
Client["Mobile and Desktop Clients<BR/>Next.js PWA"]
WebFrontend["Web Frontend<BR/>Next.js"]
ApiBackend["API Backend<BR/>NestJS"]
Database["PostgreSQL<BR/>Supabase"]
AuthProvider["Supabase Auth<BR/>Google OAuth"]
Hosting["Hosting Layer<BR/>Vercel, Supabase, VPS"]
Client --> WebFrontend
WebFrontend --> AuthProvider
WebFrontend --> ApiBackend
ApiBackend --> Database
Hosting --> WebFrontend
Hosting --> ApiBackend
Hosting --> Database
```

**Diagram sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-241](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L241)

## Detailed Component Analysis

### Repository Metadata and Placeholder Commands
The README identifies this as a new repository with no code yet. It also reserves placeholder command blocks for dependencies, development server, and tests. Treat these as placeholders until the stack is defined.

Key points:
- Remote repository URL is documented.
- Main branch is `main`.
- Getting started section is intentionally empty until stack selection.
- Layout section warns that directory structure is not set yet.

**Section sources**
- [README.md:1-25](file://README.md#L1-L25)

### Product Requirements and Stack Intent
The PRD defines roles, business rules, weekly scheduling flow, functional modules, data model draft, non-functional requirements, and the target stack. It also documents security rules, hosting plans, and timeline expectations.

Important setup implications:
- Google login with email whitelist is mandatory.
- Timezone is Asia/Makassar.
- Mobile-first PWA behavior must work on Android and iPhone.
- Database schema should use UUIDs, timestamps, soft deletes, and audit fields.
- Backend runs on a VPS with Docker or PM2 and reverse proxy.

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:27-66](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L27-L66)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:73-100](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L73-L100)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:102-195](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L102-L195)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:197-217](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L197-L217)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:218-248](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L218-L248)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:250-267](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L250-L267)

### Branch Management Strategy
At this time:
- The main branch is `main`.
- No feature branches are defined yet.
- Once implementation starts, adopt a branching strategy consistent with the ERP monorepo.

Recommended approach after stack selection:
- Use short-lived feature branches named after features or fixes.
- Require pull requests before merging into `main`.
- Protect `main` with required reviews and status checks.
- Tag releases when MVP milestones are reached.

**Section sources**
- [README.md:7-11](file://README.md#L7-L11)

### Contributing Guidelines and Development Workflow
Because this is a scaffold, formal contributing guidelines are not present yet. Until they are added, follow these safe defaults:

- Do not commit secrets or `.env` files.
- Keep changes small and focused.
- Write clear commit messages describing what changed and why.
- Update documentation when changing setup steps.
- Test Google login flows early because opening links from WhatsApp is a known risk.
- Follow the PRD’s security rules: whitelist emails at the backend, enforce role-based access, and rely on server-side validation.

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:243-248](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L243-L248)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:250-267](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L250-L267)

## Dependency Analysis
At this stage, there are no application dependencies. The repository depends conceptually on external services and tools described in the PRD.

```mermaid
graph LR
Repo["Scheduling Repository"]
Node["Node.js Runtime"]
PackageManager["Package Manager"]
PostgreSQL["PostgreSQL / Supabase"]
GoogleOAuth["Google OAuth"]
SupabaseAuth["Supabase Auth"]
NestJS["NestJS Backend"]
NextJS["Next.js Frontend"]
Repo --> Node
Repo --> PackageManager
Repo --> PostgreSQL
Repo --> GoogleOAuth
Repo --> SupabaseAuth
Repo --> NestJS
Repo --> NextJS
```

**Diagram sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-241](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L241)

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-241](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L241)

## Performance Considerations
These are general recommendations until implementation begins:

- Prefer server-side validation and authorization.
- Avoid storing redundant time data; calculate hours from shift definitions.
- Handle timezone conversions explicitly around Asia/Makassar.
- Cache read-heavy dashboard data where appropriate.
- Monitor database queries once Prisma is configured.
- Keep PWA assets optimized for mobile networks.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

### Common Setup Issues
| Problem | Likely Cause | Resolution |
|---|---|---|
| Cannot run commands from README | Placeholder script blocks are not implemented yet | Wait for stack definition; do not expect working scripts now |
| Secrets accidentally committed | Missing `.env` exclusion | Remove secrets from history and rotate them immediately |
| Google login fails from WhatsApp link | In-app browser restrictions | Open in Chrome or Safari, or install the PWA first |
| Login works but user is rejected | Email not whitelisted in backend | Add the user’s email to the employee whitelist |
| Time-related bugs | Wrong timezone handling | Ensure WITA timezone is used for deadlines and shift times |
| Database connection fails | Incorrect credentials or network access | Verify connection string, permissions, and firewall rules |
| Build output pollutes repository | Missing ignore rules | Extend `.gitignore` for framework-specific outputs |

**Section sources**
- [README.md:12-20](file://README.md#L12-L20)
- [.gitignore:1-34](file://.gitignore#L1-L34)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:218-228](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L218-L228)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:243-248](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L243-L248)

### Environment Configuration Checklist
Before starting development:

- Confirm Node.js and package manager versions.
- Confirm PostgreSQL is reachable locally or remotely.
- Confirm Supabase project exists and is initialized.
- Configure Google OAuth client with correct redirect URIs.
- Populate `.env.local` with secrets.
- Verify `.env.example` lists every required variable.
- Test login from a normal browser and from WhatsApp links.
- Validate that timezone handling uses Asia/Makassar.

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-241](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L241)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:218-228](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L218-L228)

## Conclusion
This repository is currently a scaffold. Your immediate task is to prepare the development environment, align with the intended stack, and follow safe contribution practices. When the stack is finalized, replace placeholder commands with real installation, build, test, and deployment instructions. Until then, focus on environment readiness, secure configuration, and understanding the product requirements.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Expected Future Directory Layout
Once the stack is selected, expect something like:

- `web/` — Next.js PWA frontend
- `api/` — NestJS backend
- Shared packages for types and validation
- Database migrations and seed data
- Deployment configuration for Vercel, Supabase, and VPS

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-241](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L241)