import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setLocalStorage } from '../set-local-storage';

describe('setLocalStorage', () => {
	// Save original localStorage
	const originalLocalStorage = global.localStorage;

	// Create localStorage mock
	const mockLocalStorage = {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
		length: 0,
		key: vi.fn()
	};

	beforeEach(() => {
		// Set mock localStorage
		Object.defineProperty(global, 'localStorage', {
			value: mockLocalStorage,
			writable: true
		});

		// Reset all mocks before each test
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Restore original localStorage after tests
		Object.defineProperty(global, 'localStorage', {
			value: originalLocalStorage,
			writable: true
		});
	});

	it('should store value in localStorage', () => {
		const result = setLocalStorage('test-key', 'test-value');

		expect(result).toBe(true);
		expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', '"test-value"');
	});

	it('should store object value in localStorage', () => {
		const testObject = { name: 'test', value: 42 };
		const result = setLocalStorage('test-key', testObject);

		expect(result).toBe(true);
		expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(testObject));
	});

	it('should remove key from localStorage if value is falsy', () => {
		// Test with null value
		let result = setLocalStorage('test-key', null);
		expect(result).toBe(true);
		expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');

		// Test with undefined value
		vi.clearAllMocks();
		result = setLocalStorage('test-key', undefined);
		expect(result).toBe(true);
		expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');

		// Test with empty string
		vi.clearAllMocks();
		result = setLocalStorage('test-key', '');
		expect(result).toBe(true);
		expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
	});

	it('should remove key from localStorage if value is an empty array', () => {
		const result = setLocalStorage('test-key', []);

		expect(result).toBe(true);
		expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
		expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
	});

	it('should return false if no key is provided', () => {
		const result = setLocalStorage('', 'test-value');

		expect(result).toBe(false);
		expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
		expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
	});

	it('should return false if invalid key is provided', () => {
		// @ts-expect-error testing invalid key type
		const result = setLocalStorage(null, 'test-value');

		expect(result).toBe(false);
		expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
		expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
	});

	it('should handle server-side rendering environment', () => {
		// Simulate SSR environment by temporarily removing window
		const originalWindow = global.window;
		Object.defineProperty(global, 'window', { value: undefined, writable: true });

		const result = setLocalStorage('test-key', 'test-value');

		expect(result).toBe(false);

		// Restore window
		Object.defineProperty(global, 'window', { value: originalWindow, writable: true });
	});

	it('should handle localStorage quota exceeded error', () => {
		// Mock console.error to verify it's called
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Mock localStorage.setItem to throw a quota exceeded DOMException
		mockLocalStorage.setItem.mockImplementation(() => {
			// Create DOMException or similar error that behaves like one
			const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
			throw error;
		});

		const result = setLocalStorage('test-key', 'test-value');

		expect(result).toBe(false);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'localStorage quota exceeded:',
			expect.any(DOMException)
		);

		// Restore console.error
		consoleErrorSpy.mockRestore();
	});

	it('should handle localStorage NS_ERROR_DOM_QUOTA_REACHED error', () => {
		// Mock console.error to verify it's called
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Mock localStorage.setItem to throw a NS_ERROR_DOM_QUOTA_REACHED DOMException
		mockLocalStorage.setItem.mockImplementation(() => {
			// Create DOMException or similar error that behaves like one
			const error = new DOMException('NS_ERROR_DOM_QUOTA_REACHED', 'NS_ERROR_DOM_QUOTA_REACHED');
			throw error;
		});

		const result = setLocalStorage('test-key', 'test-value');

		expect(result).toBe(false);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'localStorage quota exceeded:',
			expect.any(DOMException)
		);

		// Restore console.error
		consoleErrorSpy.mockRestore();
	});

	it('should handle other localStorage errors', () => {
		// Mock localStorage.setItem to throw a generic error
		mockLocalStorage.setItem.mockImplementation(() => {
			throw new Error('Some other localStorage error');
		});

		// Mock console.error to verify it's called
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = setLocalStorage('test-key', 'test-value');

		expect(result).toBe(false);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'Error setting localStorage data:',
			expect.any(Error)
		);

		// Restore console.error
		consoleErrorSpy.mockRestore();
	});
});
