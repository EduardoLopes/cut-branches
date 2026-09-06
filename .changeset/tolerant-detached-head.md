---
'cut-branches': patch
---

Fix backend branch-management bugs: repositories with a detached HEAD can now be opened, listed and synced; batch branch deletion pre-validates every name so a partial delete can no longer lose branches; restoring with the Overwrite strategy is atomic and batch restores report per-item failures instead of aborting; and branch restore/reachability resolve commit SHAs strictly instead of accepting arbitrary revspecs.
