import { computeDiffGaps, type DiffGap } from './diff-gaps';
import { pairLines, type SplitRow } from './split-lines';
import type {
	DiffViewerFileStatus,
	DiffViewerHunk,
	DiffViewerLayout,
	DiffViewerLine
} from './types';

/**
 * A single renderable unit of a diff, flattened out of the hunk/gap tree into
 * one linear list. The normal (small-diff) path renders straight from the
 * hunk structure so it can batch syntax highlighting per block; the
 * large-diff path renders from this flat plan instead, which lets it mount the
 * rows a slice at a time (see {@link buildRenderPlan}). Every visible row —
 * a code line, a hunk header, a gap expander — is exactly one item, so
 * "mount the first N rows" is just a `slice`.
 */
export type RenderItem =
	| { type: 'header'; header: string }
	| { type: 'gap'; gap: DiffGap }
	| { type: 'uline'; line: DiffViewerLine }
	| { type: 'srow'; row: SplitRow };

interface BuildRenderPlanParams {
	hunks: DiffViewerHunk[];
	status: DiffViewerFileStatus;
	layout: DiffViewerLayout;
	/** Expanded hidden-context lines per gap id (host-owned). */
	expandedGaps?: ReadonlyMap<string, DiffViewerLine[]>;
	/** Whether gap expanders are shown at all (mirrors `onExpandGap` presence). */
	includeGaps: boolean;
}

/**
 * Flattens a file diff into the exact sequence of rows the viewer renders,
 * mirroring the small-diff template one-for-one:
 *
 * - each gap becomes its expanded context lines (when filled), a single gap
 *   expander item (when untouched), or nothing (when it expanded to empty);
 * - a hunk header is emitted unless the gap before it is filled, in which case
 *   the line numbers run continuously and the header would only interrupt;
 * - lines flatten to one `uline` per line (unified) or one `srow` per paired
 *   row (split).
 *
 * Syntax highlighting is intentionally absent here: this path is only taken
 * for diffs past {@link import('./render-budget').DIFF_PROGRESSIVE_MIN_LINES},
 * which is above the highlight budget, so those rows always render plain.
 */
export function buildRenderPlan({
	hunks,
	status,
	layout,
	expandedGaps,
	includeGaps
}: BuildRenderPlanParams): RenderItem[] {
	const gaps = includeGaps ? computeDiffGaps(hunks, status) : [];
	const gapBefore = new Map<number, DiffGap>();
	let tailGap: DiffGap | undefined;
	for (const gap of gaps) {
		if (gap.beforeHunkIndex === null) {
			tailGap = gap;
		} else {
			gapBefore.set(gap.beforeHunkIndex, gap);
		}
	}

	const items: RenderItem[] = [];

	const pushLines = (lines: DiffViewerLine[]) => {
		if (layout === 'split') {
			for (const row of pairLines(lines)) {
				items.push({ type: 'srow', row });
			}
		} else {
			for (const line of lines) {
				items.push({ type: 'uline', line });
			}
		}
	};

	const pushGap = (gap: DiffGap | undefined) => {
		if (!gap) {
			return;
		}
		const expanded = expandedGaps?.get(gap.id);
		if (expanded && expanded.length > 0) {
			pushLines(expanded);
		} else if (!expanded) {
			items.push({ type: 'gap', gap });
		}
		// An expanded-to-empty gap contributes no rows.
	};

	hunks.forEach((hunk, index) => {
		const gap = gapBefore.get(index);
		pushGap(gap);
		const filled = !!gap && (expandedGaps?.get(gap.id)?.length ?? 0) > 0;
		if (!filled) {
			items.push({ type: 'header', header: hunk.header });
		}
		pushLines(hunk.lines);
	});
	pushGap(tailGap);

	return items;
}
