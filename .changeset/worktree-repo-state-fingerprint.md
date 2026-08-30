---
'cut-branches': patch
---

Fix repositories whose `.git` is a pointer file (linked worktrees, submodules) never re-syncing: the state fingerprint and the filesystem watcher now resolve the real git directories through git2 instead of assuming `<root>/.git`. Repositories with no commits yet (unborn HEAD) can now be added, and removing a repository that is no longer in the database reports an error instead of a false success.
