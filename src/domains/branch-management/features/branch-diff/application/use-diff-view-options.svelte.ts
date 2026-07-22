import { z } from 'zod/v4';
import type { ExplanationStyle } from '$infrastructure/bindings';
import type {
	DiffViewerGutter,
	DiffViewerLayout,
	DiffViewerVariant
} from '$ui/patterns/diff-viewer/types';
import { getValidatedLocalStorage } from '$utils/get-validated-local-storage';
import { setValidatedLocalStorage } from '$utils/set-validated-local-storage';

const STORAGE_KEY = 'diff-view-options';

const diffViewOptionsSchema = z.object({
	layout: z.enum(['unified', 'split']),
	variant: z.enum(['background', 'markers', 'bars']),
	gutter: z.enum(['single', 'double']),
	wrap: z.boolean(),
	// Defaulted (not required) so payloads stored before the canvas mode
	// existed still validate instead of dropping the user's other prefs.
	viewMode: z.enum(['list', 'canvas']).default('list'),
	// Same forward-compatible default: payloads stored before AI explanations
	// existed still validate, falling back to the succinct style.
	explanationStyle: z
		.enum(['succinct', 'detailed', 'reviewFocused', 'plainLanguage'])
		.default('succinct'),
	// Whether an explanation covers the whole file (one summary) or each change
	// group (inline per-hunk). Chosen up front so the first Explain click runs
	// the intended mode.
	explanationDetail: z.enum(['file', 'hunks']).default('file')
});

/** Whole-file summary vs per-change-group (inline) explanations. */
export type ExplanationDetail = 'file' | 'hunks';

/** How the changed files are presented. */
export type DiffViewMode = 'list' | 'canvas';

/** The user's presentation preferences for rendered diffs. */
export interface DiffViewOptions {
	layout: DiffViewerLayout;
	variant: DiffViewerVariant;
	gutter: DiffViewerGutter;
	wrap: boolean;
	viewMode: DiffViewMode;
	explanationStyle: ExplanationStyle;
	explanationDetail: ExplanationDetail;
}

export const DEFAULT_DIFF_VIEW_OPTIONS: DiffViewOptions = {
	layout: 'unified',
	variant: 'background',
	gutter: 'single',
	wrap: false,
	viewMode: 'list',
	explanationStyle: 'succinct',
	explanationDetail: 'file'
};

/**
 * Reactive diff presentation options, persisted across sessions. Delivery-
 * layer UI state: how diffs are drawn, never what they contain.
 */
export function useDiffViewOptions(): {
	readonly options: DiffViewOptions;
	update(partial: Partial<DiffViewOptions>): void;
} {
	// With a default supplied the util always resolves to a usable value —
	// the stored one when valid, the default otherwise.
	const stored = getValidatedLocalStorage(
		STORAGE_KEY,
		diffViewOptionsSchema,
		DEFAULT_DIFF_VIEW_OPTIONS
	);
	const options = $state<DiffViewOptions>({ ...DEFAULT_DIFF_VIEW_OPTIONS, ...stored.data });

	function update(partial: Partial<DiffViewOptions>): void {
		Object.assign(options, partial);
		setValidatedLocalStorage(STORAGE_KEY, { ...options }, diffViewOptionsSchema);
	}

	return {
		get options() {
			return options;
		},
		update
	};
}
