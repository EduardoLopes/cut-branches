/**
 * Utility functions for string manipulation and validation
 */

/**
 * Checks if a string is empty or only contains whitespace
 * @param str - The string to check
 * @returns true if the string is empty or only contains whitespace
 */
export function isEmptyString(str: string | null | undefined): boolean {
	return str === null || str === undefined || str.trim() === '';
}

/**
 * Ensures a string is not null or undefined
 * @param str - The string to check
 * @param defaultValue - The default value to return if the string is null or undefined
 * @returns The string or the default value
 */
export function ensureString(str: string | null | undefined, defaultValue = ''): string {
	return str ?? defaultValue;
}

/**
 * Truncates a string to a maximum length and adds an ellipsis if truncated
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - The ellipsis string to append (default: "...")
 * @returns The truncated string
 */
export function truncateString(
	str: string | null | undefined,
	maxLength: number,
	ellipsis = '...'
): string {
	if (!str || str.length <= maxLength) {
		return str ?? '';
	}

	return str.slice(0, maxLength) + ellipsis;
}

/**
 * Removes email brackets from strings like "<email@example.com>"
 * @param email - Email string possibly containing angle brackets
 * @returns Clean email without angle brackets
 */
export function cleanEmailString(email: string | null | undefined): string {
	if (email == null) return '';
	return email.replace(/^<|>$/g, '');
}

/**
 * Converts a string to title case (first letter of each word capitalized)
 * @param str - The string to convert
 * @returns The string in title case
 */
export function toTitleCase(str: string | null | undefined) {
	return (
		str
			?.toLowerCase()
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ') ?? ''
	);
}

/**
 * Checks if a string contains any of the provided words
 * @param str - The string to check
 * @param words - Array of words to check for
 * @returns true if the string contains any of the words
 */
export function containsAnyWord(str: string | null | undefined, words: string[]): boolean {
	if (!str) return false;

	return words.some((word) => str.includes(word));
}

/**
 * Formats a string by replacing placeholders with values
 * @param template - Template string with {placeholder} syntax
 * @param values - Object with values to replace placeholders
 * @returns Formatted string
 */
export function formatString(
	template: string | null | undefined,
	values: Record<string, string | number | boolean>
): string {
	if (!template) return '';
	return template.replace(/{(\w+)}/g, (_, key) => {
		return ensureString(values[key]?.toString());
	});
}
