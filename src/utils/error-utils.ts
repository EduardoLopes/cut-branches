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

	if (error instanceof z.ZodError) {
		const errorMessage = z.prettifyError(error);

		// Returned, not thrown: every other branch returns, and the callers are
		// TanStack's QueryCache/MutationCache `onError` handlers, which use the
		// result to build the user-facing notification. Throwing from there
		// escaped into the cache callback and lost the notification for exactly
		// the failures the user needs to hear about.
		return createErrorObject(
			{
				message: error.message,
				kind: error.name,
				description: errorMessage
			},
			extraProps
		);
	}

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
			// Rust's AppError.description is an `Option<String>`, so it arrives as
			// `null` for the errors built without one (invalid_branch_name,
			// invalid_repository_path, …). AppError declares it a string, and the
			// cache-level onError handlers feed it straight to the toast body — so
			// an un-normalized null reached the notification as its message.
			description: (error.description as string | null) ?? ''
		};
		return createErrorObject(baseError, extraProps);
	}

	// Handle Error instances
	if (error instanceof Error) {
		const baseError: AppError = {
			message: error.message,
			// Not `kind || 'runtime'`: `kind` was already defaulted to 'unknown'
			// above, so it is never falsy and the 'runtime' fallback could not be
			// reached. Error instances without an explicit kind get 'unknown' —
			// keeping the unreachable operand only implied otherwise.
			kind,
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

		// Always the default here. We only reach this line when the safeParse
		// above failed, and AppErrorSchema only requires `message: z.string()`
		// (kind and description both have defaults) — so a failure means
		// `message` is missing or is not a string. Reading it off the object
		// was an unreachable branch.
		const message = defaultMessage;

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
