import {
	createMutation,
	useQueryClient,
	type MutationOptions,
	type QueryKey
} from '@tanstack/svelte-query';
import {
	type CommandName,
	type CommandParams,
	type CommandResult,
	executeCommand
} from './tauri-commands';
import { type AppError } from '$lib/bindings';

// Configuration for automatic query invalidation
export interface QueryInvalidationConfig {
	queryKeys?: QueryKey[];
}

// Helper to clean query keys by filtering out nullish values
function cleanQueryKey(queryKey: QueryKey | undefined): QueryKey | undefined {
	return queryKey?.filter(Boolean);
}

// Type guard to check if variables are provided
function hasVariables<TCommand extends CommandName>(
	variables: CommandParams<TCommand> | unknown | undefined
): variables is CommandParams<TCommand> {
	return variables !== undefined;
}

// Base mutation options - using explicit types for better inference
export interface TauriMutationOptions<
	TCommand extends CommandName,
	TError = AppError,
	TContext = unknown
> extends MutationOptions<
		CommandResult<TCommand>,
		TError,
		CommandParams<TCommand> extends [] ? void : CommandParams<TCommand>,
		TContext
	> {
	queryInvalidation?: QueryInvalidationConfig;
}

export function createTauriMutation<TCommand extends CommandName>(
	commandName: TCommand,
	options?: TauriMutationOptions<TCommand>
) {
	const queryClient = useQueryClient();
	const { queryInvalidation, onSuccess, ...rest } = options ?? {};

	return createMutation(() => ({
		mutationFn: (
			variables?: CommandParams<TCommand> extends [] ? void : CommandParams<TCommand>
		) => {
			if (hasVariables<TCommand>(variables)) {
				return executeCommand(commandName, variables);
			}
			return executeCommand(commandName);
		},
		onSuccess: async (data, variables, onMutateResult, context) => {
			const invalidations: Promise<unknown>[] =
				queryInvalidation?.queryKeys?.map((queryKey) =>
					queryClient.invalidateQueries({ queryKey: cleanQueryKey(queryKey) })
				) ?? [];

			if (onSuccess) {
				invalidations.push(Promise.resolve(onSuccess(data, variables, onMutateResult, context)));
			}

			await Promise.all(invalidations);
		},
		...rest
	}));
}
