import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { commands } from '$lib/bindings';
import { createError, type AppError } from '$utils/error-utils';

// Input schema for commit reachability check
export const CommitReachableInputSchema = z.object({
	path: z.string(),
	commitSha: z.string()
});

export type CommitReachableVariables = z.infer<typeof CommitReachableInputSchema>;

// Response schema for commit reachability check
const CommitReachableResponseSchema = z.object({
	isReachable: z.boolean()
});

type CommitReachableQueryOptions = CreateQueryOptions<
	boolean,
	AppError,
	boolean,
	[string, string, string]
>;

export function createCheckCommitReachableQuery(
	variables: CommitReachableVariables,
	options?: CommitReachableQueryOptions
) {
	return createQuery<boolean, AppError, boolean, [string, string, string]>(() => ({
		queryKey: ['commit', 'reachable', variables.commitSha],
		queryFn: async () => {
			try {
				// Validate input
				const validatedInput = CommitReachableInputSchema.parse(variables);

				// Call Tauri command
				const result = await commands.isCommitReachable(validatedInput);

				if (result.status === 'error') {
					throw createError({
						message: result.error.message || 'Failed to check commit reachability',
						kind: 'tauri_error',
						description: result.error.description || null
					});
				}

				// Parse and validate response - the new structured output has isReachable directly
				const validatedResponse = CommitReachableResponseSchema.parse(result.data);

				return validatedResponse.isReachable;
			} catch (error) {
				// Handle specific validation errors
				if (error instanceof z.ZodError) {
					const errorMessage = z.prettifyError(error);
					throw createError({
						message: 'Invalid input data for checking commit reachability',
						kind: 'validation_error',
						description: errorMessage
					});
				}

				// Handle service errors that we explicitly threw
				throw createError(error);
			}
		},
		...options
	}));
}
