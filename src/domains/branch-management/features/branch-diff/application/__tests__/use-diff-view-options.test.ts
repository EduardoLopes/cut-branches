import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DIFF_VIEW_OPTIONS, useDiffViewOptions } from '../use-diff-view-options.svelte';

const STORAGE_KEY = 'diff-view-options';

beforeEach(() => {
	localStorage.clear();
});

describe('useDiffViewOptions', () => {
	it('starts from the defaults when nothing is stored', () => {
		const view = useDiffViewOptions();

		expect(view.options).toEqual(DEFAULT_DIFF_VIEW_OPTIONS);
	});

	it('applies a partial update without dropping other fields', () => {
		const view = useDiffViewOptions();

		view.update({ layout: 'split' });
		expect(view.options.layout).toBe('split');
		expect(view.options.variant).toBe('background');

		view.update({ wrap: true });
		expect(view.options.wrap).toBe(true);
		expect(view.options.layout).toBe('split');
	});

	it('persists updates so a fresh instance restores them', () => {
		useDiffViewOptions().update({ variant: 'markers', gutter: 'double' });

		const restored = useDiffViewOptions();
		expect(restored.options.variant).toBe('markers');
		expect(restored.options.gutter).toBe('double');
		expect(restored.options.layout).toBe('unified');
	});

	it('falls back to the defaults when the stored value is invalid', () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout: 'diagonal' }));

		const view = useDiffViewOptions();
		expect(view.options).toEqual(DEFAULT_DIFF_VIEW_OPTIONS);
	});
});
