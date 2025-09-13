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
} from './tauri-command-types';
import { type AppError } from '$lib/bindings';

// Configuration for automatic query invalidation
export interface QueryInvalidationConfig {
	queryKeys?: QueryKey[];
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
		mutationFn: (variables?: CommandParams<TCommand> extends [] ? void : CommandParams<TCommand>) =>
			executeCommand(commandName, variables as CommandParams<TCommand> | undefined),
		onSuccess: (data, variables, context) => {
			const invalidations: Promise<unknown>[] =
				queryInvalidation?.queryKeys?.map((queryKey) =>
					queryClient.invalidateQueries({ queryKey: queryKey?.filter(Boolean) })
				) ?? [];

			if (onSuccess) {
				invalidations.push(Promise.resolve(onSuccess(data, variables, context)));
			}

			return invalidations.length > 0 ? Promise.all(invalidations) : undefined;
		},
		...rest
	}));
}
