import { z } from 'zod/v4';

// Unified error schema
export const AppErrorSchema = z.looseObject({
	message: z.string(),
	kind: z.string().default('unknown'),
	description: z.string().default('')
});

export type AppError = z.infer<typeof AppErrorSchema>;

/**
 * Type-safe helper to create an error with specific base fields and extra properties
 */
function createErrorObject<T extends Record<string, unknown>>(
	base: AppError,
	extra: T
): AppError & T {
	return { ...base, ...extra };
}

/**
 * Creates an AppError from any error type with type-safe extra properties
 * @template T - Type of extra properties to include in the error
 * @param error The error to convert
 * @param options Optional configuration
 * @param options.kind Default error kind
 * @param options.defaultMessage Fallback message if none exists
 * @param options.extra Additional properties to include in the error
 * @returns A typed error object with both AppError fields and extra properties
 */
export function createError<T extends Record<string, unknown> = Record<string, never>>(
	error: unknown,
	options?: {
		kind?: string;
		defaultMessage?: string;
		extra?: T;
	}
): AppError & T {
	const kind = options?.kind || 'unknown';
	const defaultMessage = options?.defaultMessage || 'Unknown error';
	const extraProps = options?.extra ?? ({} as T);

	// Already an AppError object - return as is with any extra properties
	if (
		error !== null &&
		typeof error === 'object' &&
		'message' in error &&
		'kind' in error &&
		'description' in error
	) {
		const baseError: AppError = {
			message: error.message as string,
			kind: error.kind as string,
			description: error.description as string
		};
		return createErrorObject(baseError, extraProps);
	}

	// Handle Error instances
	if (error instanceof Error) {
		const baseError: AppError = {
			message: error.message,
			kind: kind || 'runtime',
			description: error.stack || ''
		};
		const errorSpecific = {
			name: error.name,
			stack: error.stack
		};
		return createErrorObject(baseError, { ...errorSpecific, ...extraProps });
	}

	// Handle string errors
	if (typeof error === 'string') {
		const baseError: AppError = {
			message: error || defaultMessage,
			kind,
			description: ''
		};
		return createErrorObject(baseError, extraProps);
	}

	// Extract message from object-like errors
	if (error !== null && typeof error === 'object') {
		// Try parsing with schema
		const parsed = AppErrorSchema.safeParse(error);
		if (parsed.success) {
			const baseError: AppError = {
				message: parsed.data.message,
				kind: parsed.data.kind,
				description: parsed.data.description
			};
			// Combine original object with extra props
			const originalExtra = { ...error } as Record<string, unknown>;
			delete originalExtra.message;
			delete originalExtra.kind;
			delete originalExtra.description;

			return createErrorObject(baseError, { ...originalExtra, ...extraProps });
		}

		// Extract message from object properties
		const message =
			'message' in error && typeof error.message === 'string' ? error.message : defaultMessage;

		// Preserve original properties where they don't conflict with required ones
		const originalProps = Object.entries(error as Record<string, unknown>)
			.filter(([key]) => !['message', 'kind', 'description'].includes(key))
			.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

		// Return with all original properties preserved
		const baseError: AppError = {
			message,
			kind,
			description: JSON.stringify(error)
		};
		return createErrorObject(baseError, { ...originalProps, ...extraProps });
	}

	// Default fallback
	const baseError: AppError = {
		message: defaultMessage,
		kind,
		description: String(error)
	};
	return createErrorObject(baseError, extraProps);
}

/**
 * Extracts error message from any error type
 */
export function getErrorMessage(error: unknown): string {
	if (error === null) return 'Null error';
	if (error === undefined) return 'Undefined error';

	if (typeof error === 'string') return error;
	if (error instanceof Error) return error.message;

	if (typeof error === 'object') {
		if ('message' in error && typeof error.message === 'string') {
			return error.message;
		}
		if ('error' in error && typeof error.error === 'string') {
			return error.error;
		}
	}

	return String(error);
}
