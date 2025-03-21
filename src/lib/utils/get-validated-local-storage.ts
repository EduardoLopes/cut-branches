import { z } from 'zod';
import { getLocalStorage } from './get-local-storage';

/**
 * Interface for the result of retrieving and validating data from localStorage
 */
export interface ValidatedStorageResult<T> {
	success: boolean;
	data?: T;
	error?: z.ZodError | Error;
}

/**
 * Retrieves and validates data from localStorage against a Zod schema
 *
 * @template T - The type of the value being retrieved
 * @param {string} key - The localStorage key
 * @param {z.ZodSchema<T>} schema - Zod schema to validate the retrieved value against
 * @param {T} [defaultValue] - Optional default value to use if data is not found or invalid
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
 * // Retrieve and validate data
 * const result = getValidatedLocalStorage(
 *   'user-prefs',
 *   userPrefsSchema,
 *   { theme: 'light', fontSize: 14, notifications: true }
 * );
 *
 * if (result.success) {
 *   console.log('Valid preferences retrieved', result.data);
 * } else {
 *   console.error('Invalid preferences data', result.error);
 * }
 * ```
 */
export function getValidatedLocalStorage<T>(
	key: string,
	schema: z.ZodSchema<T>,
	defaultValue?: T
): ValidatedStorageResult<T> {
	try {
		// Retrieve data from localStorage
		const storedData = getLocalStorage(key, undefined);

		// Handle case where no data is found
		if (storedData === undefined) {
			if (defaultValue !== undefined) {
				// If default value is provided, validate it against schema
				try {
					const validatedDefault = schema.parse(defaultValue);
					return { success: true, data: validatedDefault };
				} catch (error) {
					// Handle invalid default value
					if (error instanceof z.ZodError) {
						console.error('Default value validation error:', error.format());
						return { success: false, error };
					}
					return {
						success: false,
						error: error instanceof Error ? error : new Error(String(error))
					};
				}
			}

			// Return error if no data and no default value
			return {
				success: false,
				error: new Error(`No data found for key "${key}" in localStorage`)
			};
		}

		// Validate the retrieved data against the schema
		const validatedData = schema.parse(storedData);
		return { success: true, data: validatedData };
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			console.error('Validation error for localStorage data:', error.format());
			return { success: false, error };
		}

		// Handle other errors
		console.error('Error in getValidatedLocalStorage:', error);
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error))
		};
	}
}
