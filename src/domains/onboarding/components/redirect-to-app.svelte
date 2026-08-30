<script lang="ts">
	import Loading from '@pindoba/svelte-loading';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
	import { createPrefetchRepositoryData } from '$lib/create-prefetch-repository-data';
	import { lastRepository } from '$lib/last-repository.svelte';
	import { repositorySort, sortRepositories } from '$lib/repository-sort.svelte';

	// Query for repositories list from database
	const repositoriesQuery = createGetRepositoryListQuery();

	const prefetchRepositoryData = createPrefetchRepositoryData();

	// The remembered id comes straight out of localStorage, so it is known
	// before the list resolves — start the repository's own queries alongside
	// the list instead of after the redirect. Serial (list → redirect → fetch)
	// becomes parallel; on the launch path that is the difference between two
	// round trips of spinner and one.
	//
	// A remembered repository that no longer exists just warms a cache entry
	// nothing reads: the redirect validates against the live list either way.
	// The path isn't known yet, so the path-keyed queries are left to the page.
	if (page.url.pathname === resolve('/') && lastRepository.current) {
		prefetchRepositoryData.now(lastRepository.current);
	}

	$effect(() => {
		// Wait for the query to finish loading before making redirect decisions
		if (repositoriesQuery.isPending || repositoriesQuery.isLoading) {
			return;
		}
		// A failed list is not an empty list: never redirect/onboard on an error.
		if (repositoriesQuery.isError) {
			return;
		}

		const repositories = repositoriesQuery.data ?? [];
		const hasRepositories = repositories.length > 0;
		const currentPath = page.url.pathname;
		const isOnReposIndex = currentPath === resolve('/repos');
		const isOnRootPage = currentPath === resolve('/');
		// Settings (and its subroutes, e.g. /settings/feature-flags) is reachable
		// regardless of whether any repository exists.
		const settingsRoot = resolve('/settings');
		const isOnSettings = currentPath === settingsRoot || currentPath.startsWith(`${settingsRoot}/`);

		// The sidebar orders the list with the same helper and preference, so the
		// repository we open is the one sitting at the top of the user's list —
		// never the raw insertion order the backend happens to return.
		const sortedFirst = sortRepositories(repositories, repositorySort.mode)[0];
		// The root page is only ever reached at launch — nothing in the app
		// navigates back to `/` — so it is the signal to reopen where the user left
		// off. A `/repos` visit mid-session (after removing a repository, say)
		// deliberately keeps using the sidebar's first entry instead. A remembered
		// repository that has since been removed simply isn't found, and falls back.
		const remembered = isOnRootPage
			? repositories.find((repository) => repository.id === lastRepository.current)
			: undefined;
		const target = remembered ?? sortedFirst;

		// Land empty users in the app shell (the /repos index) if not already there
		if (!hasRepositories && !isOnReposIndex && !isOnSettings) {
			goto(resolve('/repos'));
		}
		// Redirect to the resolved repository ONLY if on the /repos index or root page
		else if (hasRepositories && (isOnReposIndex || isOnRootPage) && target) {
			goto(resolve(`/repos/${target.id}`));
		}
		// Do not redirect if on any other page - preserve current location
	});
</script>

<Loading loading={repositoriesQuery.isPending || repositoriesQuery.isLoading}></Loading>
