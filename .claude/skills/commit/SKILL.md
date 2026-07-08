---
name: commit
description: Generate a conventional commit message from staged changes and create the commit. Follows Conventional Commits 1.0.0 with cut-branches domain/scope conventions.
allowed-tools: Bash
---

# Generate Conventional Commit Message

Analyze staged changes and create a conventional commit. Works with focused, single-purpose commits by default.

**Flags:**

- `-m "message"` — Provide a commit message to validate and format (skips file analysis, saves tokens)
- `--split` — Enable multi-commit atomic splitting (disabled by default)

---

## Quick Path: Message Mode (-m flag)

If user invokes with `-m "message"`, follow this streamlined path:

### Step M1 — Parse & Validate Message

Extract message and verify format: `<type>[optional scope]: <description>`

Validate/auto-fix:

- **Type**: must be one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert` (convert to lowercase if needed)
- **Scope**: validate against the conventions in Step 3, or infer from staged files if missing
- **Description**: ensure lowercase, imperative mood, no trailing period, max 72 chars total

### Step M2 — Show Preview & Confirm

Display the formatted message and ask: "Commit with this message? (yes/no)"

If user confirms, proceed to Step M3. Otherwise, exit.

### Step M3 — Check Changesets (if needed)

If type is `feat`, `fix`, or `refactor` and the change is user-facing, check whether a changeset is required (see Step 5 below). Create if needed.

### Step M4 — Create Commit

```bash
git commit -m "<validated message>"
```

Done! Token savings: ~75% vs full analysis.

---

## Standard Path: File Analysis (default)

If `-m` flag is NOT provided, follow the full analysis path below:

## Step 1 — Check Staged Changes

Run to see what's staged:

```bash
git diff --cached --stat
```

If nothing is staged, inform the user and ask: "Would you like to stage some changes first?" Exit unless the user confirms.

## Step 2 — Examine Diff (Conditional)

If the diff is **small** (<50 lines total), show the full diff:

```bash
git diff --cached --unified=1
```

If the diff is **large** (>50 lines), show only the stat and ask: "Full diff is large (X lines). See it? (yes/no)" — only show full diff if user confirms.

**Note:** Skip showing unstaged changes entirely. The `--split` flag (below) handles multi-commit workflows.

## Step 3 — Determine Scope

This is a single-package Tauri desktop app (not a monorepo). Scope reflects the **domain or global directory** the change belongs to.

For changes inside a **domain** (`src/domains/<name>/`), use the domain name as scope:

- `src/domains/branch-management/` → scope: `branch-management`
- `src/domains/repository-management/` → scope: `repository-management`
- `src/domains/repository-cleanup/` → scope: `repository-cleanup`
- `src/domains/repository-navigation/` → scope: `repository-navigation`
- `src/domains/app-settings/` → scope: `app-settings`
- `src/domains/onboarding/` → scope: `onboarding`

For **global / cross-cutting** frontend directories, use the directory name:

- `src/ui/` → scope: `ui` (or the component name for a focused change, e.g. `footer`)
- `src/utils/` → scope: `utils`
- `src/services/` → scope: `services`
- `src/core/` → scope: `core`
- `src/infrastructure/` → scope: `infrastructure`
- `src/store/` → scope: `store`
- `src/styles/` → scope: `theme` or `styles`
- `src/routes/`, layout shells → scope: `layout` (routes are thin; usually prefer the domain they compose)

For the **Rust/Tauri backend** (`src-tauri/`), use:

- `backend` for general backend changes
- a narrower scope when it fits: `db`, `tauri`, `git`
- match the domain when the backend code maps to one (e.g. `repository-management`)

For **tooling / meta**:

- dependency bumps → `deps` (e.g. `chore(deps): ...`)
- CI, build config, lint/format config → omit scope or use `ci` / `build`

**Multiple files, one concern:** use the shared concept as scope. **Truly cross-cutting** (no single owner): omit the scope.

## Step 4 — Write the Commit Message

Follow these rules:

- **Format**: `<type>[optional scope]: <description>`
- **Type** (lowercase): `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- **Scope**: wrapped in parentheses, determined in Step 3
- **Description**: lowercase, imperative mood, no trailing period, max 72 chars total on subject line
- **Body**: only if it adds useful context not obvious from the subject; wrap at 72 chars
- **Breaking changes**: add `!` after scope, or add `BREAKING CHANGE:` footer

**Examples:**

```
feat(repository-management): add search filter to find-repositories modal
fix(repository-cleanup): keep accordion chevron visible with long paths
refactor(settings): unify settings pages on shared section patterns
feat(repository-cleanup)!: discover cleanup targets from .gitignore only
fix(db): stop recurring database is locked errors from pooled connections
chore(deps): update frontend dependencies
docs(adr): add static assets strategy decision record
```

## Step 5 — Changesets (if needed)

This app uses [Changesets](https://github.com/changesets/changesets) with a single package, **`cut-branches`**. A changeset drives the app's version bump and changelog entry.

**When a changeset is needed** (user-facing `feat`, `fix`, or `refactor`):

1. Create `.changeset/<slug>.md`:

   ```markdown
   ---
   'cut-branches': patch
   ---

   Short description of the user-facing change.
   ```

2. Bump level: `patch` for fixes/refactors, `minor` for features, `major` for breaking changes.
3. The package name is always `'cut-branches'` (matches `package.json` `name`).
4. Stage the changeset file together with the code changes.

**When NOT needed**: `chore` (including `chore(deps)`), `ci`, `build`, `test`, `docs`, and `style` changes — none of these change runtime behavior for the user.

## Step 6 — Create the Commit

```bash
git commit -m "<your commit message>"
```

**IMPORTANT**: Never add `Co-Authored-By`, `Signed-off-by`, or trailer lines.

If a pre-commit hook fails, report the error and don't retry without fixing the issue. (Exception: a coverage-threshold failure on a change with no testable surface may be bypassed with `git commit -n`.)

---

## Optional: Multi-Commit Splitting (--split flag)

If user invokes with `--split` flag, enable Step 2B:

### Step 2B — Split Into Atomic Commits (--split only)

**Always split** changes into the smallest meaningful commits. Each represents exactly one logical concern.

Split if:

- Changes have different `type`s (e.g., `fix` and `feat`) → split
- Changes touch different scopes/domains with no shared reason (e.g., `repository-management` and `theme`) → split
- A reviewer could revert one without affecting the other → split

**Exception**: Changes tightly coupled (meaningless apart) may stay together.

For each group:

1. Stage only files for that group: `git add <files>` (never `git add -A`/`.`/`-u`)
2. Commit with appropriate message (Step 4)
3. Repeat for remaining groups

**Do not ask** — split proactively.
