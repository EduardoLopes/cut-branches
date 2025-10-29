import {
	createQuery,
	type QueryKey,
	type QueryClient,
	type CreateQueryOptions,
	type FetchQueryOptions,
	useQueryClient
} from '@tanstack/svelte-query';
import { getResource } from './query-key-utils';
import {
	type CommandName,
	type CommandParams,
	type CommandResult,
	buildCommandExecutor
} from './tauri-commands';
import { type AppError } from '$lib/bindings';

// Helper to resolve input (static value or function)
export type InputResolver<TCommand extends CommandName> =
	| CommandParams<TCommand>
	| (() => CommandParams<TCommand>);

// Helper to resolve input value at runtime
function resolveInput<TCommand extends CommandName>(
	input: InputResolver<TCommand> | undefined
): CommandParams<TCommand> | undefined {
	return typeof input === 'function' ? input() : input;
}

// Type guard to ensure a value is a valid QueryKey
function isQueryKey<TQueryKey extends QueryKey>(value: unknown): value is TQueryKey {
	return Array.isArray(value) && value.every((v) => v !== undefined && v !== null);
}

// Helper to create default query key using resource-based naming
function createQueryKey<TCommand extends CommandName, TQueryKey extends QueryKey = QueryKey>(
	commandName: TCommand,
	input: CommandParams<TCommand> | undefined
): TQueryKey {
	// Use resource-based key (e.g., 'selected-branches' instead of 'listSelectedBranches')
	const resource = getResource(commandName);
	const queryKey = [resource, commandName, input].filter((v) => v !== undefined && v !== null);
	if (isQueryKey<TQueryKey>(queryKey)) {
		return queryKey;
	}
	// This should never happen in practice, but TypeScript needs a fallback
	throw new Error('Invalid query key generated');
}

// Base query options - using explicit types for better inference
export type TauriQueryOptions<
	TCommand extends CommandName,
	TData = CommandResult<TCommand>,
	TQueryKey extends QueryKey = QueryKey,
	TError = AppError
> = Omit<
	CreateQueryOptions<CommandResult<TCommand>, TError, TData, TQueryKey>,
	'queryKey' | 'queryFn'
> & {
	queryKey?: TQueryKey;
	input?: InputResolver<TCommand>;
	meta?: {
		[key: string]: unknown;
	};
};

// Prefetch options that extend TanStack Query's FetchQueryOptions
export type TauriFetchQueryOptions<
	TCommand extends CommandName,
	TQueryKey extends QueryKey = QueryKey,
	TError = AppError
> = Omit<
	FetchQueryOptions<CommandResult<TCommand>, TError, CommandResult<TCommand>, TQueryKey>,
	'queryKey' | 'queryFn'
> & {
	queryKey?: TQueryKey;
	input?: InputResolver<TCommand>;
};

// Helper to build queryFn for Tauri commands
function buildQueryFn<TCommand extends CommandName>(
	commandName: TCommand,
	input: InputResolver<TCommand> | undefined
): () => Promise<CommandResult<TCommand>> {
	const executor = buildCommandExecutor(commandName);
	return () => executor(resolveInput(input));
}

export function createTauriQuery<
	TCommand extends CommandName,
	TData = CommandResult<TCommand>,
	TQueryKey extends QueryKey = QueryKey,
	TError = AppError
>(commandName: TCommand, config: TauriQueryOptions<TCommand, TData, TQueryKey, TError>) {
	const { input, queryKey, meta, ...options } = config;

	const queryClient = useQueryClient();

	function invalidate() {
		return queryClient.invalidateQueries({
			queryKey: queryKey ?? createQueryKey<TCommand, TQueryKey>(commandName, resolveInput(input))
		});
	}

	return createQuery(() => {
		const resolvedInput = resolveInput(input);
		const finalQueryKey =
			queryKey ?? createQueryKey<TCommand, TQueryKey>(commandName, resolvedInput);

		return {
			queryKey: finalQueryKey,
			queryFn: buildQueryFn(commandName, input),
			...options,
			meta: {
				...meta,
				invalidate
			}
		};
	});
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

	const resolvedInput = resolveInput(input);
	const finalQueryKey = queryKey ?? createQueryKey<TCommand, TQueryKey>(commandName, resolvedInput);

	// Check if data already exists in cache
	const existingData = queryClient.getQueryData(finalQueryKey);
	if (existingData !== undefined) {
		return;
	}

	return await queryClient.prefetchQuery({
		queryKey: finalQueryKey,
		queryFn: buildQueryFn(commandName, input),
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
