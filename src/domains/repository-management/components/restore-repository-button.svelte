<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import { createGetBranchesQuery } from '../logic/application/queries/create-get-branches-query';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { css } from '@pindoba/panda/css';
	interface Props {
		repositoryId: string;
	}

	const { repositoryId }: Props = $props();

	const getBranchesQuery = createGetBranchesQuery(() => ({
		repoId: repositoryId,
		filters: { deletionStatus: 'deleted' }
	}));

	const count = $derived(getBranchesQuery.data?.branches.length ?? 0);

	function navigateToRestore() {
		goto(resolve(`/repos/${repositoryId}/restore`));
	}
</script>

{#if getBranchesQuery.isLoading || count > 0}
	<Loading isLoading={getBranchesQuery.isLoading}>
		<Button
			emphasis="ghost"
			size="md"
			onclick={navigateToRestore}
			data-testid="restore-navigate-button"
			title="Restore branches"
			aria-label="Restore branches"
			aria-describedby="Restore branches"
			class={css({
				gap: 'sm'
			})}
		>
			<Icon icon="lucide:undo" width="20px" height="20px" />
			Restore branches <Badge size="sm">{count}</Badge>
		</Button>
	</Loading>
{/if}
