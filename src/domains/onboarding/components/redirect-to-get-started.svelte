<script lang="ts">
	import { createGetRepositoryListQuery } from '../core/composables/create-get-repository-list-query';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

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
		const isOnGetStartedPage = currentPath === resolve('/get-started');
		const isOnRootPage = currentPath === resolve('/');

		// Redirect to /get-started if no repositories exist and not already there
		if (!hasRepositories && !isOnGetStartedPage) {
			goto(resolve('/get-started'));
		}
		// Redirect to first repository ONLY if on /get-started or root page with repositories
		else if (hasRepositories && (isOnGetStartedPage || isOnRootPage) && first) {
			goto(resolve(`/repos/${first.id}`));
		}
		// Do not redirect if on any other page - preserve current location
	});
</script>
