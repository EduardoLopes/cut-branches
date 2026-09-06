---
'cut-branches': patch
---

Repository navigation and removal fixes: every `/repos/<id>` link and redirect now goes through the shared route helpers, so ids containing `#`, `?`, `%`, spaces or non-ASCII characters resolve instead of silently breaking. A partially failed batch removal keeps the manage modal open with the failed repositories still selected, the single-remove dialog stays open until the mutation settles (and still navigates away when the repository turns out to be gone), the out-of-sync banner resets when you switch repositories, and batch removal no longer refetches the repositories it just deleted.
