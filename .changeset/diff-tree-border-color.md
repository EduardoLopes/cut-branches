---
'cut-branches': patch
---

Fix a white right border on the branch-diff file-tree pane. The border color was written separately from the border shorthand, so `border-right-color` fell back to `currentColor` (white) instead of the neutral token.
