---
'cut-branches': patch
---

Match filesystem watcher events precisely against each repository's ref surface. A linked worktree's private git directory lives inside the main repository's `.git`, so the previous prefix match fanned a single ref change out to the main repository and every registered worktree, triggering N redundant re-syncs. Only shared `refs/heads/**` and `packed-refs` now match several repositories; `HEAD` matches exactly one.
