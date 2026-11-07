---
kind: dependency_management
name: Agent Skills Dependency Lockfile (skills-lock.json)
category: dependency_management
scope:
    - '**'
source_files:
    - skills-lock.json
    - .agents/skills/antislop/SKILL.md
    - .agents/skills/code-review/SKILL.md
    - .agents/skills/tdd/SKILL.md
    - agent/skills/antislop/SKILL.md
    - agent/skills/code-review/SKILL.md
---

## What system/approach is used

This repository has no traditional code dependencies — there is no `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, or any other language package manifest. The only dependency-management artifact is **`skills-lock.json`**, which pins a set of third-party Markdown-based agent skills consumed by the project's AI workflow.

The lockfile follows the format produced by the Matt Pocock / anti-slop skills tooling:
- Top-level `version: 1` and a `skills` map keyed by skill name.
- Each entry declares `source` (GitHub repo, e.g. `mattpocock/skills` or `miqdadbadjuber/anti-slop`), `sourceType: "github"`, `skillPath` (the path inside that source repo to the skill's `SKILL.md`), and `computedHash` (a SHA-256 of the resolved content).
- Two upstream sources are pinned: `mattpocock/skills` (30+ engineering/productivity/writing skills) and `miqdadbadjuber/anti-slop` (6 antislop variants).

The same skills are vendored into both `.agents/skills/` and `agent/skills/` as local copies of the locked versions, so the repo ships with self-contained skill definitions alongside the lockfile.

## Key files and packages

- `skills-lock.json` — the single source of truth for which skill versions are included; every skill entry carries a `computedHash` that acts as an integrity checksum.
- `.agents/skills/<name>/SKILL.md` and `agent/skills/<name>/SKILL.md` — mirrored directories containing the actual vendored skill documents (each skill directory also includes an `agents/openai.yaml` profile and, for some, references/scripts).

No other dependency manifests exist at the repository root.

## Architecture and conventions

- **Vendoring + lockfile**: Skills are not fetched at runtime from GitHub; they are checked in as local copies under `.agents/skills/` and `agent/skills/`. The lockfile records the exact remote revision via `computedHash`, providing reproducibility.
- **Dual mirror layout**: Both `.agents/` and `agent/` contain identical skill trees, suggesting two consumption paths (e.g. different agents or toolchains) share the same pinned set.
- **Source attribution**: Every skill records its origin (`source`) and the subpath within that source (`skillPath`), making upgrades traceable back to a specific file in a specific upstream repo.
- **Integrity verification**: The `computedHash` field is the enforcement mechanism — it ties each locked skill to a deterministic content digest rather than a mutable branch/tag.

## Conventions and constraints

- **Observed convention**: All third-party skills come from public GitHub repositories (`sourceType: "github"`); no private registry or custom source type appears in the lockfile.
- **Enforced rule**: Each skill entry includes a `computedHash`; this is the integrity check that ensures the vendored copy matches the locked version.
- **Observed convention**: Skill names in the lockfile match the directory names under `.agents/skills/` and `agent/skills/` (e.g. `antislop`, `code-review`, `tdd`).
- **Not present**: No language-specific package manager configuration, no `vendor/` directory for code libraries, no `GOPRIVATE` or private registry settings — this repository contains no application code dependencies beyond the agent skill assets.