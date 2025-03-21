import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import * as getLocalStorageModule from '../get-local-storage';
import { getValidatedLocalStorage } from '../get-validated-local-storage';

// Mock the getLocalStorage function
vi.mock('../get-local-storage', () => ({
	getLocalStorage: vi.fn()
}));

// Mock console.error
const originalConsoleError = console.error;
beforeEach(() => {
	console.error = vi.fn();
});

afterEach(() => {
	vi.clearAllMocks();
	console.error = originalConsoleError;
});

describe('getValidatedLocalStorage', () => {
	// Define test schema
	const userPrefsSchema = z.object({
		theme: z.enum(['light', 'dark', 'system']),
		fontSize: z.number().int().positive(),
		notifications: z.boolean()
	});

	type UserPrefs = z.infer<typeof userPrefsSchema>;

	// Define default values for tests
	const defaultUserPrefs: UserPrefs = {
		theme: 'light',
		fontSize: 14,
		notifications: true
	};

	it('should retrieve and validate data successfully', () => {
		// Valid data matching the schema
		const storedData: UserPrefs = {
			theme: 'dark',
			fontSize: 16,
			notifications: true
		};

		// Mock getLocalStorage to return valid data
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(storedData);

		const result = getValidatedLocalStorage('user-prefs', userPrefsSchema);

		// Verify the result
		expect(result.success).toBe(true);
		expect(result.data).toEqual(storedData);
		expect(result.error).toBeUndefined();

		// Verify getLocalStorage was called correctly
		expect(getLocalStorageModule.getLocalStorage).toHaveBeenCalledWith('user-prefs', undefined);
		expect(console.error).not.toHaveBeenCalled();
	});

	it('should return defaultValue when no data is found and default is valid', () => {
		// Mock getLocalStorage to return undefined (no data found)
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(undefined);

		const result = getValidatedLocalStorage('user-prefs', userPrefsSchema, defaultUserPrefs);

		// Verify the result
		expect(result.success).toBe(true);
		expect(result.data).toEqual(defaultUserPrefs);
		expect(result.error).toBeUndefined();

		// Verify getLocalStorage was called correctly
		expect(getLocalStorageModule.getLocalStorage).toHaveBeenCalledWith('user-prefs', undefined);
		expect(console.error).not.toHaveBeenCalled();
	});

	it('should return error when no data is found and no default is provided', () => {
		// Mock getLocalStorage to return undefined (no data found)
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(undefined);

		const result = getValidatedLocalStorage('user-prefs', userPrefsSchema);

		// Verify the result
		expect(result.success).toBe(false);
		expect(result.data).toBeUndefined();
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error?.message).toBe('No data found for key "user-prefs" in localStorage');

		// Verify getLocalStorage was called correctly
		expect(getLocalStorageModule.getLocalStorage).toHaveBeenCalledWith('user-prefs', undefined);
	});

	it('should return error when stored data fails validation', () => {
		// Invalid data that doesn't match the schema
		const invalidData = {
			theme: 'dark',
			fontSize: 'sixteen', // Should be a number
			notifications: true
		};

		// Mock getLocalStorage to return invalid data
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(invalidData);

		const result = getValidatedLocalStorage('user-prefs', userPrefsSchema);

		// Verify the result
		expect(result.success).toBe(false);
		expect(result.data).toBeUndefined();
		expect(result.error).toBeInstanceOf(z.ZodError);

		// Verify error was logged
		expect(console.error).toHaveBeenCalled();
	});

	it('should return error when defaultValue fails validation', () => {
		// Mock getLocalStorage to return undefined (no data found)
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(undefined);

		// Invalid default data
		const invalidDefault = {
			theme: 'blue', // Not in the allowed enum values
			fontSize: 14,
			notifications: true
		};

		const result = getValidatedLocalStorage('user-prefs', userPrefsSchema, invalidDefault);

		// Verify the result
		expect(result.success).toBe(false);
		expect(result.data).toBeUndefined();
		expect(result.error).toBeInstanceOf(z.ZodError);

		// Verify error was logged
		expect(console.error).toHaveBeenCalledWith(
			'Default value validation error:',
			expect.any(Object)
		);
	});

	it('should handle non-ZodError exceptions', () => {
		// Set up mock to throw a non-ZodError
		vi.mocked(getLocalStorageModule.getLocalStorage).mockImplementation(() => {
			throw new Error('Unexpected error');
		});

		const result = getValidatedLocalStorage('user-prefs', userPrefsSchema);

		// Verify the result
		expect(result.success).toBe(false);
		expect(result.data).toBeUndefined();
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error?.message).toBe('Unexpected error');

		// Verify error was logged
		expect(console.error).toHaveBeenCalledWith(
			'Error in getValidatedLocalStorage:',
			expect.any(Error)
		);
	});

	it('should handle missing required properties in stored data', () => {
		// Invalid data (missing required properties)
		const incompleteData = {
			theme: 'dark'
			// missing fontSize and notifications
		};

		// Mock getLocalStorage to return incomplete data
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(incompleteData);

		const result = getValidatedLocalStorage('user-prefs', userPrefsSchema);

		// Verify the result
		expect(result.success).toBe(false);
		expect(result.data).toBeUndefined();
		expect(result.error).toBeInstanceOf(z.ZodError);

		// Verify the error details
		const zodError = result.error as z.ZodError;
		expect(zodError.issues.some((issue) => issue.path.includes('fontSize'))).toBe(true);
		expect(zodError.issues.some((issue) => issue.path.includes('notifications'))).toBe(true);
	});
});
