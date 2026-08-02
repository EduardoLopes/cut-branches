---
'cut-branches': patch
---

Fix error notifications showing an empty body for backend errors that carry no description. Rust sends `description` as `null` for those errors (invalid branch name, invalid repository path, and others), and it reached the toast unchanged instead of being normalised to an empty string.
