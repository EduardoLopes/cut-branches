---
'cut-branches': patch
---

Failures no longer pass silently: a repository refresh that rejects now shows a "Could not update repository" toast (instead of an unhandled rejection plus a false success toast), and a bulk repository add reports the reason for each path it could not add rather than a bare count. The Delete and Restore triggers also treat a still-loading selection as "nothing selected", so a click no longer opens an empty dialog.
