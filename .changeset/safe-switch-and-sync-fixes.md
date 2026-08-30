---
'cut-branches': patch
---

Switching branches now refuses to discard uncommitted changes instead of force-overwriting them; branches deleted in the app and re-created outside it return to the active list on the next sync; the branch list applies the same trimmed search as the header count; branch restoration uses the full commit SHA; deleting branches waits for the list to refresh before the modal closes; a failed repository-list load no longer redirects to onboarding.
