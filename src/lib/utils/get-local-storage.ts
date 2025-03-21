/**
 * Retrieves an item from localStorage and parses it into the specified type.
 *
 * This function provides a safe way to access localStorage with proper type checking
 * and error handling. It checks for localStorage availability, handles parsing errors,
 * and returns a default value when needed.
 *
 * @template T - The expected type of the stored value
 * @param key - The key of the item to retrieve from localStorage
 * @param defaultValue - The default value to return if the item is not available or an error occurs
 * @returns The parsed item from localStorage cast to type T, or the default value if not available or an error occurs
 *
 * @example
 * // Get a user profile, defaulting to an empty object
 * const profile = getLocalStorage<UserProfile>('user_profile', {});
 *
 * @example
 * // Get a theme preference, defaulting to 'light'
 * const theme = getLocalStorage<'dark' | 'light'>('theme', 'light');
 */
export function getLocalStorage<T>(key: string, defaultValue?: T): T | undefined {
	// Check if running in a browser environment with localStorage available
	if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
		return defaultValue;
	}

	try {
		const data = localStorage.getItem(key);

		// If data doesn't exist or is undefined, return default value
		if (data === null || data === 'undefined' || data === undefined) {
			return defaultValue;
		}

		// Parse the data and return it
		return JSON.parse(data) as T;
	} catch (error) {
		// Handle different types of errors
		if (error instanceof SyntaxError) {
			console.error(`Invalid JSON format in localStorage for key "${key}":`, error);
		} else if (error instanceof TypeError) {
			console.error(`Type error accessing localStorage for key "${key}":`, error);
		} else if (
			error instanceof DOMException &&
			(error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
		) {
			console.error(`Storage quota exceeded when accessing key "${key}":`, error);
		} else {
			console.error(`Error accessing localStorage for key "${key}":`, error);
		}

		return defaultValue;
	}
}
