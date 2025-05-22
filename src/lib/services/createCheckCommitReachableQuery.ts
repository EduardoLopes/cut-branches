import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import { createError, type AppError } from '$lib/utils/error-utils';

// Input schema for commit reachability check
export const CommitReachableInputSchema = z.object({
	path: z.string(),
	commitSha: z.string()
});

export type CommitReachableVariables = z.infer<typeof CommitReachableInputSchema>;

// Response schema for commit reachability check
const CommitReachableResponseSchema = z.object({
	is_reachable: z.boolean()
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
				const res = await invoke<string>('is_commit_reachable', {
					path: validatedInput.path,
					commitSha: validatedInput.commitSha
				});

				// Parse and validate response
				const parsedResponse = JSON.parse(res);
				const validatedResponse = CommitReachableResponseSchema.parse(parsedResponse);

				return validatedResponse.is_reachable;
			} catch (error) {
				// Handle specific validation errors
				if (error instanceof z.ZodError) {
					const errorMessage = error.errors.map((e) => e.message).join('; ');
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
