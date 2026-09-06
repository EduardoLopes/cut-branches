---
'cut-branches': patch
---

Fix the bulk cleanup summary counting repositories it did not clean. A repository was counted as cleaned whenever the clean command ran, even when every folder in it failed to delete, so the notification could report "Cleaned 3 repositories" alongside "12 folder(s) could not be deleted" with nothing actually removed.
