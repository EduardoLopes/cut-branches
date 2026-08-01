---
'cut-branches': minor
---

Every page now follows one layout: a shared header (icon, title, description, actions, context tabs) above a recessed content well with its own filter toolbar. The repository page splits its two navigation levels accordingly — Branches/Worktrees are tabs, Active/Deleted is a filter — and commit history and diff keep the repository header with a breadcrumb instead of being separate full-screen views.

The sidebar and the page content are now floating rounded panels on a shared backdrop, which also fixes a dark-mode bug where the strip around them rendered light.
