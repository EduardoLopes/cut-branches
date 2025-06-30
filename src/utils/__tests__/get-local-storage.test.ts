import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLocalStorage } from '../get-local-storage';

describe('getLocalStorage', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it('should return the default value if localStorage is not available', () => {
		const result = getLocalStorage('nonExistentKey', 'defaultValue');
		expect(result).toBe('defaultValue');
	});

	it('should return undefined when no default value is provided and key does not exist', () => {
		const result = getLocalStorage('nonExistentKey');
		expect(result).toBeUndefined();
	});

	it('should return the parsed value from localStorage', () => {
		localStorage.setItem('testKey', JSON.stringify('storedValue'));
		const result = getLocalStorage('testKey', 'defaultValue');
		expect(result).toBe('storedValue');
	});

	it('should return the default value when data is null', () => {
		localStorage.setItem('testKey', 'null');
		const result = getLocalStorage('testKey', 'defaultValue');
		expect(result).toBe(null);
	});

	it('should return default value when data is "undefined" string', () => {
		localStorage.setItem('testKey', 'undefined');
		const result = getLocalStorage('testKey', 'defaultValue');
		expect(result).toBe('defaultValue');
	});

	it('should return default value when localStorage.getItem returns null', () => {
		const result = getLocalStorage('nonExistentKey', 'defaultValue');
		expect(result).toBe('defaultValue');
	});

	it('should handle SyntaxError and log appropriate error', () => {
		localStorage.setItem('testKey', 'invalidJSON');
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = getLocalStorage('testKey', 'defaultValue');

		expect(result).toBe('defaultValue');
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringMatching(/Invalid JSON format in localStorage for key "testKey":/),
			expect.any(SyntaxError)
		);

		consoleErrorSpy.mockRestore();
	});

	it('should handle TypeError and log appropriate error', () => {
		// Mock JSON.parse to throw TypeError
		const originalParse = JSON.parse;
		JSON.parse = vi.fn().mockImplementation(() => {
			throw new TypeError('Test type error');
		});

		localStorage.setItem('testKey', 'someValue');
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = getLocalStorage('testKey', 'defaultValue');

		expect(result).toBe('defaultValue');
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringMatching(/Type error accessing localStorage for key "testKey":/),
			expect.any(TypeError)
		);

		JSON.parse = originalParse;
		consoleErrorSpy.mockRestore();
	});

	it('should handle QuotaExceededError and log appropriate error', () => {
		// Mock JSON.parse to throw DOMException with QuotaExceededError
		const originalParse = JSON.parse;
		JSON.parse = vi.fn().mockImplementation(() => {
			const error = new DOMException('Storage quota exceeded', 'QuotaExceededError');
			throw error;
		});

		localStorage.setItem('testKey', 'someValue');
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = getLocalStorage('testKey', 'defaultValue');

		expect(result).toBe('defaultValue');
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringMatching(/Storage quota exceeded when accessing key "testKey":/),
			expect.any(DOMException)
		);

		JSON.parse = originalParse;
		consoleErrorSpy.mockRestore();
	});

	it('should handle NS_ERROR_DOM_QUOTA_REACHED and log appropriate error', () => {
		// Mock JSON.parse to throw DOMException with NS_ERROR_DOM_QUOTA_REACHED
		const originalParse = JSON.parse;
		JSON.parse = vi.fn().mockImplementation(() => {
			const error = new DOMException('Storage quota exceeded', 'NS_ERROR_DOM_QUOTA_REACHED');
			throw error;
		});

		localStorage.setItem('testKey', 'someValue');
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = getLocalStorage('testKey', 'defaultValue');

		expect(result).toBe('defaultValue');
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringMatching(/Storage quota exceeded when accessing key "testKey":/),
			expect.any(DOMException)
		);

		JSON.parse = originalParse;
		consoleErrorSpy.mockRestore();
	});

	it('should handle generic errors and log appropriate error', () => {
		// Mock JSON.parse to throw a generic error
		const originalParse = JSON.parse;
		JSON.parse = vi.fn().mockImplementation(() => {
			throw new Error('Generic error');
		});

		localStorage.setItem('testKey', 'someValue');
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = getLocalStorage('testKey', 'defaultValue');

		expect(result).toBe('defaultValue');
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringMatching(/Error accessing localStorage for key "testKey":/),
			expect.any(Error)
		);

		JSON.parse = originalParse;
		consoleErrorSpy.mockRestore();
	});

	it('should return default value when window is undefined (SSR)', () => {
		const originalWindow = global.window;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(global as any).window = undefined;

		const result = getLocalStorage('testKey', 'defaultValue');
		expect(result).toBe('defaultValue');

		global.window = originalWindow;
	});

	it('should parse complex objects correctly', () => {
		const testObject = { name: 'test', count: 42, enabled: true };
		localStorage.setItem('objectKey', JSON.stringify(testObject));

		const result = getLocalStorage('objectKey', {});
		expect(result).toEqual(testObject);
	});

	it('should parse arrays correctly', () => {
		const testArray = [1, 2, 3, 'test'];
		localStorage.setItem('arrayKey', JSON.stringify(testArray));

		const result = getLocalStorage('arrayKey', []);
		expect(result).toEqual(testArray);
	});
});
