export function setLocalStorage<T>(key: string, value: T): void {
	if (typeof window !== 'undefined') {
		try {
			if (value && (!Array.isArray(value) || value.length > 0)) {
				localStorage.setItem(key, JSON.stringify(value));
			} else {
				localStorage.removeItem(key);
			}
		} catch (error) {
			console.error('Error setting localStorage data:', error);
		}
	}
}
