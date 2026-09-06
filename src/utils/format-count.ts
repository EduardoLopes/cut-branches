/**
 * Format a count for a badge, clamping anything above `max` to an overflow label.
 *
 * Badges live in fixed-width furniture — a sidebar rail item, a tab, a nav row —
 * where an unbounded number stretches the pill until it collides with whatever
 * sits next to it. Clamping bounds the width; `overflow` lets the caller keep
 * that bound at the same glyph count as the widest verbatim number it allows.
 *
 * Zero (and anything below it, or a non-finite value) formats as an empty string
 * so callers can render an empty badge rather than a meaningless `"0"`.
 *
 * Global, pure utility (§2).
 *
 * @param count - The count to display.
 * @param options.max - Highest number rendered verbatim (default 99).
 * @param options.overflow - Label shown above `max` (default `"<max>+"`).
 */
export function formatCount(
	count: number,
	options: { max?: number; overflow?: string } = {}
): string {
	const { max = 99, overflow = `${max}+` } = options;

	// Floor before the guard, so a fraction that rounds down to nothing (0.4)
	// reads as empty rather than as a literal "0".
	const whole = Math.floor(count);
	if (!Number.isFinite(whole) || whole <= 0) {
		return '';
	}

	return whole > max ? overflow : String(whole);
}
