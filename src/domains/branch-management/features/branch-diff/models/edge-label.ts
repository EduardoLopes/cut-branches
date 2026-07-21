/**
 * Formatting for a Call edge's hover label — the symbols the source uses from
 * the target. Rendered as a small multi-line chip (one symbol per line) so a
 * long list grows DOWNWARD into a narrow chip instead of a wide banner that
 * would span the board. Shared by the renderer (edge-labels) and any sizing
 * that needs the chip's width.
 */

/** The header shown above the symbol lines. */
export const EDGE_LABEL_HEADER = 'uses';
/** Symbol lines shown before the chip summarizes the rest as `+N more`. */
const NAME_LIMIT = 6;
/** Longest a single symbol line renders before it is ellipsized. */
const MAX_NAME_CHARS = 26;
/** Approx width of one monospace glyph at the label's font size, in px. */
const LABEL_CHAR_WIDTH = 6.2;
/** Slack around the widest line so the chip isn't flush to the glyphs. */
const LABEL_PADDING = 20;

/**
 * The label's lines: a `uses` header, then each used symbol (ellipsized if very
 * long), then a `+N more` summary when the list overflows. Empty when there is
 * nothing to show.
 */
export function edgeLabelLines(symbols: string[]): string[] {
	if (symbols.length === 0) {
		return [];
	}
	const lines = [EDGE_LABEL_HEADER];
	for (const symbol of symbols.slice(0, NAME_LIMIT)) {
		lines.push(symbol.length > MAX_NAME_CHARS ? `${symbol.slice(0, MAX_NAME_CHARS - 1)}…` : symbol);
	}
	const rest = symbols.length - NAME_LIMIT;
	if (rest > 0) {
		lines.push(`+${rest} more`);
	}
	return lines;
}

/** Approximate rendered width of the chip in px (0 when there is nothing). */
export function edgeLabelWidth(symbols: string[]): number {
	const lines = edgeLabelLines(symbols);
	if (lines.length === 0) {
		return 0;
	}
	const widest = Math.max(...lines.map((line) => line.length));
	return widest * LABEL_CHAR_WIDTH + LABEL_PADDING;
}
