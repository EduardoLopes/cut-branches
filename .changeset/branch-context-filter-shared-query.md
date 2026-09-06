---
'cut-branches': patch
---

The branches/deleted tab strip no longer pulls a second full copy of every active branch over IPC just to show its count — it now reads the same cached list the page already fetched. One fewer round-trip and one fewer conversion pass on every visit to a repository.
