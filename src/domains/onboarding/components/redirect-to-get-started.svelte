<script lang="ts">
	import { createGetRepositoryListQuery } from '../logic/application/queries/create-get-repository-list-query';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	// Query for repositories list from database
	const repositoriesQuery = createGetRepositoryListQuery();

	$effect(() => {
		const first = repositoriesQuery.data?.[0];
		const hasRepositories = (repositoriesQuery.data?.length ?? 0) > 0;
		const isOnGetStartedPage = page.url.pathname === resolve('/get-started');

		// Redirect to /get-started if no repositories exist
		if (!hasRepositories && !isOnGetStartedPage) {
			goto(resolve('/get-started'));
		}
		// Redirect to first repository if on /get-started but repositories exist
		else if (hasRepositories && isOnGetStartedPage && first) {
			goto(resolve(`/repos/${first.id}`));
		}
	});
</script>
