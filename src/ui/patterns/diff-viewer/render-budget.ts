import type { DiffViewerHunk, DiffViewerLine } from './types';

/**
 * Render budgets for large diffs.
 *
 * Shiki's JS regex engine costs roughly 0.3ms per line of code on a typical
 * machine (measured on this repo's own TypeScript at 1k/8k/20k lines), and it
 * runs synchronously on the main thread. The DOM side scales the same way:
 * every diff line mounts a grid row plus one span per syntax token. Both
 * costs are fine for everyday diffs and pathological for huge ones, so the
 * viewer degrades in steps instead of freezing:
 *
 * 1. Above {@link DIFF_HIGHLIGHT_MAX_LINES} syntax highlighting is skipped —
 *    lines render as plain text (single text node per line) and the
 *    tokenize-then-rerender double pass disappears.
 * 2. Above {@link DIFF_PROGRESSIVE_MIN_LINES} the rows are mounted
 *    progressively — a first batch synchronously, the rest in
 *    `requestAnimationFrame` chunks — so the main thread never blocks on
 *    instantiating tens of thousands of row blocks at once. This is the tier
 *    that keeps an 8000+ line diff from freezing the tab on open.
 * 3. Hosts can gate rendering entirely above
 *    {@link DIFF_RENDER_GATE_LINES}, showing a message with an explicit
 *    "show diff" affordance. With progressive mounting in place this is a
 *    courtesy ("this will take a moment"), not a freeze guard — clicking
 *    "show diff" streams the rows in instead of locking up.
 *
 * Note on `content-visibility: auto`: it looks tempting as native
 * virtualization, but it size-contains off-screen rows to zero inline width,
 * which collapses the `min-width: max-content` horizontal-scroll wrapper (long
 * lines become unreachable) and makes every scroll flip rows between 0 and
 * their real width — perturbing the container's max-content and forcing an
 * O(rows) relayout per frame (a hard scroll freeze in WebKit). The viewer
 * therefore keeps rows in normal flow and relies on progressive mounting alone.
 */

/**
 * Highlighting budget: ~0.3ms/line puts 1000 lines at roughly 300ms of
 * blocking tokenization — the upper edge of "brief pause". Beyond it the
 * viewer renders plain text.
 */
export const DIFF_HIGHLIGHT_MAX_LINES = 1000;

/**
 * Row count above which the viewer mounts progressively instead of all at
 * once. Set above {@link DIFF_HIGHLIGHT_MAX_LINES}: below it a diff both
 * highlights and mounts synchronously (its full DOM in one tick is cheap
 * enough), above it highlighting is already off and the synchronous mount is
 * what would stutter, so those rows stream in across frames.
 */
export const DIFF_PROGRESSIVE_MIN_LINES = 2000;

/**
 * Rows mounted synchronously on the first paint of a progressive diff — enough
 * to fill a tall viewport with overscan so the visible area is populated
 * immediately, while the remainder streams in.
 */
export const DIFF_PROGRESSIVE_INITIAL_BATCH = 300;

/**
 * Rows added per `requestAnimationFrame` tick while a progressive diff fills
 * in. Plain rows are cheap, so a generous batch still stays well inside a frame
 * budget while draining tens of thousands of rows in well under a second.
 */
export const DIFF_PROGRESSIVE_FRAME_BATCH = 400;

/**
 * Line count above which hosts should ask before rendering at all: even
 * streamed in, mounting this many rows is a heavy operation, so it should be
 * the user's call. Progressive mounting means saying yes no longer freezes the
 * tab — the rows fill in over a beat.
 */
export const DIFF_RENDER_GATE_LINES = 5000;

/**
 * Total lines a diff will render: every hunk's lines plus any expanded
 * hidden-context lines.
 */
export function countDiffLines(
	hunks: ReadonlyArray<Pick<DiffViewerHunk, 'lines'>>,
	expandedGaps?: ReadonlyMap<string, readonly DiffViewerLine[]>
): number {
	let total = 0;
	for (const hunk of hunks) {
		total += hunk.lines.length;
	}
	if (expandedGaps) {
		for (const lines of expandedGaps.values()) {
			total += lines.length;
		}
	}
	return total;
}
