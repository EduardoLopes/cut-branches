/** Where the ellipsis lands when a path is too long for its container. */
export type TruncatePosition = 'start' | 'middle' | 'end';

/** Returns the rendered width of `text` in the target font, in px. */
export type MeasureText = (text: string) => number;

export const ELLIPSIS = '…';

export interface TruncatePathOptions {
	/** Where the ellipsis lands. @default 'middle' */
	position?: TruncatePosition;
	/**
	 * `middle` only: show at most this many directories even when more would
	 * fit, collapsing the rest into the ellipsis. Keeps long, deeply nested
	 * paths from filling every pixel they are given.
	 */
	maxSegments?: number;
}

/**
 * Largest `k` in `[0, max]` for which `fits(k)` holds. `fits` must be
 * monotonic (true for every `k` below the first failure), which is the case
 * for "the first/last k characters of a string fit in a fixed width".
 */
function largestFitting(max: number, fits: (k: number) => boolean): number {
	let lo = 0;
	let hi = max;
	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if (fits(mid)) {
			lo = mid;
		} else {
			hi = mid - 1;
		}
	}
	return lo;
}

/**
 * Shortens `path` so it renders within `maxWidth`, placing the ellipsis at
 * `position`. The full path is returned untouched when it already fits.
 *
 * `middle` is path-aware: it removes whole directories from the middle,
 * keeping as many as fit (capped by `maxSegments`) and preferring the ones
 * nearest the end, since the folder and its parents carry the meaning —
 * `/Users/me/…/cut-branches`. Only when even `…/last-segment` overflows does
 * it fall back to a plain character split.
 */
export function truncatePath(
	path: string,
	maxWidth: number,
	measure: MeasureText,
	{ position = 'middle', maxSegments = Infinity }: TruncatePathOptions = {}
): string {
	const segments = splitSegments(path);
	const fits = measure(path) <= maxWidth;
	if (fits && (position !== 'middle' || segments.length <= maxSegments)) return path;

	if (position === 'end') {
		const k = largestFitting(path.length, (n) => measure(path.slice(0, n) + ELLIPSIS) <= maxWidth);
		return path.slice(0, k) + ELLIPSIS;
	}

	if (position === 'start') {
		const k = largestFitting(path.length, (n) => measure(ELLIPSIS + path.slice(-n)) <= maxWidth);
		return ELLIPSIS + path.slice(path.length - k);
	}

	// middle: drop whole directories. For each number of segments kept (most
	// first), try the splits from "one leading segment, the rest trailing" down
	// to "all trailing" — so a fit always keeps the deepest folders possible.
	for (let kept = Math.min(segments.length - 1, maxSegments); kept >= 1; kept--) {
		for (let leading = kept === 1 ? 0 : 1; leading >= 0; leading = nextLeading(leading, kept)) {
			const candidate = joinAroundEllipsis(segments, leading, kept - leading);
			if (measure(candidate) <= maxWidth) return candidate;
		}
	}

	// A single segment, or even `…/last` overflows: split characters evenly.
	const k = largestFitting(path.length, (n) => measure(splitMiddle(path, n)) <= maxWidth);
	return splitMiddle(path, k);
}

/**
 * Iteration order for the leading-segment count at a fixed `kept` total:
 * 1, 2, …, kept − 1, then 0 (no leading segment at all), then stop (-1).
 */
function nextLeading(leading: number, kept: number): number {
	if (leading === 0) return -1;
	return leading + 1 < kept ? leading + 1 : 0;
}

/**
 * Path segments with the root folded into the first one (`/Users`, not `''`
 * then `Users`), so a leading root never counts as a kept directory and
 * `/…/x` is never offered as an anchor.
 */
function splitSegments(path: string): string[] {
	const segments = path.split('/');
	if (segments.length > 1 && segments[0] === '') {
		segments.splice(0, 2, '/' + segments[1]);
	}
	return segments;
}

/** `a/b/…/y/z` from the first `leading` and last `trailing` segments. */
function joinAroundEllipsis(segments: string[], leading: number, trailing: number): string {
	const head = leading > 0 ? segments.slice(0, leading).join('/') + '/' : '';
	const tail = segments.slice(segments.length - trailing).join('/');
	return `${head}${ELLIPSIS}/${tail}`;
}

/** Keeps `keep` characters of `text`, half from each end, around an ellipsis. */
function splitMiddle(text: string, keep: number): string {
	const headLength = Math.ceil(keep / 2);
	const tailLength = keep - headLength;
	return text.slice(0, headLength) + ELLIPSIS + text.slice(text.length - tailLength);
}

/** A run of the displayed text that is either highlighted or not. */
export interface PathRun {
	text: string;
	highlighted: boolean;
}

/**
 * Splits a (possibly truncated) `displayed` rendering of `path` into runs so
 * the first occurrence of `highlight` in the *original* path can be styled.
 * Works for any `truncatePath` output because that output is always a prefix
 * of `path`, then the ellipsis, then a suffix of `path`; each displayed
 * character maps back to a path index, and the ellipsis is highlighted only
 * when the range covers every character it replaced.
 *
 * Returns a single plain run when `highlight` is empty or not found.
 */
export function splitHighlight(path: string, displayed: string, highlight: string): PathRun[] {
	const start = highlight ? path.indexOf(highlight) : -1;
	if (start === -1) return [{ text: displayed, highlighted: false }];
	const end = start + highlight.length;

	const ellipsisAt = displayed.indexOf(ELLIPSIS);
	const headLength = ellipsisAt === -1 ? displayed.length : ellipsisAt;
	// Where the suffix resumes in the original path.
	const tailStart = path.length - (displayed.length - headLength - 1);

	const isHighlighted = (i: number): boolean => {
		if (i < headLength) return i >= start && i < end;
		if (i === ellipsisAt) return start <= headLength && end >= tailStart;
		const pathIndex = tailStart + (i - ellipsisAt - 1);
		return pathIndex >= start && pathIndex < end;
	};

	const runs: PathRun[] = [];
	for (let i = 0; i < displayed.length; i++) {
		const highlighted = isHighlighted(i);
		const last = runs[runs.length - 1];
		if (last && last.highlighted === highlighted) {
			last.text += displayed[i];
		} else {
			runs.push({ text: displayed[i], highlighted });
		}
	}
	return runs;
}
