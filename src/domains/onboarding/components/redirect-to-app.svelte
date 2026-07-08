<script lang="ts">
	import Loading from '@pindoba/svelte-loading';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';

	// Query for repositories list from database
	const repositoriesQuery = createGetRepositoryListQuery();

	$effect(() => {
		// Wait for the query to finish loading before making redirect decisions
		if (repositoriesQuery.isPending || repositoriesQuery.isLoading) {
			return;
		}

		const first = repositoriesQuery.data?.[0];
		const hasRepositories = (repositoriesQuery.data?.length ?? 0) > 0;
		const currentPath = page.url.pathname;
		const isOnReposIndex = currentPath === resolve('/repos');
		const isOnRootPage = currentPath === resolve('/');
		// Settings (and its subroutes, e.g. /settings/feature-flags) is reachable
		// regardless of whether any repository exists.
		const settingsRoot = resolve('/settings');
		const isOnSettings = currentPath === settingsRoot || currentPath.startsWith(`${settingsRoot}/`);

		// Land empty users in the app shell (the /repos index) if not already there
		if (!hasRepositories && !isOnReposIndex && !isOnSettings) {
			goto(resolve('/repos'));
		}
		// Redirect to first repository ONLY if on the /repos index or root page with repositories
		else if (hasRepositories && (isOnReposIndex || isOnRootPage) && first) {
			goto(resolve(`/repos/${first.id}`));
		}
		// Do not redirect if on any other page - preserve current location
	});
</script>

<Loading loading={repositoriesQuery.isPending || repositoriesQuery.isLoading}></Loading>
