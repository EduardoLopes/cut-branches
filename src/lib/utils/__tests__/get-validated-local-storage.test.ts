import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod/v4';
import * as getLocalStorageModule from '../get-local-storage';
import { getValidatedLocalStorage } from '../get-validated-local-storage';

// Mock the getLocalStorage function
vi.mock('../get-local-storage', () => ({
	getLocalStorage: vi.fn()
}));

// Mock console.error and console.warn
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
beforeEach(() => {
	console.error = vi.fn();
	console.warn = vi.fn();
});

afterEach(() => {
	vi.clearAllMocks();
	console.error = originalConsoleError;
	console.warn = originalConsoleWarn;
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
		expect(result.error?.message).toBe(
			`No data found for key "user-prefs" in localStorage, and the schema does not permit 'undefined' as a value.`
		);

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
			'Default value validation error for key "user-prefs": The provided default value is invalid according to the schema.',
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

	// New tests to cover lines 66, 86, 116-118, 127-128, 135-136

	it('should fallback to undefined when defaultValue fails validation and undefined is valid (line 66)', () => {
		// Create a schema that allows undefined
		const optionalSchema = z
			.object({
				value: z.string().optional()
			})
			.or(z.undefined()); // Allow the entire schema to be undefined

		// Mock getLocalStorage to return undefined
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(undefined);

		// Invalid default value - use a string that will fail validation in some other way
		const invalidDefault = { value: 123 as unknown as string }; // TypeScript cast to avoid type error

		const result = getValidatedLocalStorage('test-key', optionalSchema, invalidDefault);

		// Verify the result
		expect(result.success).toBe(true);
		expect(result.data).toEqual(undefined); // Expect undefined instead of { value: undefined }

		// Verify warnings and errors
		expect(console.error).toHaveBeenCalledWith(
			'Default value validation error for key "test-key": The provided default value is invalid according to the schema.',
			expect.any(Object)
		);
		expect(console.warn).toHaveBeenCalledWith(
			'For key "test-key", falling back to \'undefined\' because the provided default value was invalid.'
		);
	});

	it('should handle when undefined is a valid schema value (line 86)', () => {
		// Create a schema where undefined is valid
		const optionalSchema = z
			.object({
				value: z.string().optional()
			})
			.or(z.undefined()); // Allow the entire schema to be undefined

		// Mock getLocalStorage to return undefined
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(undefined);

		// No default value provided
		const result = getValidatedLocalStorage('test-key', optionalSchema);

		// Verify the result - should succeed with undefined property
		expect(result.success).toBe(true);
		expect(result.data).toEqual(undefined); // Expect undefined instead of { value: undefined }
	});

	it('should use default value when validation fails (lines 116-118)', () => {
		// Mock getLocalStorage to return invalid data
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue({
			theme: 'invalid-theme',
			fontSize: -5, // should be positive
			notifications: 'not-boolean' // should be boolean
		});

		const result = getValidatedLocalStorage('user-prefs', userPrefsSchema, defaultUserPrefs);

		// Verify the result
		expect(result.success).toBe(true);
		expect(result.data).toEqual(defaultUserPrefs);

		// Verify warning was logged
		expect(console.warn).toHaveBeenCalledWith(
			'Validation failed for "user-prefs", using default value'
		);
	});

	it('should handle non-Error exceptions with no default (lines 127-128)', () => {
		// Mock getLocalStorage to throw a non-Error
		vi.mocked(getLocalStorageModule.getLocalStorage).mockImplementation(() => {
			// Using a string instead of an Error object
			throw 'String exception';
		});

		const result = getValidatedLocalStorage('test-key', userPrefsSchema);

		// Verify the result
		expect(result.success).toBe(false);
		expect(result.data).toBeUndefined();
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error?.message).toBe('String exception');

		// Verify error was logged
		expect(console.error).toHaveBeenCalledWith(
			'Error in getValidatedLocalStorage:',
			'String exception'
		);
	});

	it('should handle non-Error exceptions with default value (lines 135-136)', () => {
		// Mock getLocalStorage to throw a non-Error
		vi.mocked(getLocalStorageModule.getLocalStorage).mockImplementation(() => {
			// Using a number instead of an Error object
			throw 42;
		});

		const result = getValidatedLocalStorage('test-key', userPrefsSchema, defaultUserPrefs);

		// Verify the result - should succeed with default value
		expect(result.success).toBe(true);
		expect(result.data).toEqual(defaultUserPrefs);

		// Verify error was logged
		expect(console.error).toHaveBeenCalledWith('Error in getValidatedLocalStorage:', 42);
	});
});
