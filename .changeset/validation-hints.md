---
'cut-branches': minor
---

Action buttons are no longer disabled for validation reasons. Instead they stay
enabled and, when clicked before they can submit, surface a floating validation
message (e.g. "Select at least one branch to delete"). In-flight operations now
show a busy indicator on the button instead of a disabled state.
