<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AddRepositoryMenu from '$domains/repository-management/components/add-repository-menu.svelte';
	import EmptyState from '$ui/core/empty-state.svelte';
	import PageShell from '$ui/patterns/page-shell.svelte';
</script>

<PageShell testId="repos-empty-state">
	<EmptyState
		icon="mdi:source-branch-plus"
		heading="No repositories yet"
		message="Add a Git repository to see its branches and start tidying up."
	>
		{#snippet action()}
			<AddRepositoryMenu
				size="sm"
				emphasis="primary"
				onSuccess={(data) => goto(resolve(`/repos/${data.id}`))}
			/>
		{/snippet}
	</EmptyState>
</PageShell>
