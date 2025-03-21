import { getLocalStorage } from '../get-local-storage';

describe('getLocalStorage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	// Browser environment tests
	describe('environment checks', () => {
		let originalWindow: (Window & typeof globalThis) | undefined;
		let originalLocalStorage: Storage | undefined;

		beforeEach(() => {
			originalWindow = global.window;
			originalLocalStorage = global.localStorage;
		});

		afterEach(() => {
			// Restore the original window and localStorage
			global.window = originalWindow as Window & typeof globalThis;
			Object.defineProperty(global, 'localStorage', {
				value: originalLocalStorage,
				writable: true
			});
		});

		it('should return default value when window is undefined', () => {
			// Mock window as undefined
			global.window = undefined as unknown as Window & typeof globalThis;

			const result = getLocalStorage('testKey', 'defaultValue');
			expect(result).toBe('defaultValue');
		});

		it('should return default value when localStorage is undefined', () => {
			// Mock localStorage as undefined
			Object.defineProperty(global, 'localStorage', {
				value: undefined,
				writable: true
			});

			const result = getLocalStorage('testKey', 'defaultValue');
			expect(result).toBe('defaultValue');
		});
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
		expect(consoleErrorSpy).toHaveBeenCalled();
		consoleErrorSpy.mockRestore();
	});

	// Additional test cases to cover uncovered lines

	it('should return default value when localStorage returns null', () => {
		// This simulates localStorage.getItem returning null (key not found)
		localStorage.removeItem('testKey');
		const result = getLocalStorage('testKey', 'defaultValue');
		expect(result).toBe('defaultValue');
	});

	it('should return default value when localStorage returns "undefined" string', () => {
		localStorage.setItem('testKey', 'undefined');
		const result = getLocalStorage('testKey', 'defaultValue');
		expect(result).toBe('defaultValue');
	});

	it('should return default value when localStorage.getItem returns undefined', () => {
		// Create a mock implementation of localStorage that returns undefined
		const originalStorage = global.localStorage;
		const mockGetItem = vi.fn().mockReturnValue(undefined);

		// Replace localStorage with our mock
		const mockStorage = {
			getItem: mockGetItem,
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			length: 0,
			key: vi.fn()
		};

		Object.defineProperty(global, 'localStorage', {
			value: mockStorage,
			writable: true
		});

		const result = getLocalStorage('testKey', 'defaultValue');
		expect(result).toBe('defaultValue');

		// Restore original localStorage
		Object.defineProperty(global, 'localStorage', {
			value: originalStorage,
			writable: true
		});
	});

	// Comprehensive test for all conditions in the if statement
	it('should explicitly test all conditions in data validation check', () => {
		const testCases = [
			{ setup: () => localStorage.removeItem('testKey'), description: 'null case' },
			{
				setup: () => localStorage.setItem('testKey', 'undefined'),
				description: 'undefined string case'
			}
		];

		const originalStorage = global.localStorage;

		// Test case for undefined value (not just string 'undefined')
		const mockGetItem = vi.fn().mockReturnValue(undefined);
		const mockStorage = {
			getItem: mockGetItem,
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			length: 0,
			key: vi.fn()
		};

		// Test standard localStorage cases
		for (const testCase of testCases) {
			testCase.setup();
			const result = getLocalStorage('testKey', 'defaultValue');
			expect(result).toBe('defaultValue');
		}

		// Test undefined value return from getItem
		Object.defineProperty(global, 'localStorage', {
			value: mockStorage,
			writable: true
		});

		const result = getLocalStorage('testKey', 'defaultValue');
		expect(result).toBe('defaultValue');

		// Restore original localStorage
		Object.defineProperty(global, 'localStorage', {
			value: originalStorage,
			writable: true
		});
	});

	it('should handle TypeError when accessing localStorage', () => {
		// Create a mock implementation of localStorage
		const originalStorage = global.localStorage;
		const mockGetItem = vi.fn().mockImplementation(() => {
			throw new TypeError('Mock TypeError');
		});

		// Replace localStorage with our mock
		const mockStorage = {
			getItem: mockGetItem,
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			length: 0,
			key: vi.fn()
		};

		Object.defineProperty(global, 'localStorage', {
			value: mockStorage,
			writable: true
		});

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = getLocalStorage('testKey', 'defaultValue');

		expect(result).toBe('defaultValue');
		expect(consoleErrorSpy).toHaveBeenCalled();

		// Restore original localStorage
		Object.defineProperty(global, 'localStorage', {
			value: originalStorage,
			writable: true
		});
		consoleErrorSpy.mockRestore();
	});

	it('should handle DOMException with QuotaExceededError', () => {
		// Create a mock implementation of localStorage
		const originalStorage = global.localStorage;
		const mockDOMException = new DOMException('Storage quota exceeded', 'QuotaExceededError');
		const mockGetItem = vi.fn().mockImplementation(() => {
			throw mockDOMException;
		});

		// Replace localStorage with our mock
		const mockStorage = {
			getItem: mockGetItem,
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			length: 0,
			key: vi.fn()
		};

		Object.defineProperty(global, 'localStorage', {
			value: mockStorage,
			writable: true
		});

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = getLocalStorage('testKey', 'defaultValue');

		expect(result).toBe('defaultValue');
		expect(consoleErrorSpy).toHaveBeenCalled();

		// Restore original localStorage
		Object.defineProperty(global, 'localStorage', {
			value: originalStorage,
			writable: true
		});
		consoleErrorSpy.mockRestore();
	});

	it('should handle DOMException with NS_ERROR_DOM_QUOTA_REACHED', () => {
		// Create a mock implementation of localStorage
		const originalStorage = global.localStorage;
		// Create a DOMException with NS_ERROR_DOM_QUOTA_REACHED name
		const mockDOMException = new DOMException(
			'Storage quota exceeded',
			'NS_ERROR_DOM_QUOTA_REACHED'
		);
		const mockGetItem = vi.fn().mockImplementation(() => {
			throw mockDOMException;
		});

		// Replace localStorage with our mock
		const mockStorage = {
			getItem: mockGetItem,
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			length: 0,
			key: vi.fn()
		};

		Object.defineProperty(global, 'localStorage', {
			value: mockStorage,
			writable: true
		});

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = getLocalStorage('testKey', 'defaultValue');

		expect(result).toBe('defaultValue');
		expect(consoleErrorSpy).toHaveBeenCalled();

		// Restore original localStorage
		Object.defineProperty(global, 'localStorage', {
			value: originalStorage,
			writable: true
		});
		consoleErrorSpy.mockRestore();
	});

	it('should handle generic errors', () => {
		// Create a mock implementation of localStorage
		const originalStorage = global.localStorage;
		const mockGetItem = vi.fn().mockImplementation(() => {
			throw new Error('Generic error');
		});

		// Replace localStorage with our mock
		const mockStorage = {
			getItem: mockGetItem,
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
			length: 0,
			key: vi.fn()
		};

		Object.defineProperty(global, 'localStorage', {
			value: mockStorage,
			writable: true
		});

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = getLocalStorage('testKey', 'defaultValue');

		expect(result).toBe('defaultValue');
		expect(consoleErrorSpy).toHaveBeenCalled();

		// Restore original localStorage
		Object.defineProperty(global, 'localStorage', {
			value: originalStorage,
			writable: true
		});
		consoleErrorSpy.mockRestore();
	});
});
