/**
 * Retrieves an item from localStorage and parses it into the specified type.
 * If the code is not running in a browser environment or if there is an error during parsing,
 * a default value is returned.
 *
 * @param key - The key of the item to retrieve from localStorage.
 * @param defaultValue - The default value to return if the item is not available or an error occurs.
 * @returns The parsed item from localStorage, or the default value if not available or an error occurs.
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
	if (typeof window !== 'undefined') {
		try {
			const data = localStorage?.getItem(key);
			return data ? JSON.parse(data) : defaultValue;
		} catch (error) {
			console.error(`Error parsing localStorage data for key "${key}":`, error);
			return defaultValue;
		}
	}
	return defaultValue;
}
