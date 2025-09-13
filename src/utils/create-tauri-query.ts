import {
	createQuery,
	type QueryKey,
	type QueryClient,
	type CreateQueryOptions,
	type FetchQueryOptions
} from '@tanstack/svelte-query';
import {
	type CommandName,
	type CommandParams,
	type CommandResult,
	executeCommand
} from './tauri-command-types';
import { type AppError } from '$lib/bindings';

// Base query options - using explicit types for better inference
export interface TauriQueryOptions<
	TCommand extends CommandName,
	TQueryKey extends QueryKey = QueryKey,
	TError = AppError
> extends Omit<CreateQueryOptions<CommandResult<TCommand>, TError>, 'queryKey' | 'queryFn'> {
	queryKey: TQueryKey;
	input?: CommandParams<TCommand> extends []
		? void
		: CommandParams<TCommand> | (() => CommandParams<TCommand>);
}

// Prefetch options that extend TanStack Query's FetchQueryOptions
export interface TauriFetchQueryOptions<
	TCommand extends CommandName,
	TQueryKey extends QueryKey = QueryKey,
	TError = AppError
> extends FetchQueryOptions<CommandResult<TCommand>, TError, CommandResult<TCommand>, TQueryKey> {
	queryKey: TQueryKey;
	input?: CommandParams<TCommand> extends []
		? void
		: CommandParams<TCommand> | (() => CommandParams<TCommand>);
}

// Legacy wrapper options for backward compatibility
export type TauriQueryWrapperOptions<
	TCommand extends CommandName,
	TQueryKey extends QueryKey = QueryKey
> = Omit<TauriQueryOptions<TCommand, TQueryKey>, 'queryKey'>;

export function createTauriQuery<
	TCommand extends CommandName,
	TQueryKey extends QueryKey = QueryKey
>(commandName: TCommand, config: TauriQueryOptions<TCommand, TQueryKey>) {
	const { queryKey, input, ...options } = config;

	return createQuery(() => ({
		queryKey,
		queryFn: () => {
			const resolvedInput = typeof input === 'function' ? input() : input;
			return executeCommand(commandName, resolvedInput as CommandParams<TCommand> | undefined);
		},
		...options
	}));
}

/**
 * Prefetches a query with automatic Tauri invoke integration
 * Only prefetches if the data is not already cached
 */
export async function prefetchTauriQuery<
	TCommand extends CommandName,
	TQueryKey extends QueryKey = QueryKey
>(
	queryClient: QueryClient,
	commandName: TCommand,
	config: TauriFetchQueryOptions<TCommand, TQueryKey>
) {
	const { queryKey, input, ...fetchOptions } = config;

	// Check if data already exists in cache
	const existingData = queryClient.getQueryData(queryKey);
	if (existingData !== undefined) {
		return;
	}

	return await queryClient.prefetchQuery({
		queryKey,
		queryFn: () => {
			const resolvedInput = typeof input === 'function' ? input() : input;
			return executeCommand(commandName, resolvedInput as CommandParams<TCommand> | undefined);
		},
		...fetchOptions
	});
}

/**
 * Creates a prefetch function bound to a specific query configuration
 */
export function createTauriPrefetcher<
	TCommand extends CommandName,
	TQueryKey extends QueryKey = QueryKey
>(
	commandName: TCommand,
	config: Pick<TauriFetchQueryOptions<TCommand, TQueryKey>, 'queryKey' | 'input'>
) {
	return (
		queryClient: QueryClient,
		options?: Omit<TauriFetchQueryOptions<TCommand, TQueryKey>, 'queryKey' | 'input'>
	) => {
		return prefetchTauriQuery(queryClient, commandName, {
			...config,
			...options
		});
	};
}
