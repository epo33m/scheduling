---
trigger: always_on
---

# Clean Working Tree Is Mandatory

A task ends when `git status` has nothing left to report. Any staged file, unstaged modification, or untracked file left behind makes the tree dirty, and a dirty tree hides the next agent's real diff.

## The rule

1. **Commit everything that is not gitignored** before reporting a task done — code, tests, docs, and regenerated knowledge docs such as `.qoder/repowiki/`.
2. **Group changes into coherent commits**, one concern each, with a conventional prefix (`feat:`, `fix:`, `chore:`, `docs:`). "Everything committed" does not mean "one giant commit".
3. **Prove the end state** with `git status --short`. The only acceptable output is empty.
4. **Unrelated churn still gets committed.** Generated docs, a formatter run, IDE regeneration: give it its own commit and say so in the report. Never leave it dirty, never discard it.

## Never committed

- `.env` and `.env.*` (the tracked `.env.example` is the exception), credentials, tokens, keys, dumps.
- Anything already matched by `.gitignore`: `node_modules/`, `dist/`, `.next/`, `.turbo/`, `api/src/generated/`, `graphify-out/`. Committing generated build output is not "clean", it is noise.

## When a commit cannot happen

Report it instead of working around it. A failing hook, a rejected push, or a merge conflict is a finding for the user. Never `--no-verify` past a failing check, never `reset --hard` or `checkout --` to clear the way, and never discard changes you did not write.
