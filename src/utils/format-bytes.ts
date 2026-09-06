/**
 * Format a byte count as a human-readable string using binary units
 * (1 KB = 1024 bytes), e.g. `1536 → "1.5 KB"`, `0 → "0 B"`.
 *
 * Global, pure utility (§2): used across the cleanup UI to show folder sizes
 * and reclaimable-space totals.
 *
 * @param bytes - Non-negative byte count.
 * @param fractionDigits - Decimals for units above bytes (default 1).
 */
export function formatBytes(bytes: number, fractionDigits = 1): string {
	if (!Number.isFinite(bytes) || bytes <= 0) {
		return '0 B';
	}

	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / Math.pow(1024, exponent);

	// Bytes are always whole; larger units get fixed decimals, trimming trailing zeros.
	const formatted =
		exponent === 0 ? String(Math.round(value)) : trimZeros(value.toFixed(fractionDigits));

	return `${formatted} ${units[exponent]}`;
}

/** Drop trailing zeros and a dangling decimal point: `"1.50" → "1.5"`, `"2.0" → "2"`. */
function trimZeros(value: string): string {
	return value.replace(/\.?0+$/, '');
}
