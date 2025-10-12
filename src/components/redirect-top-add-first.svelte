<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { createListRepositoriesQuery } from '$domains/repository-management/services/create-list-repositories-query';

	// Query for repositories list from database
	const repositoriesQuery = createListRepositoriesQuery();

	$effect(() => {
		const first = repositoriesQuery.data?.[0];
		const hasRepositories = (repositoriesQuery.data?.length ?? 0) > 0;
		const isOnAddFirstPage = page.url.pathname === resolve('/add-first');

		// Redirect to /add-first if no repositories exist
		if (!hasRepositories && !isOnAddFirstPage) {
			goto(resolve('/add-first'));
		}
		// Redirect to first repository if on /add-first but repositories exist
		else if (hasRepositories && isOnAddFirstPage && first) {
			goto(resolve(`/repos/${first.id}`));
		}
	});
</script>
