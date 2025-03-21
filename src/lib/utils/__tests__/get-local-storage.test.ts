import { getLocalStorage } from '../get-local-storage';

describe('getLocalStorage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should return the default value if localStorage is not available', () => {
		const result = getLocalStorage('nonExistentKey', 'defaultValue');
		expect(result).toBe('defaultValue');
	});

	it('should return the parsed value from localStorage', () => {
		localStorage.setItem('testKey', JSON.stringify('storedValue'));
		const result = getLocalStorage('testKey', 'defaultValue');
		expect(result).toBe('storedValue');
	});

	it('should return the default value if parsing fails', () => {
		localStorage.setItem('testKey', 'invalidJSON');
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = getLocalStorage('testKey', 'defaultValue');
		expect(result).toBe('defaultValue');
		consoleErrorSpy.mockRestore();
	});
});
