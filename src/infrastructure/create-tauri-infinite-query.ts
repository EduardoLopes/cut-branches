import {
	createInfiniteQuery,
	useQueryClient,
	type CreateInfiniteQueryOptions,
	type InfiniteData,
	type QueryKey
} from '@tanstack/svelte-query';
import { createQueryKey, resolveInput, type InputResolver } from './create-tauri-query';
import {
	buildCommandExecutor,
	type CommandName,
	type CommandParams,
	type CommandResult
} from './tauri-commands';
import { type AppError } from '$infrastructure/bindings';

/**
 * Options for a cursor-paged Tauri command. `input` is the base command input
 * WITHOUT the page cursor — it also forms the query key, so every page of the
 * same listing shares one cache entry (and invalidation matches the same
 * `[resource, commandName, input]` shape `createTauriQuery` uses).
 * `withPageParam` merges the current cursor into that base input per fetch.
 */
export type TauriInfiniteQueryOptions<
	TCommand extends CommandName,
	TPageParam,
	TData = InfiniteData<CommandResult<TCommand>, TPageParam>,
	TQueryKey extends QueryKey = QueryKey,
	TError = AppError
> = Omit<
	CreateInfiniteQueryOptions<CommandResult<TCommand>, TError, TData, TQueryKey, TPageParam>,
	'queryKey' | 'queryFn'
> & {
	/** Explicit key (value or thunk, so it can track reactive inputs). Useful
	 *  when the key needs context the wire input doesn't carry (e.g. repoId). */
	queryKey?: TQueryKey | (() => TQueryKey);
	input?: InputResolver<TCommand>;
	withPageParam: (input: CommandParams<TCommand>, pageParam: TPageParam) => CommandParams<TCommand>;
	meta?: {
		[key: string]: unknown;
	};
};

/**
 * Infinite-query sibling of `createTauriQuery`: same resource-based query
 * key, same `Result` unwrapping, same `meta.invalidate` helper — plus
 * cursor-based page accumulation via TanStack's `createInfiniteQuery`.
 */
export function createTauriInfiniteQuery<
	TCommand extends CommandName,
	TPageParam,
	TData = InfiniteData<CommandResult<TCommand>, TPageParam>,
	TQueryKey extends QueryKey = QueryKey,
	TError = AppError
>(
	commandName: TCommand,
	config: TauriInfiniteQueryOptions<TCommand, TPageParam, TData, TQueryKey, TError>
) {
	const { input, queryKey, withPageParam, meta, ...options } = config;

	const queryClient = useQueryClient();
	const executor = buildCommandExecutor(commandName);

	const resolveKey = (): TQueryKey =>
		(typeof queryKey === 'function' ? queryKey() : queryKey) ??
		createQueryKey<TCommand, TQueryKey>(commandName, resolveInput(input));

	function invalidate() {
		return queryClient.invalidateQueries({ queryKey: resolveKey() });
	}

	return createInfiniteQuery(() => {
		const finalQueryKey = resolveKey();

		return {
			queryKey: finalQueryKey,
			// TanStack types the context's pageParam as unknown; it always holds
			// initialPageParam or a getNextPageParam result, i.e. TPageParam.
			queryFn: ({ pageParam }: { pageParam?: unknown }) => {
				const base = resolveInput(input);
				return executor(base === undefined ? base : withPageParam(base, pageParam as TPageParam));
			},
			...options,
			meta: {
				...meta,
				invalidate
			}
		};
	});
}
