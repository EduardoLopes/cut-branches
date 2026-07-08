import type { ListStaleRepositoriesOutput } from '$infrastructure/bindings';

/**
 * A minimal reactive stand-in for the TanStack query returned by
 * `createListStaleRepositoriesQuery`, for unit-testing `useStaleRepositories`
 * without a `QueryClientProvider`. Backed by runes so the composable's
 * `$derived`/`$effect` react to `set(...)` in tests.
 */
export function createStaleQueryMock() {
	let data = $state<ListStaleRepositoriesOutput | undefined>(undefined);
	let isLoading = $state(true);
	let isFetching = $state(true);
	let isSuccess = $state(false);
	let refetchImpl: () => Promise<unknown> = async () => {};

	const query = {
		get data() {
			return data;
		},
		get isLoading() {
			return isLoading;
		},
		get isFetching() {
			return isFetching;
		},
		get isSuccess() {
			return isSuccess;
		},
		refetch: () => refetchImpl()
	};

	return {
		query,
		/** Resolve the query with a scan result (leaves the loading state). */
		set(next: ListStaleRepositoriesOutput | undefined) {
			data = next;
			isLoading = false;
			isFetching = false;
			isSuccess = next !== undefined;
		},
		/** Install what `refetch()` should do (e.g. set fresh data). */
		onRefetch(fn: () => Promise<unknown>) {
			refetchImpl = fn;
		}
	};
}
