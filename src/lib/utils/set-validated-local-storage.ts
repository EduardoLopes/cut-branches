import { z } from 'zod';
import { setLocalStorage } from './set-local-storage';

/**
 * Interface for the result of validating and storing data in localStorage
 */
export interface ValidatedStorageResult<T> {
	success: boolean;
	data?: T;
	error?: z.ZodError | Error;
}

/**
 * Validates data against a Zod schema and safely stores it in localStorage
 *
 * @template T - The type of the value being stored
 * @param {string} key - The localStorage key
 * @param {unknown} value - The value to store (will be validated)
 * @param {z.ZodSchema<T>} schema - Zod schema to validate the value against
 * @returns {ValidatedStorageResult<T>} - Result object with success status and error/data
 *
 * @example
 * ```ts
 * // Define a schema for user preferences
 * const userPrefsSchema = z.object({
 *   theme: z.enum(['light', 'dark', 'system']),
 *   fontSize: z.number().int().positive(),
 *   notifications: z.boolean()
 * });
 *
 * // Validate and store data
 * const result = setValidatedLocalStorage(
 *   'user-prefs',
 *   { theme: 'dark', fontSize: 16, notifications: true },
 *   userPrefsSchema
 * );
 *
 * if (result.success) {
 *   console.log('Preferences saved successfully', result.data);
 * } else {
 *   console.error('Invalid preferences data', result.error);
 * }
 * ```
 */
export function setValidatedLocalStorage<T>(
	key: string,
	value: unknown,
	schema: z.ZodSchema<T>
): ValidatedStorageResult<T> {
	try {
		// Validate the data against the schema
		const validatedData = schema.parse(value);

		// Use the existing setLocalStorage function to store the validated data
		const storageSuccess = setLocalStorage(key, validatedData);

		if (storageSuccess) {
			return { success: true, data: validatedData };
		} else {
			return {
				success: false,
				error: new Error('Failed to store data in localStorage')
			};
		}
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			console.error('Validation error for localStorage data:', error.format());
			return { success: false, error };
		}

		// Handle other errors
		console.error('Error in setValidatedLocalStorage:', error);
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error))
		};
	}
}
