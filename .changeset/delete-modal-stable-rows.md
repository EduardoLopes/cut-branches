---
'cut-branches': patch
---

Stop the delete-branches modal (and the branch list) from shifting while scrolling. Merge status is now computed during the branch listing sync — one revwalk over HEAD's history answers every branch in a few tens of milliseconds — so the "not fully merged" alert is known the moment a row mounts instead of popping in after a lazy per-viewport fetch.
