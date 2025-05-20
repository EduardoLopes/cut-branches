import { z } from 'zod/v4';

/**
 * Utility functions for common validations
 */

/**
 * Validate and transform input using a Zod schema
 * @param input - Data to validate
 * @param schema - Zod schema to validate against
 * @returns Result object with success status and validated data or error
 */
export function validateWithSchema<T>(
	input: unknown,
	schema: z.ZodType<T>
): { success: boolean; data?: T; error?: z.ZodError | Error } {
	try {
		const validatedData = schema.parse(input);
		return { success: true, data: validatedData };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { success: false, error };
		}
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error))
		};
	}
}

/**
 * Format Zod validation errors into a readable error message
 * @param error - Zod error object
 * @returns Formatted error message string
 */
export function formatZodError(error: z.ZodError): string {
	return error.issues
		.map((issue) => {
			const path = issue.path.join('.');
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join('; ');
}

/**
 * Checks if a value is a valid date
 * @param value - Value to check
 * @returns Boolean indicating if the value is a valid date
 */
export function isValidDate(value: unknown): boolean {
	if (value instanceof Date) {
		return !isNaN(value.getTime());
	}

	if (typeof value === 'string' || typeof value === 'number') {
		const date = new Date(value);
		return !isNaN(date.getTime());
	}

	return false;
}

/**
 * Creates a safe validator that won't throw and returns a result object
 * @param validator - Function that performs validation
 * @returns Function that returns a result object
 */
export function createSafeValidator<T, U>(
	validator: (input: T) => U
): (input: T) => { success: boolean; value?: U; error?: Error } {
	return (input: T) => {
		try {
			const result = validator(input);
			return { success: true, value: result };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error))
			};
		}
	};
}

/**
 * Safely validates an object against a schema, returning a typed result or default value
 * @param input - Object to validate
 * @param schema - Zod schema to validate against
 * @param defaultValue - Default value to return if validation fails
 * @returns Validated object or default value
 */
export function safeParse<T>(
	input: unknown,
	schema: z.ZodType<T>,
	defaultValue?: T
): T | undefined {
	try {
		const result = schema.safeParse(input);
		return result.success ? result.data : defaultValue;
	} catch {
		return defaultValue;
	}
}
