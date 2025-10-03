import {
	createMutation,
	type MutationOptions,
	type MutationKey,
	type QueryKey
} from '@tanstack/svelte-query';
import { getResource } from './query-key-utils';
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
	awaitInvalidates?: QueryKey[];
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
> extends Omit<
		MutationOptions<
			CommandResult<TCommand>,
			TError,
			CommandParams<TCommand> extends [] ? void : CommandParams<TCommand>,
			TContext
		>,
		'mutationKey'
	> {
	queryInvalidation?: QueryInvalidationConfig;
	mutationKey?: MutationKey;
}

export function createTauriMutation<TCommand extends CommandName>(
	commandName: TCommand,
	options?: TauriMutationOptions<TCommand>
) {
	const { mutationKey, meta, ...rest } = options ?? {};

	// Use resource-based mutation key (e.g., 'selected-branches' instead of 'batchDeleteSelectedBranches')
	const resource = getResource(commandName);
	const resourceKey = Array.isArray(resource) ? resource[0] : resource;
	const finalMutationKey = mutationKey ?? [resourceKey];

	// For multi-resource commands, store all resources in meta for invalidation
	const allResources = Array.isArray(resource) ? resource : [resource];

	return createMutation(() => ({
		mutationKey: finalMutationKey,
		mutationFn: (
			variables?: CommandParams<TCommand> extends [] ? void : CommandParams<TCommand>
		) => {
			if (hasVariables<TCommand>(variables)) {
				return executeCommand(commandName, variables);
			}
			return executeCommand(commandName);
		},
		meta: {
			...meta,
			// All resources affected by this mutation (for multi-resource invalidation)
			resources: allResources
		},
		...rest
	}));
}
