---
'cut-branches': patch
---

Fast scrolls in the branch list no longer flash a blank well: a deeper buffer of rows is ready once the list settles, and any stretch a flick still outruns shows placeholder rows (bars where the name, author, commit and date go) until the real rows arrive.
