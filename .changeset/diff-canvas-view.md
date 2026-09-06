---
'cut-branches': minor
---

Add a canvas view mode to the branch diff. Changed files are laid out as pannable/zoomable node panels in dependency columns, with import edges drawn between them and each node embedding the file's diff, backed by a tree-sitter code-structure analysis. A list/canvas toggle is persisted alongside the other diff view options.

Work in progress — two known issues from review are not yet fixed: canvas pan/zoom resets when a node is toggled, and getDiffStructure is not yet wired into every cache-invalidation path.
