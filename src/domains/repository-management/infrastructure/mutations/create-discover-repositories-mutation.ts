import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

type DiscoverRepositoriesMutationOptions = TauriMutationOptions<'discoverRepositories'>;

/**
 * Mutation adapter for the `discover_repositories` command. Modelled as a
 * mutation (not a query) because it is an on-demand, side-effect-free scan the
 * user triggers explicitly — there is no stable key worth caching.
 */
export function createDiscoverRepositoriesMutation(options?: DiscoverRepositoriesMutationOptions) {
	return createTauriMutation('discoverRepositories', options);
}
