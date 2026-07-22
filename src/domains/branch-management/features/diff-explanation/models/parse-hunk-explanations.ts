/**
 * Splits the marker-delimited per-hunk explanation stream back into sections.
 *
 * The backend prompt has the agent echo a `@@HUNK <n>@@` marker line before
 * each hunk's explanation (see `build_hunk_prompt`). This parser re-runs over
 * the whole accumulated buffer on every streamed update — robust to a marker
 * arriving split across two deltas: it simply resolves on the next re-parse.
 */
export interface ParsedHunkExplanation {
	/** 1-based hunk number from the marker. */
	index: number;
	/** Explanation text for that hunk (trimmed). */
	text: string;
}

/** Matches a `@@HUNK 3@@` marker occupying its own line. */
const MARKER = /^@@HUNK (\d+)@@[ \t]*$/gm;

/**
 * Parses marker-delimited text into ordered per-hunk sections. Text before the
 * first marker (a preamble the agent shouldn't produce) is ignored. Returns an
 * empty array when no marker is present yet.
 */
export function parseHunkExplanations(raw: string): ParsedHunkExplanation[] {
	const matches = [...raw.matchAll(MARKER)];
	return matches.map((match, i) => {
		const start = (match.index ?? 0) + match[0].length;
		const end = i + 1 < matches.length ? (matches[i + 1].index ?? raw.length) : raw.length;
		return {
			index: Number(match[1]),
			text: raw.slice(start, end).trim()
		};
	});
}
