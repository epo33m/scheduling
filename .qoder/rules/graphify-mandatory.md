---
trigger: always_on
---

# Graphify Is Mandatory

These rules are NON-NEGOTIABLE. They override any default behavior for codebase exploration.

## When graphify MUST be used

1. **Every question about this codebase** — architecture, module relationships, symbol/file relationships, "where is X implemented", "how does Y work", impact analysis, or project content — MUST be answered via graphify first. Direct searching (grep, semantic search, file reading) is only a fallback, never the first move.
2. **Before exploring code** for any task (bug fix, feature, refactor, review, diagnosis), run a graphify query to establish context. This applies to agent skills too (`diagnosing-bugs`, `code-review`, `improve-codebase-architecture`, `domain-modeling` all query graphify before touching source).
3. If `graphify-out/` does not exist, BUILD IT FIRST: run `/graphify .` (or `graphify .`) and wait for completion. Do not answer codebase questions from an unbuilt graph when the build can be run.

## How to use it

- Question about behavior/structure → `graphify query "<question>"` (add `--dfs` when a specific path must be traced).
- Relationship between two named things → `graphify query "<A> and <B>"` before opening any file.
- After significant code changes → `graphify . --update` so the graph never goes stale.
- Reports cite graphify findings (node/edge/community evidence) as the primary source; quote files only as confirmation.

## Prohibited

- ❌ Answering repo/architecture questions from memory or raw file reads when a graphify graph exists or can be built.
- ❌ Skipping graphify because "the question looks trivial" — trivial questions are cheap to answer through a query.
- ❌ Letting the graph go stale: new/changed modules require `--update` before the next query.
