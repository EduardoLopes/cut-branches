/**
 * Utilities for working with Svelte 5 runes and stores
 */

/**
 * Creates a simple state-based toggle function
 * @param initialValue - Initial state
 * @returns Object with toggle functions
 */
export function createToggle(initialValue = false) {
	let value = initialValue;

	return {
		get: () => value,
		set: (newValue: boolean) => (value = newValue),
		toggle: () => (value = !value),
		reset: () => (value = initialValue)
	};
}

/**
 * Creates a debounced version of a function
 * @param func - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function that returns a Promise resolving to the original function's return value
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	delay = 300
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	let timeoutId: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		return new Promise<ReturnType<T>>((resolve, reject) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(async () => {
				try {
					const result = await func(...args);
					resolve(result as ReturnType<T>);
				} catch (error) {
					reject(error);
				}
			}, delay);
		});
	};
}
