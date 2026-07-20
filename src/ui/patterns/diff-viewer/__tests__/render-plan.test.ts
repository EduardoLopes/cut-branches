import { describe, expect, it } from 'vitest';
import { buildRenderPlan, type RenderItem } from '../render-plan';
import type { DiffViewerHunk, DiffViewerLine } from '../types';

const line = (content: string, kind: DiffViewerLine['kind'] = 'context'): DiffViewerLine => ({
	kind,
	content,
	oldLineNo: 1,
	newLineNo: 1
});

const hunk = (overrides: Partial<DiffViewerHunk> = {}): DiffViewerHunk => ({
	header: '@@ -1,1 +1,1 @@',
	oldStart: 1,
	oldLines: 1,
	newStart: 1,
	newLines: 1,
	lines: [line('a')],
	...overrides
});

const types = (items: RenderItem[]) => items.map((item) => item.type);

describe('buildRenderPlan', () => {
	it('emits a header then one uline per line for a plain unified hunk (no gaps)', () => {
		const items = buildRenderPlan({
			hunks: [hunk({ lines: [line('a'), line('b')] })],
			status: 'modified',
			layout: 'unified',
			includeGaps: false
		});

		expect(types(items)).toEqual(['header', 'uline', 'uline']);
	});

	it('includes gap expanders around the hunks when gaps are enabled', () => {
		// newStart 3 → a leading gap (gap-0) before the hunk; modified → a tail gap.
		const items = buildRenderPlan({
			hunks: [hunk({ newStart: 3, oldStart: 3 })],
			status: 'modified',
			layout: 'unified',
			includeGaps: true
		});

		// gap-0 expander, header, line, tail-gap expander
		expect(types(items)).toEqual(['gap', 'header', 'uline', 'gap']);
		expect(items[0]).toMatchObject({ type: 'gap', gap: { id: 'gap-0' } });
		expect(items[3]).toMatchObject({ type: 'gap', gap: { id: 'gap-tail' } });
	});

	it('renders a filled gap as its lines and drops the following hunk header', () => {
		const hunks = [
			hunk({ header: '@@ -1,1 +1,1 @@', newStart: 1, oldStart: 1, lines: [line('first')] }),
			hunk({ header: '@@ -5,1 +5,1 @@', newStart: 5, oldStart: 5, lines: [line('second')] })
		];
		const items = buildRenderPlan({
			hunks,
			status: 'modified',
			layout: 'unified',
			includeGaps: true,
			expandedGaps: new Map([['gap-1', [line('between a'), line('between b')]]])
		});

		// header(hunk0), line(first), 2 expanded lines, [header dropped], line(second), tail gap
		expect(types(items)).toEqual(['header', 'uline', 'uline', 'uline', 'uline', 'gap']);
		expect(items.map((i) => (i.type === 'header' ? i.header : null)).filter(Boolean)).toEqual([
			'@@ -1,1 +1,1 @@'
		]);
	});

	it('contributes nothing for a gap that expanded to empty, keeping its header', () => {
		const hunks = [
			hunk({ header: '@@ -1,1 +1,1 @@', newStart: 1, oldStart: 1, lines: [line('first')] }),
			hunk({ header: '@@ -5,1 +5,1 @@', newStart: 5, oldStart: 5, lines: [line('second')] })
		];
		const items = buildRenderPlan({
			hunks,
			status: 'modified',
			layout: 'unified',
			includeGaps: true,
			// gap-1 expanded to nothing, tail gap expanded to nothing.
			expandedGaps: new Map<string, DiffViewerLine[]>([
				['gap-1', []],
				['gap-tail', []]
			])
		});

		// header, line, header(kept — gap empty, not filled), line — and no gap items at all.
		expect(types(items)).toEqual(['header', 'uline', 'header', 'uline']);
	});

	it('pairs lines into split rows in split layout', () => {
		const items = buildRenderPlan({
			hunks: [
				hunk({
					lines: [line('gone', 'removed'), line('kept', 'added')]
				})
			],
			status: 'modified',
			layout: 'split',
			includeGaps: false
		});

		// A removed/added block pairs into a single split row.
		expect(types(items)).toEqual(['header', 'srow']);
	});
});
