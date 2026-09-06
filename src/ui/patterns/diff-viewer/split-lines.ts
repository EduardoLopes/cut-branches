import type { DiffViewerLine } from './types';

/**
 * One visual row of the split (side-by-side) layout. `left`/`right` are
 * `null` when the row has no counterpart on that side (an unpaired removal
 * or addition). The indices point back into the source line array so callers
 * can zip per-line data (syntax tokens) computed over that array.
 */
export interface SplitRow {
	left: DiffViewerLine | null;
	leftIndex: number | null;
	right: DiffViewerLine | null;
	rightIndex: number | null;
	/** The row's representative line — the new side when present, else the
	 *  old side. Annotations attach to it. Every row has at least one side,
	 *  so this is never null. */
	primary: DiffViewerLine;
}

/**
 * Pairs a run of diff lines into side-by-side rows: context lines occupy
 * both sides, and each removed-run/added-run block is aligned index-wise so
 * the Nth removed line faces the Nth added line (the familiar review-tool
 * pairing). Uneven runs leave the shorter side empty.
 */
export function pairLines(lines: DiffViewerLine[]): SplitRow[] {
	const rows: SplitRow[] = [];
	let i = 0;
	while (i < lines.length) {
		if (lines[i].kind === 'context') {
			rows.push({
				left: lines[i],
				leftIndex: i,
				right: lines[i],
				rightIndex: i,
				primary: lines[i]
			});
			i += 1;
			continue;
		}
		const removed: number[] = [];
		const added: number[] = [];
		while (i < lines.length && lines[i].kind === 'removed') {
			removed.push(i);
			i += 1;
		}
		while (i < lines.length && lines[i].kind === 'added') {
			added.push(i);
			i += 1;
		}
		const length = Math.max(removed.length, added.length);
		for (let j = 0; j < length; j += 1) {
			const leftIndex = removed[j] ?? null;
			const rightIndex = added[j] ?? null;
			const left = leftIndex === null ? null : lines[leftIndex];
			const right = rightIndex === null ? null : lines[rightIndex];
			rows.push({ left, leftIndex, right, rightIndex, primary: (right ?? left) as DiffViewerLine });
		}
	}
	return rows;
}
