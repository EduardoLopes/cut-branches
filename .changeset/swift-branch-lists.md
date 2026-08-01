---
'cut-branches': patch
---

Large repositories no longer freeze when selecting branches, opening the delete modal, or scrolling the branch list: branch metrics are fetched in batches over the visible window, selection updates patch the cache instead of refetching the whole list, and unchanged repositories serve their branch list from the database.
