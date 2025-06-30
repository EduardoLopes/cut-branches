import { z } from 'zod/v4';
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
 * @param {z.ZodType<T>} schema - Zod schema to validate the retrieved value against
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
	schema: z.ZodType<T>,
	defaultValue?: T
): ValidatedStorageResult<T> {
	try {
		// Retrieve data from localStorage
		const storedData = getLocalStorage(key, undefined);

		// Handle case where no data is found
		if (storedData === undefined) {
			if (defaultValue !== undefined) {
				// If default value is provided, try to validate it against schema
				try {
					const validatedDefault = schema.parse(defaultValue);
					return { success: true, data: validatedDefault };
				} catch (defaultValidationError) {
					console.error(
						`Default value validation error for key "${key}": The provided default value is invalid according to the schema.`,
						defaultValidationError instanceof z.ZodError
							? defaultValidationError.format()
							: defaultValidationError
					);

					// Since the provided defaultValue is invalid, try to see if 'undefined' is a valid state as a fallback.
					try {
						const validatedUndefined = schema.parse(undefined);
						console.warn(
							`For key "${key}", falling back to 'undefined' because the provided default value was invalid.`
						);
						return { success: true, data: validatedUndefined };
					} catch {
						// If 'undefined' is also not allowed by the schema, then no valid value can be established.
						console.error(
							`For key "${key}", cannot fall back to 'undefined' as it's also not permitted by the schema. The original default value was also invalid.`
						);
						return {
							success: false,
							error:
								defaultValidationError instanceof Error
									? defaultValidationError
									: new Error(String(defaultValidationError))
						};
					}
				}
			}

			// If no data found and no default value, try to parse undefined with the schema
			try {
				const validatedUndefined = schema.parse(undefined);
				// If schema.parse(undefined) succeeds, it means undefined is a valid state according to the schema
				return { success: true, data: validatedUndefined };
			} catch {
				// If schema.parse(undefined) fails, then undefined is not allowed by the schema.
				// This is a genuine case of "no data found, and undefined is not a valid state for this schema".
				return {
					success: false,
					error: new Error(
						`No data found for key "${key}" in localStorage, and the schema does not permit 'undefined' as a value.`
					)
				};
			}
		}

		// Validate the retrieved data against the schema
		try {
			const validatedData = schema.parse(storedData);
			return { success: true, data: validatedData };
		} catch (error) {
			// If validation fails but we have a default value, use it
			if (defaultValue !== undefined) {
				console.warn(`Validation failed for "${key}", using default value`);
				return { success: true, data: defaultValue };
			}
			throw error; // Re-throw to be caught by outer catch
		}
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			console.error('Validation error for localStorage data:', error.format());
			// Return default value if available, even if validation fails
			if (defaultValue !== undefined) {
				return { success: true, data: defaultValue };
			}
			return { success: false, error };
		}

		// Handle other errors
		console.error('Error in getValidatedLocalStorage:', error);
		if (defaultValue !== undefined) {
			return { success: true, data: defaultValue };
		}
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error))
		};
	}
}
