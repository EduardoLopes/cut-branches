---
'cut-branches': patch
---

Ship every icon inside the app instead of downloading it from the Iconify API at runtime: icons draw on the first frame, never pop in after a row mounts, and work offline. The few non-Lucide icons now use their closest Lucide match, and the app's tree-branch mark is drawn inline.
