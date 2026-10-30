<script lang="ts">
	import LucideGitBranchPlus from '@lucide/svelte/icons/git-branch-plus';
	import { goto } from '$app/navigation';
	import AddRepositoryMenu from '$domains/repository-management/components/add-repository-menu.svelte';
	import { resolveRepositoryPath } from '$lib/repository-route';
	import EmptyState from '$ui/core/empty-state.svelte';
	import PageShell from '$ui/patterns/page-shell.svelte';
</script>

<PageShell testId="repos-empty-state">
	<EmptyState
		icon={LucideGitBranchPlus}
		heading="No repositories yet"
		message="Add a Git repository to see its branches and start tidying up."
	>
		{#snippet action()}
			<AddRepositoryMenu
				size="sm"
				emphasis="primary"
				onSuccess={(data) => goto(resolveRepositoryPath(data.id))}
			/>
		{/snippet}
	</EmptyState>
</PageShell>
