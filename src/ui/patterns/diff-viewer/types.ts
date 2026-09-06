/**
 * Structural types the diff viewer renders. They are intentionally
 * shape-compatible with the Tauri bindings' `DiffLine`/`DiffHunk`/
 * `FileChangeStatus` so domain code can pass binding values straight through,
 * while the viewer itself stays free of infrastructure imports.
 */

export type DiffViewerLineKind = 'context' | 'added' | 'removed';

export interface DiffViewerLine {
	kind: DiffViewerLineKind;
	content: string;
	/** 1-based line number on the old side; `null` for added lines. */
	oldLineNo: number | null;
	/** 1-based line number on the new side; `null` for removed lines. */
	newLineNo: number | null;
}

export interface DiffViewerHunk {
	header: string;
	oldStart: number;
	oldLines: number;
	newStart: number;
	newLines: number;
	lines: DiffViewerLine[];
}

export type DiffViewerFileStatus = 'added' | 'deleted' | 'modified' | 'renamed';

/** Layout of the rendered diff: one column or side-by-side. */
export type DiffViewerLayout = 'unified' | 'split';

/**
 * How a line signals added/removed:
 * - `background` — full-row green/red wash (review-tool look)
 * - `markers` — classic `+`/`−` marker column, tinted gutter, no row wash
 * - `bars` — colored bar on the row's leading edge with a subtle wash
 */
export type DiffViewerVariant = 'background' | 'markers' | 'bars';

/** One number column (the line's own side) or the classic old/new pair. */
export type DiffViewerGutter = 'single' | 'double';

/** Payload of the optional token hover callback. */
export interface DiffViewerTokenHover {
	/** Text of the hovered token run. */
	content: string;
	/** The diff line the run belongs to. */
	line: DiffViewerLine;
}
