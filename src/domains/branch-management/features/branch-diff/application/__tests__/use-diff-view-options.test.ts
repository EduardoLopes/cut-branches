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
	it('persists the view mode alongside the other options', () => {
		useDiffViewOptions().update({ viewMode: 'canvas' });

		const restored = useDiffViewOptions();
		expect(restored.options.viewMode).toBe('canvas');
		expect(restored.options.layout).toBe('unified');
	});

	it('persists the explanation style and detail alongside the other options', () => {
		useDiffViewOptions().update({ explanationStyle: 'reviewFocused', explanationDetail: 'hunks' });

		const restored = useDiffViewOptions();
		expect(restored.options.explanationStyle).toBe('reviewFocused');
		expect(restored.options.explanationDetail).toBe('hunks');
		expect(restored.options.layout).toBe('unified');
	});

	it('accepts payloads stored before the view mode / explanation options existed', () => {
		// A pre-canvas payload has none of viewMode / explanationStyle /
		// explanationDetail — it must still validate and keep the other prefs.
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ layout: 'split', variant: 'markers', gutter: 'double', wrap: true })
		);

		const view = useDiffViewOptions();
		expect(view.options.layout).toBe('split');
		expect(view.options.viewMode).toBe('list');
		expect(view.options.explanationStyle).toBe('succinct');
		expect(view.options.explanationDetail).toBe('file');
	});
});
