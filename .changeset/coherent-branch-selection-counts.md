---
'cut-branches': patch
---

Fix the branch selection counter and header checkbox while a search is active. The selected count was measured across the whole repository instead of the branches the search left visible, so the header could read "5 branches are selected / 2 branches were found" and the select-all checkbox appeared empty even with branches selected.
