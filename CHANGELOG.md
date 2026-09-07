# cut-branches

## 0.6.0

### Minor Changes

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`3ca2539`](https://github.com/EduardoLopes/cut-branches/commit/3ca253981699ef26729e66ed26418b130ce89dc0) - Collapsing the sidebar now animates: the rail glides to its width on a single curve, the "Cut Branches" and "Repositories" headings fold away as it closes and unfurl as it reopens, and the collapse toggle cross-fades its icon while riding the shrinking edge to the centre of the rail. The toggle also moves out of the brand header into its own row at the bottom of the sidebar. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`2e7dbd9`](https://github.com/EduardoLopes/cut-branches/commit/2e7dbd94d5d7a03d97ef7d9b86059da927119745) - Branch cards now show the upstream ref as a footer badge and support a compact layout that reduces the card to the branch identity for dense contexts. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`487f176`](https://github.com/EduardoLopes/cut-branches/commit/487f176d6e1c86536b9a731a0116b5caff0482e1) - Branch cards now show the branch's line diff (+added/−removed) against its merge-base with the current branch, as badges on the right side of the card footer. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`7233841`](https://github.com/EduardoLopes/cut-branches/commit/72338419e0fb989b7eb624b8000adda221c33278) - Branch card footer now covers every state without layout shift: placeholder badges while the line diff is computing, a neutral "no diff" badge for branches with no unique changes, and an explicit "no upstream" badge for local-only branches. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`c5abe9f`](https://github.com/EduardoLopes/cut-branches/commit/c5abe9fdc630e1c80644c6b95737b8bb54c8ec43) - Branch cards now truncate long branch names and upstream refs with ellipses instead of overflowing, and accept extra footer badges from the consuming screen. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`d155290`](https://github.com/EduardoLopes/cut-branches/commit/d155290790b362eef3228fa261cdf82079a46a41) - Add a branch/commit diff review view — a changed-files list with expandable, syntax-highlighted diffs — with entry points from branch cards, commit rows, and the delete-branch confirmation. Gated behind the `branch-diff` feature flag (off by default). (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`13a7e80`](https://github.com/EduardoLopes/cut-branches/commit/13a7e80b9e0a4e85b72342d31a5a236634dd989f) - Render symbol-level call edges on the diff canvas: edges now show which symbols one file uses from another, drawn as colored, multi-line labelled connections with wider node spacing so the relationships stay readable. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`d2509ad`](https://github.com/EduardoLopes/cut-branches/commit/d2509ad5a628b34e7c8679e380d72b5b3b621ee1) - Render the commit history graph rows with the shared commit card in a compact density, showing the commit summary, author, relative time, short SHA, upstream, and ref decorations. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`02887fd`](https://github.com/EduardoLopes/cut-branches/commit/02887fd183bf57b07d3d88e2460b426613d39fbb) - Add a flag-gated commit-history view with an interactive branch graph. Open it from a repository's menu to browse the full commit log across branches, see each branch's ahead/behind comparison against the base, preview a branch's graph on hover from the branch list, and select branches to delete directly from the graph. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`1c12a55`](https://github.com/EduardoLopes/cut-branches/commit/1c12a555605d9f224121da20ba113d557b5e89ee) - Branch commit cards now show the commit's short SHA and, when configured, its upstream tracking ref, and can disclose the full commit message body via a per-card toggle. The backend now stores and exposes both the commit subject (summary) and the full message, plus each branch's upstream. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`801f8d8`](https://github.com/EduardoLopes/cut-branches/commit/801f8d8b22a4d61be8b6856eea4883cf70d86eec) - Give every dialog the same shape as Find repositories: an icon and subtitle in the header, lists on a recessed surface with scroll shadows, one-line rows whose paths truncate in the middle with the folder highlighted, consistent selected/hover/pressed row states, primary buttons disabled while their action runs, and footers without dividers. Manage repositories gains a live search match count; Clean up no longer lets you confirm mid-scan; Remove repository shows a busy state. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`d7cf24e`](https://github.com/EduardoLopes/cut-branches/commit/d7cf24e82527a612d3cc4dff274206cf4dc338d7) - Add a canvas view mode to the branch diff. Changed files are laid out as pannable/zoomable node panels in dependency columns, with import edges drawn between them and each node embedding the file's diff, backed by a tree-sitter code-structure analysis. A list/canvas toggle is persisted alongside the other diff view options. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

  Work in progress — two known issues from review are not yet fixed: canvas pan/zoom resets when a node is toggled, and getDiffStructure is not yet wired into every cache-invalidation path.

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`4644854`](https://github.com/EduardoLopes/cut-branches/commit/4644854a2af86b853419eed5101610c9ec44b629) - "Explain all" now honors the Detail choice: in per-change mode each file's (Thanks [@EduardoLopes](https://github.com/EduardoLopes))
  diff is revealed with its explanations rendered inline per hunk.

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`01b9bd6`](https://github.com/EduardoLopes/cut-branches/commit/01b9bd63ca556fdb5332a5eba83e460752ac8b8f) - Add AI-generated explanations to the branch diff: explain a single hunk, a whole file, or the entire changeset at once, with a chosen level of detail. Explanations render inline next to the diff and as per-file panels, and can be re-run or cancelled per file. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`ccaf606`](https://github.com/EduardoLopes/cut-branches/commit/ccaf606d5fa770c287c779d0829e550932ca8936) - The diff view gains a file tree: changed files grouped by directory (deep single-child paths compressed) in a pane beside the list — activating a file scrolls to its diff and opens it. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`e580667`](https://github.com/EduardoLopes/cut-branches/commit/e580667453f1b3cf069d9cfa6588a5dd29bd0c99) - New "View" menu in the diff header: unified/split layout, change style (background, markers, bars), one or two line-number columns, and line wrapping — persisted across sessions. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`62bd2f6`](https://github.com/EduardoLopes/cut-branches/commit/62bd2f6f6958c739541c4d78a35be514241cccd0) - Render large diffs progressively so huge files no longer freeze the diff view while opening, and keep page scrolling responsive over wide diffs. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`d5d539f`](https://github.com/EduardoLopes/cut-branches/commit/d5d539fc9f681f4e4b1103705642ff5d4d1e4f3e) - feat: database integration with lot's of changes (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`0a58882`](https://github.com/EduardoLopes/cut-branches/commit/0a588822f196b08c508cbfb4768f7d80cebe292c) - The app now reopens the repository you were last working in, and when there is no (Thanks [@EduardoLopes](https://github.com/EduardoLopes))
  repository to remember it opens the first one in the sidebar's current sort order
  instead of an arbitrary one.

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`cf574e6`](https://github.com/EduardoLopes/cut-branches/commit/cf574e6f295d3631bc3331e74eaac6b27b99af56) - Redesign the Find repositories modal: scan location and options move into a toolbar under the header, results show a full-width filter, paths truncate smartly on one line with the repository folder highlighted, linked worktrees nest under their repository, the list sits on a recessed surface with scroll shadows, and adding is disabled while a scan runs. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`3376e47`](https://github.com/EduardoLopes/cut-branches/commit/3376e4717506e39e6cb35ebd3f7a1a874cac39a1) - The commit history's branch gutter now renders each branch through the shared compact branch card — upstream ref, current badge, and selected/locked visuals included — with a wider column for branch details and no checkbox on the undeletable current branch. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`1e39c88`](https://github.com/EduardoLopes/cut-branches/commit/1e39c88e541cbee23c926cae5895f5a4a76295c8) - Very large file diffs now ask before rendering ("Show diff") instead of mounting unprompted, and say so when syntax highlighting is disabled for size. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`52e40d0`](https://github.com/EduardoLopes/cut-branches/commit/52e40d0f67770550c14bfe1d764c068b086786b7) - Highlight the deep-linked branch in its own graph color when navigating from a commit card, and remove the now-inert hover on commit-history rows. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`8d12381`](https://github.com/EduardoLopes/cut-branches/commit/8d12381cbd49d16a1ab7d2be784e01072a5f4cac) - On macOS the window now draws its own titlebar alongside the traffic lights, following light and dark mode with the rest of the app, and reclaiming the space reserved for those controls when the window goes fullscreen. Windows and Linux keep their standard system titlebar. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`75a4069`](https://github.com/EduardoLopes/cut-branches/commit/75a4069566be4d8e4efbf853e6f513ae6beb12cb) - The sidebar repository list now reads as one recessed panel, keeps its branch-count badge visible in the collapsed rail, and fades clipped rows into the surface at the top and bottom edges to signal there is more to scroll to. Counts above 999 clamp to "99+" so a badge can no longer stretch across the rail, with the exact count kept on its accessible label. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`20edb5d`](https://github.com/EduardoLopes/cut-branches/commit/20edb5d44d2db5ee4e9ae47f5f0dfd592c4c6586) - Track review progress in the branch diff: mark files reviewed from either the list rows or the canvas nodes, see a reviewed count in the header, and clear all marks at once. Progress is persisted per repository and diff target. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`e9f4e88`](https://github.com/EduardoLopes/cut-branches/commit/e9f4e88650d130ff0027d0be786b475a7b1c9eec) - Replace the branch list's pagination with a single virtualized, infinitely-scrolling list — rows load as you scroll, stay mounted once passed, and the scroll port is keyboard-focusable. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`812a2f5`](https://github.com/EduardoLopes/cut-branches/commit/812a2f5f032fc72e023312015c3b0c40aecb70cb) - On macOS the sidebar collapse toggle now sits in the titlebar next to the traffic lights, so it stays reachable at the same spot whether the sidebar is open or collapsed to its rail. Windows and Linux keep it in the sidebar's own bottom row. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`164f302`](https://github.com/EduardoLopes/cut-branches/commit/164f302136d1f902c152fe5ecef06711f9163f41) - Slim down the commit shown inside a branch card to a single line — message, author and date — and add a "More" control that expands the branch's recent commits with full detail (description body, SHA, diff link). Expanding promotes the last commit to a full card so its description is readable, and the panel header follows along. Requires the "Commit history" feature flag. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`b0b5501`](https://github.com/EduardoLopes/cut-branches/commit/b0b550127b86b09d6a0ea994f20da84f0a54e27b) - Split diff layout now always wraps long lines — half-width columns made horizontal scrolling unusable. The "Wrap lines" option shows as on and locked while split is active and still applies when switching back to unified. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`4a3b375`](https://github.com/EduardoLopes/cut-branches/commit/4a3b3752650b286056f65d87de4d73e65625beae) - Each changed file's header now stays pinned to the top of the list while its diff scrolls, so long diffs never lose their file identity. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`54c405c`](https://github.com/EduardoLopes/cut-branches/commit/54c405c2c4c2d793993564b0ef72e8300df07a3f) - Every page now follows one layout: a shared header (icon, title, description, actions, context tabs) above a recessed content well with its own filter toolbar. The repository page splits its two navigation levels accordingly — Branches/Worktrees are tabs, Active/Deleted is a filter — and commit history and diff keep the repository header with a breadcrumb instead of being separate full-screen views. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

  The sidebar and the page content are now floating rounded panels on a shared backdrop, which also fixes a dark-mode bug where the strip around them rendered light.

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`5854b22`](https://github.com/EduardoLopes/cut-branches/commit/5854b22192313d8bec7b570982e8cd93f6e0fb78) - Action buttons are no longer disabled for validation reasons. Instead they stay (Thanks [@EduardoLopes](https://github.com/EduardoLopes))
  enabled and, when clicked before they can submit, surface a floating validation
  message (e.g. "Select at least one branch to delete"). In-flight operations now
  show a busy indicator on the button instead of a disabled state.

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`421bdb5`](https://github.com/EduardoLopes/cut-branches/commit/421bdb5b62ab38979957d56d8e22e14e3644a748) - Add worktree management: a flag-gated worktrees view for a repository that lists, adds, removes, and locks git worktrees, with a Branches/Worktrees context switch in the repository header. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

### Patch Changes

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`f631e2a`](https://github.com/EduardoLopes/cut-branches/commit/f631e2a7443a7e232ae2063e97f5958035570eea) - Show the add-repository button's icon on the leading (left) side of the label instead of trailing it. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`aa69a37`](https://github.com/EduardoLopes/cut-branches/commit/aa69a379b38ead6b2b697aabfe1a6cab83e099a4) - The select-all control in every pick-list dialog — Find repositories, Manage repositories and Clean up repository — is now attached to the list it acts on: it rides in a header inside the list panel, one surface tier above the rows and separated by a hairline, with its checkbox in the same column as the rows' checkboxes. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`90e0b2f`](https://github.com/EduardoLopes/cut-branches/commit/90e0b2f8a8c998a748b307beeab1747b930cc0b6) - refactor: improve query invalidation and loading state handling in branch management components (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`ef38bbc`](https://github.com/EduardoLopes/cut-branches/commit/ef38bbce55cafad4f807d45962ff5122a8d913b7) - The branches/deleted tab strip no longer pulls a second full copy of every active branch over IPC just to show its count — it now reads the same cached list the page already fetched. One fewer round-trip and one fewer conversion pass on every visit to a repository. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`d924b05`](https://github.com/EduardoLopes/cut-branches/commit/d924b05a8e65139b55015b4b78f1c2cb7de33f1b) - Opening a repository no longer stutters. The branch list used to mount its full scroll runway (22 cards) before the first paint, even though the viewport holds four — around 75ms of blocking work on every arrival. It now mounts a narrow window and widens to the full runway on the first scroll, roughly halving the time between navigating and seeing branches. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`b46ca0f`](https://github.com/EduardoLopes/cut-branches/commit/b46ca0ff6bbc349e72ed1756e136addc77e679a4) - Fix the branch selection counter and header checkbox while a search is active. The selected count was measured across the whole repository instead of the branches the search left visible, so the header could read "5 branches are selected / 2 branches were found" and the select-all checkbox appeared empty even with branches selected. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`4b9481c`](https://github.com/EduardoLopes/cut-branches/commit/4b9481c8970a465cbc520e64269f0ffae29411d1) - Commit history rows no longer duplicate the upstream ref badge on each commit; the upstream is shown by the branch card instead. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`7e23ecb`](https://github.com/EduardoLopes/cut-branches/commit/7e23ecb3647720d648afb92554c43f66e2c0b395) - Fix the commit history run toggle overflowing its gutter column: it is now a borderless ghost button that fits the column exactly, and the run divider strip's icon no longer oversizes. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`e10f21c`](https://github.com/EduardoLopes/cut-branches/commit/e10f21c6c4cd795b3944d130b631eff441c71b57) - Refine the current branch in the branch list: its card now fills the full row width and is marked with a "current" badge. The current branch is no longer lockable, since it already can't be deleted. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`e1546d3`](https://github.com/EduardoLopes/cut-branches/commit/e1546d3509f4374e29a6bf4e4836cd34664f2127) - Stop the delete-branches modal (and the branch list) from shifting while scrolling. Merge status is now computed during the branch listing sync — one revwalk over HEAD's history answers every branch in a few tens of milliseconds — so the "not fully merged" alert is known the moment a row mounts instead of popping in after a lazy per-viewport fetch. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`faa9e94`](https://github.com/EduardoLopes/cut-branches/commit/faa9e9425820882ff19895bee85ced0edbaf40e3) - Refresh the Rust and frontend dependency stack to the latest releases (git2 0.21, tree-sitter 0.27, notify 8, Tauri plugins, SvelteKit 2.70, Svelte 5.57), so the app ships with the newest upstream fixes. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`c5ac2bf`](https://github.com/EduardoLopes/cut-branches/commit/c5ac2bf18367dcef152a4e2c8177811e27d14d88) - Fix a white right border on the branch-diff file-tree pane. The border color was written separately from the border shorthand, so `border-right-color` fell back to `currentColor` (white) instead of the neutral token. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`90e0b2f`](https://github.com/EduardoLopes/cut-branches/commit/90e0b2f8a8c998a748b307beeab1747b930cc0b6) - refactor: improve query invalidation and loading state handling in branch management components (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`2fdd1e9`](https://github.com/EduardoLopes/cut-branches/commit/2fdd1e997d8c5b01950d4b055fe149cc88e159b6) - Fix error notifications showing an empty body for backend errors that carry no description. Rust sends `description` as `null` for those errors (invalid branch name, invalid repository path, and others), and it reached the toast unchanged instead of being normalised to an empty string. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`01ee07b`](https://github.com/EduardoLopes/cut-branches/commit/01ee07b37660f165fbeb5c97b040149a4ca58695) - feat: add testing documentation and testing utilities (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`6f3d485`](https://github.com/EduardoLopes/cut-branches/commit/6f3d48597c8b94ff0f245e52b3d171c89c828ed2) - The footer is one continuous bar now that the sidebar can collapse — the sidebar-width segment is gone and the theme mode select moved to the right, next to the notifications button. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`7c12a08`](https://github.com/EduardoLopes/cut-branches/commit/7c12a08eb08e649b272737ebde9a05708e7773c6) - Selecting a branch now draws an accent border on its card, so the selection reads clearly instead of blending into the unselected ones. The current branch keeps its subtler muted border. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`b7b790e`](https://github.com/EduardoLopes/cut-branches/commit/b7b790e345f79b5c5a3063dbf97a9f180e8233be) - refactor: standardize command input/output structures and update commands naming conventions (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`c43b2a5`](https://github.com/EduardoLopes/cut-branches/commit/c43b2a593f8148b444cd49d0c0a4683be3581f8c) - refactor: update error handling to use AppError struct across branch and repository services (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`9f4d53c`](https://github.com/EduardoLopes/cut-branches/commit/9f4d53c0bfcec5960026d2f547216322aedfaa84) - Hide the "Repository options" tooltip while the repository options menu is open. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`11f383d`](https://github.com/EduardoLopes/cut-branches/commit/11f383d8738cef09f24790ce0348a61409e9ee66) - Fix the bulk cleanup summary counting repositories it did not clean. A repository was counted as cleaned whenever the clean command ran, even when every folder in it failed to delete, so the notification could report "Cleaned 3 repositories" alongside "12 folder(s) could not be deleted" with nothing actually removed. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`6ce313d`](https://github.com/EduardoLopes/cut-branches/commit/6ce313ddf77789643078966faddb25df416a981e) - refactor: use a new architecture (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`d6c4861`](https://github.com/EduardoLopes/cut-branches/commit/d6c48615065ac95516ea9e177fa03a7ada3126cd) - feat: add loading indicator and popover functionality to RepositoryManagementHeader (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`60811bd`](https://github.com/EduardoLopes/cut-branches/commit/60811bde88ad7a79ee564e0457eb9d7dec0137bb) - Open the "Repository options" tooltip to the left of its button instead of below it. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`f312b47`](https://github.com/EduardoLopes/cut-branches/commit/f312b4768835e4aa57e9d35995fa2281efadddb3) - Branch cards no longer flash a "not fully merged" alert on every branch while merge metrics are still loading. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`e1ea256`](https://github.com/EduardoLopes/cut-branches/commit/e1ea256186daddc6491044b694f73d8c0533265b) - Right-align the add-repository call to action in the welcome screen and render it at the medium size. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`36cc664`](https://github.com/EduardoLopes/cut-branches/commit/36cc66493f87dc51d0db207750a10c48fb820300) - Make the sticky page toolbar opaque. It now fills with `neutral.surface.hill` — one tier above the well's `surface.ground` — instead of a blurred 50% `surface.peak`, so rows scrolling underneath no longer ghost through it. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`ec353c7`](https://github.com/EduardoLopes/cut-branches/commit/ec353c7ef8ca1246358c1ba0e7a8cb7f0ec2a426) - refactor: reorganize code structure in src-tauri (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`faae7f8`](https://github.com/EduardoLopes/cut-branches/commit/faae7f886982e09a1fa9fae7ff75b94d25d8b14a) - The collapsed sidebar rail now keeps the add-repository button and the repository icons on one center line, with the scrollbar gutter reserved symmetrically. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`8fc0d88`](https://github.com/EduardoLopes/cut-branches/commit/8fc0d8865c5bb0ea8d25a8f463b9cfe161b79d2d) - Fix a set of repository flow bugs: closing the "Find repositories" dialog now abandons the running scan (and a re-scan can no longer be overwritten by a superseded one), batch removal reports why each repository failed and invalidates the same caches as a single removal, the global `repository-changed` listener no longer leaks a duplicate handle, a stale sync check can no longer flag the previously open repository as out of sync, and repository ids containing `#`, `?` or `%` now produce working routes. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`864d9e3`](https://github.com/EduardoLopes/cut-branches/commit/864d9e3d26dd1fe9a1c56f0f93803c101dbff319) - Repository navigation and removal fixes: every `/repos/<id>` link and redirect now goes through the shared route helpers, so ids containing `#`, `?`, `%`, spaces or non-ASCII characters resolve instead of silently breaking. A partially failed batch removal keeps the manage modal open with the failed repositories still selected, the single-remove dialog stays open until the mutation settles (and still navigates away when the repository turns out to be gone), the out-of-sync banner resets when you switch repositories, and batch removal no longer refetches the repositories it just deleted. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`606560b`](https://github.com/EduardoLopes/cut-branches/commit/606560baeb9837b1943192d0f18df2079289f91b) - Restore progress now counts each branch exactly once, so the bar no longer reaches 100% while conflicts are still waiting for a decision; cancelling the folder picker in "Scan a specific folder" closes the dialog instead of leaving it empty. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`d979d84`](https://github.com/EduardoLopes/cut-branches/commit/d979d840b12f9133444a71c40b1062587ad65150) - Switching branches now refuses to discard uncommitted changes instead of force-overwriting them; branches deleted in the app and re-created outside it return to the active list on the next sync; the branch list applies the same trimmed search as the header count; branch restoration uses the full commit SHA; deleting branches waits for the list to refresh before the modal closes; a failed repository-list load no longer redirects to onboarding. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`54e3e7a`](https://github.com/EduardoLopes/cut-branches/commit/54e3e7ad326dfe78615f6d8c11ea4fc09a5c75b3) - feat: add showAlerts prop to BranchList component and update usage in DeletedBranchesView (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`5d4ccd6`](https://github.com/EduardoLopes/cut-branches/commit/5d4ccd6337a25d20ec7cc3504467b6764d4936a9) - Fixed the repository, diff, history, cleanup and settings pages overlapping the footer: they sized themselves from the viewport rather than from the space the app shell actually gives them. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`5122943`](https://github.com/EduardoLopes/cut-branches/commit/512294372a9db136fdb28a7b0f524d121cc8014a) - feat: introduce CommitCard component for better commit display in branch management (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`e744c7b`](https://github.com/EduardoLopes/cut-branches/commit/e744c7b7f925fac81dac9973fabbba1d0ec2ce78) - The sidebar repository list sits directly on the sidebar surface — removing the inset card wrapper gives the navigation items more horizontal room. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`570321f`](https://github.com/EduardoLopes/cut-branches/commit/570321f9cfb62c6e3632f3adb92a6e7ab8871b8a) - refactor: replace invoke calls with generated bindings for branch management and repository services (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`50e7148`](https://github.com/EduardoLopes/cut-branches/commit/50e7148ac531fc73258bfad11c1f23eeb98a03ca) - Show only one state at a time in the active branches view — the error message no longer stacks with the "no branches to delete" note and the empty-repository message. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`d12aaae`](https://github.com/EduardoLopes/cut-branches/commit/d12aaaea6e24c7666bbb1d164f69edc9602a26b2) - Apply a settings or feature-flag change to the interface right away. Toggles backed by a persisted store only took effect after restarting the app the first time they were read. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`7697d00`](https://github.com/EduardoLopes/cut-branches/commit/7697d00e894b0e467905710918a9af8258bce1ad) - refactor: enhancing type safety and utility functions for tauri commands and svelte query (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`751d397`](https://github.com/EduardoLopes/cut-branches/commit/751d39757038ff2604020886b15877db01a82c29) - Keep the branches toolbar a fixed height so the Active and Deleted views no longer differ in height, and vertically centre the search field against the filter and bulk-action controls. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`908f6d9`](https://github.com/EduardoLopes/cut-branches/commit/908f6d9358cb286e5b919d3e09d1c67e99718d8f) - refact: update how serde is used (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`7874f70`](https://github.com/EduardoLopes/cut-branches/commit/7874f70575ed82d82fc796529d840061bd5c5657) - Failures no longer pass silently: a repository refresh that rejects now shows a "Could not update repository" toast (instead of an unhandled rejection plus a false success toast), and a bulk repository add reports the reason for each path it could not add rather than a bare count. The Delete and Restore triggers also treat a still-loading selection as "nothing selected", so a click no longer opens an empty dialog. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`62bebbb`](https://github.com/EduardoLopes/cut-branches/commit/62bebbb587a2db040497fb9b4e90664ce98758b4) - Switching branches now shows an actionable error when uncommitted changes would be overwritten; branches that fail to restore are reported in a toast instead of vanishing silently; cancelling the folder picker from inside the scan dialog keeps the current results; a failed repository-list load now shows an error notification. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`95287e4`](https://github.com/EduardoLopes/cut-branches/commit/95287e49f637c39749417d4a600dbebc01be83c4) - Migrate every surface token reference to pindoba's terrain ladder: `surface.soft` → `peak`, `step.1/2/3` → `hill`/`base`/`valley`, and `deep` → `ground` (same under `accent.surface`). (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`631fa08`](https://github.com/EduardoLopes/cut-branches/commit/631fa08fe36794b88a72049439d4e4e54dd6e6ac) - Large repositories no longer freeze when selecting branches, opening the delete modal, or scrolling the branch list: branch metrics are fetched in batches over the visible window, selection updates patch the cache instead of refetching the whole list, and unchanged repositories serve their branch list from the database. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`0f67c0b`](https://github.com/EduardoLopes/cut-branches/commit/0f67c0bef90807546aef6bd20bd7977c6b897e92) - refactor: update RepositoryManagementHeader with new tab functionality (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`931ea82`](https://github.com/EduardoLopes/cut-branches/commit/931ea82658b66f615232eb6f697911db6e710f62) - Keep a long commit summary on the branch card ellipsized inside the card instead of bleeding past its edge. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`aea88f4`](https://github.com/EduardoLopes/cut-branches/commit/aea88f4df61347fd6d51c590ca4304e9213a7592) - Rework the commit card layout: the branch/history icon now flanks the commit (Thanks [@EduardoLopes](https://github.com/EduardoLopes))
  message, the subject reads as a heading, and author · relative date share a
  single trailing meta line.

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`f8de56f`](https://github.com/EduardoLopes/cut-branches/commit/f8de56f0203fd51fe5c3a8179726b8bc001b446f) - Fix backend branch-management bugs: repositories with a detached HEAD can now be opened, listed and synced; batch branch deletion pre-validates every name so a partial delete can no longer lose branches; restoring with the Overwrite strategy is atomic and batch restores report per-item failures instead of aborting; and branch restore/reachability resolve commit SHAs strictly instead of accepting arbitrary revspecs. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`476fad9`](https://github.com/EduardoLopes/cut-branches/commit/476fad9fa18f09f708e6df7f892a489536f6f1ab) - feat: implement automatic query invalidation and resource-based keys for tauri mutations and queries (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`5791036`](https://github.com/EduardoLopes/cut-branches/commit/5791036e25db27462597d3ddf2b5e1423274fec5) - Match filesystem watcher events precisely against each repository's ref surface. A linked worktree's private git directory lives inside the main repository's `.git`, so the previous prefix match fanned a single ref change out to the main repository and every registered worktree, triggering N redundant re-syncs. Only shared `refs/heads/**` and `packed-refs` now match several repositories; `HEAD` matches exactly one. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`605d1c4`](https://github.com/EduardoLopes/cut-branches/commit/605d1c438d100ea8b2b499dc5f36c5e661dd3963) - feat: add utils for svelte query and mutation (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`8428248`](https://github.com/EduardoLopes/cut-branches/commit/8428248621ee87a9a9ebe35486b9edc5fb0adecd) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [#33](https://github.com/EduardoLopes/cut-branches/pull/33) [`d398647`](https://github.com/EduardoLopes/cut-branches/commit/d3986478ba5dbe102a283b697f52ec587b08a166) - Fix repositories whose `.git` is a pointer file (linked worktrees, submodules) never re-syncing: the state fingerprint and the filesystem watcher now resolve the real git directories through git2 instead of assuming `<root>/.git`. Repositories with no commits yet (unborn HEAD) can now be added, and removing a repository that is no longer in the database reports an error instead of a false success. (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

## 0.5.0

### Minor Changes

- [`f48d66e`](https://github.com/EduardoLopes/cut-branches/commit/f48d66e3047b062135d1c2f5771ec0fad6a798b6) - feat(branches): implement restore functionality for deleted branches (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

### Patch Changes

- [`c910ca9`](https://github.com/EduardoLopes/cut-branches/commit/c910ca95a328e7a58d324515c349b5f229294100) - chore: update zod dependency to version 3.25.3 and adjust imports to use zod/v4 (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`4e0f100`](https://github.com/EduardoLopes/cut-branches/commit/4e0f100e345f2ddab0db792a7aa76eca02ce4a2b) - git commit -m "refactor(git): restructure git module by separating branch and commit functionalities into distinct files" (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`90f6410`](https://github.com/EduardoLopes/cut-branches/commit/90f6410313313a02606cfb539203800af757e30f) - feat: improve type safety (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`3a7afc5`](https://github.com/EduardoLopes/cut-branches/commit/3a7afc5124d9d2c16e2dbae28802ce3e4a773792) - feat(add-button): enhance error handling and notifications in repository addition process (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`61424ca`](https://github.com/EduardoLopes/cut-branches/commit/61424ca8e3c0089409e18bd6322ff6990743c74b) - feat(restore): can restore branches in a single call (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`de2ee3b`](https://github.com/EduardoLopes/cut-branches/commit/de2ee3bb0358132d1388eac017d75ace3e52b882) - docs: update README (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`c44910e`](https://github.com/EduardoLopes/cut-branches/commit/c44910e7b3e43296a0ac700b3e1630671edbe0c3) - feat(errors): add error messages descriptions (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`b884566`](https://github.com/EduardoLopes/cut-branches/commit/b8845668af4e0cec85897281f92cf895b8191d8d) - refact: better organize rust code and write tests for it. Update the front end code to the backend changes (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`87b6cf6`](https://github.com/EduardoLopes/cut-branches/commit/87b6cf6415d8445905b5b045e2f2aeef7ffcc201) - feat(coverage): integrate cargo-tarpaulin for Rust test coverage and update documentation (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`a10fb92`](https://github.com/EduardoLopes/cut-branches/commit/a10fb9295f100d06beb6e5c47ac6e32bf7497ae9) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`a270f76`](https://github.com/EduardoLopes/cut-branches/commit/a270f7638a5b13292541bd1a70394a40638ffffb) - chore: configure apple certificate (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`e220072`](https://github.com/EduardoLopes/cut-branches/commit/e220072f93d70c8955dd9c558f6e2ee4260e4224) - "fix(repository): change how store for repository is is handled" (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`c94159c`](https://github.com/EduardoLopes/cut-branches/commit/c94159cf34af67c50d15b01e8f5fb20f32dd79ab) - test: write more tests including integration tests (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`cab2094`](https://github.com/EduardoLopes/cut-branches/commit/cab2094467aee87fc97d17178e1d4c24142ce9c3) - feat(menu): sort menu items by label (again) (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`f60b8c2`](https://github.com/EduardoLopes/cut-branches/commit/f60b8c21a45f566af7d3be730ce312ebce6e6ca9) - style(footer): tweak visuals (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`9e4508e`](https://github.com/EduardoLopes/cut-branches/commit/9e4508efc27c2885eff654abe29582d7e0a22b44) - refactor: add lots of utilities and write tests (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`cf7c0bc`](https://github.com/EduardoLopes/cut-branches/commit/cf7c0bcd92ec582d417d16580da78fc8ab64bdbc) - feat(footer): add SvelteQueryDevtools in a better place and only shows in development mode (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`8897a2d`](https://github.com/EduardoLopes/cut-branches/commit/8897a2d65a3a3e66967f9dc042be247f263761c1) - fix(menu): improve item retrieval and sorting logic (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`f58491f`](https://github.com/EduardoLopes/cut-branches/commit/f58491fa8b59515ad94e647bc8eb37010a240a1f) - fix: correct function name casing for createSwitchBranchMutation and implement safe date formatting in services (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`7878d54`](https://github.com/EduardoLopes/cut-branches/commit/7878d54bf196dc7cc21c916ea2cacf29967f448f) - refactor(git): restructure git module by separating branch and commit functionalities into distinct files and uses git2 crate (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

## 0.4.2

### Patch Changes

- [`773fe72`](https://github.com/EduardoLopes/cut-branches/commit/773fe726e2188c9544a9a8dadd04a87bba68fd79) - chore: update publish workflow (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

## 0.4.1

### Patch Changes

- [`44d2f82`](https://github.com/EduardoLopes/cut-branches/commit/44d2f828c3044c1c102b41a544ca704456ced0cf) - chore(svelte-config): update static adapter configuration (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

## 0.4.0

### Minor Changes

- [`a6acbe8`](https://github.com/EduardoLopes/cut-branches/commit/a6acbe8cd39043c23936a04d3ea9d8ae790a25c5) - feat(local-storage): integrate Zod schema validation into store classes and tests (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`343d42a`](https://github.com/EduardoLopes/cut-branches/commit/343d42a1ed7d28c7f75795762b436bd7bc67ce1d) - chore(dependencies): update to Vite 6 and Svelte plugin versions and refine Vite configuration conditions (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`eaaad5b`](https://github.com/EduardoLopes/cut-branches/commit/eaaad5ba9af210dc49e5ea02582e717629ad343f) - feat(local-storage): implement AbstractStore class and refactor MapStore, SetStore, and Store to extend it (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`d316b3e`](https://github.com/EduardoLopes/cut-branches/commit/d316b3e31e459d1bb0120fafdcf5804489333d88) - feat: change visual so the light and dark theme looks better (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`5bec744`](https://github.com/EduardoLopes/cut-branches/commit/5bec7444f1a46cad983081629f6fadcb495fafbb) - feat(lock-branch-toggle): remove branch from selected when locked (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`9930fed`](https://github.com/EduardoLopes/cut-branches/commit/9930fed69954f1cd36af47cf7fac5ddeb49beb04) - chore: update eslint-plugin-svelte, fix errors and warnings (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`dbca928`](https://github.com/EduardoLopes/cut-branches/commit/dbca9284307982ea17065d740a0123ce4148a668) - chore: update most front-end dependencies (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`ca4ed9e`](https://github.com/EduardoLopes/cut-branches/commit/ca4ed9e50fe5e099104211105f206bce53e6163f) - feat(notifications-popover): make the code robust and add more unit tests (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`7bdbafe`](https://github.com/EduardoLopes/cut-branches/commit/7bdbafe45d34630bcedf3d43197699a9c52ad735) - chore(package): update dependencies and remove optimization exclusion for @pindoba packages in Vite configuration (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

### Patch Changes

- [`5458589`](https://github.com/EduardoLopes/cut-branches/commit/5458589d9bc27213bbe7f82d83f12ca2329504c0) - feat(menu): tweak visual (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`b0db4a5`](https://github.com/EduardoLopes/cut-branches/commit/b0db4a5e8343442f988666d38280935f8e610afc) - chore(package): update test script to run vitest in silent mode (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`f6577ae`](https://github.com/EduardoLopes/cut-branches/commit/f6577aece36d5e39b0b3140dd8dd9723084d9588) - refactor(local-storage): replace getLocalStorage with getValidatedLocalStorage in AbstractStore and update related tests (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`da031e3`](https://github.com/EduardoLopes/cut-branches/commit/da031e3e1f6df840463832c9c1c945138f7c2574) - feat(local-storage): integrate Zod schema validation into MapStore, SetStore, and Store classes (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`3c860d7`](https://github.com/EduardoLopes/cut-branches/commit/3c860d75e0db0e00270cd3ec7ab012fce93be726) - refactor(remove-repository-modal): update selected branches store usage and clear order in removal process (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`9211b29`](https://github.com/EduardoLopes/cut-branches/commit/9211b29ae93a4565243d11fac462c299002b35d6) - feat(notifications-popover): improved styling (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`6d04e5e`](https://github.com/EduardoLopes/cut-branches/commit/6d04e5e7e68c69281c05b42b78bb712b97875fa4) - feat(branch): optimize select all functionality in branches bulk actions component for improved performance (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`4d6fabf`](https://github.com/EduardoLopes/cut-branches/commit/4d6fabfccb35014e260213c006e9775e3978e0f2) - test(branches-bulk-actions): update checkbox selection test to use role and aria-checked attribute (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`59a5812`](https://github.com/EduardoLopes/cut-branches/commit/59a58120b1a9e2ba90c25ab22b11f08c295b357c) - feat(local-storage): enhance setLocalStorage function with validation, error handling, and improved documentation (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`af91da6`](https://github.com/EduardoLopes/cut-branches/commit/af91da613b44e02c474b0b32482995d1b66108a1) - fix(repository-header): ensure safe access to repository state in RemoveRepositoryModal (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`a2cfe13`](https://github.com/EduardoLopes/cut-branches/commit/a2cfe13ec14580b3838b9c9f4fe704f177b57f54) - feat(branch): replace Branches component with new Repository component (divide into parts) (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`4ab43c0`](https://github.com/EduardoLopes/cut-branches/commit/4ab43c0ca1f7594cdbd763d56ddb148e47aafaab) - feat(branch): update branch component styles for improved visual (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`a9927f5`](https://github.com/EduardoLopes/cut-branches/commit/a9927f512138f4a8dc0fa2744fc8209f66984d9c) - refactor(store): add default value parameter to store constructors for improved initialization (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`5a8fb1f`](https://github.com/EduardoLopes/cut-branches/commit/5a8fb1f878b3ecbd8dac53ec74c8a81e2dd13201) - style(branch-list): add dark and light mode border styles for improved UI consistency (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`b95ee71`](https://github.com/EduardoLopes/cut-branches/commit/b95ee7123f1667b1948e7d0f4fa90b391c55b341) - fix(get-validated-local-storage): improve error handling and validation fallback for undefined values (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`37aa27c`](https://github.com/EduardoLopes/cut-branches/commit/37aa27ca9c545ad6f0349ad1e99df0e9358a7f6a) - fix(repository): ensure safe access to repository state and improve search functionality (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`5fca95b`](https://github.com/EduardoLopes/cut-branches/commit/5fca95b2e4cbe59e55f81779b1dbd219b6727d68) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`e9b9c13`](https://github.com/EduardoLopes/cut-branches/commit/e9b9c135d66027a1d302750b34316c87585e5d10) - feat(local-storage): add setValidatedLocalStorage function for schema validation and storage (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`cb5e323`](https://github.com/EduardoLopes/cut-branches/commit/cb5e3237179fe8c4ebd09f36e04027ab666be1a8) - feat(local-storage): add getValidatedLocalStorage function for retrieving and validating localStorage data with Zod schema (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`ca26dc0`](https://github.com/EduardoLopes/cut-branches/commit/ca26dc0785efd93a866d53c50d0ec0e13e389b13) - fix(add-button): don't try to add a repository twice (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`584b0e6`](https://github.com/EduardoLopes/cut-branches/commit/584b0e6a313536f21f8026004c3a16911aafd001) - feat(branch): enhance branch component layout and style (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`ec33a97`](https://github.com/EduardoLopes/cut-branches/commit/ec33a97b04e753de2e34e1522276badf6c11cd96) - test: add more tests (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`4f07adc`](https://github.com/EduardoLopes/cut-branches/commit/4f07adc5a78bcebf3142add448bff8655fa35513) - feat(local-storage): enhance getLocalStorage function with improved error handling (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`e45c2c1`](https://github.com/EduardoLopes/cut-branches/commit/e45c2c1256a932b55afe10da48577c4dabc524c4) - feat(branch): replace icons in branch component and adjust sizes for better visibility (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

## 0.3.1

### Patch Changes

- [`e9f983e`](https://github.com/EduardoLopes/cut-branches/commit/e9f983ecb2e23b8cba5adecb749d424e1f29dcbd) - style: update background color in branches component (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`c066f1f`](https://github.com/EduardoLopes/cut-branches/commit/c066f1f01508afd9dac60846c34ff674b0267676) - feat: update footer text color for improved contrast (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

## 0.3.0

### Minor Changes

- [`8a504eb`](https://github.com/EduardoLopes/cut-branches/commit/8a504eb6014bec471af01120bfca891d2e805310) - feat(branch): can lock branches (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`f7e8a91`](https://github.com/EduardoLopes/cut-branches/commit/f7e8a917f8e638b49a9af6d8720de1f393a163dd) - feat(notifications): implement infinite scroll for notifications popover (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`1d336ba`](https://github.com/EduardoLopes/cut-branches/commit/1d336ba497087cccbf01e5ae08a233ad30fe9059) - feat(branch): show last commit details (Thanks [@EduardoLopes](https://github.com/EduardoLopes))
  - show the right information for not fully merged branches (it was inverted)
  - change how colors is handled in the branch component

- [`20cf330`](https://github.com/EduardoLopes/cut-branches/commit/20cf330938dadb677d6bfb71ad2c12b13b7b1f3b) - feat(branch): implement switch branch functionality with UI integration (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

### Patch Changes

- [`40c295f`](https://github.com/EduardoLopes/cut-branches/commit/40c295fb5696b9c7810086877b2a24a16fe918be) - refactor: change selected branches storage from arrays to sets for improved uniqueness handling and performance (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`227dbce`](https://github.com/EduardoLopes/cut-branches/commit/227dbce37268b72881b8221c14b8b1f600efd4aa) - Update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`e8823c6`](https://github.com/EduardoLopes/cut-branches/commit/e8823c64f7332055169afdd6e37dc4b32e3fff00) - fix(branch): remove angle brackets from last commit email (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`1bb4899`](https://github.com/EduardoLopes/cut-branches/commit/1bb4899d59ae40f99df27fe7cdf740ad4d8caf37) - refactor: update search branches store (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`8b63b00`](https://github.com/EduardoLopes/cut-branches/commit/8b63b00619eb559b2a389285558c238f9a41e982) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`a5aac2f`](https://github.com/EduardoLopes/cut-branches/commit/a5aac2fe658c4c381c9aca91cfc3e82344aa2fb9) - fix(notifications-popover): reset page number on opening notification popover (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`da12892`](https://github.com/EduardoLopes/cut-branches/commit/da12892b44714d5b324046ce5b77fd7bbcb42fa7) - fix(branches): update locked and selected branches retrieval to use repository name (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`0fe69f4`](https://github.com/EduardoLopes/cut-branches/commit/0fe69f4a82d5d70a7a10f8d333c0446caed1ec15) - fix(path): update error messages to use markdown formatting (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`352310b`](https://github.com/EduardoLopes/cut-branches/commit/352310b787726d6d33ab9d1399effe9d1960a464) - feat(shell): add tauri-plugin-shell and integrate into main application (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`a9de03b`](https://github.com/EduardoLopes/cut-branches/commit/a9de03b7214bab2278b67c10df0debc31760f200) - feat: add package.json version and update footer to display it (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`0917b4b`](https://github.com/EduardoLopes/cut-branches/commit/0917b4b1c3c4f091b2b977f62722db8de17e6e59) - feat(notification): enhance delete branch notifications with markdown formatting (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`ed1f58b`](https://github.com/EduardoLopes/cut-branches/commit/ed1f58bd06fcad1317e3ef5736f6cd7df88ff291) - fix(branches-bulk-actions): correct singular/plural wording in selection info (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`6c60f85`](https://github.com/EduardoLopes/cut-branches/commit/6c60f859f23c4862d083df02478157917fd4587c) - fix(branch): change last commit date format from months to days (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`53d2278`](https://github.com/EduardoLopes/cut-branches/commit/53d2278c8ee54db88c9b211e258c176801aa26e4) - feat: add Markdown support for notifications and error messages (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`4bb148f`](https://github.com/EduardoLopes/cut-branches/commit/4bb148ff096eca376f2001001c9178c053d4f071) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`d323e7d`](https://github.com/EduardoLopes/cut-branches/commit/d323e7d224fba33245f816ff50b2a494d794f2c6) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`3051b0d`](https://github.com/EduardoLopes/cut-branches/commit/3051b0d13bfdae9d2886319a9b09d8fe58f2d356) - fix(notifications-popover): correct open state behavior (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`9a7d1f9`](https://github.com/EduardoLopes/cut-branches/commit/9a7d1f9a157b8b3211540de9f99b1588cfdcb1e6) - fix(branches): disable button while switching branche (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`725cbe7`](https://github.com/EduardoLopes/cut-branches/commit/725cbe70ef8b6d9e15a026816ea4e35a5c312200) - refactor(repositories): rename repos store and update throughout the codebase (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`430ed51`](https://github.com/EduardoLopes/cut-branches/commit/430ed51f822e1bbca24b1fb3c0b5213271bd5567) - feat(main.rs): sort branches by current status (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`c1610ae`](https://github.com/EduardoLopes/cut-branches/commit/c1610aedd9a6cdafe0dfb6430be628c38aab7459) - feat(repositories): enhance repository management and navigation logic (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`97ee9af`](https://github.com/EduardoLopes/cut-branches/commit/97ee9af93de40062b8c89a3fe46d4fb49c57c9ca) - fix: update get_current_branch command to retrieve current branch name even when HEAD is detached (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`3850909`](https://github.com/EduardoLopes/cut-branches/commit/38509098ffbd77961d6e069fd81bbc930590a149) - chore: update svelte (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`c88ef2b`](https://github.com/EduardoLopes/cut-branches/commit/c88ef2b33d7b9ba49c7a6f8651d41764891e573d) - fix(repositories): update existing repository instead of ignoring duplicates (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`d6e9591`](https://github.com/EduardoLopes/cut-branches/commit/d6e959141782c679d3e10eb8c759cb919d3f7bc9) - refactor: enhance add-button component (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`e13c49b`](https://github.com/EduardoLopes/cut-branches/commit/e13c49b8ec15fbabfb67e59fa408b07c7a4efb7a) - refactor: convert locked branches store from arrays to sets (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`b33ed37`](https://github.com/EduardoLopes/cut-branches/commit/b33ed37d70759ae100cd37ca455294a959d3220f) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`60a4b75`](https://github.com/EduardoLopes/cut-branches/commit/60a4b75926d660a11eeda7ea45af0a5118b0db69) - feat(format-date): update date format to include time (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`54c8086`](https://github.com/EduardoLopes/cut-branches/commit/54c8086021c8f92375b56a9d72bd2adf26724445) - feat(branch): update selected branches on branch switch (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`7e027f3`](https://github.com/EduardoLopes/cut-branches/commit/7e027f38836cd844fb67bbaf6ff81fc5775c19a0) - refactor: integrate repository creation logic directly in one call (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`0da518e`](https://github.com/EduardoLopes/cut-branches/commit/0da518e0320ce1c2b3ac2317ade6abc92e247455) - fix(notifications): allow custom notification id or generate a new one (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`0e08594`](https://github.com/EduardoLopes/cut-branches/commit/0e085941b458c7fe64ad115be008b8dbc1206a78) - chore: update deps (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`73d4190`](https://github.com/EduardoLopes/cut-branches/commit/73d41906c29eb6a4bbd45b351b92ef9f6278d4b6) - refactor(notifications): notification store is a class that uses svelte 5 features (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`78827bb`](https://github.com/EduardoLopes/cut-branches/commit/78827bb9e0dd4f658fe51260cbfbc2f71e4bee15) - feat(layout): add footer component and integrate last updated timestamp (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`dd8b2cf`](https://github.com/EduardoLopes/cut-branches/commit/dd8b2cf78d013bf643e6e9e864d51454b26b2157) - feat(branch): update selected branches when locking branches (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`ca3ef0d`](https://github.com/EduardoLopes/cut-branches/commit/ca3ef0d6d514854c1f9c3140081f96c51facd082) - refactor: this is a big commit that rewrite all stores (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`dfcbbd1`](https://github.com/EduardoLopes/cut-branches/commit/dfcbbd1a8b352375eabee80d8c9644e5bb0d9db2) - refactor(selected): remove deprecated selected store and integrate new selected branches store (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`afd4bc3`](https://github.com/EduardoLopes/cut-branches/commit/afd4bc32cd722d44a95a1d2e36e71bb2375d7aca) - feat(notifications-popover): tweak visuals (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- refactor: enhance remove-repository-modal by clearing search and selected repository states on removal

- [`d2736c7`](https://github.com/EduardoLopes/cut-branches/commit/d2736c746a6b2e15eef4c19a452079df8488c116) - refactor: extract local storage logic into set-local-storage utility function (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`2c6a639`](https://github.com/EduardoLopes/cut-branches/commit/2c6a6393daf295bb11349016515ffd1f4485ac0c) - chore: update version to 0.3.1 in tauri configuration (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

## 0.2.2

### Patch Changes

- [`7bfaf67`](https://github.com/EduardoLopes/cut-branches/commit/7bfaf677431c338450f4e2a3a7ad061d4c8b9c8b) - chore: patch changeset git changelog module (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`20e6edb`](https://github.com/EduardoLopes/cut-branches/commit/20e6edb864e75cba102d6ef64a37e5159ba6f3ee) - chore: add custom changeset commit message (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

- [`06fb158`](https://github.com/EduardoLopes/cut-branches/commit/06fb158684efd732a42ca04ae7d4bb3f65d3f7d4) - chore: changeset output changelog in github format (Thanks [@EduardoLopes](https://github.com/EduardoLopes))

## 0.2.1

### Patch Changes

- 0fe0a79: chore: remove unplugin-icons

## 0.2.0

### Minor Changes

- Uses pindoba ui and svelte 5 (this is a big update)
