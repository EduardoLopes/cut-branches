import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod/v4';
import { setLocalStorage } from '../set-local-storage';
import { setValidatedLocalStorage } from '../set-validated-local-storage';

// Mock the setLocalStorage function
vi.mock('../set-local-storage', () => ({
	setLocalStorage: vi.fn()
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

describe('setValidatedLocalStorage', () => {
	// Define test schema
	const userPrefsSchema = z.object({
		theme: z.enum(['light', 'dark', 'system']),
		fontSize: z.number().int().positive(),
		notifications: z.boolean()
	});

	type UserPrefs = z.infer<typeof userPrefsSchema>;

	it('should validate and store valid data successfully', () => {
		// Set up mock to return success
		vi.mocked(setLocalStorage).mockReturnValue(true);

		// Valid data matching the schema
		const validData: UserPrefs = {
			theme: 'dark',
			fontSize: 16,
			notifications: true
		};

		const result = setValidatedLocalStorage('user-prefs', validData, userPrefsSchema);

		// Verify the result
		expect(result.success).toBe(true);
		expect(result.data).toEqual(validData);
		expect(result.error).toBeUndefined();

		// Verify setLocalStorage was called correctly
		expect(setLocalStorage).toHaveBeenCalledWith('user-prefs', validData);
		expect(console.error).not.toHaveBeenCalled();
	});

	it('should return error for invalid data', () => {
		// Invalid data (wrong type for fontSize)
		const invalidData = {
			theme: 'dark',
			fontSize: 'sixteen', // Should be a number
			notifications: true
		};

		const result = setValidatedLocalStorage('user-prefs', invalidData, userPrefsSchema);

		// Verify the result
		expect(result.success).toBe(false);
		expect(result.data).toBeUndefined();
		expect(result.error).toBeInstanceOf(z.ZodError);

		// Verify setLocalStorage was not called
		expect(setLocalStorage).not.toHaveBeenCalled();
		// Verify error was logged
		expect(console.error).toHaveBeenCalled();
	});

	it('should return error for invalid enum value', () => {
		// Invalid data (wrong enum value for theme)
		const invalidEnumData = {
			theme: 'blue', // Not in the allowed enum values
			fontSize: 16,
			notifications: true
		};

		const result = setValidatedLocalStorage('user-prefs', invalidEnumData, userPrefsSchema);

		// Verify the result
		expect(result.success).toBe(false);
		expect(result.data).toBeUndefined();
		expect(result.error).toBeInstanceOf(z.ZodError);

		// Verify setLocalStorage was not called
		expect(setLocalStorage).not.toHaveBeenCalled();
	});

	it('should return error when storage fails', () => {
		// Set up mock to return failure
		vi.mocked(setLocalStorage).mockReturnValue(false);

		// Valid data but storage will fail
		const validData: UserPrefs = {
			theme: 'light',
			fontSize: 14,
			notifications: false
		};

		const result = setValidatedLocalStorage('user-prefs', validData, userPrefsSchema);

		// Verify the result
		expect(result.success).toBe(false);
		expect(result.data).toBeUndefined();
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error?.message).toBe('Failed to store data in localStorage');

		// Verify setLocalStorage was called
		expect(setLocalStorage).toHaveBeenCalledWith('user-prefs', validData);
	});

	it('should handle missing required properties', () => {
		// Invalid data (missing required properties)
		const incompleteData = {
			theme: 'dark'
			// missing fontSize and notifications
		};

		const result = setValidatedLocalStorage('user-prefs', incompleteData, userPrefsSchema);

		// Verify the result
		expect(result.success).toBe(false);
		expect(result.data).toBeUndefined();
		expect(result.error).toBeInstanceOf(z.ZodError);

		// Verify the error details
		const zodError = result.error as z.ZodError;
		expect(zodError.issues.some((issue) => issue.path.includes('fontSize'))).toBe(true);
		expect(zodError.issues.some((issue) => issue.path.includes('notifications'))).toBe(true);
	});

	it('should handle non-ZodError exceptions', () => {
		// Set up mock to throw a non-ZodError
		vi.mocked(setLocalStorage).mockImplementation(() => {
			throw new Error('Unexpected error');
		});

		const validData: UserPrefs = {
			theme: 'system',
			fontSize: 12,
			notifications: true
		};

		const result = setValidatedLocalStorage('user-prefs', validData, userPrefsSchema);

		// Verify the result
		expect(result.success).toBe(false);
		expect(result.data).toBeUndefined();
		expect(result.error).toBeInstanceOf(Error);
		expect(result.error?.message).toBe('Unexpected error');

		// Verify error was logged
		expect(console.error).toHaveBeenCalledWith(
			'Error in setValidatedLocalStorage:',
			expect.any(Error)
		);
	});
});
