import type { ThemedToken } from 'shiki';
import { tokenStyle } from './token-style';

/**
 * A renderable slice of one line: its text, the syntax-highlight style it
 * inherits from the shiki token it came from, and whether it falls inside a
 * search match (rendered with a mark wash).
 */
export interface MarkedRun {
	content: string;
	style?: string;
	marked: boolean;
}

/** Case-insensitive `[start, end)` ranges of every `term` occurrence. */
export function findMatchRanges(content: string, term: string): Array<[number, number]> {
	const needle = term.trim().toLowerCase();
	if (!needle) {
		return [];
	}
	const haystack = content.toLowerCase();
	const ranges: Array<[number, number]> = [];
	let index = haystack.indexOf(needle);
	while (index !== -1) {
		ranges.push([index, index + needle.length]);
		index = haystack.indexOf(needle, index + needle.length);
	}
	return ranges;
}

/**
 * Splits a line into runs that respect BOTH boundaries at once: shiki token
 * edges (for syntax color) and search-match edges (for the mark wash). A
 * match spanning several tokens marks every affected slice, and a match in
 * the middle of a token splits it — no boundary case loses either signal.
 * With no tokens the whole line is one style-less segment; with no term
 * nothing is marked.
 */
export function buildMarkedRuns(
	content: string,
	tokens: ThemedToken[] | null,
	term: string
): MarkedRun[] {
	const ranges = findMatchRanges(content, term);

	// Token segments with absolute offsets; one unstyled segment without tokens.
	const segments: Array<{ start: number; end: number; style?: string }> = [];
	if (tokens && tokens.length > 0) {
		let offset = 0;
		for (const token of tokens) {
			segments.push({
				start: offset,
				end: offset + token.content.length,
				style: tokenStyle(token)
			});
			offset += token.content.length;
		}
	} else {
		segments.push({ start: 0, end: content.length });
	}

	const isMarked = (position: number) =>
		ranges.some(([start, end]) => position >= start && position < end);

	const runs: MarkedRun[] = [];
	for (const segment of segments) {
		// Cut the segment at every match edge that falls inside it.
		const cuts = [
			segment.start,
			...ranges.flatMap(([start, end]) =>
				[start, end].filter((edge) => edge > segment.start && edge < segment.end)
			),
			segment.end
		].sort((a, b) => a - b);

		for (let i = 0; i < cuts.length - 1; i += 1) {
			const [from, to] = [cuts[i], cuts[i + 1]];
			if (to > from) {
				runs.push({
					content: content.slice(from, to),
					style: segment.style,
					marked: isMarked(from)
				});
			}
		}
	}

	return runs.filter((run) => run.content.length > 0);
}
