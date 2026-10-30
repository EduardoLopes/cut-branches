---
'cut-branches': patch
---

Keep the branch list filled during fast scrolls: rows are placed at their real height from the start (the scrollbar no longer shrinks as you scroll), a deeper buffer of rows is ready past each edge, and any stretch a flick still outruns shows empty cards instead of a blank list. Searching scrolls back to the top again, and the list header sits flush under the toolbar.
