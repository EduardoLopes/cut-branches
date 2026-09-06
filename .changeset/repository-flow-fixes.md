---
'cut-branches': patch
---

Fix a set of repository flow bugs: closing the "Find repositories" dialog now abandons the running scan (and a re-scan can no longer be overwritten by a superseded one), batch removal reports why each repository failed and invalidates the same caches as a single removal, the global `repository-changed` listener no longer leaks a duplicate handle, a stale sync check can no longer flag the previously open repository as out of sync, and repository ids containing `#`, `?` or `%` now produce working routes.
