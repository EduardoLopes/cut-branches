/**
 * Safely stores data in localStorage with error handling and validation
 *
 * @template T - The type of the value being stored
 * @param {string} key - The localStorage key
 * @param {T} value - The value to store
 * @returns {boolean} - True if storage was successful, false otherwise
 *
 * @example
 * ```ts
 * // Store a simple value
 * setLocalStorage('user-id', 123);
 *
 * // Store an object
 * setLocalStorage('user-preferences', { theme: 'dark', fontSize: 16 });
 *
 * // Store gets removed when passing empty arrays or falsy values
 * setLocalStorage('cart-items', []);  // Will remove the key
 * ```
 */
export function setLocalStorage<T>(key: string, value: T): boolean {
	// Guard against server-side rendering (SSR) environments
	if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
		return false;
	}

	// Validate key parameter
	if (!key || typeof key !== 'string') {
		console.error('Invalid localStorage key provided');
		return false;
	}

	try {
		// Store data if value is truthy and either not an array or a non-empty array
		if (value && (!Array.isArray(value) || value.length > 0)) {
			localStorage.setItem(key, JSON.stringify(value));
			return true;
		} else {
			// Remove item if value is falsy or an empty array
			localStorage.removeItem(key);
			return true;
		}
	} catch (error) {
		// Handle specific localStorage errors
		if (
			error instanceof DOMException &&
			// Storage full
			(error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
		) {
			console.error('localStorage quota exceeded:', error);
		} else {
			console.error('Error setting localStorage data:', error);
		}
		return false;
	}
}
